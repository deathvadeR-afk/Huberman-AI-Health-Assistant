import { TranscriptService } from '../services/transcriptService.js';
import { createLogger } from '../utils/logger.js';
import pool from '../config/database.js';

const logger = createLogger('TranscriptController');
const transcriptService = new TranscriptService();

class TranscriptController {
  /**
   * Get transcript for a specific video
   */
  async getVideoTranscript(req, res) {
    try {
      const { videoId } = req.params;
      
      if (!videoId) {
        return res.status(400).json({
          success: false,
          error: 'Video ID is required'
        });
      }

      // First try to get from database
      const dbQuery = `
        SELECT t.*, v.title, v.youtube_id 
        FROM transcripts t
        JOIN videos v ON t.video_id = v.id
        WHERE v.youtube_id = $1
      `;
      
      const result = await pool.query(dbQuery, [videoId]);
      
      if (result.rows.length > 0) {
        const transcript = result.rows[0];
        
        // Get segments if available
        const segmentsQuery = `
          SELECT * FROM transcript_segments 
          WHERE video_id = $1 
          ORDER BY start_time ASC
        `;
        
        const segmentsResult = await pool.query(segmentsQuery, [transcript.video_id]);
        
        return res.json({
          success: true,
          data: {
            video_id: transcript.youtube_id,
            title: transcript.title,
            full_text: transcript.full_text,
            language: transcript.language,
            confidence_score: transcript.confidence_score,
            segments: segmentsResult.rows,
            created_at: transcript.created_at,
            updated_at: transcript.updated_at
          }
        });
      }

      // If not in database, try to fetch from YouTube
      const liveTranscript = await transcriptService.getVideoTranscript(videoId);
      
      if (!liveTranscript) {
        return res.status(404).json({
          success: false,
          error: 'Transcript not found for this video'
        });
      }

      res.json({
        success: true,
        data: liveTranscript,
        source: 'live'
      });

    } catch (error) {
      logger.error('Error getting video transcript:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve transcript'
      });
    }
  }

  /**
   * Search transcripts for specific content
   */
  async searchTranscripts(req, res) {
    try {
      const { query, limit = 10, offset = 0 } = req.query;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }

      // Search in full transcript text
      const searchQuery = `
        SELECT 
          t.id,
          v.youtube_id,
          v.title,
          v.description,
          v.published_at,
          ts_headline('english', t.full_text, plainto_tsquery('english', $1)) as highlighted_text,
          ts_rank(to_tsvector('english', t.full_text), plainto_tsquery('english', $1)) as relevance
        FROM transcripts t
        JOIN videos v ON t.video_id = v.id
        WHERE to_tsvector('english', t.full_text) @@ plainto_tsquery('english', $1)
        ORDER BY relevance DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await pool.query(searchQuery, [query, limit, offset]);

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM transcripts t
        WHERE to_tsvector('english', t.full_text) @@ plainto_tsquery('english', $1)
      `;
      
      const countResult = await pool.query(countQuery, [query]);
      const total = parseInt(countResult.rows[0].total);

      res.json({
        success: true,
        data: {
          results: result.rows,
          pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: (parseInt(offset) + parseInt(limit)) < total
          }
        }
      });

    } catch (error) {
      logger.error('Error searching transcripts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search transcripts'
      });
    }
  }

  /**
   * Get transcript segments for a video with timestamps
   */
  async getVideoSegments(req, res) {
    try {
      const { videoId } = req.params;
      const { startTime, endTime, query } = req.query;

      if (!videoId) {
        return res.status(400).json({
          success: false,
          error: 'Video ID is required'
        });
      }

      let segmentsQuery = `
        SELECT ts.*, v.title, v.youtube_id
        FROM transcript_segments ts
        JOIN videos v ON ts.video_id = v.id
        WHERE v.youtube_id = $1
      `;
      
      const queryParams = [videoId];
      let paramCount = 1;

      // Add time range filter if provided
      if (startTime !== undefined) {
        paramCount++;
        segmentsQuery += ` AND ts.start_time >= $${paramCount}`;
        queryParams.push(parseFloat(startTime));
      }

      if (endTime !== undefined) {
        paramCount++;
        segmentsQuery += ` AND ts.end_time <= $${paramCount}`;
        queryParams.push(parseFloat(endTime));
      }

      // Add text search if provided
      if (query) {
        paramCount++;
        segmentsQuery += ` AND ts.text ILIKE $${paramCount}`;
        queryParams.push(`%${query}%`);
      }

      segmentsQuery += ` ORDER BY ts.start_time ASC`;

      const result = await pool.query(segmentsQuery, queryParams);

      res.json({
        success: true,
        data: {
          video_id: videoId,
          segments: result.rows,
          total_segments: result.rows.length
        }
      });

    } catch (error) {
      logger.error('Error getting video segments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve video segments'
      });
    }
  }

  /**
   * Get transcript statistics
   */
  async getTranscriptStats(req, res) {
    try {
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT t.id) as total_transcripts,
          COUNT(DISTINCT ts.id) as total_segments,
          AVG(LENGTH(t.full_text)) as avg_transcript_length,
          SUM(LENGTH(t.full_text)) as total_characters,
          COUNT(DISTINCT v.id) as videos_with_transcripts
        FROM transcripts t
        LEFT JOIN transcript_segments ts ON t.video_id = ts.video_id
        LEFT JOIN videos v ON t.video_id = v.id
      `;

      const result = await pool.query(statsQuery);
      const stats = result.rows[0];

      // Calculate estimated words (rough estimate: 5 characters per word)
      const estimatedWords = Math.round(parseInt(stats.total_characters || 0) / 5);

      res.json({
        success: true,
        data: {
          total_transcripts: parseInt(stats.total_transcripts || 0),
          total_segments: parseInt(stats.total_segments || 0),
          videos_with_transcripts: parseInt(stats.videos_with_transcripts || 0),
          avg_transcript_length: Math.round(parseFloat(stats.avg_transcript_length || 0)),
          total_characters: parseInt(stats.total_characters || 0),
          estimated_words: estimatedWords,
          cache_stats: transcriptService.getCacheStats()
        }
      });

    } catch (error) {
      logger.error('Error getting transcript stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve transcript statistics'
      });
    }
  }
}

export default new TranscriptController();