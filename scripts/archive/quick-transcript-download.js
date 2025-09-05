#!/usr/bin/env node

/**
 * Quick Huberman Lab Transcript Downloader
 * Downloads transcripts for popular Huberman Lab videos
 */

import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';
import fs from 'fs/promises';

// Load environment variables
dotenv.config({ path: './backend/.env' });

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN
});

// Popular Huberman Lab videos to start with
const HUBERMAN_VIDEOS = [
  'https://www.youtube.com/watch?v=SwQhKFMxmDY', // Master Your Sleep
  'https://www.youtube.com/watch?v=nm1TxQj9IsQ', // Brain-Body Function
  'https://www.youtube.com/watch?v=ClxRHJPz8aQ', // Morning Routine
  'https://www.youtube.com/watch?v=QmOF0crdyRU', // Exercise Science
  'https://www.youtube.com/watch?v=E7W4OQfJWdw', // Nutrition
  'https://www.youtube.com/watch?v=h-1BuZFmmX4', // Focus & Attention
  'https://www.youtube.com/watch?v=yS6kNBXQQyg', // Stress Management
  'https://www.youtube.com/watch?v=OTd73bvZNT0', // Cold Exposure
  'https://www.youtube.com/watch?v=x4m_PdFbu-s', // Heat Exposure
  'https://www.youtube.com/watch?v=QyDFy_ofM0Q', // Dopamine
  'https://www.youtube.com/watch?v=8IWDAqodDas', // Light & Health
  'https://www.youtube.com/watch?v=rLQKjFpansQ', // Supplements
  'https://www.youtube.com/watch?v=DsVzKCk066g', // Alcohol
  'https://www.youtube.com/watch?v=tEmt1Znux58', // Caffeine
  'https://www.youtube.com/watch?v=CpgajbQYFVQ'  // Meditation
];

async function downloadTranscripts() {
  console.log('🚀 Starting quick transcript download for Huberman Lab videos...');
  console.log(`📹 Processing ${HUBERMAN_VIDEOS.length} videos`);
  
  try {
    // Create data directory
    await fs.mkdir('./data/transcripts', { recursive: true });
    
    // Process one video at a time to avoid API issues
    const allTranscripts = [];
    
    for (let i = 0; i < HUBERMAN_VIDEOS.length; i++) {
      const videoUrl = HUBERMAN_VIDEOS[i];
      console.log(`📹 Processing video ${i + 1}/${HUBERMAN_VIDEOS.length}: ${videoUrl}`);
      
      try {
        const input = {
          videoUrl: videoUrl,
          language: 'en'
        };

        console.log('🕷️ Running Apify YouTube Transcript Scraper...');
        const run = await apifyClient.actor('faVsWy9VTSNVIhWpR').call(input);
        
        console.log(`📊 Scraper run ID: ${run.id}`);
        
        // Get results
        const { items: transcripts } = await apifyClient.dataset(run.defaultDatasetId).listItems();
        allTranscripts.push(...transcripts);
        
        console.log(`✅ Downloaded transcript for video ${i + 1}`);
        
        // Small delay between requests
        if (i < HUBERMAN_VIDEOS.length - 1) {
          console.log('⏳ Waiting 5 seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
      } catch (error) {
        console.error(`❌ Failed to download transcript for video ${i + 1}:`, error.message);
        continue;
      }
    }

    console.log('🕷️ Running Apify YouTube Transcript Scraper...');
    const run = await apifyClient.actor('faVsWy9VTSNVIhWpR').call(input);
    
    console.log(`📊 Scraper run ID: ${run.id}`);
    console.log('⏳ Waiting for scraper to complete...');
    
    // Get results
    const { items: transcripts } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    
    console.log(`✅ Downloaded ${allTranscripts.length} transcripts total`);
    
    // Save transcripts
    let savedCount = 0;
    for (const transcript of allTranscripts) {
      try {
        const videoId = extractVideoId(transcript.url || transcript.videoUrl);
        if (!videoId) continue;
        
        const filename = `${videoId}.json`;
        const transcriptData = {
          videoId: videoId,
          url: transcript.url || transcript.videoUrl,
          title: transcript.title,
          transcript: transcript.transcript || transcript.text,
          timestamps: transcript.timestamps,
          language: transcript.language || 'en',
          downloadedAt: new Date().toISOString()
        };
        
        await fs.writeFile(`./data/transcripts/${filename}`, JSON.stringify(transcriptData, null, 2));
        savedCount++;
        
        console.log(`💾 Saved: ${transcript.title || videoId}`);
        
      } catch (error) {
        console.error('❌ Failed to save transcript:', error);
      }
    }
    
    console.log('🎉 Transcript download completed!');
    console.log(`📊 Successfully saved ${savedCount} transcripts to ./data/transcripts/`);
    
    return allTranscripts;
    
  } catch (error) {
    console.error('❌ Transcript download failed:', error);
    throw error;
  }
}

function extractVideoId(url) {
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

// Run the downloader
downloadTranscripts().catch(console.error);