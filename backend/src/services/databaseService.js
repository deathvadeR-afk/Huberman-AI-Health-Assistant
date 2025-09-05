import pg from 'pg';
import { createLogger } from '../utils/logger.js';

const { Pool } = pg;
const logger = createLogger('DatabaseService');

class DatabaseService {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Database connection failed:', error);
      // Fall back to in-memory mode
      this.isConnected = false;
      logger.warn('Falling back to in-memory mode');
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      logger.info('Database connection closed');
    }
  }

  async storeVideo(videoData) {
    if (!this.isConnected) {
      logger.warn('Database not connected, skipping video storage');
      return videoData;
    }

    try {
      const query = `
        INSERT INTO videos (youtube_id, title, description, duration_seconds, view_count, like_count, published_at, thumbnail_url, raw_data)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (youtube_id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          view_count = EXCLUDED.view_count,
          like_count = EXCLUDED.like_count,
          updated_at = NOW()
        RETURNING *
      `;

      const values = [
        videoData.id || videoData.videoId,
        videoData.title,
        videoData.description,
        videoData.duration || 0,
        videoData.viewCount || 0,
        videoData.likeCount || 0,
        videoData.publishedAt || new Date(),
        videoData.thumbnailUrl || videoData.thumbnail,
        JSON.stringify(videoData)
      ];

      const result = await this.pool.query(query, values);
      logger.info(`Stored video: ${videoData.title}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to store video:', error);
      return videoData;
    }
  }

  async storeTranscript(transcriptData) {
    if (!this.isConnected) {
      logger.warn('Database not connected, skipping transcript storage');
      return [];
    }

    try {
      // Find the video by URL or ID
      const videoQuery = 'SELECT id FROM videos WHERE youtube_id = $1 OR raw_data->\'url\' = $2';
      const videoResult = await this.pool.query(videoQuery, [
        transcriptData.videoId,
        transcriptData.videoUrl
      ]);

      if (videoResult.rows.length === 0) {
        logger.warn(`Video not found for transcript: ${transcriptData.videoUrl}`);
        return [];
      }

      const videoId = videoResult.rows[0].id;
      
      // First, store the main transcript
      const transcriptQuery = `
        INSERT INTO transcripts (id, video_id, full_text, language, confidence_score, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (video_id) DO UPDATE SET
          full_text = EXCLUDED.full_text,
          updated_at = NOW()
        RETURNING id
      `;
      
      const fullText = transcriptData.transcript?.map(seg => seg.text).join(' ') || '';
      const transcriptResult = await this.pool.query(transcriptQuery, [
        videoId,
        fullText,
        'en',
        0.95
      ]);
      
      const transcriptId = transcriptResult.rows[0].id;
      const segments = transcriptData.transcript || transcriptData.data || [];

      // Delete existing segments
      await this.pool.query('DELETE FROM transcript_segments WHERE video_id = $1', [videoId]);

      const storedSegments = [];
      for (const segment of segments) {
        const segmentQuery = `
          INSERT INTO transcript_segments (
            id, transcript_id, video_id, start_time, end_time, text, 
            speaker, confidence_score, created_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW()
          )
          RETURNING *
        `;

        const startTime = parseFloat(segment.start || 0);
        const duration = parseFloat(segment.dur || segment.duration || 0);
        const endTime = startTime + duration;

        const segmentValues = [
          transcriptId,
          videoId,
          startTime,
          endTime,
          segment.text || '',
          'Host',
          0.95
        ];

        const segmentResult = await this.pool.query(segmentQuery, segmentValues);
        storedSegments.push(segmentResult.rows[0]);
      }

      logger.info(`Stored ${storedSegments.length} transcript segments for video ${videoId}`);
      return storedSegments;
    } catch (error) {
      logger.error('Failed to store transcript:', error);
      return [];
    }
  }

  async getVideoStats() {
    if (!this.isConnected) {
      return {
        totalVideos: 7, // Mock data count
        totalHours: 15.5,
        totalViews: 12500000,
        latestVideo: new Date().toISOString(),
        oldestVideo: '2021-01-01T00:00:00Z'
      };
    }

    try {
      const query = `
        SELECT 
          COUNT(*) as total_videos,
          SUM(duration_seconds) / 3600.0 as total_hours,
          SUM(view_count) as total_views,
          MAX(published_at) as latest_video,
          MIN(published_at) as oldest_video
        FROM videos
      `;

      const result = await this.pool.query(query);
      const stats = result.rows[0];

      return {
        totalVideos: parseInt(stats.total_videos),
        totalHours: parseFloat(stats.total_hours) || 0,
        totalViews: parseInt(stats.total_views) || 0,
        latestVideo: stats.latest_video,
        oldestVideo: stats.oldest_video
      };
    } catch (error) {
      logger.error('Failed to get video stats:', error);
      return {
        totalVideos: 0,
        totalHours: 0,
        totalViews: 0,
        latestVideo: null,
        oldestVideo: null
      };
    }
  }

  async getHealthTopics(category = null) {
    if (!this.isConnected) {
      // Return mock health topics
      return [
        { name: 'Sleep', category: 'Neuroscience', description: 'Sleep optimization and circadian rhythms' },
        { name: 'Exercise', category: 'Fitness', description: 'Physical exercise and performance' },
        { name: 'Nutrition', category: 'Health', description: 'Diet and nutritional science' },
        { name: 'Stress Management', category: 'Mental Health', description: 'Stress reduction techniques' }
      ];
    }

    try {
      let query = 'SELECT * FROM health_topics';
      const params = [];

      if (category) {
        query += ' WHERE category = $1';
        params.push(category);
      }

      query += ' ORDER BY name';

      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get health topics:', error);
      return [];
    }
  }

  async getVideoSegments(videoId) {
    if (!this.isConnected) {
      // Return mock segments
      return [
        {
          startTime: 120,
          endTime: 180,
          text: 'This is a sample transcript segment about health topics.',
          label: 'Health Discussion'
        }
      ];
    }

    try {
      const query = `
        SELECT start_time, end_time, text, id
        FROM transcript_segments
        WHERE video_id = $1
        ORDER BY start_time
      `;

      const result = await this.pool.query(query, [videoId]);
      return result.rows.map((row, index) => ({
        startTime: parseFloat(row.start_time),
        endTime: parseFloat(row.end_time),
        text: row.text,
        label: `Segment ${index + 1}`
      }));
    } catch (error) {
      logger.error('Failed to get video segments:', error);
      return [];
    }
  }

  async searchVideos(query, limit = 10) {
    if (!this.isConnected) {
      // Return mock search results
      return [
        {
          id: 'video_123',
          youtube_id: 'SwQhKFMxmDY',
          title: 'Master Your Sleep & Be More Alert When Awake',
          description: 'In this episode, I discuss the biology of sleep...',
          relevanceScore: 0.95
        }
      ];
    }

    try {
      const searchQuery = `
        SELECT *, 
               ts_rank(to_tsvector('english', title || ' ' || description), plainto_tsquery('english', $1)) as relevance_score
        FROM videos
        WHERE to_tsvector('english', title || ' ' || description) @@ plainto_tsquery('english', $1)
        ORDER BY relevance_score DESC
        LIMIT $2
      `;

      const result = await this.pool.query(searchQuery, [query, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to search videos:', error);
      return [];
    }
  }

  async getVideoById(videoId) {
    if (!this.isConnected) {
      return null;
    }

    try {
      const query = 'SELECT * FROM videos WHERE id = $1 OR youtube_id = $1';
      const result = await this.pool.query(query, [videoId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get video by ID:', error);
      return null;
    }
  }
}

export { DatabaseService };