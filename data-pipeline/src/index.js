#!/usr/bin/env node

import { VideoScraper } from './scrapers/videoScraper.js';
import { createLogger } from './utils/logger.js';
import { DatabaseManager } from './utils/database.js';
import dotenv from 'dotenv';

dotenv.config();

const logger = createLogger('DataPipeline');

class DataPipeline {
    constructor() {
        this.videoScraper = new VideoScraper();
        this.db = new DatabaseManager();
    }

    async runFullPipeline() {
        try {
            logger.info('🚀 Starting Huberman Health AI Data Pipeline...');
            
            // Step 1: Scrape videos
            logger.info('📹 Step 1: Scraping Huberman Lab videos...');
            const videos = await this.videoScraper.scrapeHubermanVideos();
            logger.info(`✅ Successfully scraped ${videos.length} videos`);

            // Step 2: Get statistics
            logger.info('📊 Step 2: Generating statistics...');
            const stats = await this.videoScraper.getScrapingStats();
            this.logStatistics(stats);

            // Step 3: Future steps (transcripts, processing, etc.)
            logger.info('🔄 Pipeline completed successfully!');
            
            return {
                success: true,
                videosProcessed: videos.length,
                statistics: stats
            };

        } catch (error) {
            logger.error('❌ Pipeline failed:', error);
            throw error;
        }
    }

    async runVideoScraping() {
        try {
            logger.info('📹 Running video scraping only...');
            const videos = await this.videoScraper.scrapeHubermanVideos();
            const stats = await this.videoScraper.getScrapingStats();
            
            this.logStatistics(stats);
            
            return {
                success: true,
                videosProcessed: videos.length,
                statistics: stats
            };
        } catch (error) {
            logger.error('❌ Video scraping failed:', error);
            throw error;
        }
    }

    async getStatus() {
        try {
            const stats = await this.db.getVideoStats();
            return {
                database: 'connected',
                totalVideos: parseInt(stats.total_videos),
                latestVideo: stats.latest_video_date,
                oldestVideo: stats.oldest_video_date,
                totalHours: Math.round(stats.total_duration / 3600),
                averageViews: Math.round(stats.average_views)
            };
        } catch (error) {
            logger.error('Error getting status:', error);
            return {
                database: 'error',
                error: error.message
            };
        }
    }

    logStatistics(stats) {
        if (!stats) return;
        
        logger.info('📊 Data Pipeline Statistics:');
        logger.info(`   📺 Total Videos: ${stats.totalVideos}`);
        logger.info(`   📅 Latest Video: ${stats.latestVideo}`);
        logger.info(`   📅 Oldest Video: ${stats.oldestVideo}`);
        logger.info(`   ⏱️  Average Duration: ${Math.round(stats.averageDuration / 60)} minutes`);
        logger.info(`   🎬 Total Content: ${Math.round(stats.totalDuration / 3600)} hours`);
    }

    async cleanup() {
        try {
            await this.db.close();
            logger.info('🧹 Cleanup completed');
        } catch (error) {
            logger.error('Error during cleanup:', error);
        }
    }
}

// CLI Interface
async function main() {
    const pipeline = new DataPipeline();
    
    // Handle process termination gracefully
    process.on('SIGINT', async () => {
        logger.info('🛑 Received SIGINT, shutting down gracefully...');
        await pipeline.cleanup();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        logger.info('🛑 Received SIGTERM, shutting down gracefully...');
        await pipeline.cleanup();
        process.exit(0);
    });

    try {
        const command = process.argv[2];
        
        switch (command) {
            case 'scrape-videos':
                await pipeline.runVideoScraping();
                break;
                
            case 'status':
                const status = await pipeline.getStatus();
                console.log('\n📊 Current Status:');
                console.log(`   Database: ${status.database}`);
                if (status.database === 'connected') {
                    console.log(`   Total Videos: ${status.totalVideos}`);
                    console.log(`   Latest Video: ${status.latestVideo}`);
                    console.log(`   Total Hours: ${status.totalHours}`);
                    console.log(`   Average Views: ${status.averageViews?.toLocaleString()}`);
                } else {
                    console.log(`   Error: ${status.error}`);
                }
                break;
                
            case 'full':
            default:
                await pipeline.runFullPipeline();
                break;
        }
        
        await pipeline.cleanup();
        process.exit(0);
        
    } catch (error) {
        logger.error('❌ Pipeline execution failed:', error);
        await pipeline.cleanup();
        process.exit(1);
    }
}

// Export for programmatic use
export { DataPipeline };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
