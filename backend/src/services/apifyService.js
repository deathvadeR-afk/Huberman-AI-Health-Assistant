import { ApifyClient } from 'apify-client';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ApifyService');

/**
 * Service for interacting with Apify actors to scrape YouTube content
 * Handles video metadata collection and transcript extraction from Huberman Lab channel
 *
 * @class ApifyService
 * @description Provides methods to scrape YouTube videos and transcripts using Apify actors
 */
class ApifyService {
    /**
     * Initialize the Apify service with API client and actor configurations
     *
     * @constructor
     * @throws {Error} If APIFY_API_TOKEN environment variable is not set
     */
    constructor() {
        this.client = new ApifyClient({
            token: process.env.APIFY_API_TOKEN
        });

        // Actor IDs from the project brief
        /** @type {string} Actor ID for YouTube channel video scraping */
        this.CHANNEL_SCRAPER_ID = '1p1aa7gcSydPkAE0d';
        /** @type {string} Actor ID for YouTube video transcript extraction */
        this.TRANSCRIPT_SCRAPER_ID = 'faVsWy9VTSNVIhWpR';
    }

    /**
     * Scrape all videos from Huberman Lab channel using Apify Channel Scraper
     *
     * @async
     * @method scrapeHubermanVideos
     * @returns {Promise<Array<Object>>} Array of video objects with metadata
     * @throws {Error} If scraping fails or API token is invalid
     *
     * @example
     * const apifyService = new ApifyService();
     * const videos = await apifyService.scrapeHubermanVideos();
     * console.log(`Scraped ${videos.length} videos`);
     */
    async scrapeHubermanVideos() {
        try {
            logger.info('Starting Huberman Lab channel scraping...');
            
            const input = {
                handles: ['@hubermanlab'], // Use handles instead of channelUrl
                maxVideos: 500, // Get all videos
                includeVideoDetails: true,
                includeComments: false,
                includeSubtitles: false
            };

            // Start the actor
            const run = await this.client.actor(this.CHANNEL_SCRAPER_ID).call(input);
            
            logger.info(`Channel scraping completed. Run ID: ${run.id}`);
            
            // Get the results
            const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
            
            logger.info(`Scraped ${items.length} videos from Huberman Lab`);
            
            return items.map(video => ({
                youtube_id: video.id,
                title: video.title,
                description: video.description,
                url: video.url,
                thumbnail_url: video.thumbnailUrl,
                duration_seconds: this.parseDuration(video.duration),
                view_count: video.viewCount,
                like_count: video.likeCount,
                published_at: new Date(video.publishedAt),
                channel_name: video.channelName,
                raw_data: video
            }));
            
        } catch (error) {
            logger.error('Error scraping Huberman videos:', error);
            throw error;
        }
    }

    /**
     * Scrape transcripts for specific YouTube videos using Apify Transcript Scraper
     *
     * @async
     * @method scrapeVideoTranscripts
     * @param {Array<string>} videoIds - Array of YouTube video IDs to scrape transcripts for
     * @returns {Promise<Array<Object>>} Array of transcript objects with timestamped segments
     * @throws {Error} If transcript scraping fails or video IDs are invalid
     *
     * @example
     * const videoIds = ['SwQhKFMxmDY', 'nm1TxQj9IsQ'];
     * const transcripts = await apifyService.scrapeVideoTranscripts(videoIds);
     * console.log(`Scraped ${transcripts.length} transcripts`);
     */
    async scrapeVideoTranscripts(videoIds) {
        try {
            logger.info(`Starting transcript scraping for ${videoIds.length} videos...`);
            
            const results = [];
            
            // Process videos in batches to avoid rate limits
            const batchSize = 5;
            for (let i = 0; i < videoIds.length; i += batchSize) {
                const batch = videoIds.slice(i, i + batchSize);
                
                const batchPromises = batch.map(async (videoId) => {
                    try {
                        const input = {
                            videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
                            includeTimestamps: true,
                            language: 'en'
                        };

                        const run = await this.client.actor(this.TRANSCRIPT_SCRAPER_ID).call(input);
                        const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
                        
                        if (items.length > 0) {
                            const item = items[0];

                            // Handle the correct data structure from Apify
                            const segments = item.data || [];
                            const fullText = segments
                                .filter(seg => seg.text) // Only segments with text
                                .map(seg => seg.text)
                                .join(' ');

                            return {
                                video_id: videoId,
                                transcript: fullText,
                                segments: segments.filter(seg => seg.text).map(seg => ({
                                    start_time: parseFloat(seg.start || 0),
                                    end_time: parseFloat(seg.start || 0) + parseFloat(seg.dur || 0),
                                    text: seg.text,
                                    duration: parseFloat(seg.dur || 0)
                                })),
                                language: 'en',
                                segmentCount: segments.filter(seg => seg.text).length,
                                totalDuration: Math.max(...segments.map(seg => parseFloat(seg.start || 0) + parseFloat(seg.dur || 0)))
                            };
                        }
                        
                        return null;
                    } catch (error) {
                        logger.error(`Error scraping transcript for video ${videoId}:`, error);
                        return null;
                    }
                });

                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults.filter(result => result !== null));
                
                // Add delay between batches
                if (i + batchSize < videoIds.length) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            
            logger.info(`Successfully scraped ${results.length} transcripts`);
            return results;
            
        } catch (error) {
            logger.error('Error scraping transcripts:', error);
            throw error;
        }
    }

    /**
     * Parse YouTube duration format (PT1H2M3S) to seconds
     */
    parseDuration(duration) {
        if (!duration) return 0;
        
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;
        
        const hours = parseInt(match[1] || 0);
        const minutes = parseInt(match[2] || 0);
        const seconds = parseInt(match[3] || 0);
        
        return hours * 3600 + minutes * 60 + seconds;
    }

    /**
     * Process transcript segments for timestamp extraction
     */
    processTranscriptSegments(segments) {
        return segments.map(segment => ({
            start_time: segment.startTime,
            end_time: segment.endTime,
            text: segment.text,
            duration: segment.endTime - segment.startTime
        }));
    }

    /**
     * Extract key topics and timestamps from transcript
     */
    extractKeyTopics(transcript, segments) {
        // This would use AI to identify key topics and their timestamps
        // For now, return basic structure
        const topics = [];
        
        // Simple keyword-based topic extraction (would be enhanced with AI)
        const healthKeywords = [
            'sleep', 'exercise', 'nutrition', 'stress', 'dopamine', 'serotonin',
            'cortisol', 'testosterone', 'growth hormone', 'circadian', 'metabolism',
            'brain', 'neuroscience', 'protocol', 'supplement', 'diet', 'workout'
        ];
        
        segments.forEach(segment => {
            const text = segment.text.toLowerCase();
            healthKeywords.forEach(keyword => {
                if (text.includes(keyword)) {
                    topics.push({
                        topic: keyword,
                        timestamp: segment.startTime,
                        context: segment.text,
                        relevance_score: this.calculateRelevanceScore(text, keyword)
                    });
                }
            });
        });
        
        return topics;
    }

    /**
     * Calculate relevance score for a topic mention
     */
    calculateRelevanceScore(text, keyword) {
        const keywordCount = (text.match(new RegExp(keyword, 'gi')) || []).length;
        const textLength = text.split(' ').length;
        return Math.min(keywordCount / textLength * 100, 1.0);
    }

    /**
     * Get actor run status
     */
    async getRunStatus(runId) {
        try {
            const run = await this.client.run(runId).get();
            return {
                status: run.status,
                startedAt: run.startedAt,
                finishedAt: run.finishedAt,
                stats: run.stats
            };
        } catch (error) {
            logger.error(`Error getting run status for ${runId}:`, error);
            throw error;
        }
    }
}

export { ApifyService };
