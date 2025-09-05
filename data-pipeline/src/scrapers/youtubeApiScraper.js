import axios from 'axios';
import dotenv from 'dotenv';
import { createLogger } from '../utils/logger.js';
import { DatabaseManager } from '../utils/database.js';

dotenv.config();

const logger = createLogger('YouTubeApiScraper');

class YouTubeApiScraper {
    constructor() {
        this.apiKey = process.env.YOUTUBE_API_KEY;
        this.baseUrl = 'https://www.googleapis.com/youtube/v3';
        this.channelId = process.env.HUBERMAN_CHANNEL_ID || 'UC2D2CMWXMOVWx7giW1n3LIg';
        this.db = new DatabaseManager();
        
        if (!this.apiKey) {
            throw new Error('YOUTUBE_API_KEY not found in environment variables');
        }
    }

    async scrapeHubermanVideos(maxResults = 1000) {
        try {
            logger.info('Starting Huberman Lab video scraping with YouTube Data API...');
            
            // Get all videos from the channel
            const videos = await this.getAllChannelVideos(maxResults);
            logger.info(`Found ${videos.length} videos from Huberman Lab channel`);

            // Process and store the videos
            const processedVideos = await this.processVideos(videos);
            
            logger.info(`Successfully processed and stored ${processedVideos.length} videos`);
            return processedVideos;

        } catch (error) {
            logger.error('Error scraping Huberman videos:', error);
            throw error;
        }
    }

    async getAllChannelVideos(maxResults = 1000) {
        const allVideos = [];
        let nextPageToken = null;
        const maxResultsPerPage = 50; // YouTube API limit

        try {
            do {
                logger.info(`Fetching videos page... (current total: ${allVideos.length})`);
                
                const response = await this.getChannelVideosPage(maxResultsPerPage, nextPageToken);
                
                if (response.items && response.items.length > 0) {
                    // Get detailed video information
                    const videoIds = response.items.map(item => item.id.videoId).filter(Boolean);
                    const detailedVideos = await this.getVideoDetails(videoIds);
                    
                    allVideos.push(...detailedVideos);
                    nextPageToken = response.nextPageToken;
                    
                    logger.info(`Fetched ${detailedVideos.length} videos, total: ${allVideos.length}`);
                } else {
                    break;
                }

                // Respect rate limits
                await this.delay(100);

            } while (nextPageToken && allVideos.length < maxResults);

            return allVideos.slice(0, maxResults);

        } catch (error) {
            logger.error('Error fetching channel videos:', error);
            throw error;
        }
    }

    async getChannelVideosPage(maxResults = 50, pageToken = null) {
        const params = {
            part: 'id,snippet',
            channelId: this.channelId,
            type: 'video',
            order: 'date',
            maxResults: maxResults,
            key: this.apiKey
        };

        if (pageToken) {
            params.pageToken = pageToken;
        }

        const response = await axios.get(`${this.baseUrl}/search`, { params });
        return response.data;
    }

    async getVideoDetails(videoIds) {
        if (!videoIds || videoIds.length === 0) return [];

        try {
            const params = {
                part: 'snippet,contentDetails,statistics',
                id: videoIds.join(','),
                key: this.apiKey
            };

            const response = await axios.get(`${this.baseUrl}/videos`, { params });
            return response.data.items || [];

        } catch (error) {
            logger.error('Error fetching video details:', error);
            return [];
        }
    }

    async processVideos(rawVideos) {
        const processedVideos = [];

        for (const video of rawVideos) {
            try {
                const processedVideo = await this.processSingleVideo(video);
                if (processedVideo) {
                    processedVideos.push(processedVideo);
                }
            } catch (error) {
                logger.error(`Error processing video ${video.id}:`, error);
                // Continue with other videos
            }
        }

        return processedVideos;
    }

    async processSingleVideo(rawVideo) {
        try {
            // Extract and clean video data
            const videoData = {
                youtube_id: rawVideo.id,
                title: this.cleanText(rawVideo.snippet.title),
                description: this.cleanText(rawVideo.snippet.description),
                published_at: new Date(rawVideo.snippet.publishedAt),
                duration_seconds: this.parseDuration(rawVideo.contentDetails?.duration),
                view_count: parseInt(rawVideo.statistics?.viewCount) || 0,
                like_count: parseInt(rawVideo.statistics?.likeCount) || 0,
                thumbnail_url: this.getBestThumbnail(rawVideo.snippet.thumbnails),
                url: `https://www.youtube.com/watch?v=${rawVideo.id}`,
                channel_id: rawVideo.snippet.channelId,
                tags: rawVideo.snippet.tags || []
            };

            // Check if video already exists
            const existingVideo = await this.db.findVideoByYouTubeId(videoData.youtube_id);
            
            if (existingVideo) {
                logger.info(`Video ${videoData.youtube_id} already exists, updating...`);
                return await this.db.updateVideo(existingVideo.id, videoData);
            } else {
                logger.info(`Storing new video: ${videoData.title}`);
                return await this.db.createVideo(videoData);
            }

        } catch (error) {
            logger.error('Error processing single video:', error);
            return null;
        }
    }

    cleanText(text) {
        if (!text) return '';
        
        return text
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/[\r\n]+/g, ' ') // Replace newlines with spaces
            .trim();
    }

    parseDuration(duration) {
        if (!duration) return 0;

        // Parse ISO 8601 duration (PT1H2M3S)
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (match) {
            const hours = parseInt(match[1]) || 0;
            const minutes = parseInt(match[2]) || 0;
            const seconds = parseInt(match[3]) || 0;
            return hours * 3600 + minutes * 60 + seconds;
        }

        return 0;
    }

    getBestThumbnail(thumbnails) {
        if (!thumbnails) return '';
        
        // Prefer higher quality thumbnails
        const qualities = ['maxres', 'standard', 'high', 'medium', 'default'];
        
        for (const quality of qualities) {
            if (thumbnails[quality]) {
                return thumbnails[quality].url;
            }
        }
        
        return '';
    }

    async getScrapingStats() {
        try {
            const stats = await this.db.getVideoStats();
            return {
                totalVideos: stats.total_videos,
                latestVideo: stats.latest_video_date,
                oldestVideo: stats.oldest_video_date,
                averageDuration: stats.average_duration,
                totalDuration: stats.total_duration,
                averageViews: stats.average_views,
                totalViews: stats.total_views
            };
        } catch (error) {
            logger.error('Error getting scraping stats:', error);
            return null;
        }
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async checkQuotaUsage() {
        // Estimate quota usage (rough calculation)
        // Search: 100 units per request
        // Videos: 1 unit per video
        logger.info('💡 YouTube API Quota Usage Estimate:');
        logger.info('   Search requests: ~100 units per 50 videos');
        logger.info('   Video details: ~1 unit per video');
        logger.info('   Daily quota limit: 10,000 units (free tier)');
    }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const scraper = new YouTubeApiScraper();
    
    scraper.checkQuotaUsage();
    
    scraper.scrapeHubermanVideos(100) // Start with 100 videos for testing
        .then(videos => {
            console.log(`✅ Successfully scraped ${videos.length} videos`);
            return scraper.getScrapingStats();
        })
        .then(stats => {
            if (stats) {
                console.log('📊 Scraping Statistics:');
                console.log(`   Total Videos: ${stats.totalVideos}`);
                console.log(`   Latest Video: ${stats.latestVideo}`);
                console.log(`   Oldest Video: ${stats.oldestVideo}`);
                console.log(`   Average Duration: ${Math.round(stats.averageDuration / 60)} minutes`);
                console.log(`   Total Content: ${Math.round(stats.totalDuration / 3600)} hours`);
                console.log(`   Average Views: ${stats.averageViews?.toLocaleString()}`);
                console.log(`   Total Views: ${stats.totalViews?.toLocaleString()}`);
            }
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Scraping failed:', error.message);
            process.exit(1);
        });
}

export { YouTubeApiScraper };
