import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';
import { createLogger } from '../utils/logger.js';
import { DatabaseManager } from '../utils/database.js';

dotenv.config();

const logger = createLogger('VideoScraper');

class VideoScraper {
    constructor() {
        this.apifyClient = new ApifyClient({
            token: process.env.APIFY_API_TOKEN,
        });
        this.db = new DatabaseManager();
        this.actorId = process.env.APIFY_CHANNEL_SCRAPER_ID || '1p1aa7gcSydPkAE0d';
    }

    async scrapeHubermanVideos() {
        try {
            logger.info('Starting Huberman Lab video scraping...');

            // Configure the scraper input
            const input = {
                startUrls: [process.env.HUBERMAN_CHANNEL_URL || 'https://www.youtube.com/@hubermanlab'],
                maxResults: 1000, // Adjust based on needs
                includeVideoDetails: true,
                includeComments: false,
                includeSubtitles: false, // We'll get transcripts separately
                sortBy: 'newest'
            };

            logger.info('Running Apify actor with input:', input);

            // Run the actor
            const run = await this.apifyClient.actor(this.actorId).call(input);

            logger.info(`Actor run finished. Status: ${run.status}`);

            if (run.status !== 'SUCCEEDED') {
                throw new Error(`Actor run failed with status: ${run.status}`);
            }

            // Get the results
            const { items } = await this.apifyClient.dataset(run.defaultDatasetId).listItems();

            logger.info(`Scraped ${items.length} videos from Huberman Lab channel`);

            // Process and store the videos
            const processedVideos = await this.processVideos(items);
            
            logger.info(`Successfully processed and stored ${processedVideos.length} videos`);

            return processedVideos;

        } catch (error) {
            logger.error('Error scraping Huberman videos:', error);
            throw error;
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
                title: this.cleanText(rawVideo.title),
                description: this.cleanText(rawVideo.description),
                published_at: new Date(rawVideo.publishedAt),
                duration_seconds: this.parseDuration(rawVideo.duration),
                view_count: parseInt(rawVideo.viewCount) || 0,
                like_count: parseInt(rawVideo.likeCount) || 0,
                thumbnail_url: rawVideo.thumbnailUrl || rawVideo.thumbnail,
                url: rawVideo.url,
                channel_id: rawVideo.channelId || 'UC2D2CMWXMOVWx7giW1n3LIg',
                tags: this.extractTags(rawVideo.tags || rawVideo.keywords)
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

        // Handle different duration formats
        if (typeof duration === 'number') {
            return duration;
        }

        if (typeof duration === 'string') {
            // Parse ISO 8601 duration (PT1H2M3S) or simple formats
            const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            if (match) {
                const hours = parseInt(match[1]) || 0;
                const minutes = parseInt(match[2]) || 0;
                const seconds = parseInt(match[3]) || 0;
                return hours * 3600 + minutes * 60 + seconds;
            }

            // Parse MM:SS or HH:MM:SS format
            const timeParts = duration.split(':').map(part => parseInt(part));
            if (timeParts.length === 2) {
                return timeParts[0] * 60 + timeParts[1]; // MM:SS
            } else if (timeParts.length === 3) {
                return timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2]; // HH:MM:SS
            }
        }

        return 0;
    }

    extractTags(tags) {
        if (!tags) return [];
        
        if (Array.isArray(tags)) {
            return tags.filter(tag => tag && tag.trim().length > 0);
        }
        
        if (typeof tags === 'string') {
            return tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        }
        
        return [];
    }

    async getScrapingStats() {
        try {
            const stats = await this.db.getVideoStats();
            return {
                totalVideos: stats.total_videos,
                latestVideo: stats.latest_video_date,
                oldestVideo: stats.oldest_video_date,
                averageDuration: stats.average_duration,
                totalDuration: stats.total_duration
            };
        } catch (error) {
            logger.error('Error getting scraping stats:', error);
            return null;
        }
    }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const scraper = new VideoScraper();
    
    scraper.scrapeHubermanVideos()
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
            }
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Scraping failed:', error.message);
            process.exit(1);
        });
}

export { VideoScraper };
