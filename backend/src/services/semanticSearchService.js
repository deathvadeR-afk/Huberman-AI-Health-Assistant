import { createLogger } from '../utils/logger.js';
import { DatabaseService } from './databaseService.js';
import { OpenRouterService } from './openRouterService.js';

const logger = createLogger('SemanticSearchService');

class SemanticSearchService {
  constructor() {
    this.db = new DatabaseService();
    this.openRouter = new OpenRouterService();
  }

  async searchTranscripts(query, options = {}) {
    const {
      limit = 10,
      minRelevanceScore = 0.1,
      includeTimestamps = true
    } = options;

    logger.info(`Searching transcripts for: "${query}"`);

    try {
      // Step 1: Get candidate videos from database
      const candidateVideos = await this.db.searchVideos(query, limit * 2);
      
      if (candidateVideos.length === 0) {
        logger.warn('No candidate videos found');
        return [];
      }

      // Step 2: Use AI for semantic ranking
      const semanticResults = await this.openRouter.semanticSearch(query, candidateVideos);
      
      // Step 3: Combine database and AI results
      const combinedResults = candidateVideos.map((video, index) => {
        const aiResult = semanticResults.find(r => r.index === index);
        const dbScore = video.relevance_score || 0;
        const aiScore = aiResult ? aiResult.score : 0;
        
        // Weighted combination of scores
        const finalScore = (dbScore * 0.4) + (aiScore * 0.6);
        
        return {
          id: video.id,
          youtube_id: video.youtube_id,
          title: video.title,
          description: video.description,
          duration: this.formatDuration(video.duration_seconds),
          views: this.formatViews(video.view_count),
          relevanceScore: finalScore,
          searchSnippet: aiResult ? aiResult.reason : `Relevant content for "${query}"`,
          publishedAt: video.published_at,
          thumbnailUrl: video.thumbnail_url
        };
      });

      // Step 4: Filter by minimum relevance and sort
      const filteredResults = combinedResults
        .filter(result => result.relevanceScore >= minRelevanceScore)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

      // Step 5: Add timestamps if requested
      if (includeTimestamps) {
        for (const result of filteredResults) {
          result.timestamps = await this.extractRelevantTimestamps(result.id, query);
        }
      }

      logger.info(`Found ${filteredResults.length} relevant results`);
      return filteredResults;

    } catch (error) {
      logger.error('Semantic search failed:', error);
      return [];
    }
  }

  async findSimilarContent(videoId, options = {}) {
    const { limit = 5 } = options;

    logger.info(`Finding similar content to video: ${videoId}`);

    try {
      // Get the source video
      const sourceVideo = await this.db.getVideoById(videoId);
      if (!sourceVideo) {
        logger.warn(`Video not found: ${videoId}`);
        return [];
      }

      // Use the video's title and description as search query
      const searchQuery = `${sourceVideo.title} ${sourceVideo.description}`.substring(0, 200);
      
      // Search for similar content
      const similarResults = await this.searchTranscripts(searchQuery, {
        limit: limit + 1, // +1 to exclude the source video
        minRelevanceScore: 0.2
      });

      // Remove the source video from results
      const filteredResults = similarResults.filter(result => result.id !== videoId);

      return filteredResults.slice(0, limit);

    } catch (error) {
      logger.error('Failed to find similar content:', error);
      return [];
    }
  }

  async extractRelevantTimestamps(videoId, query) {
    try {
      const segments = await this.db.getVideoSegments(videoId);
      
      if (segments.length === 0) {
        return [];
      }

      // Enhanced keyword matching with scoring
      const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 2);
      
      const scoredSegments = segments.map(segment => {
        const segmentText = segment.text.toLowerCase();
        let score = 0;
        
        // Count exact word matches
        queryWords.forEach(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'gi');
          const matches = segmentText.match(regex);
          if (matches) {
            score += matches.length;
          }
        });
        
        // Bonus for phrase matches
        if (segmentText.includes(query.toLowerCase())) {
          score += 5;
        }
        
        return { ...segment, score };
      });

      // Sort by relevance score and take top segments
      const relevantSegments = scoredSegments
        .filter(segment => segment.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      // If no matches, return segments with most content
      const finalSegments = relevantSegments.length > 0 
        ? relevantSegments 
        : segments
            .sort((a, b) => b.text.length - a.text.length)
            .slice(0, 3);

      return finalSegments.map(segment => ({
        time: segment.startTime,
        label: `${this.formatTime(segment.startTime)} - Relevant Content`,
        description: segment.text.substring(0, 120) + (segment.text.length > 120 ? '...' : '')
      }));

    } catch (error) {
      logger.error('Failed to extract timestamps:', error);
      return [];
    }
  }

  async getTopicSuggestions(query) {
    logger.info(`Getting topic suggestions for: "${query}"`);

    try {
      // Get health topics from database
      const topics = await this.db.getHealthTopics();
      
      // Simple relevance scoring based on keyword matching
      const queryWords = query.toLowerCase().split(' ');
      
      const scoredTopics = topics.map(topic => {
        const topicText = `${topic.name} ${topic.description}`.toLowerCase();
        const matches = queryWords.filter(word => topicText.includes(word));
        
        return {
          ...topic,
          relevanceScore: matches.length / queryWords.length
        };
      });

      // Return top suggestions
      return scoredTopics
        .filter(topic => topic.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 5);

    } catch (error) {
      logger.error('Failed to get topic suggestions:', error);
      return [];
    }
  }

  // Helper methods
  formatDuration(seconds) {
    if (!seconds) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  formatViews(viewCount) {
    if (!viewCount) return '0 views';
    
    if (viewCount >= 1000000) {
      return `${(viewCount / 1000000).toFixed(1)}M views`;
    } else if (viewCount >= 1000) {
      return `${(viewCount / 1000).toFixed(1)}K views`;
    }
    return `${viewCount} views`;
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

export { SemanticSearchService };