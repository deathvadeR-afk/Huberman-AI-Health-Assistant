#!/usr/bin/env node

/**
 * Complete Huberman Lab Transcript Collector
 * 1. Gets ALL videos from Huberman Lab channel
 * 2. Downloads transcripts for ALL videos
 * 3. Saves them to files and database
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

class HubermanTranscriptCollector {
    constructor() {
        this.db = new DatabaseService();

        // Apify actor IDs
        this.CHANNEL_SCRAPER_ID = '1p1aa7gcSydPkAE0d'; // YouTube Channel Scraper
        this.TRANSCRIPT_SCRAPER_ID = 'faVsWy9VTSNVIhWpR'; // YouTube Transcript Scraper

        // Huberman Lab channel
        this.HUBERMAN_CHANNEL_URL = 'https://www.youtube.com/@hubermanlab';
        this.HUBERMAN_CHANNEL_ID = 'UC2D2CMWXMOVWx7giW1n3LIg';

        // Data directory
        this.dataDir = './data/transcripts';
        this.videosFile = './data/huberman-videos.json';
    }

    async start() {
        console.log('🚀 Starting COMPLETE Huberman Lab transcript collection...');

        try {
            // Create data directories
            await fs.mkdir(this.dataDir, { recursive: true });
            await fs.mkdir('./data', { recursive: true });

            // Initialize database
            await this.db.connect();

            // Step 1: Get ALL videos from channel
            console.log('📹 Step 1: Getting ALL videos from Huberman Lab channel...');
            const videos = await this.getAllChannelVideos();

            console.log(`✅ Found ${videos.length} total videos`);

            // Save video list
            await fs.writeFile(this.videosFile, JSON.stringify(videos, null, 2));
            console.log(`💾 Saved video list to ${this.videosFile}`);

            // Step 2: Download ALL transcripts
            console.log('📝 Step 2: Downloading transcripts for ALL videos...');
            const transcripts = await this.downloadAllTranscripts(videos);

            // Step 3: Generate final statistics
            const stats = await this.generateStats();

            console.log('🎉 COMPLETE transcript collection finished!');
            console.log('📊 Final Statistics:');
            console.log(`   Total Videos Found: ${videos.length}`);
            console.log(`   Total Transcripts Downloaded: ${transcripts.length}`);
            console.log(`   Success Rate: ${((transcripts.length / videos.length) * 100).toFixed(1)}%`);
            console.log(`   Storage Location: ${this.dataDir}`);

            return { videos, transcripts, stats };

        } catch (error) {
            console.error('❌ Complete transcript collection failed:', error);
            throw error;
        } finally {
            await this.db.close();
        }
    }

    async getAllChannelVideos() {
        console.log('🕷️ Running Apify Channel Scraper for ALL videos...');

        const input = {
            channelUrls: [this.HUBERMAN_CHANNEL_URL],
            maxVideos: 1000, // Get ALL videos (Huberman has ~400+)
            includeVideoDetails: true,
            includeComments: false, // Skip comments to save quota
            includeSubtitles: false, // We'll get transcripts separately
            sortBy: 'newest' // Start with newest videos
        };

        const run = await apifyClient.actor(this.CHANNEL_SCRAPER_ID).call(input);
        console.log(`📊 Channel scraper run ID: ${run.id}`);
        console.log('⏳ Waiting for channel scraper to complete...');

        // Get all results
        const { items: videos } = await apifyClient.dataset(run.defaultDatasetId).listItems();

        console.log(`📹 Raw results: ${videos.length} items`);

        // Process and clean video data
        const processedVideos = videos.map(video => ({
            id: video.id || this.extractVideoId(video.url),
            url: video.url,
            title: video.title,
            description: video.description,
            duration: video.duration,
            viewCount: video.viewCount,
            publishedAt: video.publishedAt,
            thumbnailUrl: video.thumbnailUrl
        })).filter(video => video.id && video.url);

        console.log(`✅ Processed ${processedVideos.length} valid videos`);
        return processedVideos;
    }

    async downloadAllTranscripts(videos) {
        console.log(`📝 Starting transcript download for ${videos.length} videos...`);

        const batchSize = 10; // Process in smaller batches to avoid API limits
        const allTranscripts = [];
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < videos.length; i += batchSize) {
            const batch = videos.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(videos.length / batchSize);

            console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} videos)`);

            // Process each video in the batch individually
            for (let j = 0; j < batch.length; j++) {
                const video = batch[j];
                const videoNum = i + j + 1;

                console.log(`📹 [${videoNum}/${videos.length}] ${video.title}`);

                try {
                    const transcript = await this.downloadSingleTranscript(video);
                    if (transcript) {
                        allTranscripts.push(transcript);
                        await this.saveTranscript(transcript, video);
                        successCount++;
                        console.log(`✅ [${videoNum}] Transcript saved`);
                    } else {
                        failCount++;
                        console.log(`⚠️ [${videoNum}] No transcript available`);
                    }
                } catch (error) {
                    failCount++;
                    console.error(`❌ [${videoNum}] Failed:`, error.message);
                }

                // Small delay between individual requests
                if (j < batch.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            // Longer delay between batches
            if (i + batchSize < videos.length) {
                console.log(`⏳ Batch ${batchNum} complete. Waiting 30 seconds before next batch...`);
                await new Promise(resolve => setTimeout(resolve, 30000));
            }

            // Progress update
            console.log(`📊 Progress: ${successCount} success, ${failCount} failed, ${videos.length - successCount - failCount} remaining`);
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

        // Get results
        const { items: transcripts } = await apifyClient.dataset(run.defaultDatasetId).listItems();

        if (transcripts.length > 0) {
            return transcripts[0];
        }

        return null;
    }

    async saveTranscript(transcript, video) {
        const videoId = video.id;
        const filename = `${videoId}.json`;
        const filepath = path.join(this.dataDir, filename);

        const transcriptData = {
            videoId: videoId,
            url: video.url,
            title: video.title,
            description: video.description,
            duration: video.duration,
            viewCount: video.viewCount,
            publishedAt: video.publishedAt,
            transcript: transcript.transcript || transcript.text || transcript.subtitles,
            timestamps: transcript.timestamps,
            language: transcript.language || 'en',
            downloadedAt: new Date().toISOString()
        };

        // Save to file
        await fs.writeFile(filepath, JSON.stringify(transcriptData, null, 2));

        // Save to database if available
        try {
            await this.db.storeVideo({
                youtube_id: videoId,
                title: video.title,
                description: video.description,
                duration: video.duration,
                view_count: video.viewCount,
                published_at: video.publishedAt,
                thumbnail_url: video.thumbnailUrl
            });

            await this.db.storeTranscript({
                video_id: videoId,
                transcript_text: transcript.transcript || transcript.text || transcript.subtitles,
                timestamps: transcript.timestamps,
                language: transcript.language || 'en'
            });
        } catch (dbError) {
            console.warn(`⚠️ Database save failed for ${videoId}:`, dbError.message);
        }
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

    async generateStats() {
        try {
            const files = await fs.readdir(this.dataDir);
            const transcriptFiles = files.filter(f => f.endsWith('.json'));

            let totalWords = 0;
            let totalDuration = 0;

            for (const file of transcriptFiles.slice(0, 10)) { // Sample first 10 for stats
                try {
                    const content = await fs.readFile(path.join(this.dataDir, file), 'utf8');
                    const data = JSON.parse(content);
                    if (data.transcript) {
                        totalWords += data.transcript.split(' ').length;
                    }
                } catch (e) {
                    // Skip invalid files
                }
            }

            return {
                totalTranscripts: transcriptFiles.length,
                estimatedTotalWords: Math.round((totalWords / 10) * transcriptFiles.length),
                storageLocation: this.dataDir
            };
        } catch (error) {
            console.error('Failed to generate stats:', error);
            return { totalTranscripts: 0 };
        }
    }
}

// Run the complete collector
async function main() {
    const collector = new HubermanTranscriptCollector();

    try {
        const results = await collector.start();

        console.log('\n🎯 MISSION ACCOMPLISHED!');
        console.log('=====================================');
        console.log(`📹 Total Videos: ${results.videos.length}`);
        console.log(`📝 Total Transcripts: ${results.transcripts.length}`);
        console.log(`💾 Files saved to: ${collector.dataDir}`);
        console.log(`📊 Estimated words: ${results.stats.estimatedTotalWords?.toLocaleString() || 'N/A'}`);

    } catch (error) {
        console.error('❌ Complete collection failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default HubermanTranscriptCollector;