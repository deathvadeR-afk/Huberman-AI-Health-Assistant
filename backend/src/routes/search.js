import express from 'express';
import { SemanticSearchService } from '../services/semanticSearchService.js';
import { HealthQueryProcessor } from '../services/healthQueryProcessor.js';
import { DatabaseManager } from '../utils/database.js';
import { createLogger } from '../utils/logger.js';
import { ValidationError } from '../middleware/errorHandler.js';
import { createCustomRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();
const logger = createLogger('SearchRoutes');
const db = new DatabaseManager();

// Initialize services
const semanticSearchService = new SemanticSearchService();
const healthQueryProcessor = new HealthQueryProcessor();

// Apply stricter rate limiting for search endpoints
const searchRateLimit = createCustomRateLimiter(30, 900, 180); // 30 requests per 15 minutes

// Health-focused semantic search
router.post('/health', searchRateLimit, async (req, res, next) => {
    try {
        const { query, filters = {}, options = {} } = req.body;

        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            throw new ValidationError('Search query is required');
        }

        if (query.length > 500) {
            throw new ValidationError('Query too long. Maximum 500 characters allowed.');
        }

        logger.info('Processing health search query', { 
            query: query.substring(0, 100),
            userId: req.user?.id,
            ip: req.ip 
        });

        const startTime = Date.now();

        // Process the health query
        const processedQuery = await healthQueryProcessor.processQuery(query);

        // Perform semantic search
        const searchResults = await semanticSearchService.search(
            processedQuery.enhancedSearchTerms || processedQuery.searchTerms,
            processedQuery.healthTopics,
            {
                limit: options.limit || 10,
                userId: req.user?.id,
                preferences: options.preferences || {}
            }
        );

        const processingTime = Date.now() - startTime;

        // Record user query for analytics
        try {
            const queryId = await db.recordUserQuery({
                query_text: query,
                user_ip: req.ip,
                user_agent: req.get('User-Agent'),
                response_time_ms: processingTime,
                results_count: searchResults.videos.length
            });

            // Record query results
            if (queryId && searchResults.videos.length > 0) {
                await db.recordQueryResults(queryId, searchResults.videos.map((video, index) => ({
                    video_id: video.id,
                    similarity_score: video.ai_relevance_score || video.relevance_score || 0,
                    rank_position: index + 1
                })));
            }
        } catch (analyticsError) {
            logger.warn('Failed to record analytics:', analyticsError.message);
        }

        const response = {
            query: query,
            processedQuery: {
                queryType: processedQuery.queryType,
                confidence: processedQuery.confidence,
                healthTopics: processedQuery.healthTopics.slice(0, 3),
                searchTerms: processedQuery.searchTerms
            },
            results: searchResults.videos.map(video => ({
                id: video.id,
                youtube_id: video.youtube_id,
                title: video.title,
                description: video.search_snippet || video.description?.substring(0, 200) + '...',
                url: video.url,
                thumbnail_url: video.thumbnail_url,
                duration_seconds: video.duration_seconds,
                view_count: video.view_count,
                like_count: video.like_count,
                published_at: video.published_at,
                relevance_score: video.ai_relevance_score || video.relevance_score,
                formatted_duration: formatDuration(video.duration_seconds),
                formatted_views: formatNumber(video.view_count)
            })),
            recommendations: searchResults.recommendations,
            metadata: {
                totalResults: searchResults.total,
                processingTime: processingTime,
                timestamp: new Date().toISOString(),
                suggestedFilters: processedQuery.suggestedFilters
            }
        };

        res.json(response);

    } catch (error) {
        logger.error('Health search error:', error);
        next(error);
    }
});

// General semantic search
router.post('/semantic', searchRateLimit, async (req, res, next) => {
    try {
        const { query, filters = {}, options = {} } = req.body;

        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            throw new ValidationError('Search query is required');
        }

        logger.info('Processing semantic search', { query: query.substring(0, 100) });

        const results = await semanticSearchService.semanticSearch(query, filters, options);

        res.json(results);

    } catch (error) {
        logger.error('Semantic search error:', error);
        next(error);
    }
});

// Get search suggestions
router.get('/suggestions', async (req, res, next) => {
    try {
        const { q, limit = 5 } = req.query;

        if (!q || q.length < 2) {
            return res.json({ suggestions: [] });
        }

        // Get suggestions from health topics
        const topicSuggestions = await db.query(`
            SELECT name, category, 'topic' as type
            FROM health_topics 
            WHERE name ILIKE $1 OR keywords && ARRAY[$2]
            ORDER BY name
            LIMIT $3
        `, [`%${q}%`, q.toLowerCase(), Math.ceil(limit / 2)]);

        // Get suggestions from popular video titles
        const videoSuggestions = await db.query(`
            SELECT DISTINCT 
                CASE 
                    WHEN title ILIKE $1 THEN title
                    ELSE regexp_replace(title, '.*(' || $2 || '[^\\s]*).*', '\\1', 'i')
                END as suggestion,
                'video' as type
            FROM videos 
            WHERE title ILIKE $1
            ORDER BY view_count DESC
            LIMIT $3
        `, [`%${q}%`, q, Math.floor(limit / 2)]);

        const suggestions = [
            ...topicSuggestions.rows.map(row => ({
                text: row.name,
                type: row.type,
                category: row.category
            })),
            ...videoSuggestions.rows.map(row => ({
                text: row.suggestion,
                type: row.type
            }))
        ].slice(0, limit);

        res.json({ suggestions });

    } catch (error) {
        logger.error('Search suggestions error:', error);
        next(error);
    }
});

// Get popular search terms
router.get('/popular', async (req, res, next) => {
    try {
        const { limit = 10, timeframe = 'week' } = req.query;

        let dateFilter;
        switch (timeframe) {
            case 'day':
                dateFilter = "created_at > NOW() - INTERVAL '1 day'";
                break;
            case 'week':
                dateFilter = "created_at > NOW() - INTERVAL '7 days'";
                break;
            case 'month':
                dateFilter = "created_at > NOW() - INTERVAL '30 days'";
                break;
            default:
                dateFilter = "created_at > NOW() - INTERVAL '7 days'";
        }

        const query = `
            SELECT 
                query_text,
                COUNT(*) as search_count,
                AVG(results_count) as avg_results,
                AVG(response_time_ms) as avg_response_time
            FROM user_queries 
            WHERE ${dateFilter}
              AND LENGTH(query_text) > 3
            GROUP BY query_text
            HAVING COUNT(*) > 1
            ORDER BY search_count DESC, avg_results DESC
            LIMIT $1
        `;

        const result = await db.query(query, [parseInt(limit)]);

        res.json({
            popularSearches: result.rows.map(row => ({
                query: row.query_text,
                searchCount: parseInt(row.search_count),
                avgResults: Math.round(row.avg_results),
                avgResponseTime: Math.round(row.avg_response_time)
            })),
            timeframe,
            limit: parseInt(limit)
        });

    } catch (error) {
        logger.error('Popular searches error:', error);
        next(error);
    }
});

// Get search analytics
router.get('/analytics', async (req, res, next) => {
    try {
        const { timeframe = 'week' } = req.query;

        let dateFilter;
        switch (timeframe) {
            case 'day':
                dateFilter = "created_at > NOW() - INTERVAL '1 day'";
                break;
            case 'week':
                dateFilter = "created_at > NOW() - INTERVAL '7 days'";
                break;
            case 'month':
                dateFilter = "created_at > NOW() - INTERVAL '30 days'";
                break;
            default:
                dateFilter = "created_at > NOW() - INTERVAL '7 days'";
        }

        // Get search statistics
        const statsQuery = `
            SELECT 
                COUNT(*) as total_searches,
                COUNT(DISTINCT user_ip) as unique_users,
                AVG(results_count) as avg_results_per_search,
                AVG(response_time_ms) as avg_response_time,
                COUNT(CASE WHEN results_count = 0 THEN 1 END) as zero_result_searches
            FROM user_queries 
            WHERE ${dateFilter}
        `;

        const statsResult = await db.query(statsQuery);
        const stats = statsResult.rows[0];

        // Get search trends by hour
        const trendsQuery = `
            SELECT 
                DATE_TRUNC('hour', created_at) as hour,
                COUNT(*) as search_count
            FROM user_queries 
            WHERE ${dateFilter}
            GROUP BY DATE_TRUNC('hour', created_at)
            ORDER BY hour
        `;

        const trendsResult = await db.query(trendsQuery);

        res.json({
            timeframe,
            statistics: {
                totalSearches: parseInt(stats.total_searches),
                uniqueUsers: parseInt(stats.unique_users),
                avgResultsPerSearch: Math.round(stats.avg_results_per_search || 0),
                avgResponseTime: Math.round(stats.avg_response_time || 0),
                zeroResultSearches: parseInt(stats.zero_result_searches),
                successRate: stats.total_searches > 0 
                    ? Math.round(((stats.total_searches - stats.zero_result_searches) / stats.total_searches) * 100)
                    : 0
            },
            trends: trendsResult.rows.map(row => ({
                hour: row.hour,
                searchCount: parseInt(row.search_count)
            }))
        });

    } catch (error) {
        logger.error('Search analytics error:', error);
        next(error);
    }
});

// Helper functions
function formatDuration(seconds) {
    if (!seconds) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

function formatNumber(num) {
    if (!num) return '0';
    
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    } else {
        return num.toString();
    }
}

export default router;
