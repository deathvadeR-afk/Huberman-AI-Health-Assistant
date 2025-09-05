#!/usr/bin/env node

/**
 * Get ALL Huberman Lab Videos
 * First step: Get all video URLs from the channel
 */

import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';
import fs from 'fs/promises';

// Load environment variables
dotenv.config({ path: './backend/.env' });

console.log('🔑 API Token:', process.env.APIFY_API_TOKEN ? 'Found' : 'Missing');

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN
});

async function getAllHubermanVideos() {
  console.log('🚀 Getting ALL Huberman Lab videos...');
  
  try {
    // Create data directory
    await fs.mkdir('./data', { recursive: true });
    
    // Try different channel URL formats
    const channelFormats = [
      'https://www.youtube.com/channel/UC2D2CMWXMOVWx7giW1n3LIg',
      'https://www.youtube.com/@hubermanlab',
      'https://www.youtube.com/c/AndrewHubermanLab'
    ];
    
    let videos = [];
    
    for (const channelUrl of channelFormats) {
      console.log(`🔍 Trying channel URL: ${channelUrl}`);
      
      const input = {
        channelUrls: [channelUrl],
        maxVideos: 500,
        includeVideoDetails: true,
        includeComments: false,
        includeSubtitles: false
      };

      try {
        console.log('🕷️ Running Apify Channel Scraper...');
        const run = await apifyClient.actor('1p1aa7gcSydPkAE0d').call(input);
        
        console.log(`📊 Scraper run ID: ${run.id}`);
        console.log('⏳ Waiting for scraper to complete...');
        
        // Get results
        const { items: channelVideos } = await apifyClient.dataset(run.defaultDatasetId).listItems();
        
        console.log(`✅ Found ${channelVideos.length} videos from ${channelUrl}`);
        
        if (channelVideos.length > 0) {
          videos = channelVideos;
          break; // Success! Use these videos
        }
      } catch (error) {
        console.error(`❌ Failed with ${channelUrl}:`, error.message);
        continue;
      }
    }

    console.log('🕷️ Running Apify Channel Scraper...');
    console.log('📊 Input:', JSON.stringify(input, null, 2));
    
    const run = await apifyClient.actor('1p1aa7gcSydPkAE0d').call(input);
    
    console.log(`📊 Scraper run ID: ${run.id}`);
    console.log('⏳ Waiting for scraper to complete...');
    
    // This section is now handled in the loop above
    
    console.log(`✅ Found ${videos.length} videos`);
    
    if (videos.length > 0) {
      console.log('📋 First video sample:');
      console.log(JSON.stringify(videos[0], null, 2));
    }
    
    // Save all videos to file
    await fs.writeFile('./data/all-huberman-videos.json', JSON.stringify(videos, null, 2));
    console.log('💾 Saved all videos to ./data/all-huberman-videos.json');
    
    // Extract just URLs for transcript downloading
    const videoUrls = videos.map(video => video.url).filter(Boolean);
    await fs.writeFile('./data/huberman-video-urls.json', JSON.stringify(videoUrls, null, 2));
    console.log(`💾 Saved ${videoUrls.length} video URLs to ./data/huberman-video-urls.json`);
    
    console.log('🎉 Video collection completed!');
    console.log(`📊 Total videos: ${videos.length}`);
    console.log(`📊 Valid URLs: ${videoUrls.length}`);
    
    return videos;
    
  } catch (error) {
    console.error('❌ Video collection failed:', error);
    throw error;
  }
}

// Run the collector
getAllHubermanVideos().catch(console.error);