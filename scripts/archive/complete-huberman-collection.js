#!/usr/bin/env node

/**
 * Complete Huberman Lab Collection
 * Uses both Apify actors to collect ALL videos and transcripts from Huberman Lab channel
 * 
 * Actors used:
 * - Channel Scraper: https://console.apify.com/actors/1p1aa7gcSydPkAE0d
 * - Transcript Scraper: https://console.apify.com/actors/faVsWy9VTSNVIhWpR
 */

import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables
dotenv.config({ path: './backend/.env' });

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN
});

class HubermanCollector {
  constructor() {
    this.CHANNEL_SCRAPER_ID = '1p1aa7gcSydPkAE0d';
    this.TRANSCRIPT_SCRAPER_ID = 'faVsWy9VTSNVIhWpR';
    
    // Different channel URL formats to try
    this.CHANNEL_URLS = [
      'https://www.youtube.com/channel/UC2D2CMWXMOVWx7giW1n3LIg', // Channel ID format
      'https://www.youtube.com/@hubermanlab',                      // Handle format
      'https://www.youtube.com/c/AndrewHubermanLab',               // Custom URL format
      'https://www.youtube.com/user/hubermanlab'                   // User format (if exists)
    ];
    
    this.dataDir = './data';
    this.transcriptDir = './data/transcripts';
  }

  async start() {
    console.log('🚀 Starting COMPLETE Huberman Lab collection...');
    console.log('🔑 API Token:', process.env.APIFY_API_TOKEN ? 'Found ✅' : 'Missing ❌');
    
    if (!process.env.APIFY_API_TOKEN) {
      throw new Error('APIFY_API_TOKEN is required. Please set it in backend/.env');
    }

    try {
      // Create directories
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.transcriptDir, { recursive: true });

      // Step 1: Get ALL videos from channel
      console.log('\n📹 STEP 1: Getting ALL videos from Huberman Lab channel...');
      const videos = await this.getAllChannelVideos();
      
      if (videos.length === 0) {
        throw new Error('No videos found from any channel URL format');
      }

      console.log(`✅ Found ${videos.length} total videos`);

      // Step 2: Download transcripts for ALL videos
      console.log('\n📝 STEP 2: Downloading transcripts for ALL videos...');
      const transcripts = await this.downloadAllTranscripts(videos);

      // Step 3: Generate final report
      const report = await this.generateReport(videos, transcripts);
      
      console.log('\n🎉 COMPLETE COLLECTION FINISHED!');
      console.log('=====================================');
      console.log(`📹 Total Videos: ${videos.length}`);
      console.log(`📝 Total Transcripts: ${transcripts.length}`);
      console.log(`📊 Success Rate: ${((transcripts.length / videos.length) * 100).toFixed(1)}%`);
      console.log(`💾 Data saved to: ${this.dataDir}`);
      
      return { videos, transcripts, report };

    } catch (error) {
      console.error('❌ Collection failed:', error);
      throw error;
    }
  }

  async getAllChannelVideos() {
    console.log('🕷️ Testing Channel Scraper with different URL formats...');
    
    for (let i = 0; i < this.CHANNEL_URLS.length; i++) {
      const channelUrl = this.CHANNEL_URLS[i];
      console.log(`\n🔍 [${i + 1}/${this.CHANNEL_URLS.length}] Trying: ${channelUrl}`);
      
      try {
        const input = {
          channelUrls: [channelUrl],
          maxVideos: 1000, // Get ALL videos
          includeVideoDetails: true,
          includeComments: false,
          includeSubtitles: false,
          sortBy: 'newest'
        };

        console.log('📊 Input parameters:', JSON.stringify(input, null, 2));
        console.log('🕷️ Running Channel Scraper...');
        
        const run = await apifyClient.actor(this.CHANNEL_SCRAPER_ID).call(input);
        console.log(`📊 Run ID: ${run.id}`);
        console.log('⏳ Waiting for completion...');
        
        // Get results
        const { items: videos } = await apifyClient.dataset(run.defaultDatasetId).listItems();
        console.log(`📊 Raw results: ${videos.length} items`);
        
        if (videos.length > 0) {
          console.log('✅ SUCCESS! Found videos with this URL format');
          console.log('📋 Sample video:', JSON.stringify(videos[0], null, 2));
          
          // Process and clean video data
          const processedVideos = this.processVideoData(videos);
          
          // Save video data
          await fs.writeFile(
            path.join(this.dataDir, 'all-huberman-videos.json'), 
            JSON.stringify(processedVideos, null, 2)
          );
          
          const videoUrls = processedVideos.map(v => v.url).filter(Boolean);
          await fs.writeFile(
            path.join(this.dataDir, 'huberman-video-urls.json'), 
            JSON.stringify(videoUrls, null, 2)
          );
          
          console.log(`💾 Saved ${processedVideos.length} videos and ${videoUrls.length} URLs`);
          return processedVideos;
        } else {
          console.log('⚠️ No videos found with this URL format');
        }
        
      } catch (error) {
        console.error(`❌ Failed with ${channelUrl}:`, error.message);
        
        // If it's a quota/limit error, we should stop trying
        if (error.message.includes('quota') || error.message.includes('limit')) {
          console.log('🛑 API quota/limit reached. Stopping attempts.');
          break;
        }
        
        continue;
      }
    }
    
    // If we get here, none of the URLs worked
    console.log('\n⚠️ Channel scraper didn\'t find videos with any URL format.');
    console.log('🔧 This could be due to:');
    console.log('   - API quota limits');
    console.log('   - Channel privacy settings');
    console.log('   - Actor configuration issues');
    console.log('   - Temporary YouTube API issues');
    
    // Return empty array - we'll use manual video list as fallback
    return [];
  }

  processVideoData(rawVideos) {
    return rawVideos.map(video => ({
      id: this.extractVideoId(video.url) || video.id,
      url: video.url,
      title: video.title,
      description: video.description,
      duration: video.duration,
      viewCount: video.viewCount,
      publishedAt: video.publishedAt,
      thumbnailUrl: video.thumbnailUrl,
      channelTitle: video.channelTitle || 'Huberman Lab'
    })).filter(video => video.id && video.url);
  }

  async downloadAllTranscripts(videos) {
    if (videos.length === 0) {
      console.log('⚠️ No videos provided for transcript download');
      return [];
    }

    console.log(`📝 Starting transcript download for ${videos.length} videos...`);
    
    const batchSize = 5; // Small batches to avoid overwhelming the API
    const allTranscripts = [];
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
        
        console.log(`📹 [${videoNum}/${videos.length}] ${video.title || video.id}`);
        
        try {
          const transcript = await this.downloadSingleTranscript(video);
          
          if (transcript && transcript.transcript) {
            // Process and save transcript
            const processedTranscript = this.processTranscriptData(transcript, video);
            allTranscripts.push(processedTranscript);
            
            await this.saveTranscript(processedTranscript);
            
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
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      // Longer delay between batches
      if (i + batchSize < videos.length) {
        console.log(`⏳ Batch complete. Waiting 30 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
      
      // Progress update
      const remaining = videos.length - successCount - failCount;
      console.log(`📊 Progress: ${successCount} success, ${failCount} failed, ${remaining} remaining`);
    }
    
    console.log(`\n✅ Transcript download complete!`);
    console.log(`📊 Final: ${successCount} successful, ${failCount} failed`);
    
    return allTranscripts;
  }

  async downloadSingleTranscript(video) {
    const input = {
      videoUrl: video.url,
      language: 'en'
    };

    const run = await apifyClient.actor(this.TRANSCRIPT_SCRAPER_ID).call(input);
    const { items: transcripts } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    
    return transcripts.length > 0 ? transcripts[0] : null;
  }

  processTranscriptData(transcript, video) {
    let fullText = '';
    let timestamps = [];
    
    // Process transcript array format
    if (Array.isArray(transcript.transcript)) {
      for (const segment of transcript.transcript) {
        if (segment.text) {
          fullText += segment.text + ' ';
          timestamps.push({
            start: parseFloat(segment.start || 0),
            duration: parseFloat(segment.dur || 0),
            text: segment.text
          });
        }
      }
    } else if (typeof transcript.transcript === 'string') {
      fullText = transcript.transcript;
    }
    
    fullText = fullText.trim();
    
    return {
      videoId: video.id,
      url: video.url,
      title: video.title || transcript.title,
      description: video.description,
      fullTranscript: fullText,
      timestamps: timestamps,
      wordCount: fullText.split(' ').length,
      language: transcript.language || 'en',
      downloadedAt: new Date().toISOString()
    };
  }

  async saveTranscript(transcript) {
    const filename = `${transcript.videoId}.json`;
    const filepath = path.join(this.transcriptDir, filename);
    await fs.writeFile(filepath, JSON.stringify(transcript, null, 2));
  }

  async generateReport(videos, transcripts) {
    const report = {
      collectionDate: new Date().toISOString(),
      totalVideos: videos.length,
      totalTranscripts: transcripts.length,
      successRate: videos.length > 0 ? ((transcripts.length / videos.length) * 100).toFixed(1) + '%' : '0%',
      totalWords: transcripts.reduce((sum, t) => sum + (t.wordCount || 0), 0),
      averageWordsPerTranscript: transcripts.length > 0 ? Math.round(transcripts.reduce((sum, t) => sum + (t.wordCount || 0), 0) / transcripts.length) : 0,
      dataLocation: {
        videos: path.join(this.dataDir, 'all-huberman-videos.json'),
        transcripts: this.transcriptDir,
        report: path.join(this.dataDir, 'collection-report.json')
      },
      topicsCovered: this.extractTopics(videos),
      transcriptStats: transcripts.map(t => ({
        videoId: t.videoId,
        title: t.title,
        wordCount: t.wordCount,
        hasTimestamps: t.timestamps && t.timestamps.length > 0
      }))
    };
    
    await fs.writeFile(
      path.join(this.dataDir, 'collection-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    return report;
  }

  extractTopics(videos) {
    const topics = new Set();
    videos.forEach(video => {
      if (video.title) {
        const title = video.title.toLowerCase();
        if (title.includes('sleep')) topics.add('Sleep');
        if (title.includes('exercise') || title.includes('fitness')) topics.add('Exercise');
        if (title.includes('nutrition') || title.includes('diet')) topics.add('Nutrition');
        if (title.includes('focus') || title.includes('attention')) topics.add('Focus');
        if (title.includes('stress') || title.includes('anxiety')) topics.add('Stress');
        if (title.includes('dopamine') || title.includes('neurotransmitter')) topics.add('Neuroscience');
        if (title.includes('supplement')) topics.add('Supplements');
        if (title.includes('light') || title.includes('circadian')) topics.add('Light & Circadian');
        if (title.includes('cold') || title.includes('heat')) topics.add('Temperature');
        if (title.includes('learning') || title.includes('memory')) topics.add('Learning');
      }
    });
    return Array.from(topics);
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
}

// Main execution
async function main() {
  const collector = new HubermanCollector();
  
  try {
    const results = await collector.start();
    
    console.log('\n🎯 COLLECTION COMPLETE!');
    console.log('========================');
    console.log(`📹 Videos: ${results.videos.length}`);
    console.log(`📝 Transcripts: ${results.transcripts.length}`);
    console.log(`📊 Total Words: ${results.report.totalWords.toLocaleString()}`);
    console.log(`💾 Data Location: ${collector.dataDir}`);
    
  } catch (error) {
    console.error('❌ Collection failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default HubermanCollector;