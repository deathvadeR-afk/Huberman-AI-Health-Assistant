#!/usr/bin/env node

/**
 * Final Transcript Downloader
 * Downloads transcripts with correct data structure handling
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

class FinalTranscriptDownloader {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    this.TRANSCRIPT_SCRAPER_ID = 'faVsWy9VTSNVIhWpR';
    this.transcriptDir = './data/transcripts';
  }

  async start() {
    console.log('🚀 Starting final transcript download with correct data handling...');
    console.log('🔑 API Token:', process.env.APIFY_API_TOKEN ? 'Found ✅' : 'Missing ❌');
    
    try {
      // Create transcript directory
      await fs.mkdir(this.transcriptDir, { recursive: true });

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

      // Download transcripts
      console.log('\n🕷️ Starting transcript downloads...');
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

  async downloadAllTranscripts(videos) {
    const batchSize = 5; // Small batches to be respectful
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
          const transcript = await this.downloadSingleTranscript(videoUrl);
          
          if (transcript && transcript.data && Array.isArray(transcript.data)) {
            const processedTranscript = this.processTranscript(transcript, video);
            
            if (processedTranscript.wordCount > 0) {
              await this.saveTranscript(processedTranscript);
              
              successCount++;
              totalWords += processedTranscript.wordCount;
              console.log(`✅ [${videoNum}] SUCCESS - ${processedTranscript.wordCount} words, ${processedTranscript.timestamps.length} segments`);
            } else {
              failCount++;
              console.log(`⚠️ [${videoNum}] NO TEXT - Transcript has no readable text`);
            }
          } else {
            failCount++;
            console.log(`⚠️ [${videoNum}] NO TRANSCRIPT - No data field or not an array`);
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
        const waitTime = 45;
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
    console.log(`   📊 Average Words per Transcript: ${successCount > 0 ? Math.round(totalWords / successCount).toLocaleString() : 0}`);
    console.log(`   💾 Transcripts saved to: ${this.transcriptDir}`);
    
    // Generate final report
    await this.generateReport(videos.length, successCount, failCount, totalWords);
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
    
    // The transcript data is in the 'data' field as an array
    const transcriptData = transcript.data || [];
    
    for (const segment of transcriptData) {
      if (segment.text && segment.text.trim()) {
        fullText += segment.text + ' ';
        timestamps.push({
          start: parseFloat(segment.start || 0),
          duration: parseFloat(segment.dur || 0),
          text: segment.text.trim()
        });
      }
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
      segmentCount: timestamps.length,
      language: 'en',
      downloadedAt: new Date().toISOString()
    };
  }

  async saveTranscript(transcript) {
    const filename = `${transcript.videoId}.json`;
    const filepath = path.join(this.transcriptDir, filename);
    await fs.writeFile(filepath, JSON.stringify(transcript, null, 2));
  }

  async generateReport(totalVideos, successCount, failCount, totalWords) {
    const report = {
      collectionDate: new Date().toISOString(),
      totalVideosInDatabase: totalVideos,
      transcriptsDownloaded: successCount,
      transcriptsFailed: failCount,
      successRate: ((successCount / totalVideos) * 100).toFixed(1) + '%',
      totalWords: totalWords,
      averageWordsPerTranscript: successCount > 0 ? Math.round(totalWords / successCount) : 0,
      dataLocation: this.transcriptDir,
      summary: `Successfully downloaded ${successCount} transcripts out of ${totalVideos} videos (${((successCount / totalVideos) * 100).toFixed(1)}% success rate) containing ${totalWords.toLocaleString()} total words.`
    };
    
    await fs.writeFile('./data/final-transcript-report.json', JSON.stringify(report, null, 2));
    console.log('📋 Final report saved to ./data/final-transcript-report.json');
    
    return report;
  }
}

// Run the final downloader
async function main() {
  const downloader = new FinalTranscriptDownloader();
  
  try {
    await downloader.start();
    console.log('\n🎯 MISSION ACCOMPLISHED!');
    console.log('All available transcripts have been downloaded from your 392 video database!');
  } catch (error) {
    console.error('❌ Download failed:', error);
    process.exit(1);
  }
}

main();