#!/usr/bin/env node

/**
 * Enhanced Transcript Downloader
 * Downloads transcripts with better error handling and debugging
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

class EnhancedTranscriptDownloader {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    this.TRANSCRIPT_SCRAPER_ID = 'faVsWy9VTSNVIhWpR';
    this.transcriptDir = './data/transcripts';
    this.debugDir = './data/debug';
  }

  async start() {
    console.log('🚀 Starting enhanced transcript download...');
    console.log('🔑 API Token:', process.env.APIFY_API_TOKEN ? 'Found ✅' : 'Missing ❌');
    
    try {
      // Create directories
      await fs.mkdir(this.transcriptDir, { recursive: true });
      await fs.mkdir(this.debugDir, { recursive: true });

      // Test database connection
      console.log('🔌 Testing database connection...');
      await this.pool.query('SELECT NOW()');
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

      // Test with a few videos first
      console.log('\n🧪 Testing transcript download with first 3 videos...');
      const testVideos = videosNeedingTranscripts.slice(0, 3);
      await this.testTranscriptDownload(testVideos);

      // Ask user if they want to continue with all videos
      console.log('\n❓ Do you want to continue downloading all transcripts?');
      console.log('   This will take a long time and use API quota.');
      console.log('   Press Ctrl+C to stop, or wait 10 seconds to continue...');
      
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Download all transcripts
      console.log('\n🕷️ Starting full transcript download...');
      await this.downloadAllTranscripts(videosNeedingTranscripts);

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
        SELECT youtube_id, title, description, published_at, duration_seconds
        FROM videos 
        WHERE youtube_id IS NOT NULL
        ORDER BY published_at DESC
      `;
      
      const result = await this.pool.query(query);
      console.log(`📊 Found ${result.rows.length} videos in database`);
      
      if (result.rows.length > 0) {
        console.log('📋 Sample videos:');
        result.rows.slice(0, 5).forEach((video, idx) => {
          console.log(`   ${idx + 1}. ${video.title} (${video.youtube_id}) - ${video.published_at?.toISOString()?.split('T')[0]}`);
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
      return [];
    }
  }

  async testTranscriptDownload(videos) {
    console.log('🧪 Testing transcript download...');
    
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const videoUrl = `https://www.youtube.com/watch?v=${video.youtube_id}`;
      
      console.log(`\n🔍 Test ${i + 1}: ${video.title}`);
      console.log(`🔗 URL: ${videoUrl}`);
      console.log(`📅 Published: ${video.published_at?.toISOString()?.split('T')[0]}`);
      
      try {
        const result = await this.downloadSingleTranscriptWithDebug(videoUrl, video.youtube_id);
        
        if (result.success) {
          console.log(`✅ SUCCESS - ${result.wordCount} words, ${result.segments} segments`);
        } else {
          console.log(`⚠️ NO TRANSCRIPT - ${result.reason}`);
        }
        
      } catch (error) {
        console.error(`❌ ERROR - ${error.message}`);
      }
      
      // Delay between test requests
      if (i < videos.length - 1) {
        console.log('⏳ Waiting 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }

  async downloadSingleTranscriptWithDebug(videoUrl, videoId) {
    const input = {
      videoUrl: videoUrl,
      language: 'en'
    };

    console.log('🕷️ Running Apify Transcript Scraper...');
    const run = await apifyClient.actor(this.TRANSCRIPT_SCRAPER_ID).call(input);
    console.log(`📊 Run ID: ${run.id}`);
    console.log(`🔗 Monitor: https://console.apify.com/actors/runs/${run.id}`);
    
    // Get results
    const { items: transcripts } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    
    // Save debug info
    const debugInfo = {
      videoUrl,
      videoId,
      runId: run.id,
      inputParams: input,
      resultCount: transcripts.length,
      results: transcripts,
      timestamp: new Date().toISOString()
    };
    
    await fs.writeFile(
      path.join(this.debugDir, `debug-${videoId}.json`),
      JSON.stringify(debugInfo, null, 2)
    );
    
    if (transcripts.length === 0) {
      return { success: false, reason: 'No transcript data returned from Apify' };
    }
    
    const transcript = transcripts[0];
    console.log('📋 Transcript keys:', Object.keys(transcript));
    
    // Check different possible transcript formats
    const transcriptContent = transcript.transcript || transcript.subtitles || transcript.text || transcript.captions;
    
    if (!transcriptContent) {
      console.log('📋 Available fields:', Object.keys(transcript));
      return { success: false, reason: 'No transcript content found in response' };
    }
    
    let wordCount = 0;
    let segments = 0;
    
    if (Array.isArray(transcriptContent)) {
      segments = transcriptContent.length;
      wordCount = transcriptContent.reduce((sum, segment) => {
        return sum + (segment.text ? segment.text.split(' ').length : 0);
      }, 0);
    } else if (typeof transcriptContent === 'string') {
      wordCount = transcriptContent.split(' ').length;
      segments = 1;
    }
    
    return { success: true, wordCount, segments, transcript };
  }

  async downloadAllTranscripts(videos) {
    const batchSize = 3; // Very small batches to be conservative
    let successCount = 0;
    let failCount = 0;
    let totalWords = 0;

    console.log(`📝 Starting download of ${videos.length} transcripts in batches of ${batchSize}...`);

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
          const result = await this.downloadSingleTranscriptWithDebug(videoUrl, video.youtube_id);
          
          if (result.success) {
            const processedTranscript = this.processTranscript(result.transcript, video);
            await this.saveTranscript(processedTranscript);
            
            successCount++;
            totalWords += processedTranscript.wordCount;
            console.log(`✅ [${videoNum}] SUCCESS - ${processedTranscript.wordCount} words`);
          } else {
            failCount++;
            console.log(`⚠️ [${videoNum}] NO TRANSCRIPT - ${result.reason}`);
          }
          
        } catch (error) {
          failCount++;
          console.error(`❌ [${videoNum}] FAILED - ${error.message}`);
        }
        
        // Delay between requests
        if (j < batch.length - 1) {
          console.log('⏳ Waiting 8 seconds...');
          await new Promise(resolve => setTimeout(resolve, 8000));
        }
      }
      
      // Longer delay between batches
      if (i + batchSize < videos.length) {
        const waitTime = 45; // 45 seconds between batches
        console.log(`⏳ Batch ${batchNum} complete. Waiting ${waitTime} seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      }
      
      // Progress update
      const processed = successCount + failCount;
      const remaining = videos.length - processed;
      const successRate = processed > 0 ? ((successCount / processed) * 100).toFixed(1) : '0';
      
      console.log(`📊 Progress: ${successCount} success, ${failCount} failed, ${remaining} remaining`);
      console.log(`📈 Success Rate: ${successRate}%, Total Words: ${totalWords.toLocaleString()}`);
    }
    
    console.log('\n🎉 TRANSCRIPT DOWNLOAD COMPLETE!');
    console.log('================================');
    console.log(`📊 Final Results:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📈 Success Rate: ${((successCount / videos.length) * 100).toFixed(1)}%`);
    console.log(`   📝 Total Words: ${totalWords.toLocaleString()}`);
    console.log(`   💾 Transcripts saved to: ${this.transcriptDir}`);
    console.log(`   🔍 Debug info saved to: ${this.debugDir}`);
  }

  processTranscript(transcript, video) {
    let fullText = '';
    let timestamps = [];
    
    const transcriptContent = transcript.transcript || transcript.subtitles || transcript.text || transcript.captions;
    
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

// Run the enhanced downloader
async function main() {
  const downloader = new EnhancedTranscriptDownloader();
  
  try {
    await downloader.start();
    console.log('\n🎯 MISSION ACCOMPLISHED!');
  } catch (error) {
    console.error('❌ Download failed:', error);
    process.exit(1);
  }
}

main();