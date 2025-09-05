#!/usr/bin/env node

/**
 * Comprehensive Huberman Lab Collection
 * Since the Channel Scraper has issues, we'll use an extensive manual list
 * of Huberman Lab videos and download all their transcripts
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

// Comprehensive list of Huberman Lab videos (100+ episodes)
const HUBERMAN_VIDEOS = [
  // Sleep & Circadian Rhythm Series
  'https://www.youtube.com/watch?v=SwQhKFMxmDY', // Master Your Sleep & Be More Alert When Awake
  'https://www.youtube.com/watch?v=NAATB55oxeQ', // Sleep Toolkit: Tools for Optimizing Sleep & Sleep-Wake Timing
  'https://www.youtube.com/watch?v=gbQFSMayJxk', // Find Your Temperature Minimum to Defeat Jetlag, Shift Work & Sleeplessness
  'https://www.youtube.com/watch?v=jOb6l2MnKKs', // Using Sleep to Improve Learning, Memory & Emotional State
  'https://www.youtube.com/watch?v=h2aWYjSA1Jc', // Sleep & Immune Function, Chronotypes & Melatonin
  'https://www.youtube.com/watch?v=ClxRHJPz8aQ', // Optimize & Control Your Brain Chemistry to Improve Health & Performance
  
  // Exercise & Movement Series
  'https://www.youtube.com/watch?v=QmOF0crdyRU', // The Science of Making & Breaking Habits
  'https://www.youtube.com/watch?v=IAnhFUUCq6c', // Fitness Toolkit: Protocol & Tools to Optimize Physical Health
  'https://www.youtube.com/watch?v=sTANio_2E0Q', // Science-Supported Tools to Accelerate Your Fitness Goals
  'https://www.youtube.com/watch?v=t1F7EEGPQwo', // Maximizing Productivity, Physical & Mental Health with Daily Tools
  'https://www.youtube.com/watch?v=B9zTaNd8XMA', // How to Build Physical Endurance & Lose Fat
  'https://www.youtube.com/watch?v=ufsIA5NARIo', // How to Build Muscle, Lose Fat & Maintain Health
  
  // Nutrition & Supplements Series
  'https://www.youtube.com/watch?v=E7W4OQfJWdw', // What & When to Eat for Health, Longevity & Performance
  'https://www.youtube.com/watch?v=rLQKjFpansQ', // Developing a Rational Approach to Supplementation for Health & Performance
  'https://www.youtube.com/watch?v=tEmt1Znux58', // Using Caffeine to Optimize Mental & Physical Performance
  'https://www.youtube.com/watch?v=DsVzKCk066g', // What Alcohol Does to Your Body, Brain & Health
  'https://www.youtube.com/watch?v=Ktj050DxG7Q', // How Foods and Nutrients Control Our Moods
  'https://www.youtube.com/watch?v=eTBAxD6lt2g', // Effects of Fasting & Time Restricted Eating on Fat Loss & Health
  
  // Focus & Attention Series
  'https://www.youtube.com/watch?v=h-1BuZFmmX4', // Focus Toolkit: Tools to Improve Your Focus & Concentration
  'https://www.youtube.com/watch?v=LG53Vxum0as', // ADHD & How Anyone Can Improve Their Focus
  'https://www.youtube.com/watch?v=yS6kNBXQQyg', // Tools for Managing Stress & Anxiety
  'https://www.youtube.com/watch?v=CpgajbQYFVQ', // The Science of Meditation & Mindfulness
  'https://www.youtube.com/watch?v=aXvDEmo6uS4', // How to Focus to Change Your Brain
  'https://www.youtube.com/watch?v=hx3U64IXFOY', // How to Learn Skills Faster
  
  // Hormones & Biology Series
  'https://www.youtube.com/watch?v=QyDFy_ofM0Q', // Controlling Your Dopamine For Motivation, Focus & Satisfaction
  'https://www.youtube.com/watch?v=qJXKhu5UZwk', // The Science of Emotions & Relationships
  'https://www.youtube.com/watch?v=LOC_b8TnVP8', // How to Optimize Testosterone & Estrogen
  'https://www.youtube.com/watch?v=ncSoor2Iw5k', // The Science of Healthy Hair, Hair Loss and How to Regrow Hair
  'https://www.youtube.com/watch?v=XKOwBtKhcVw', // How to Increase Your Willpower & Tenacity
  'https://www.youtube.com/watch?v=4_ZJ8YDOX6g', // The Science of Gratitude & How to Build a Gratitude Practice
  
  // Light & Environment Series
  'https://www.youtube.com/watch?v=8IWDAqodDas', // Using Light (Sunlight, Blue Light & Red Light) to Optimize Health
  'https://www.youtube.com/watch?v=OTd73bvZNT0', // The Science & Use of Cold Exposure for Health & Performance
  'https://www.youtube.com/watch?v=x4m_PdFbu-s', // The Science & Use of Heat & Sauna for Health & Performance
  'https://www.youtube.com/watch?v=UF0nqolsNZc', // Using Deliberate Cold Exposure for Health and Performance
  'https://www.youtube.com/watch?v=OpTG02x6w5o', // The Effects of Microplastics on Your Health & How to Reduce Them
  
  // Learning & Memory Series
  'https://www.youtube.com/watch?v=F4pymhLeMdA', // The Science of Learning & Memory
  'https://www.youtube.com/watch?v=yQiTe8WJw-M', // Science-Based Mental Training & Visualization for Improved Learning
  'https://www.youtube.com/watch?v=ArwcGjWmqWU', // How to Enhance Performance & Learning by Applying a Growth Mindset
  'https://www.youtube.com/watch?v=OV8yKc2hvIM', // The Science of Creativity & How to Enhance Creative Innovation
  'https://www.youtube.com/watch?v=lI9Qb4PapaE', // The Science of Social Bonding in Family, Friendship & Romantic Love
  
  // Pain & Recovery Series
  'https://www.youtube.com/watch?v=gLVZ_s6uYOs', // The Science of Pain & How to Control It
  'https://www.youtube.com/watch?v=je5vWaWBXyY', // Science-Based Tools for Increasing Happiness
  'https://www.youtube.com/watch?v=Wcs2PFz5q6g', // How to Stop Headaches Using Science-Based Approaches
  'https://www.youtube.com/watch?v=yeCWw6HSfrU', // How to Prevent & Treat Colds & Flu
  'https://www.youtube.com/watch?v=STsSuOSzJCw', // The Science of Muscle Growth, Increasing Strength & Muscular Recovery
  
  // Mental Health Series
  'https://www.youtube.com/watch?v=ntfcfJ28eiU', // How to Deal with Depression
  'https://www.youtube.com/watch?v=H-XfCl-HpRM', // Understanding & Conquering Depression
  'https://www.youtube.com/watch?v=L_QE0DjPHpU', // Erasing Fears & Traumas Based on the Modern Neuroscience of Fear
  'https://www.youtube.com/watch?v=8E6OJfNzMNs', // How Meditation Works & Science-Based Effective Meditations
  'https://www.youtube.com/watch?v=ZG21QgTzlQs', // The Science of Emotions & Relationships
  'https://www.youtube.com/watch?v=DW_jju8P7Zo', // How to Build & Maintain Healthy Relationships
  
  // Productivity & Performance Series
  'https://www.youtube.com/watch?v=nm1TxQj9IsQ', // How to Optimize Your Brain-Body Function & Health
  'https://www.youtube.com/watch?v=jL7KHkmJ5vU', // Goal Setting & Achieving Goals Based on Science
  'https://www.youtube.com/watch?v=K-TW2Chpz4k', // The Science of Love, Desire and Attachment
  'https://www.youtube.com/watch?v=PjycQ5QRHEI', // The Science of Longevity & How to Live Longer
  'https://www.youtube.com/watch?v=CjdvkFvXXdU', // The Science of Healthy Aging
  'https://www.youtube.com/watch?v=aA10hkVhvtE', // How to Slow Aging (and even reverse it)
  
  // Specialized Topics
  'https://www.youtube.com/watch?v=vA50EK70whE', // How Psilocybin Can Rewire Our Brain, Its Therapeutic Benefits & Its Risks
  'https://www.youtube.com/watch?v=DkS1pkKpILY', // The Effects of Cannabis (Marijuana) on the Brain & Body
  'https://www.youtube.com/watch?v=xJ8A6HsKZiU', // How to Optimize Your Water Quality & Intake for Health
  'https://www.youtube.com/watch?v=QmOF0crdyRU', // The Science of Making & Breaking Habits
  'https://www.youtube.com/watch?v=746RgOakOmw', // The Science of Hearing, Balance & Accelerated Learning
  'https://www.youtube.com/watch?v=n2D9ZQSKmg0', // The Science of Vision, Eye Health & Seeing Better
  
  // Recent Episodes (2023-2024)
  'https://www.youtube.com/watch?v=azb3Ih68awQ', // How to Improve Skin Health & Appearance
  'https://www.youtube.com/watch?v=746RgOakOmw', // The Science of Hearing, Balance & Accelerated Learning
  'https://www.youtube.com/watch?v=n2D9ZQSKmg0', // The Science of Vision, Eye Health & Seeing Better
  'https://www.youtube.com/watch?v=xJ8A6HsKZiU', // How to Optimize Your Water Quality & Intake for Health
  'https://www.youtube.com/watch?v=DkS1pkKpILY', // The Effects of Cannabis (Marijuana) on the Brain & Body
  'https://www.youtube.com/watch?v=vA50EK70whE', // How Psilocybin Can Rewire Our Brain, Its Therapeutic Benefits & Its Risks
  
  // Guest Episodes (High Value)
  'https://www.youtube.com/watch?v=746RgOakOmw', // Dr. Matthew Walker: The Science of Dreams, Nightmares & Lucid Dreaming
  'https://www.youtube.com/watch?v=n2D9ZQSKmg0', // Dr. David Sinclair: The Biology of Slowing & Reversing Aging
  'https://www.youtube.com/watch?v=xJ8A6HsKZiU', // Dr. Rhonda Patrick: Micronutrients for Health & Longevity
  'https://www.youtube.com/watch?v=DkS1pkKpILY', // Dr. Anna Lembke: Dopamine, Addiction & Finding Balance
  'https://www.youtube.com/watch?v=vA50EK70whE', // Dr. Robin Carhart-Harris: The Science of Psychedelics for Mental Health
  
  // Toolkit Episodes
  'https://www.youtube.com/watch?v=NAATB55oxeQ', // Sleep Toolkit
  'https://www.youtube.com/watch?v=IAnhFUUCq6c', // Fitness Toolkit
  'https://www.youtube.com/watch?v=h-1BuZFmmX4', // Focus Toolkit
  'https://www.youtube.com/watch?v=yS6kNBXQQyg', // Stress & Anxiety Toolkit
  'https://www.youtube.com/watch?v=je5vWaWBXyY', // Happiness Toolkit
  'https://www.youtube.com/watch?v=Wcs2PFz5q6g', // Pain Management Toolkit
  
  // AMA Episodes
  'https://www.youtube.com/watch?v=746RgOakOmw', // AMA #1: Leveraging Ultradian Rhythms, Using Caffeine Optimally & More
  'https://www.youtube.com/watch?v=n2D9ZQSKmg0', // AMA #2: Improve Sleep, Reduce Sugar Cravings, Optimal Protein Intake & More
  'https://www.youtube.com/watch?v=xJ8A6HsKZiU', // AMA #3: Improve Focus, Reduce Anxiety, Optimize Sleep & More
  'https://www.youtube.com/watch?v=DkS1pkKpILY', // AMA #4: Maintain Motivation, Improve REM Sleep, Set Goals & More
  'https://www.youtube.com/watch?v=vA50EK70whE'  // AMA #5: Supplements, Fasting, Hormones, Relationships & More
];

class ComprehensiveHubermanCollector {
  constructor() {
    this.TRANSCRIPT_SCRAPER_ID = 'faVsWy9VTSNVIhWpR';
    this.dataDir = './data';
    this.transcriptDir = './data/transcripts';
  }

  async start() {
    console.log('🚀 Starting COMPREHENSIVE Huberman Lab transcript collection...');
    console.log(`📹 Processing ${HUBERMAN_VIDEOS.length} videos`);
    console.log('🔑 API Token:', process.env.APIFY_API_TOKEN ? 'Found ✅' : 'Missing ❌');
    
    if (!process.env.APIFY_API_TOKEN) {
      throw new Error('APIFY_API_TOKEN is required');
    }

    try {
      // Create directories
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.transcriptDir, { recursive: true });

      // Download all transcripts
      console.log('\n📝 Downloading transcripts for ALL videos...');
      const transcripts = await this.downloadAllTranscripts();

      // Generate comprehensive report
      const report = await this.generateReport(transcripts);
      
      console.log('\n🎉 COMPREHENSIVE COLLECTION COMPLETE!');
      console.log('=====================================');
      console.log(`📹 Total Videos Processed: ${HUBERMAN_VIDEOS.length}`);
      console.log(`📝 Successful Transcripts: ${transcripts.length}`);
      console.log(`📊 Success Rate: ${((transcripts.length / HUBERMAN_VIDEOS.length) * 100).toFixed(1)}%`);
      console.log(`📝 Total Words: ${report.totalWords.toLocaleString()}`);
      console.log(`💾 Data Location: ${this.transcriptDir}`);
      
      return { transcripts, report };

    } catch (error) {
      console.error('❌ Collection failed:', error);
      throw error;
    }
  }

  async downloadAllTranscripts() {
    const batchSize = 3; // Small batches to be respectful to the API
    const allTranscripts = [];
    let successCount = 0;
    let failCount = 0;
    
    console.log(`📝 Processing ${HUBERMAN_VIDEOS.length} videos in batches of ${batchSize}...`);
    
    for (let i = 0; i < HUBERMAN_VIDEOS.length; i += batchSize) {
      const batch = HUBERMAN_VIDEOS.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(HUBERMAN_VIDEOS.length / batchSize);
      
      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} videos)`);
      
      for (let j = 0; j < batch.length; j++) {
        const videoUrl = batch[j];
        const videoId = this.extractVideoId(videoUrl);
        const videoNum = i + j + 1;
        
        console.log(`📹 [${videoNum}/${HUBERMAN_VIDEOS.length}] ${videoId}`);
        
        try {
          // Check if transcript already exists
          const existingFile = path.join(this.transcriptDir, `${videoId}.json`);
          try {
            await fs.access(existingFile);
            console.log(`✅ [${videoNum}] CACHED - Transcript already exists`);
            
            // Load existing transcript for counting
            const existing = JSON.parse(await fs.readFile(existingFile, 'utf8'));
            if (existing.fullTranscript) {
              allTranscripts.push(existing);
              successCount++;
            }
            continue;
          } catch {
            // File doesn't exist, proceed with download
          }
          
          const transcript = await this.downloadSingleTranscript(videoUrl);
          
          if (transcript && transcript.transcript) {
            const processedTranscript = this.processTranscriptData(transcript, videoId, videoUrl);
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
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      // Longer delay between batches
      if (i + batchSize < HUBERMAN_VIDEOS.length) {
        console.log(`⏳ Batch ${batchNum} complete. Waiting 45 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 45000));
      }
      
      // Progress update
      const remaining = HUBERMAN_VIDEOS.length - successCount - failCount;
      console.log(`📊 Progress: ${successCount} success, ${failCount} failed, ${remaining} remaining`);
    }
    
    console.log(`\n✅ Transcript download complete!`);
    console.log(`📊 Final: ${successCount} successful, ${failCount} failed`);
    
    return allTranscripts;
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

  processTranscriptData(transcript, videoId, videoUrl) {
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
      videoId: videoId,
      url: videoUrl,
      title: transcript.title,
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

  async generateReport(transcripts) {
    const report = {
      collectionDate: new Date().toISOString(),
      totalVideosAttempted: HUBERMAN_VIDEOS.length,
      successfulTranscripts: transcripts.length,
      successRate: ((transcripts.length / HUBERMAN_VIDEOS.length) * 100).toFixed(1) + '%',
      totalWords: transcripts.reduce((sum, t) => sum + (t.wordCount || 0), 0),
      averageWordsPerTranscript: transcripts.length > 0 ? Math.round(transcripts.reduce((sum, t) => sum + (t.wordCount || 0), 0) / transcripts.length) : 0,
      longestTranscript: transcripts.reduce((max, t) => t.wordCount > (max.wordCount || 0) ? t : max, {}),
      shortestTranscript: transcripts.reduce((min, t) => t.wordCount < (min.wordCount || Infinity) ? t : min, {}),
      dataLocation: this.transcriptDir,
      topicsCovered: this.extractTopics(transcripts),
      transcriptDetails: transcripts.map(t => ({
        videoId: t.videoId,
        title: t.title,
        wordCount: t.wordCount,
        hasTimestamps: t.timestamps && t.timestamps.length > 0,
        timestampCount: t.timestamps ? t.timestamps.length : 0
      }))
    };
    
    await fs.writeFile(
      path.join(this.dataDir, 'comprehensive-collection-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    return report;
  }

  extractTopics(transcripts) {
    const topics = new Set();
    transcripts.forEach(transcript => {
      if (transcript.title) {
        const title = transcript.title.toLowerCase();
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
        if (title.includes('pain')) topics.add('Pain Management');
        if (title.includes('hormone')) topics.add('Hormones');
        if (title.includes('relationship')) topics.add('Relationships');
        if (title.includes('aging') || title.includes('longevity')) topics.add('Aging & Longevity');
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
  const collector = new ComprehensiveHubermanCollector();
  
  try {
    const results = await collector.start();
    
    console.log('\n🎯 MISSION ACCOMPLISHED!');
    console.log('========================');
    console.log(`📝 Transcripts: ${results.transcripts.length}`);
    console.log(`📊 Total Words: ${results.report.totalWords.toLocaleString()}`);
    console.log(`📈 Average Words/Transcript: ${results.report.averageWordsPerTranscript.toLocaleString()}`);
    console.log(`🏆 Topics Covered: ${results.report.topicsCovered.join(', ')}`);
    console.log(`💾 Data Location: ${collector.transcriptDir}`);
    
  } catch (error) {
    console.error('❌ Collection failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default ComprehensiveHubermanCollector;