#!/usr/bin/env node

/**
 * Huberman Lab Transcript Downloader
 * Downloads transcripts for all Huberman Lab videos using Apify
 */

import { ApifyClient } from 'apify-client';
import { DatabaseService } from '../backend/src/services/databaseService.js';
import { createLogger } from '../backend/src/utils/logger.js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables
dotenv.config({ path: './backend/.env' });

const logger = createLogger('TranscriptDownloader');

class TranscriptDownloader {
  constructor() {
    this.apifyClient = new ApifyClient({
      token: process.env.APIFY_API_TOKEN
    });
    this.db = new DatabaseService();
    
    // Apify YouTube Transcript Scraper actor ID
    this.TRANSCRIPT_SCRAPER_ID = 'faVsWy9VTSNVIhWpR';
    
    // Huberman Lab channel info
    this.HUBERMAN_CHANNEL_ID = 'UC2D2CMWXMOVWx7giW1n3LIg';
    this.HUBERMAN_CHANNEL_URL = 'https://www.youtube.com/@hubermanlab';
    
    // Create data directory
    this.dataDir = './data/transcripts';
  }

  async start() {
    logger.info('🚀 Starting Huberman Lab transcript download...');
    
    try {
      // Create data directory
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Initialize database connection
      await this.db.connect();
      
      // Step 1: Get all Huberman Lab video URLs
      logger.info('📹 Step 1: Getting all Huberman Lab video URLs...');
      const videoUrls = await this.getAllHubermanVideoUrls();
      
      if (videoUrls.length === 0) {
        throw new Error('No video URLs found');
      }
      
      logger.info(`✅ Found ${videoUrls.length} Huberman Lab videos`);
      
      // Step 2: Download transcripts in batches
      logger.info('📝 Step 2: Downloading transcripts...');
      const transcripts = await this.downloadAllTranscripts(videoUrls);
      
      // Step 3: Save transcripts to files and database
      logger.info('💾 Step 3: Saving transcripts...');
      await this.saveTranscripts(transcripts);
      
      logger.info('🎉 Transcript download completed successfully!');
      logger.info(`📊 Downloaded ${transcripts.length} transcripts`);
      
      return transcripts;
      
    } catch (error) {
      logger.error('❌ Transcript download failed:', error);
      throw error;
    } finally {
      await this.db.close();
    }
  }

  async getAllHubermanVideoUrls() {
    // First, let's get video URLs from the channel
    const channelInput = {
      channelUrls: [this.HUBERMAN_CHANNEL_URL],
      maxVideos: 500, // Get all videos
      includeVideoDetails: true,
      includeComments: false,
      includeSubtitles: false
    };

    logger.info('🕷️ Running Apify channel scraper to get video URLs...');
    const channelRun = await this.apifyClient.actor('1p1aa7gcSydPkAE0d').call(channelInput);
    
    logger.info(`📊 Channel scraper run ID: ${channelRun.id}`);
    logger.info('⏳ Waiting for channel scraper to complete...');
    
    const { items: videos } = await this.apifyClient.dataset(channelRun.defaultDatasetId).listItems();
    
    // Extract video URLs
    const videoUrls = videos.map(video => {
      if (video.url) return video.url;
      if (video.videoId) return `https://www.youtube.com/watch?v=${video.videoId}`;
      return null;
    }).filter(Boolean);
    
    logger.info(`📹 Extracted ${videoUrls.length} video URLs`);
    return videoUrls;
  }

  async downloadAllTranscripts(videoUrls) {
    const batchSize = 50; // Process in batches to avoid overwhelming the API
    const allTranscripts = [];
    
    for (let i = 0; i < videoUrls.length; i += batchSize) {
      const batch = videoUrls.slice(i, i + batchSize);
      logger.info(`📝 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(videoUrls.length/batchSize)} (${batch.length} videos)`);
      
      try {
        const batchTranscripts = await this.downloadTranscriptBatch(batch);
        allTranscripts.push(...batchTranscripts);
        
        // Small delay between batches
        if (i + batchSize < videoUrls.length) {
          logger.info('⏳ Waiting 10 seconds before next batch...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      } catch (error) {
        logger.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, error);
        // Continue with next batch
      }
    }
    
    return allTranscripts;
  }

  async downloadTranscriptBatch(videoUrls) {
    const input = {
      videoUrls: videoUrls,
      language: 'en', // English transcripts
      format: 'text', // Get plain text format
      includeTimestamps: true
    };

    logger.info(`🕷️ Running transcript scraper for ${videoUrls.length} videos...`);
    const run = await this.apifyClient.actor(this.TRANSCRIPT_SCRAPER_ID).call(input);
    
    logger.info(`📊 Transcript scraper run ID: ${run.id}`);
    logger.info('⏳ Waiting for transcript scraper to complete...');
    
    // Get results
    const { items: transcripts } = await this.apifyClient.dataset(run.defaultDatasetId).listItems();
    
    logger.info(`✅ Downloaded ${transcripts.length} transcripts from batch`);
    return transcripts;
  }

  async saveTranscripts(transcripts) {
    let savedCount = 0;
    
    for (const transcript of transcripts) {
      try {
        // Extract video ID from URL
        const videoId = this.extractVideoId(transcript.url || transcript.videoUrl);
        if (!videoId) {
          logger.warn('⚠️ Could not extract video ID from:', transcript.url);
          continue;
        }
        
        // Save to file
        const filename = `${videoId}.json`;
        const filepath = path.join(this.dataDir, filename);
        
        const transcriptData = {
          videoId: videoId,
          url: transcript.url || transcript.videoUrl,
          title: transcript.title,
          transcript: transcript.transcript || transcript.text,
          timestamps: transcript.timestamps,
          language: transcript.language || 'en',
          downloadedAt: new Date().toISOString()
        };
        
        await fs.writeFile(filepath, JSON.stringify(transcriptData, null, 2));
        
        // Save to database if available
        try {
          await this.db.storeTranscript({
            video_id: videoId,
            transcript_text: transcript.transcript || transcript.text,
            timestamps: transcript.timestamps,
            language: transcript.language || 'en'
          });
        } catch (dbError) {
          logger.warn('⚠️ Database save failed for', videoId, ':', dbError.message);
        }
        
        savedCount++;
        
        if (savedCount % 10 === 0) {
          logger.info(`💾 Saved ${savedCount}/${transcripts.length} transcripts...`);
        }
        
      } catch (error) {
        logger.error('❌ Failed to save transcript:', error);
      }
    }
    
    logger.info(`✅ Successfully saved ${savedCount} transcripts`);
    return savedCount;
  }

  extractVideoId(url) {
    if (!url) return null;
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }

  async generateStats() {
    try {
      const files = await fs.readdir(this.dataDir);
      const transcriptFiles = files.filter(f => f.endsWith('.json'));
      
      logger.info('📊 Transcript Download Statistics:');
      logger.info(`   Total Transcripts: ${transcriptFiles.length}`);
      logger.info(`   Storage Location: ${this.dataDir}`);
      
      return {
        totalTranscripts: transcriptFiles.length,
        storageLocation: this.dataDir
      };
    } catch (error) {
      logger.error('Failed to generate stats:', error);
      return { totalTranscripts: 0 };
    }
  }
}

// Run the transcript downloader
async function main() {
  const downloader = new TranscriptDownloader();
  
  try {
    await downloader.start();
    await downloader.generateStats();
  } catch (error) {
    logger.error('❌ Transcript download failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default TranscriptDownloader;