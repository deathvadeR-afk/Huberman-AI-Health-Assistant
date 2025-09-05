#!/usr/bin/env node

/**
 * Get All Transcripts from Database Videos
 * Extracts all 392 video URLs from the database and downloads transcripts using Apify
 */

import { ApifyClient } from 'apify-client';
import { DatabaseService } from '../backend/src/services/databaseService.js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables
dotenv.config({ path: './backend/.env' });

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN
});

class DatabaseTranscriptCollector {
  constructor() {
    this.db = new DatabaseService();
    this.TRANSCRIPT_SCRAPER_ID = 'faVsWy9VTSNVIhWpR';
    this.transcriptDir = './data/transcripts';
    this.batchSize = 10; // Process in small batches to avoid API limits
  }

  async start() {
    console.log('🚀 Starting transcript collection from database videos...');
    console.log('🔑 API Token:', process.env.APIFY_API_TOKEN ? 'Found ✅' : 'Missing ❌');
    
    if (!process.env.APIFY_API_TOKEN) {
      throw new Error('APIFY_API_TOKEN is required. Please set it in backend/.env');
    }

    try {
      // Create transcript directory
      await fs.mkdir(this.transcriptDir, { recursive: true });

      // Step 1: Get all videos from database
      console.log('\n📹 STEP 1: Getting all videos from database...');
      await this.db.connect();
      const videos = await this.getAllVideosFromDatabase();
      
      if (videos.length === 0) {
        throw new Error('No videos found in database. Please run the data collection first.');
      }

      console.log(`✅ Found ${videos.length} videos in database`);

      // Step 2: Check which transcripts we already have
      console.log('\n📝 STEP 2: Checking existing transcripts...');
      const existingTranscripts = await this.getExistingTranscripts();
      const videosNeedingTranscripts = videos.filter(video => 
        !existingTranscripts.includes(video.youtube_id)
      );

      console.log(`📊 Existing transcripts: ${existingTranscripts.length}`);
      console.log(`📊 Videos needing transcripts: ${videosNeedingTranscripts.length}`);

      // Step 3: Download missing transcripts
      console.log('\n🕷️ STEP 3: Downloading missing transcripts...');
      const transcripts = await this.downloadAllTranscripts(videosNeedingTranscripts);

      // Step 4: Generate final report
      const report = await this.generateReport(videos, transcripts, existingTranscripts);
      
      console.log('\n🎉 TRANSCRIPT COLLECTION COMPLETE!');
      console.log('===================================');
      console.log(`📹 Total Videos in DB: ${videos.length}`);
      console.log(`📝 New Transcripts Downloaded: ${transcripts.length}`);
      console.log(`📊 Total Transcripts Now: ${existingTranscripts.length + transcripts.length}`);
      console.log(`📈 Overall Success Rate: ${(((existingTranscripts.length + transcripts.length) / videos.length) * 100).toFixed(1)}%`);
      console.log(`💾 Transcripts saved to: ${this.transcriptDir}`);
      
      return { videos, transcripts, report };

    } catch (error) {
      console.error('❌ Transcript collection failed:', error);
      throw error;
    } finally {
      await this.db.close();
    }
  }

  async getAllVideosFromDatabase() {
    console.log('🔍 Querying database for all videos...');
    
    try {
      // Query all videos from the database
      const query = `
        SELECT 
          youtube_id,
          title,
          description,
          duration,
          view_count,
          published_at,
          thumbnail_url
        FROM videos 
        ORDER BY published_at DESC
      `;
      
      const result = await this.db.query(query);
      const videos = result.rows;
      
      console.log(`📊 Database query returned ${videos.length} videos`);
      
      if (videos.length > 0) {
        console.log('📋 Sample video from database:');
        console.log(`   Title: ${videos[0].title}`);
        console.log(`   YouTube ID: ${videos[0].youtube_id}`);
        console.log(`   Published: ${videos[0].published_at}`);
      }
      
      return videos;
      
    } catch (error) {
      console.error('❌ Database query failed:', error);
      throw error;
    }
  }

  async getExistingTranscripts() {
    try {
      const files = await fs.readdir(this.transcriptDir);
      const transcriptFiles = files.filter(f => f.endsWith('.json'));
      const existingIds = transcriptFiles.map(f => f.replace('.json', ''));
      
      console.log(`📁 Found ${existingIds.length} existing transcript files`);
      return existingIds;
      
    } catch (error) {
      // Directory doesn't exist yet
      console.log('📁 No existing transcripts directory found');
      return [];
    }
  }

  async downloadAllTranscripts(videos) {
    if (videos.length === 0) {
      console.log('✅ All transcripts already exist!');
      return [];
    }

    console.log(`📝 Starting transcript download for ${videos.length} videos...`);
    
    const allTranscripts = [];
    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;
    
    // Process in batches
    for (let i = 0; i < videos.length; i += this.batchSize) {
      const batch = videos.slice(i, i + this.batchSize);
      const batchNum = Math.floor(i / this.batchSize) + 1;
      const totalBatches = Math.ceil(videos.length / this.batchSize);
      
      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} videos)`);
      
      // Process each video in the batch
      for (let j = 0; j < batch.length; j++) {
        const video = batch[j];
        const videoNum = i + j + 1;
        const videoUrl = `https://www.youtube.com/watch?v=${video.youtube_id}`;
        
        console.log(`📹 [${videoNum}/${videos.length}] ${video.title}`);
        console.log(`🔗 ${videoUrl}`);
        
        try {
          // Check if transcript already exists (double-check)
          const transcriptPath = path.join(this.transcriptDir, `${video.youtube_id}.json`);
          try {
            await fs.access(transcriptPath);
            console.log(`⏭️ [${videoNum}] SKIP - Transcript already exists`);
            skipCount++;
            continue;
          } catch {
            // File doesn't exist, proceed with download
          }
          
          // Download transcript
          const transcript = await this.downloadSingleTranscript(videoUrl);
          
          if (transcript && (transcript.transcript || transcript.subtitles)) {
            // Process and save transcript
            const processedTranscript = this.processTranscriptData(transcript, video);
            allTranscripts.push(processedTranscript);
            
            await this.saveTranscript(processedTranscript);
            
            // Also save to database
            await this.saveTranscriptToDatabase(processedTranscript);
            
            successCount++;
            console.log(`✅ [${videoNum}] SUCCESS - ${processedTranscript.wordCount} words`);
          } else {
            failCount++;
            console.log(`⚠️ [${videoNum}] NO TRANSCRIPT - Not available`);
          }
          
        } catch (error) {
          failCount++;
          console.error(`❌ [${videoNum}] FAILED - ${error.message}`);
        }
        
        // Small delay between requests
        if (j < batch.length - 1) {
          console.log('⏳ Waiting 5 seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      // Longer delay between batches
      if (i + this.batchSize < videos.length) {
        console.log(`⏳ Batch ${batchNum} complete. Waiting 30 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
      
      // Progress update
      const processed = successCount + failCount + skipCount;
      const remaining = videos.length - processed;
      console.log(`📊 Progress: ${successCount} success, ${failCount} failed, ${skipCount} skipped, ${remaining} remaining`);
    }
    
    console.log(`\n✅ Transcript download complete!`);
    console.log(`📊 Final: ${successCount} successful, ${failCount} failed, ${skipCount} skipped`);
    
    return allTranscripts;
  }

  async downloadSingleTranscript(videoUrl) {
    const input = {
      videoUrl: videoUrl,
      language: 'en'
    };

    console.log('🕷️ Running Apify Transcript Scraper...');
    const run = await apifyClient.actor(this.TRANSCRIPT_SCRAPER_ID).call(input);
    
    // Get results
    const { items: transcripts } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    
    return transcripts.length > 0 ? transcripts[0] : null;
  }

  processTranscriptData(transcript, video) {
    let fullText = '';
    let timestamps = [];
    
    // Handle different transcript formats
    const transcriptContent = transcript.transcript || transcript.subtitles || transcript.text;
    
    if (Array.isArray(transcriptContent)) {
      // Array format with timestamps
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
      // Plain text format
      fullText = transcriptContent;
    }
    
    fullText = fullText.trim();
    
    return {
      videoId: video.youtube_id,
      url: `https://www.youtube.com/watch?v=${video.youtube_id}`,
      title: video.title,
      description: video.description,
      duration: video.duration,
      viewCount: video.view_count,
      publishedAt: video.published_at,
      fullTranscript: fullText,
      timestamps: timestamps,
      wordCount: fullText ? fullText.split(' ').length : 0,
      language: transcript.language || 'en',
      downloadedAt: new Date().toISOString()
    };
  }

  async saveTranscript(transcript) {
    const filename = `${transcript.videoId}.json`;
    const filepath = path.join(this.transcriptDir, filename);
    await fs.writeFile(filepath, JSON.stringify(transcript, null, 2));
  }

  async saveTranscriptToDatabase(transcript) {
    try {
      // Check if transcript already exists in database
      const existingQuery = 'SELECT id FROM transcripts WHERE video_id = $1';
      const existingResult = await this.db.query(existingQuery, [transcript.videoId]);
      
      if (existingResult.rows.length > 0) {
        // Update existing transcript
        const updateQuery = `
          UPDATE transcripts 
          SET transcript_text = $1, timestamps = $2, language = $3, updated_at = NOW()
          WHERE video_id = $4
        `;
        await this.db.query(updateQuery, [
          transcript.fullTranscript,
          JSON.stringify(transcript.timestamps),
          transcript.language,
          transcript.videoId
        ]);
      } else {
        // Insert new transcript
        const insertQuery = `
          INSERT INTO transcripts (video_id, transcript_text, timestamps, language, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
        `;
        await this.db.query(insertQuery, [
          transcript.videoId,
          transcript.fullTranscript,
          JSON.stringify(transcript.timestamps),
          transcript.language
        ]);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to save transcript to database for ${transcript.videoId}:`, error.message);
    }
  }

  async generateReport(videos, newTranscripts, existingTranscripts) {
    const totalTranscripts = existingTranscripts.length + newTranscripts.length;
    const totalWords = newTranscripts.reduce((sum, t) => sum + (t.wordCount || 0), 0);
    
    const report = {
      collectionDate: new Date().toISOString(),
      databaseVideos: videos.length,
      existingTranscripts: existingTranscripts.length,
      newTranscriptsDownloaded: newTranscripts.length,
      totalTranscripts: totalTranscripts,
      overallSuccessRate: ((totalTranscripts / videos.length) * 100).toFixed(1) + '%',
      newTranscriptWords: totalWords,
      averageWordsPerNewTranscript: newTranscripts.length > 0 ? Math.round(totalWords / newTranscripts.length) : 0,
      dataLocations: {
        transcriptFiles: this.transcriptDir,
        database: 'transcripts table',
        report: './data/transcript-collection-report.json'
      },
      newTranscriptDetails: newTranscripts.map(t => ({
        videoId: t.videoId,
        title: t.title,
        wordCount: t.wordCount,
        hasTimestamps: t.timestamps && t.timestamps.length > 0,
        publishedAt: t.publishedAt
      }))
    };
    
    await fs.writeFile('./data/transcript-collection-report.json', JSON.stringify(report, null, 2));
    console.log('📋 Report saved to ./data/transcript-collection-report.json');
    
    return report;
  }
}

// Main execution
async function main() {
  const collector = new DatabaseTranscriptCollector();
  
  try {
    const results = await collector.start();
    
    console.log('\n🎯 MISSION ACCOMPLISHED!');
    console.log('=========================');
    console.log(`📹 Database Videos: ${results.videos.length}`);
    console.log(`📝 New Transcripts: ${results.transcripts.length}`);
    console.log(`📊 Total Words: ${results.report.newTranscriptWords.toLocaleString()}`);
    console.log(`💾 Files Location: ${collector.transcriptDir}`);
    console.log(`📈 Success Rate: ${results.report.overallSuccessRate}`);
    
  } catch (error) {
    console.error('❌ Collection failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default DatabaseTranscriptCollector;