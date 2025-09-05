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
            connectionTimeoutMillis: 10000, // Increased timeout
            acquireTimeoutMillis: 10000,
        });

        // Don't test connection on initialization to avoid blocking
        // this.testConnection();
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
            logger.debug('Executed query', { text, duration, rows: res.rowCount });
            return res;
        } catch (error) {
            logger.error('Database query error:', { text, error: error.message });
            throw error;
        }
    }

    // Video-related methods
    async findVideoByYouTubeId(youtubeId) {
        const query = 'SELECT * FROM videos WHERE youtube_id = $1';
        const result = await this.query(query, [youtubeId]);
        return result.rows[0] || null;
    }

    async createVideo(videoData) {
        const query = `
            INSERT INTO videos (
                youtube_id, title, description, published_at, duration_seconds,
                view_count, like_count, thumbnail_url, url, channel_id, tags
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;
        
        const values = [
            videoData.youtube_id,
            videoData.title,
            videoData.description,
            videoData.published_at,
            videoData.duration_seconds,
            videoData.view_count,
            videoData.like_count,
            videoData.thumbnail_url,
            videoData.url,
            videoData.channel_id,
            videoData.tags
        ];

        const result = await this.query(query, values);
        logger.info(`Created video: ${videoData.title} (${videoData.youtube_id})`);
        return result.rows[0];
    }

    async updateVideo(videoId, videoData) {
        const query = `
            UPDATE videos SET
                title = $2,
                description = $3,
                published_at = $4,
                duration_seconds = $5,
                view_count = $6,
                like_count = $7,
                thumbnail_url = $8,
                url = $9,
                channel_id = $10,
                tags = $11,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `;
        
        const values = [
            videoId,
            videoData.title,
            videoData.description,
            videoData.published_at,
            videoData.duration_seconds,
            videoData.view_count,
            videoData.like_count,
            videoData.thumbnail_url,
            videoData.url,
            videoData.channel_id,
            videoData.tags
        ];

        const result = await this.query(query, values);
        logger.info(`Updated video: ${videoData.title} (${videoData.youtube_id})`);
        return result.rows[0];
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

    async getVideosByDateRange(startDate, endDate) {
        const query = `
            SELECT * FROM videos 
            WHERE published_at >= $1 AND published_at <= $2
            ORDER BY published_at DESC
        `;
        
        const result = await this.query(query, [startDate, endDate]);
        return result.rows;
    }

    async searchVideosByTitle(searchTerm) {
        const query = `
            SELECT * FROM videos 
            WHERE title ILIKE $1 OR description ILIKE $1
            ORDER BY published_at DESC
        `;
        
        const result = await this.query(query, [`%${searchTerm}%`]);
        return result.rows;
    }

    // Transcript-related methods (for future use)
    async createTranscript(transcriptData) {
        const query = `
            INSERT INTO transcripts (video_id, full_text, language, confidence_score)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        
        const values = [
            transcriptData.video_id,
            transcriptData.full_text,
            transcriptData.language || 'en',
            transcriptData.confidence_score
        ];

        const result = await this.query(query, values);
        return result.rows[0];
    }

    async findTranscriptByVideoId(videoId) {
        const query = 'SELECT * FROM transcripts WHERE video_id = $1';
        const result = await this.query(query, [videoId]);
        return result.rows[0] || null;
    }

    // Health topics methods
    async getAllHealthTopics() {
        const query = 'SELECT * FROM health_topics ORDER BY name';
        const result = await this.query(query);
        return result.rows;
    }

    async findHealthTopicByName(name) {
        const query = 'SELECT * FROM health_topics WHERE name ILIKE $1';
        const result = await this.query(query, [name]);
        return result.rows[0] || null;
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
