import express from 'express';
import { DatabaseManager } from '../utils/database.js';
import { createLogger } from '../utils/logger.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';

const router = express.Router();
const logger = createLogger('VideoRoutes');
const db = new DatabaseManager();

// Get all videos with pagination
router.get('/', async (req, res, next) => {
    try {
        const { 
            limit = 20, 
            offset = 0, 
            sortBy = 'published_at', 
            sortOrder = 'desc',
            search = null,
            minDuration = null,
            maxDuration = null
        } = req.query;

        // Validate parameters
        const validSortFields = ['published_at', 'view_count', 'like_count', 'duration_seconds', 'title'];
        const validSortOrders = ['asc', 'desc'];

        if (!validSortFields.includes(sortBy)) {
            throw new ValidationError('Invalid sortBy field');
        }

        if (!validSortOrders.includes(sortOrder.toLowerCase())) {
            throw new ValidationError('Invalid sortOrder. Use "asc" or "desc"');
        }

        let query = 'SELECT * FROM videos WHERE 1=1';
        const params = [];
        let paramCount = 0;

        // Add search filter
        if (search) {
            paramCount++;
            query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        // Add duration filters
        if (minDuration) {
            paramCount++;
            query += ` AND duration_seconds >= $${paramCount}`;
            params.push(parseInt(minDuration));
        }

        if (maxDuration) {
            paramCount++;
            query += ` AND duration_seconds <= $${paramCount}`;
            params.push(parseInt(maxDuration));
        }

        // Add sorting and pagination
        query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
        
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(parseInt(limit));
        
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(parseInt(offset));

        const result = await db.query(query, params);

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM videos WHERE 1=1';
        const countParams = [];
        let countParamCount = 0;

        if (search) {
            countParamCount++;
            countQuery += ` AND (title ILIKE $${countParamCount} OR description ILIKE $${countParamCount})`;
            countParams.push(`%${search}%`);
        }

        if (minDuration) {
            countParamCount++;
            countQuery += ` AND duration_seconds >= $${countParamCount}`;
            countParams.push(parseInt(minDuration));
        }

        if (maxDuration) {
            countParamCount++;
            countQuery += ` AND duration_seconds <= $${countParamCount}`;
            countParams.push(parseInt(maxDuration));
        }

        const countResult = await db.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        res.json({
            videos: result.rows,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: (parseInt(offset) + parseInt(limit)) < total
            },
            filters: {
                search,
                minDuration: minDuration ? parseInt(minDuration) : null,
                maxDuration: maxDuration ? parseInt(maxDuration) : null,
                sortBy,
                sortOrder
            }
        });

    } catch (error) {
        next(error);
    }
});

// Get video statistics (must come before /:id route)
router.get('/stats', async (req, res, next) => {
    try {
        const stats = await db.getVideoStats();

        res.json({
            total: parseInt(stats.total_videos),
            totalHours: Math.round(stats.total_duration / 3600),
            averageDuration: Math.round(stats.average_duration / 60), // in minutes
            totalViews: parseInt(stats.total_views),
            averageViews: Math.round(stats.average_views),
            latestVideo: stats.latest_video_date,
            oldestVideo: stats.oldest_video_date,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        next(error);
    }
});

// Get a specific video by ID
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        // Validate UUID format
        if (!id || !id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            throw new ValidationError('Invalid video ID format');
        }

        const query = 'SELECT * FROM videos WHERE id = $1';
        const result = await db.query(query, [id]);

        if (result.rows.length === 0) {
            throw new NotFoundError('Video not found');
        }

        const video = result.rows[0];

        // Get related health topics
        const topicsQuery = `
            SELECT ht.*, vt.relevance_score
            FROM health_topics ht
            JOIN video_topics vt ON ht.id = vt.topic_id
            WHERE vt.video_id = $1
            ORDER BY vt.relevance_score DESC
        `;
        const topicsResult = await db.query(topicsQuery, [id]);

        res.json({
            ...video,
            healthTopics: topicsResult.rows,
            formattedDuration: formatDuration(video.duration_seconds),
            formattedViews: formatNumber(video.view_count),
            formattedLikes: formatNumber(video.like_count)
        });

    } catch (error) {
        next(error);
    }
});

// Get video by YouTube ID
router.get('/youtube/:youtubeId', async (req, res, next) => {
    try {
        const { youtubeId } = req.params;

        if (!youtubeId || youtubeId.length !== 11) {
            throw new ValidationError('Invalid YouTube ID format');
        }

        const query = 'SELECT * FROM videos WHERE youtube_id = $1';
        const result = await db.query(query, [youtubeId]);

        if (result.rows.length === 0) {
            throw new NotFoundError('Video not found');
        }

        res.json(result.rows[0]);

    } catch (error) {
        next(error);
    }
});

// Search videos
router.get('/search', async (req, res, next) => {
    try {
        const { q, limit = 10, offset = 0 } = req.query;

        if (!q || typeof q !== 'string' || q.trim().length === 0) {
            throw new ValidationError('Search query is required');
        }

        const searchTerm = q.trim();

        const query = `
            SELECT *, 
                   ts_rank(to_tsvector('english', title || ' ' || COALESCE(description, '')), 
                           plainto_tsquery('english', $1)) as rank
            FROM videos 
            WHERE to_tsvector('english', title || ' ' || COALESCE(description, '')) 
                  @@ plainto_tsquery('english', $1)
            ORDER BY rank DESC, published_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(query, [searchTerm, parseInt(limit), parseInt(offset)]);

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM videos 
            WHERE to_tsvector('english', title || ' ' || COALESCE(description, '')) 
                  @@ plainto_tsquery('english', $1)
        `;
        const countResult = await db.query(countQuery, [searchTerm]);

        res.json({
            query: searchTerm,
            videos: result.rows,
            total: parseInt(countResult.rows[0].total),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

    } catch (error) {
        next(error);
    }
});



// Get popular videos
router.get('/popular', async (req, res, next) => {
    try {
        const { limit = 10, timeframe = 'all' } = req.query;

        let query = `
            SELECT *, 
                   view_count as popularity_score
            FROM videos 
        `;

        const params = [parseInt(limit)];

        // Add timeframe filter
        if (timeframe !== 'all') {
            let dateFilter;
            switch (timeframe) {
                case 'week':
                    dateFilter = "published_at > NOW() - INTERVAL '7 days'";
                    break;
                case 'month':
                    dateFilter = "published_at > NOW() - INTERVAL '30 days'";
                    break;
                case 'year':
                    dateFilter = "published_at > NOW() - INTERVAL '365 days'";
                    break;
                default:
                    dateFilter = '1=1';
            }
            query += ` WHERE ${dateFilter}`;
        }

        query += ` ORDER BY view_count DESC, like_count DESC LIMIT $1`;

        const result = await db.query(query, params);

        res.json({
            videos: result.rows,
            timeframe,
            limit: parseInt(limit)
        });

    } catch (error) {
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
