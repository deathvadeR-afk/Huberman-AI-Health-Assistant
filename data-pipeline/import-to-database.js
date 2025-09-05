#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { DatabaseManager } from './src/utils/database.js';
import { createLogger } from './src/utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const logger = createLogger('DatabaseImporter');

class DatabaseImporter {
    constructor() {
        this.db = new DatabaseManager();
    }

    async importVideosFromJson(jsonFilePath) {
        try {
            logger.info(`📂 Reading data from: ${jsonFilePath}`);
            
            if (!fs.existsSync(jsonFilePath)) {
                throw new Error(`File not found: ${jsonFilePath}`);
            }

            const data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
            const videos = data.videos;

            logger.info(`📊 Found ${videos.length} videos to import`);
            logger.info(`📅 Data collected at: ${data.metadata.collected_at}`);

            // Test database connection first
            await this.db.testConnection();
            logger.info('✅ Database connection successful');

            let imported = 0;
            let updated = 0;
            let errors = 0;

            for (let i = 0; i < videos.length; i++) {
                const video = videos[i];
                
                try {
                    // Check if video already exists
                    const existingVideo = await this.db.findVideoByYouTubeId(video.youtube_id);
                    
                    if (existingVideo) {
                        // Update existing video
                        await this.db.updateVideo(existingVideo.id, {
                            ...video,
                            published_at: new Date(video.published_at)
                        });
                        updated++;
                        logger.info(`📝 Updated: ${video.title} (${i + 1}/${videos.length})`);
                    } else {
                        // Create new video
                        await this.db.createVideo({
                            ...video,
                            published_at: new Date(video.published_at)
                        });
                        imported++;
                        logger.info(`➕ Imported: ${video.title} (${i + 1}/${videos.length})`);
                    }

                    // Progress update every 10 videos
                    if ((i + 1) % 10 === 0) {
                        logger.info(`📈 Progress: ${i + 1}/${videos.length} (${Math.round((i + 1) / videos.length * 100)}%)`);
                    }

                } catch (error) {
                    errors++;
                    logger.error(`❌ Error importing video ${video.youtube_id}:`, error.message);
                    // Continue with other videos
                }
            }

            // Get final statistics
            const stats = await this.db.getVideoStats();

            logger.info('\n🎉 Import completed!');
            logger.info(`📊 Import Summary:`);
            logger.info(`   New videos imported: ${imported}`);
            logger.info(`   Videos updated: ${updated}`);
            logger.info(`   Errors: ${errors}`);
            logger.info(`   Total videos in database: ${stats.total_videos}`);
            logger.info(`   Total content: ${Math.round(stats.total_duration / 3600)} hours`);
            logger.info(`   Average duration: ${Math.round(stats.average_duration / 60)} minutes`);
            logger.info(`   Total views: ${parseInt(stats.total_views).toLocaleString()}`);

            return {
                imported,
                updated,
                errors,
                totalInDatabase: parseInt(stats.total_videos)
            };

        } catch (error) {
            logger.error('❌ Import failed:', error);
            throw error;
        }
    }

    async getLatestJsonFile() {
        const outputDir = './data/output';
        
        if (!fs.existsSync(outputDir)) {
            throw new Error('Output directory not found. Run collect-videos-json.js first.');
        }

        const files = fs.readdirSync(outputDir)
            .filter(file => file.startsWith('huberman-videos-') && file.endsWith('.json'))
            .sort()
            .reverse(); // Get the latest file

        if (files.length === 0) {
            throw new Error('No video data files found. Run collect-videos-json.js first.');
        }

        return path.join(outputDir, files[0]);
    }

    async cleanup() {
        await this.db.close();
    }
}

// Main execution
async function main() {
    const importer = new DatabaseImporter();

    try {
        // Get the latest JSON file
        const jsonFile = await importer.getLatestJsonFile();
        logger.info(`🔍 Using latest data file: ${path.basename(jsonFile)}`);

        // Import the data
        const result = await importer.importVideosFromJson(jsonFile);

        console.log('\n✅ Database import completed successfully!');
        console.log(`   📊 ${result.imported} new videos imported`);
        console.log(`   📝 ${result.updated} videos updated`);
        console.log(`   💾 ${result.totalInDatabase} total videos in database`);

        if (result.errors > 0) {
            console.log(`   ⚠️  ${result.errors} errors occurred (check logs)`);
        }

    } catch (error) {
        console.error('❌ Import failed:', error.message);
        process.exit(1);
    } finally {
        await importer.cleanup();
    }
}

main();
