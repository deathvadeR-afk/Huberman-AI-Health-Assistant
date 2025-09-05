import pg from 'pg';
import dotenv from 'dotenv';
import { createLogger } from './logger.js';

dotenv.config();

const { Pool } = pg;
const logger = createLogger('DatabaseManager');

export class DatabaseManager {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
            acquireTimeoutMillis: 10000,
        });
    }

    async testConnection() {
        try {
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            logger.info('Database connection established successfully');
        } catch (error) {
            logger.error('Failed to connect to database:', error);
            throw error;
        }
    }

    async query(text, params) {
        const start = Date.now();
        try {
            const res = await this.pool.query(text, params);
            const duration = Date.now() - start;
            logger.debug('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
            return res;
        } catch (error) {
            logger.error('Database query error:', { text: text.substring(0, 100), error: error.message });
            throw error;
        }
    }

    // Video-related methods
    async findVideoByYouTubeId(youtubeId) {
        const query = 'SELECT * FROM videos WHERE youtube_id = $1';
        const result = await this.query(query, [youtubeId]);
        return result.rows[0] || null;
    }

    async getAllVideos(limit = null, offset = 0) {
        let query = 'SELECT * FROM videos ORDER BY published_at DESC';
        const params = [];
        
        if (limit) {
            query += ' LIMIT $1 OFFSET $2';
            params.push(limit, offset);
        }
        
        const result = await this.query(query, params);
        return result.rows;
    }

    async searchVideosByTitle(searchTerm, limit = 10) {
        const query = `
            SELECT *, 
                   ts_rank(to_tsvector('english', title || ' ' || description), plainto_tsquery('english', $1)) as rank
            FROM videos 
            WHERE to_tsvector('english', title || ' ' || description) @@ plainto_tsquery('english', $1)
            ORDER BY rank DESC, published_at DESC
            LIMIT $2
        `;
        
        const result = await this.query(query, [searchTerm, limit]);
        return result.rows;
    }

    async getVideosByHealthTopic(topicName, limit = 10) {
        const query = `
            SELECT v.*, vt.relevance_score, ht.name as topic_name
            FROM videos v
            JOIN video_topics vt ON v.id = vt.video_id
            JOIN health_topics ht ON vt.topic_id = ht.id
            WHERE ht.name ILIKE $1
            ORDER BY vt.relevance_score DESC, v.published_at DESC
            LIMIT $2
        `;
        
        const result = await this.query(query, [`%${topicName}%`, limit]);
        return result.rows;
    }

    async getVideoStats() {
        const query = `
            SELECT 
                COUNT(*) as total_videos,
                MAX(published_at) as latest_video_date,
                MIN(published_at) as oldest_video_date,
                AVG(duration_seconds) as average_duration,
                SUM(duration_seconds) as total_duration,
                AVG(view_count) as average_views,
                SUM(view_count) as total_views
            FROM videos
        `;
        
        const result = await this.query(query);
        return result.rows[0];
    }

    async getAllHealthTopics() {
        const query = 'SELECT * FROM health_topics ORDER BY name';
        const result = await this.query(query);
        return result.rows;
    }

    async findHealthTopicByKeywords(keywords) {
        const query = `
            SELECT * FROM health_topics 
            WHERE keywords && $1 OR name ILIKE ANY($2)
            ORDER BY name
        `;
        
        const keywordPatterns = keywords.map(k => `%${k}%`);
        const result = await this.query(query, [keywords, keywordPatterns]);
        return result.rows;
    }

    // User query tracking
    async recordUserQuery(queryData) {
        const query = `
            INSERT INTO user_queries (query_text, user_ip, user_agent, response_time_ms, results_count)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `;
        
        const values = [
            queryData.query_text,
            queryData.user_ip,
            queryData.user_agent,
            queryData.response_time_ms,
            queryData.results_count
        ];

        const result = await this.query(query, values);
        return result.rows[0].id;
    }

    async recordQueryResults(queryId, results) {
        const query = `
            INSERT INTO query_results (query_id, video_id, similarity_score, rank_position)
            VALUES ($1, $2, $3, $4)
        `;

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            await this.query(query, [
                queryId,
                result.video_id,
                result.similarity_score,
                i + 1
            ]);
        }
    }

    // Cleanup and maintenance
    async close() {
        await this.pool.end();
        logger.info('Database connection pool closed');
    }

    async vacuum() {
        await this.query('VACUUM ANALYZE');
        logger.info('Database vacuum completed');
    }
}

export default DatabaseManager;
