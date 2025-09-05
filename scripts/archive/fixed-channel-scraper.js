#!/usr/bin/env node

/**
 * Fixed Channel Scraper
 * Uses correct input format for Apify YouTube Channel Scraper
 */

import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';
import fs from 'fs/promises';

// Load environment variables
dotenv.config({ path: './backend/.env' });

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN
});

async function getHubermanVideos() {
  console.log('🔍 Testing YouTube Channel Scraper with correct input format...');
  console.log('🔑 API Token:', process.env.APIFY_API_TOKEN ? 'Found ✅' : 'Missing ❌');
  
  if (!process.env.APIFY_API_TOKEN) {
    console.error('❌ APIFY_API_TOKEN is required');
    return;
  }

  // Create data directory
  await fs.mkdir('./data', { recursive: true });

  // Different input formats to try based on the error message
  const inputConfigs = [
    {
      name: 'YouTube Handle Format',
      input: {
        youtubeHandles: ['@hubermanlab'],
        maxVideos: 50,
        includeVideoDetails: true
      }
    },
    {
      name: 'Start URLs Format',
      input: {
        startUrls: [
          'https://www.youtube.com/@hubermanlab',
          'https://www.youtube.com/channel/UC2D2CMWXMOVWx7giW1n3LIg'
        ],
        maxVideos: 50,
        includeVideoDetails: true
      }
    },
    {
      name: 'Keywords Format',
      input: {
        keywords: ['huberman lab'],
        maxVideos: 50,
        includeVideoDetails: true
      }
    },
    {
      name: 'Channel URLs in startUrls',
      input: {
        startUrls: [
          { url: 'https://www.youtube.com/@hubermanlab' },
          { url: 'https://www.youtube.com/channel/UC2D2CMWXMOVWx7giW1n3LIg' }
        ],
        maxVideos: 50,
        includeVideoDetails: true
      }
    }
  ];

  for (let i = 0; i < inputConfigs.length; i++) {
    const config = inputConfigs[i];
    console.log(`\n🔍 [${i + 1}/${inputConfigs.length}] Testing: ${config.name}`);
    
    try {
      console.log('📊 Input:', JSON.stringify(config.input, null, 2));
      console.log('🕷️ Running YouTube Channel Scraper...');
      
      const run = await apifyClient.actor('1p1aa7gcSydPkAE0d').call(config.input);
      console.log(`📊 Run ID: ${run.id}`);
      console.log(`🔗 Monitor: https://console.apify.com/actors/runs/${run.id}`);
      
      console.log('⏳ Waiting for completion...');
      
      // Get results
      const { items: videos } = await apifyClient.dataset(run.defaultDatasetId).listItems();
      console.log(`📊 Results: ${videos.length} videos found`);
      
      if (videos.length > 0) {
        console.log('✅ SUCCESS! This input format worked');
        
        // Show sample video
        console.log('📋 Sample video:');
        console.log(JSON.stringify(videos[0], null, 2));
        
        // Show video titles
        console.log('\n📊 Video titles found:');
        videos.slice(0, 10).forEach((video, idx) => {
          console.log(`   ${idx + 1}. ${video.title || video.name || 'No title'}`);
        });
        
        // Save results
        await fs.writeFile('./data/huberman-videos-test.json', JSON.stringify(videos, null, 2));
        console.log(`💾 Saved ${videos.length} videos to ./data/huberman-videos-test.json`);
        
        // Extract URLs
        const videoUrls = videos.map(video => video.url).filter(Boolean);
        await fs.writeFile('./data/huberman-urls-test.json', JSON.stringify(videoUrls, null, 2));
        console.log(`💾 Saved ${videoUrls.length} URLs to ./data/huberman-urls-test.json`);
        
        return { success: true, config: config.name, videos };
      } else {
        console.log('⚠️ No videos found with this input format');
      }
      
    } catch (error) {
      console.error(`❌ Error with ${config.name}:`, error.message);
      
      // Log more details about the error
      if (error.data) {
        console.log('📋 Error details:', JSON.stringify(error.data, null, 2));
      }
      
      if (error.message.includes('quota') || error.message.includes('limit')) {
        console.log('🛑 API quota/limit reached. Stopping tests.');
        break;
      }
    }
    
    // Delay between attempts
    if (i < inputConfigs.length - 1) {
      console.log('⏳ Waiting 15 seconds before next attempt...');
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }
  
  console.log('\n📋 Test Complete');
  console.log('================');
  console.log('If no format worked, the actor might have specific requirements.');
  console.log('Check the actor documentation: https://console.apify.com/actors/1p1aa7gcSydPkAE0d');
}

// Run the test
getHubermanVideos().catch(console.error);