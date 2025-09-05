#!/usr/bin/env node

/**
 * Download ALL Huberman Lab Transcripts - Manual Approach
 * Uses a comprehensive list of known Huberman Lab videos
 */

import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';
import fs from 'fs/promises';

// Load environment variables
dotenv.config({ path: './backend/.env' });

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN
});

// Comprehensive list of Huberman Lab videos (major episodes)
const HUBERMAN_VIDEOS = [
  // Sleep & Circadian Rhythm
  'https://www.youtube.com/watch?v=SwQhKFMxmDY', // Master Your Sleep & Be More Alert When Awake
  'https://www.youtube.com/watch?v=NAATB55oxeQ', // Sleep Toolkit: Tools for Optimizing Sleep & Sleep-Wake Timing
  'https://www.youtube.com/watch?v=gbQFSMayJxk', // Find Your Temperature Minimum to Defeat Jetlag, Shift Work & Sleeplessness
  'https://www.youtube.com/watch?v=jOb6l2MnKKs', // Using Sleep to Improve Learning, Memory & Emotional State
  
  // Exercise & Movement
  'https://www.youtube.com/watch?v=QmOF0crdyRU', // The Science of Making & Breaking Habits
  'https://www.youtube.com/watch?v=IAnhFUUCq6c', // Fitness Toolkit: Protocol & Tools to Optimize Physical Health
  'https://www.youtube.com/watch?v=sTANio_2E0Q', // Science-Supported Tools to Accelerate Your Fitness Goals
  'https://www.youtube.com/watch?v=t1F7EEGPQwo', // Maximizing Productivity, Physical & Mental Health with Daily Tools
  
  // Nutrition & Supplements
  'https://www.youtube.com/watch?v=E7W4OQfJWdw', // What & When to Eat for Health, Longevity & Performance
  'https://www.youtube.com/watch?v=rLQKjFpansQ', // Developing a Rational Approach to Supplementation for Health & Performance
  'https://www.youtube.com/watch?v=tEmt1Znux58', // Using Caffeine to Optimize Mental & Physical Performance
  'https://www.youtube.com/watch?v=DsVzKCk066g', // What Alcohol Does to Your Body, Brain & Health
  
  // Focus & Attention
  'https://www.youtube.com/watch?v=h-1BuZFmmX4', // Focus Toolkit: Tools to Improve Your Focus & Concentration
  'https://www.youtube.com/watch?v=LG53Vxum0as', // ADHD & How Anyone Can Improve Their Focus
  'https://www.youtube.com/watch?v=yS6kNBXQQyg', // Tools for Managing Stress & Anxiety
  'https://www.youtube.com/watch?v=CpgajbQYFVQ', // The Science of Meditation & Mindfulness
  
  // Hormones & Biology
  'https://www.youtube.com/watch?v=QyDFy_ofM0Q', // Controlling Your Dopamine For Motivation, Focus & Satisfaction
  'https://www.youtube.com/watch?v=qJXKhu5UZwk', // The Science of Emotions & Relationships
  'https://www.youtube.com/watch?v=LOC_b8TnVP8', // How to Optimize Testosterone & Estrogen
  'https://www.youtube.com/watch?v=ncSoor2Iw5k', // The Science of Healthy Hair, Hair Loss and How to Regrow Hair
  
  // Light & Environment
  'https://www.youtube.com/watch?v=8IWDAqodDas', // Using Light (Sunlight, Blue Light & Red Light) to Optimize Health
  'https://www.youtube.com/watch?v=OTd73bvZNT0', // The Science & Use of Cold Exposure for Health & Performance
  'https://www.youtube.com/watch?v=x4m_PdFbu-s', // The Science & Use of Heat & Sauna for Health & Performance
  'https://www.youtube.com/watch?v=ClxRHJPz8aQ', // Optimize & Control Your Brain Chemistry to Improve Health & Performance
  
  // Learning & Memory
  'https://www.youtube.com/watch?v=hx3U64IXFOY', // How to Learn Skills Faster
  'https://www.youtube.com/watch?v=aXvDEmo6uS4', // How to Focus to Change Your Brain
  'https://www.youtube.com/watch?v=F4pymhLeMdA', // The Science of Learning & Memory
  'https://www.youtube.com/watch?v=SwQhKFMxmDY', // Neuroplasticity & How to Change Your Brain
  
  // Pain & Recovery
  'https://www.youtube.com/watch?v=gLVZ_s6uYOs', // The Science of Pain & How to Control It
  'https://www.youtube.com/watch?v=B9zTaNd8XMA', // How to Build Physical Endurance & Lose Fat
  'https://www.youtube.com/watch?v=je5vWaWBXyY', // Science-Based Tools for Increasing Happiness
  'https://www.youtube.com/watch?v=Wcs2PFz5q6g', // How to Stop Headaches Using Science-Based Approaches
  
  // Mental Health
  'https://www.youtube.com/watch?v=ntfcfJ28eiU', // How to Deal with Depression
  'https://www.youtube.com/watch?v=H-XfCl-HpRM', // Understanding & Conquering Depression
  'https://www.youtube.com/watch?v=L_QE0DjPHpU', // Erasing Fears & Traumas Based on the Modern Neuroscience of Fear
  'https://www.youtube.com/watch?v=8E6OJfNzMNs', // How Meditation Works & Science-Based Effective Meditations
  
  // Productivity & Performance
  'https://www.youtube.com/watch?v=nm1TxQj9IsQ', // How to Optimize Your Brain-Body Function & Health
  'https://www.youtube.com/watch?v=QmOF0crdyRU', // The Science of Making & Breaking Habits
  'https://www.youtube.com/watch?v=t1F7EEGPQwo', // Maximizing Productivity, Physical & Mental Health with Daily Tools
  'https://www.youtube.com/watch?v=yQiTe8WJw-M', // Science-Based Mental Training & Visualization for Improved Learning
  
  // Relationships & Social
  'https://www.youtube.com/watch?v=K-TW2Chpz4k', // The Science of Love, Desire and Attachment
  'https://www.youtube.com/watch?v=qJXKhu5UZwk', // The Science of Emotions & Relationships
  'https://www.youtube.com/watch?v=DW_jju8P7Zo', // How to Build & Maintain Healthy Relationships
  'https://www.youtube.com/watch?v=lI9Qb4PapaE', // The Science of Social Bonding in Family, Friendship & Romantic Love
  
  // Aging & Longevity
  'https://www.youtube.com/watch?v=CjdvkFvXXdU', // The Science of Healthy Aging
  'https://www.youtube.com/watch?v=aA10hkVhvtE', // How to Slow Aging (and even reverse it)
  'https://www.youtube.com/watch?v=PjycQ5QRHEI', // The Science of Longevity & How to Live Longer
  'https://www.youtube.com/watch?v=ufsIA5NARIo', // How to Build Muscle, Lose Fat & Maintain Health
  
  // Specialized Topics
  'https://www.youtube.com/watch?v=OV8yKc2hvIM', // The Science of Creativity & How to Enhance Creative Innovation
  'https://www.youtube.com/watch?v=ArwcGjWmqWU', // How to Enhance Performance & Learning by Applying a Growth Mindset
  'https://www.youtube.com/watch?v=QmOF0crdyRU', // Goal Setting & Achieving Goals Based on Science
  'https://www.youtube.com/watch?v=jL7KHkmJ5vU'  // The Science of Gratitude & How to Build a Gratitude Practice
];

async function downloadAllTranscripts() {
  console.log('🚀 Starting comprehensive Huberman Lab transcript download...');
  console.log(`📹 Processing ${HUBERMAN_VIDEOS.length} videos`);
  
  try {
    // Create data directory
    await fs.mkdir('./data/transcripts', { recursive: true });
    
    const allTranscripts = [];
    let successCount = 0;
    let failCount = 0;
    
    // Process videos one by one with progress tracking
    for (let i = 0; i < HUBERMAN_VIDEOS.length; i++) {
      const videoUrl = HUBERMAN_VIDEOS[i];
      const videoId = extractVideoId(videoUrl);
      
      console.log(`\n📹 [${i + 1}/${HUBERMAN_VIDEOS.length}] Processing: ${videoId}`);
      console.log(`🔗 URL: ${videoUrl}`);
      
      try {
        const input = {
          videoUrl: videoUrl,
          language: 'en'
        };

        console.log('🕷️ Running transcript scraper...');
        const run = await apifyClient.actor('faVsWy9VTSNVIhWpR').call(input);
        
        console.log(`📊 Run ID: ${run.id}`);
        
        // Get results
        const { items: transcripts } = await apifyClient.dataset(run.defaultDatasetId).listItems();
        
        if (transcripts.length > 0) {
          const transcript = transcripts[0];
          allTranscripts.push(transcript);
          
          // Save transcript
          await saveTranscript(transcript, videoId, videoUrl);
          
          successCount++;
          console.log(`✅ [${i + 1}] SUCCESS - Transcript saved for ${videoId}`);
        } else {
          failCount++;
          console.log(`⚠️ [${i + 1}] NO TRANSCRIPT - No transcript available for ${videoId}`);
        }
        
      } catch (error) {
        failCount++;
        console.error(`❌ [${i + 1}] FAILED - ${videoId}:`, error.message);
      }
      
      // Progress update every 10 videos
      if ((i + 1) % 10 === 0) {
        console.log(`\n📊 PROGRESS UPDATE:`);
        console.log(`   Completed: ${i + 1}/${HUBERMAN_VIDEOS.length}`);
        console.log(`   Success: ${successCount}`);
        console.log(`   Failed: ${failCount}`);
        console.log(`   Success Rate: ${((successCount / (i + 1)) * 100).toFixed(1)}%`);
      }
      
      // Delay between requests to be respectful to the API
      if (i < HUBERMAN_VIDEOS.length - 1) {
        console.log('⏳ Waiting 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    console.log('\n🎉 TRANSCRIPT DOWNLOAD COMPLETED!');
    console.log('=====================================');
    console.log(`📊 FINAL STATISTICS:`);
    console.log(`   Total Videos Processed: ${HUBERMAN_VIDEOS.length}`);
    console.log(`   Successful Downloads: ${successCount}`);
    console.log(`   Failed Downloads: ${failCount}`);
    console.log(`   Success Rate: ${((successCount / HUBERMAN_VIDEOS.length) * 100).toFixed(1)}%`);
    console.log(`   Transcripts Saved To: ./data/transcripts/`);
    
    // Save summary
    const summary = {
      totalVideos: HUBERMAN_VIDEOS.length,
      successfulDownloads: successCount,
      failedDownloads: failCount,
      successRate: ((successCount / HUBERMAN_VIDEOS.length) * 100).toFixed(1) + '%',
      downloadedAt: new Date().toISOString(),
      transcripts: allTranscripts.map(t => ({
        videoId: extractVideoId(t.url || t.videoUrl),
        title: t.title,
        hasTranscript: !!(t.transcript || t.text || t.subtitles)
      }))
    };
    
    await fs.writeFile('./data/transcript-download-summary.json', JSON.stringify(summary, null, 2));
    console.log(`📋 Summary saved to: ./data/transcript-download-summary.json`);
    
    return allTranscripts;
    
  } catch (error) {
    console.error('❌ Transcript download failed:', error);
    throw error;
  }
}

async function saveTranscript(transcript, videoId, videoUrl) {
  const filename = `${videoId}.json`;
  const transcriptData = {
    videoId: videoId,
    url: videoUrl,
    title: transcript.title,
    transcript: transcript.transcript || transcript.text || transcript.subtitles,
    timestamps: transcript.timestamps,
    language: transcript.language || 'en',
    downloadedAt: new Date().toISOString(),
    wordCount: (transcript.transcript || transcript.text || transcript.subtitles || '').split(' ').length
  };
  
  await fs.writeFile(`./data/transcripts/${filename}`, JSON.stringify(transcriptData, null, 2));
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
downloadAllTranscripts().catch(console.error);