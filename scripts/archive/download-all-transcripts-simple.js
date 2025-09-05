#!/usr/bin/env node

/**
 * Simple Transcript Downloader
 * Downloads transcripts for all videos using direct database connection
 */

import { ApifyClient } from 'apify-client';
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

const { Pool } = pg;

// Load environment variables
dotenv.config({ path: './backend/.env' });

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN
});

class SimpleTranscriptDownloader {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    this.TRANSCRIPT_SCRAPER_ID = 'faVsWy9VTSNVIhWpR';
    this.transcriptDir = './data/transcripts';
  }

  async start() {
    console.log('🚀 Starting simple transcript download...');
    console.log('🔑 API Token:', process.env.APIFY_API_TOKEN ? 'Found ✅' : 'Missing ❌');
    
    if (!process.env.APIFY_API_TOKEN) {
      throw new Error('APIFY_API_TOKEN is required');
    }

    try {
      // Create transcript directory
      await fs.mkdir(this.transcriptDir, { recursive: true });

      // Test database connection
      console.log('🔌 Testing database connection...');
      const testResult = await this.pool.query('SELECT NOW()');
      console.log('✅ Database connected successfully');

      // Get all videos
      console.log('📹 Getting all videos from database...');
      const videos = await this.getAllVideos();
      
      if (videos.length === 0) {
        throw new Error('No videos found in database');
      }

      console.log(`✅ Found ${videos.length} videos in database`);

      // Check existing transcripts
      const existingTranscripts = await this.getExistingTranscripts();
      const videosNeedingTranscripts = videos.filter(video => 
        !existingTranscripts.includes(video.youtube_id)
      );

      console.log(`📊 Existing transcripts: ${existingTranscripts.length}`);
      console.log(`📊 Videos needing transcripts: ${videosNeedingTranscripts.length}`);

      if (videosNeedingTranscripts.length === 0) {
        console.log('✅ All videos already have transcripts!');
        return;
      }

      // Download transcripts
      console.log('\n🕷️ Starting transcript downloads...');
      await this.downloadTranscripts(videosNeedingTranscripts);

    } catch (error) {
      console.error('❌ Download failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  async getAllVideos() {
    try {
      const query = `
        SELECT youtube_id, title, description, published_at
        FROM videos 
        ORDER BY published_at DESC
      `;
      
      const result = await this.pool.query(query);
      console.log(`📊 Found ${result.rows.length} videos in database`);
      
      if (result.rows.length > 0) {
        console.log('📋 Sample videos:');
        result.rows.slice(0, 3).forEach((video, idx) => {
          console.log(`   ${idx + 1}. ${video.title} (${video.youtube_id})`);
        });
      }
      
      return result.rows;
      
    } catch (error) {
      console.error('❌ Failed to get videos:', error);
      throw error;
    }
  }

  async getExistingTranscripts() {
    try {
      const files = await fs.readdir(this.transcriptDir);
      const transcriptFiles = files.filter(f => f.endsWith('.json'));
      return transcriptFiles.map(f => f.replace('.json', ''));
    } catch (error) {
      return []; // Directory doesn't exist yet
    }
  }

  async downloadTranscripts(videos) {
    const batchSize = 5; // Small batches
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < videos.length; i += batchSize) {
      const batch = videos.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(videos.length / batchSize);
      
      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} videos)`);
      
      for (let j = 0; j < batch.length; j++) {
        const video = batch[j];
        const videoNum = i + j + 1;
        const videoUrl = `https://www.youtube.com/watch?v=${video.youtube_id}`;
        
        console.log(`📹 [${videoNum}/${videos.length}] ${video.title}`);
        
        try {
          const transcript = await this.downloadSingleTranscript(videoUrl);
          
          if (transcript && (transcript.transcript || transcript.subtitles)) {
            const processedTranscript = this.processTranscript(transcript, video);
            await this.saveTranscript(processedTranscript);
            
            successCount++;
            console.log(`✅ [${videoNum}] SUCCESS - ${processedTranscript.wordCount} words`);
          } else {
            failCount++;
            console.log(`⚠️ [${videoNum}] NO TRANSCRIPT`);
          }
          
        } catch (error) {
          failCount++;
          console.error(`❌ [${videoNum}] FAILED - ${error.message}`);
        }
        
        // Delay between requests
        if (j < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      // Delay between batches
      if (i + batchSize < videos.length) {
        console.log('⏳ Waiting 30 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
      
      console.log(`📊 Progress: ${successCount} success, ${failCount} failed`);
    }
    
    console.log('\n🎉 TRANSCRIPT DOWNLOAD COMPLETE!');
    console.log(`📊 Final: ${successCount} successful, ${failCount} failed`);
    console.log(`📈 Success Rate: ${((successCount / videos.length) * 100).toFixed(1)}%`);
  }

  async downloadSingleTranscript(videoUrl) {
    const input = {
      videoUrl: videoUrl,
      language: 'en'
    };

    const run = await apifyClient.actor(this.TRANSCRIPT_SCRAPER_ID).call(input);
    const { items: transcripts } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    
    return transcripts.length > 0 ? transcripts[0] : null;
  }

  processTranscript(transcript, video) {
    let fullText = '';
    let timestamps = [];
    
    const transcriptContent = transcript.transcript || transcript.subtitles || transcript.text;
    
    if (Array.isArray(transcriptContent)) {
      for (const segment of transcriptContent) {
        if (segment.text) {
          fullText += segment.text + ' ';
          timestamps.push({
            start: parseFloat(segment.start || 0),
            duration: parseFloat(segment.dur || segment.duration || 0),
            text: segment.text
          });
        }
      }
    } else if (typeof transcriptContent === 'string') {
      fullText = transcriptContent;
    }
    
    fullText = fullText.trim();
    
    return {
      videoId: video.youtube_id,
      url: `https://www.youtube.com/watch?v=${video.youtube_id}`,
      title: video.title,
      description: video.description,
      publishedAt: video.published_at,
      fullTranscript: fullText,
      timestamps: timestamps,
      wordCount: fullText ? fullText.split(' ').length : 0,
      language: 'en',
      downloadedAt: new Date().toISOString()
    };
  }

  async saveTranscript(transcript) {
    const filename = `${transcript.videoId}.json`;
    const filepath = path.join(this.transcriptDir, filename);
    await fs.writeFile(filepath, JSON.stringify(transcript, null, 2));
  }
}

// Run the downloader
async function main() {
  const downloader = new SimpleTranscriptDownloader();
  
  try {
    await downloader.start();
    console.log('\n🎯 MISSION ACCOMPLISHED!');
    console.log('All available transcripts have been downloaded!');
  } catch (error) {
    console.error('❌ Download failed:', error);
    process.exit(1);
  }
}

main();