#!/usr/bin/env node

/**
 * Debug Channel Scraper
 * Test the Apify Channel Scraper with different configurations
 */

import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './backend/.env' });

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN
});

async function debugChannelScraper() {
  console.log('🔍 Debugging Apify Channel Scraper...');
  console.log('🔑 API Token:', process.env.APIFY_API_TOKEN ? 'Found ✅' : 'Missing ❌');
  
  if (!process.env.APIFY_API_TOKEN) {
    console.error('❌ APIFY_API_TOKEN is required. Please set it in backend/.env');
    return;
  }

  const channelConfigs = [
    {
      name: 'Channel ID Format',
      url: 'https://www.youtube.com/channel/UC2D2CMWXMOVWx7giW1n3LIg',
      maxVideos: 10 // Start small for testing
    },
    {
      name: 'Handle Format',
      url: 'https://www.youtube.com/@hubermanlab',
      maxVideos: 10
    },
    {
      name: 'Custom URL Format',
      url: 'https://www.youtube.com/c/AndrewHubermanLab',
      maxVideos: 10
    }
  ];

  for (let i = 0; i < channelConfigs.length; i++) {
    const config = channelConfigs[i];
    console.log(`\n🔍 [${i + 1}/${channelConfigs.length}] Testing: ${config.name}`);
    console.log(`🔗 URL: ${config.url}`);
    
    try {
      const input = {
        channelUrls: [config.url],
        maxVideos: config.maxVideos,
        includeVideoDetails: true,
        includeComments: false,
        includeSubtitles: false
      };

      console.log('📊 Input:', JSON.stringify(input, null, 2));
      console.log('🕷️ Running Channel Scraper...');
      
      const run = await apifyClient.actor('1p1aa7gcSydPkAE0d').call(input);
      console.log(`📊 Run ID: ${run.id}`);
      console.log(`🔗 Run URL: https://console.apify.com/actors/runs/${run.id}`);
      
      console.log('⏳ Waiting for completion...');
      
      // Get results
      const { items: videos } = await apifyClient.dataset(run.defaultDatasetId).listItems();
      console.log(`📊 Results: ${videos.length} videos found`);
      
      if (videos.length > 0) {
        console.log('✅ SUCCESS! Channel scraper worked with this configuration');
        console.log('📋 First video sample:');
        console.log(JSON.stringify(videos[0], null, 2));
        
        console.log('\n📊 Video titles found:');
        videos.slice(0, 5).forEach((video, idx) => {
          console.log(`   ${idx + 1}. ${video.title || 'No title'}`);
        });
        
        return { success: true, config, videos };
      } else {
        console.log('⚠️ No videos found with this configuration');
      }
      
    } catch (error) {
      console.error(`❌ Error with ${config.name}:`, error.message);
      
      // Check if it's a specific error type
      if (error.message.includes('quota')) {
        console.log('🛑 API quota exceeded. Stopping tests.');
        break;
      } else if (error.message.includes('not found')) {
        console.log('🔍 Channel not found with this URL format');
      } else if (error.message.includes('timeout')) {
        console.log('⏰ Request timed out');
      }
    }
    
    // Small delay between attempts
    if (i < channelConfigs.length - 1) {
      console.log('⏳ Waiting 10 seconds before next attempt...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  console.log('\n📋 Debug Summary:');
  console.log('================');
  console.log('If no configuration worked, possible issues:');
  console.log('1. 🔑 API token invalid or expired');
  console.log('2. 📊 API quota/rate limits reached');
  console.log('3. 🔒 Channel privacy settings');
  console.log('4. 🕷️ Actor configuration or YouTube API changes');
  console.log('5. 🌐 Network connectivity issues');
  
  console.log('\n🔧 Troubleshooting steps:');
  console.log('1. Check Apify console: https://console.apify.com/actors/1p1aa7gcSydPkAE0d');
  console.log('2. Verify API token in Apify settings');
  console.log('3. Check account usage/limits');
  console.log('4. Try running the actor manually in Apify console');
}

// Run the debug
debugChannelScraper().catch(console.error);