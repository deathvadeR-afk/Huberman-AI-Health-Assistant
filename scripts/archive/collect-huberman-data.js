#!/usr/bin/env node

/**
 * Complete Huberman Lab Data Collection Script
 * Scrapes all videos and transcripts from the Huberman Lab YouTube channel
 */

import { ApifyClient } from 'apify-client';
import { DatabaseService } from '../backend/src/services/databaseService.js';
import { createLogger } from '../backend/src/utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './backend/.env' });

const logger = createLogger('DataCollection');

class HubermanDataCollector {
  constructor() {
    this.apifyClient = new ApifyClient({
      token: process.env.APIFY_API_TOKEN
    });
    this.db = new DatabaseService();
    
    // Apify actor IDs from requirements
    this.CHANNEL_SCRAPER_ID = '1p1aa7gcSydPkAE0d';
    this.TRANSCRIPT_SCRAPER_ID = 'faVsWy9VTSNVIhWpR';
    
    // Huberman Lab channel info
    this.HUBERMAN_CHANNEL_URL = 'https://www.youtube.com/@hubermanlab';
    this.HUBERMAN_CHANNEL_ID = 'UC2D2CMWXMOVWx7giW1n3LIg';
  }

  async start() {
    logger.info('🚀 Starting complete Huberman Lab data collection...');
    
    try {
      // Initialize database connection
      await this.db.connect();
      
      // Step 1: Scrape all videos from channel
      logger.info('📹 Step 1: Scraping all videos from Huberman Lab channel...');
      const videos = await this.scrapeAllVideos();
      
      if (videos.length === 0) {
        throw new Error('No videos found from channel scraping');
      }
      
      logger.info(`✅ Found ${videos.length} videos from Huberman Lab channel`);
      
      // Step 2: Store videos in database
      logger.info('💾 Step 2: Storing videos in database...');
      const storedVideos = await this.storeVideos(videos);
      logger.info(`✅ Stored ${storedVideos.length} videos in database`);
      
      // Step 3: Scrape transcripts for all videos
      logger.info('📝 Step 3: Scraping transcripts for all videos...');
      const transcriptResults = await this.scrapeAllTranscripts(videos);
      logger.info(`✅ Processed ${transcriptResults.length} transcripts`);
      
      // Step 4: Generate final statistics
      const stats = await this.generateFinalStats();
      
      logger.info('🎉 Data collection completed successfully!');
      logger.info('📊 Final Statistics:');
      logger.info(`   Total Videos: ${stats.totalVideos}`);
      logger.info(`   Total Transcripts: ${stats.totalTranscripts}`);
      logger.info(`   Total Content Hours: ${stats.totalHours.toFixed(1)}`);
      logger.info(`   Total Views: ${stats.totalViews.toLocaleString()}`);
      logger.info(`   Date Range: ${stats.oldestVideo} to ${stats.latestVideo}`);
      
      return stats;
      
    } catch (error) {
      logger.error('❌ Data collection failed:', error);
      throw error;
    } finally {
      await this.db.close();
    }
  }

  async scrapeAllVideos() {
    logger.info('Starting video scraping with Apify...');
    
    try {
      const input = {
        channelUrls: [this.HUBERMAN_CHANNEL_URL],
        maxVideos: 1000, // Get all videos (Huberman has ~400)
        includeVideoDetails: true,
        includeComments: false, // Skip comments to save quota
        includeSubtitles: false // We'll get transcripts separately
      };

      logger.info('🕷️ Running Apify channel scraper...');
      const run = await this.apifyClient.actor(this.CHANNEL_SCRAPER_ID).call(input);
      
      logger.info(`📊 Scraper run ID: ${run.id}`);
      logger.info('⏳ Waiting for scraper to complete...');
      
      // Wait for completion and get results
      const { items } = await this.apifyClient.dataset(run.defaultDatasetId).listItems();
      
      logger.info(`🎯 Scraped ${items.length} videos from channel`);
      
      // Process and clean video data
      const processedVideos = items.map(video => ({
        id: video.id,
        title: video.title,
        description: video.description,
        url: video.url,
        duration: video.duration,
        durationSeconds: this.parseDuration(video.duration),
        viewCount: video.viewCount,
        likeCount: video.likeCount,
        publishedAt: video.publishedAt,
        thumbnailUrl: video.thumbnailUrl,
        channelName: 'Andrew Huberman',
        raw_data: video
      }));

      return processedVideos;
      
    } catch (error) {
      logger.error('Video scraping failed:', error);
      throw new Error(`Failed to scrape videos: ${error.message}`);
    }
  }

  async storeVideos(videos) {
    logger.info(`Storing ${videos.length} videos in database...`);
    
    const storedVideos = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      
      try {
        const stored = await this.db.storeVideo(video);
        storedVideos.push(stored);
        successCount++;
        
        if ((i + 1) % 10 === 0) {
          logger.info(`📊 Progress: ${i + 1}/${videos.length} videos stored`);
        }
        
      } catch (error) {
        logger.error(`Failed to store video "${video.title}":`, error.message);
        errorCount++;
      }
    }

    logger.info(`✅ Video storage complete: ${successCount} success, ${errorCount} errors`);
    return storedVideos;
  }

  async scrapeAllTranscripts(videos) {
    logger.info(`Starting transcript scraping for ${videos.length} videos...`);
    
    // Process in batches to avoid overwhelming the API
    const BATCH_SIZE = 10;
    const batches = [];
    
    for (let i = 0; i < videos.length; i += BATCH_SIZE) {
      batches.push(videos.slice(i, i + BATCH_SIZE));
    }

    logger.info(`📦 Processing ${batches.length} batches of ${BATCH_SIZE} videos each`);

    const allResults = [];
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      logger.info(`🔄 Processing batch ${batchIndex + 1}/${batches.length}...`);
      
      try {
        const batchResults = await this.scrapeTranscriptBatch(batch);
        allResults.push(...batchResults);
        
        logger.info(`✅ Batch ${batchIndex + 1} completed: ${batchResults.length} transcripts processed`);
        
        // Wait between batches to be respectful to the API
        if (batchIndex < batches.length - 1) {
          logger.info('⏳ Waiting 30 seconds before next batch...');
          await new Promise(resolve => setTimeout(resolve, 30000));
        }
        
      } catch (error) {
        logger.error(`❌ Batch ${batchIndex + 1} failed:`, error.message);
        // Continue with next batch
      }
    }

    logger.info(`🎯 Transcript scraping completed: ${allResults.length} total transcripts`);
    return allResults;
  }

  async scrapeTranscriptBatch(videos) {
    const videoUrls = videos.map(v => v.url);
    
    try {
      const input = {
        videoUrls: videoUrls,
        language: 'en',
        includeTimestamps: true
      };

      logger.info(`🕷️ Running transcript scraper for ${videoUrls.length} videos...`);
      const run = await this.apifyClient.actor(this.TRANSCRIPT_SCRAPER_ID).call(input);
      
      // Wait for completion
      const { items } = await this.apifyClient.dataset(run.defaultDatasetId).listItems();
      
      logger.info(`📝 Got ${items.length} transcript results`);

      // Store transcripts in database
      const results = [];
      for (const transcript of items) {
        try {
          const segments = await this.db.storeTranscript(transcript);
          results.push({
            videoUrl: transcript.videoUrl,
            segmentCount: segments.length,
            success: true
          });
        } catch (error) {
          logger.error(`Failed to store transcript for ${transcript.videoUrl}:`, error.message);
          results.push({
            videoUrl: transcript.videoUrl,
            error: error.message,
            success: false
          });
        }
      }

      return results;
      
    } catch (error) {
      logger.error('Transcript batch scraping failed:', error);
      return [];
    }
  }

  async generateFinalStats() {
    logger.info('📊 Generating final statistics...');
    
    try {
      const videoStats = await this.db.getVideoStats();
      
      // Get transcript count
      const transcriptQuery = 'SELECT COUNT(*) as count FROM transcript_segments';
      const transcriptResult = await this.db.pool?.query(transcriptQuery);
      const totalTranscripts = transcriptResult?.rows[0]?.count || 0;

      return {
        totalVideos: videoStats.totalVideos,
        totalTranscripts: parseInt(totalTranscripts),
        totalHours: videoStats.totalHours,
        totalViews: videoStats.totalViews,
        latestVideo: videoStats.latestVideo,
        oldestVideo: videoStats.oldestVideo,
        collectionDate: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('Failed to generate stats:', error);
      return {
        totalVideos: 0,
        totalTranscripts: 0,
        totalHours: 0,
        totalViews: 0,
        collectionDate: new Date().toISOString()
      };
    }
  }

  // Helper methods
  parseDuration(duration) {
    if (!duration) return 0;
    
    // Parse duration string like "1:23:45" or "23:45"
    const parts = duration.split(':').map(Number);
    
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    
    return 0;
  }
}

// Run the data collection if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const collector = new HubermanDataCollector();
  
  collector.start()
    .then((stats) => {
      console.log('\n🎉 DATA COLLECTION COMPLETED SUCCESSFULLY!');
      console.log('\n📊 FINAL STATISTICS:');
      console.log(`   📹 Total Videos: ${stats.totalVideos}`);
      console.log(`   📝 Total Transcripts: ${stats.totalTranscripts}`);
      console.log(`   ⏰ Total Content: ${stats.totalHours.toFixed(1)} hours`);
      console.log(`   👀 Total Views: ${stats.totalViews.toLocaleString()}`);
      console.log(`   📅 Collection Date: ${stats.collectionDate}`);
      console.log('\n✅ Your Huberman Health AI Assistant is now ready with real data!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ DATA COLLECTION FAILED:');
      console.error(error.message);
      console.error('\n🔧 Troubleshooting:');
      console.error('1. Check your Apify API token in backend/.env');
      console.error('2. Ensure PostgreSQL database is running');
      console.error('3. Verify database connection settings');
      process.exit(1);
    });
}

export { HubermanDataCollector };