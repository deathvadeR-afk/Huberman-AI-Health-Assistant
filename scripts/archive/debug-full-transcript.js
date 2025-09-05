#!/usr/bin/env node

/**
 * Debug Full Transcript Structure
 * Downloads one transcript and shows the complete structure
 */

import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';
import fs from 'fs/promises';

// Load environment variables
dotenv.config({ path: './backend/.env' });

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN
});

async function debugFullTranscript() {
  console.log('🔍 Debugging full transcript structure...');
  
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
      const transcript = transcripts[0];
      
      console.log('📋 Full transcript object keys:');
      console.log(Object.keys(transcript));
      
      console.log('\n📋 Full transcript structure:');
      console.log(JSON.stringify(transcript, null, 2));
      
      // Save to debug file
      await fs.writeFile('./data/debug-transcript-full.json', JSON.stringify(transcript, null, 2));
      console.log('\n💾 Full transcript saved to ./data/debug-transcript-full.json');
      
      // Process the transcript
      if (transcript.transcript && Array.isArray(transcript.transcript)) {
        let fullText = '';
        let timestamps = [];
        
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
        
        const processedTranscript = {
          videoId: 'SwQhKFMxmDY',
          url: 'https://www.youtube.com/watch?v=SwQhKFMxmDY',
          title: transcript.title,
          fullTranscript: fullText.trim(),
          timestamps: timestamps,
          wordCount: fullText.trim().split(' ').length,
          language: 'en',
          downloadedAt: new Date().toISOString()
        };
        
        await fs.writeFile('./data/debug-transcript-processed.json', JSON.stringify(processedTranscript, null, 2));
        console.log('💾 Processed transcript saved to ./data/debug-transcript-processed.json');
        
        console.log(`\n📊 Transcript Stats:`);
        console.log(`   Title: ${transcript.title}`);
        console.log(`   Word Count: ${processedTranscript.wordCount}`);
        console.log(`   Segments: ${timestamps.length}`);
        console.log(`   Duration: ${Math.max(...timestamps.map(t => t.start + t.duration))} seconds`);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugFullTranscript();