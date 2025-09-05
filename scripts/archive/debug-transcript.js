#!/usr/bin/env node

/**
 * Debug script to see transcript data structure
 */

import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './backend/.env' });

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN
});

async function debugTranscript() {
  console.log('🔍 Debugging transcript structure...');
  
  try {
    const input = {
      videoUrl: 'https://www.youtube.com/watch?v=SwQhKFMxmDY', // Master Your Sleep
      language: 'en'
    };

    console.log('🕷️ Running Apify YouTube Transcript Scraper...');
    const run = await apifyClient.actor('faVsWy9VTSNVIhWpR').call(input);
    
    console.log(`📊 Scraper run ID: ${run.id}`);
    
    // Get results
    const { items: transcripts } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    
    console.log(`✅ Downloaded ${transcripts.length} transcript(s)`);
    
    if (transcripts.length > 0) {
      console.log('📋 First transcript structure:');
      console.log(JSON.stringify(transcripts[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugTranscript();