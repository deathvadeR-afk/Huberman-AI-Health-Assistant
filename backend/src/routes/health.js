import express from 'express';
import { DatabaseManager } from '../utils/database.js';
import { createLogger } from '../utils/logger.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';

const router = express.Router();
const logger = createLogger('HealthRoutes');
const db = new DatabaseManager();

// Get all health topics
router.get('/topics', async (req, res, next) => {
    try {
        const { category, limit = 50, offset = 0 } = req.query;
        
        let query = 'SELECT * FROM health_topics';
        const params = [];
        
        if (category) {
            query += ' WHERE category ILIKE $1';
            params.push(`%${category}%`);
        }
        
        query += ' ORDER BY name LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await db.query(query, params);
        
        res.json({
            topics: result.rows,
            total: result.rows.length,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
    } catch (error) {
        next(error);
    }
});

// Get a specific health topic
router.get('/topics/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        if (!id || !id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            throw new ValidationError('Invalid topic ID format');
        }
        
        const query = 'SELECT * FROM health_topics WHERE id = $1';
        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            throw new NotFoundError('Health topic not found');
        }
        
        res.json(result.rows[0]);
        
    } catch (error) {
        next(error);
    }
});

// Get videos related to a health topic
router.get('/topics/:id/videos', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { limit = 10, offset = 0 } = req.query;
        
        if (!id || !id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            throw new ValidationError('Invalid topic ID format');
        }
        
        const query = `
            SELECT v.*, vt.relevance_score, ht.name as topic_name
            FROM videos v
            JOIN video_topics vt ON v.id = vt.video_id
            JOIN health_topics ht ON vt.topic_id = ht.id
            WHERE ht.id = $1
            ORDER BY vt.relevance_score DESC, v.published_at DESC
            LIMIT $2 OFFSET $3
        `;
        
        const result = await db.query(query, [id, parseInt(limit), parseInt(offset)]);
        
        res.json({
            videos: result.rows,
            total: result.rows.length,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
    } catch (error) {
        next(error);
    }
});

// Search health topics by keywords
router.get('/topics/search', async (req, res, next) => {
    try {
        const { q, limit = 10 } = req.query;
        
        if (!q || typeof q !== 'string' || q.trim().length === 0) {
            throw new ValidationError('Search query is required');
        }
        
        const searchTerm = q.trim();
        
        const query = `
            SELECT *, 
                   ts_rank(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || array_to_string(keywords, ' ')), 
                           plainto_tsquery('english', $1)) as rank
            FROM health_topics 
            WHERE to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || array_to_string(keywords, ' ')) 
                  @@ plainto_tsquery('english', $1)
            ORDER BY rank DESC, name
            LIMIT $2
        `;
        
        const result = await db.query(query, [searchTerm, parseInt(limit)]);
        
        res.json({
            query: searchTerm,
            topics: result.rows,
            total: result.rows.length
        });
        
    } catch (error) {
        next(error);
    }
});

// Get health statistics
router.get('/stats', async (req, res, next) => {
    try {
        // Get topic statistics
        const topicStatsQuery = `
            SELECT 
                COUNT(*) as total_topics,
                COUNT(DISTINCT category) as total_categories
            FROM health_topics
        `;
        
        // Get video-topic relationship statistics
        const videoTopicStatsQuery = `
            SELECT 
                COUNT(*) as total_video_topics,
                AVG(relevance_score) as avg_relevance_score
            FROM video_topics
        `;
        
        // Get most popular topics
        const popularTopicsQuery = `
            SELECT ht.name, ht.category, COUNT(vt.video_id) as video_count
            FROM health_topics ht
            LEFT JOIN video_topics vt ON ht.id = vt.topic_id
            GROUP BY ht.id, ht.name, ht.category
            ORDER BY video_count DESC
            LIMIT 10
        `;
        
        const [topicStats, videoTopicStats, popularTopics] = await Promise.all([
            db.query(topicStatsQuery),
            db.query(videoTopicStatsQuery),
            db.query(popularTopicsQuery)
        ]);
        
        res.json({
            topics: {
                total: parseInt(topicStats.rows[0].total_topics),
                categories: parseInt(topicStats.rows[0].total_categories)
            },
            videoTopics: {
                total: parseInt(videoTopicStats.rows[0].total_video_topics),
                averageRelevance: parseFloat(videoTopicStats.rows[0].avg_relevance_score || 0)
            },
            popularTopics: popularTopics.rows,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        next(error);
    }
});

export default router;
