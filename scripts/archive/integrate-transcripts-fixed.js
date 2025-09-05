#!/usr/bin/env node

/**
 * Fixed Transcript Database Integration
 * Integrates transcripts using the correct existing database schema
 */

import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

const { Pool } = pg;

// Load environment variables
dotenv.config({ path: './backend/.env' });

class FixedTranscriptIntegrator {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    this.transcriptDir = './data/transcripts';
  }

  async start() {
    console.log('🚀 Starting fixed transcript database integration...');
    
    try {
      // Test database connection
      console.log('🔌 Testing database connection...');
      await this.pool.query('SELECT NOW()');
      console.log('✅ Database connected successfully');

      // Get all transcript files
      console.log('📁 Reading transcript files...');
      const transcriptFiles = await this.getTranscriptFiles();
      
      if (transcriptFiles.length === 0) {
        throw new Error('No transcript files found in ./data/transcripts/');
      }

      console.log(`✅ Found ${transcriptFiles.length} transcript files`);

      // Process and integrate transcripts
      console.log('💾 Integrating transcripts into database...');
      const results = await this.integrateTranscripts(transcriptFiles);

      // Generate integration report
      await this.generateIntegrationReport(results);

      console.log('\n🎉 TRANSCRIPT INTEGRATION COMPLETE!');
      console.log('===================================');
      console.log(`📊 Integration Results:`);
      console.log(`   ✅ Successfully integrated: ${results.successful}`);
      console.log(`   ❌ Failed integrations: ${results.failed}`);
      console.log(`   📝 Total transcript segments: ${results.totalSegments}`);
      console.log(`   📈 Success Rate: ${((results.successful / transcriptFiles.length) * 100).toFixed(1)}%`);
      console.log(`   💾 Database updated with full transcript data`);

    } catch (error) {
      console.error('❌ Integration failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  async getTranscriptFiles() {
    try {
      const files = await fs.readdir(this.transcriptDir);
      const transcriptFiles = files.filter(f => f.endsWith('.json'));
      return transcriptFiles;
    } catch (error) {
      console.error('❌ Failed to read transcript directory:', error);
      throw error;
    }
  }

  async integrateTranscripts(transcriptFiles) {
    let successful = 0;
    let failed = 0;
    let totalSegments = 0;

    console.log(`📝 Processing ${transcriptFiles.length} transcript files...`);

    for (let i = 0; i < transcriptFiles.length; i++) {
      const filename = transcriptFiles[i];
      const youtubeId = filename.replace('.json', '');
      
      try {
        // Read transcript file
        const filepath = path.join(this.transcriptDir, filename);
        const fileContent = await fs.readFile(filepath, 'utf8');
        const transcript = JSON.parse(fileContent);

        // Validate transcript data
        if (!transcript.fullTranscript || transcript.fullTranscript.trim() === '') {
          console.log(`⚠️ [${i + 1}/${transcriptFiles.length}] ${youtubeId} - Empty transcript`);
          failed++;
          continue;
        }

        // Find the video in database by youtube_id
        const videoQuery = 'SELECT id FROM videos WHERE youtube_id = $1';
        const videoResult = await this.pool.query(videoQuery, [youtubeId]);

        if (videoResult.rows.length === 0) {
          console.log(`⚠️ [${i + 1}/${transcriptFiles.length}] ${youtubeId} - Video not found in database`);
          failed++;
          continue;
        }

        const videoId = videoResult.rows[0].id;

        // Insert/update transcript using the correct schema
        await this.insertTranscript(transcript, videoId, youtubeId);
        
        // Insert transcript segments
        const segmentCount = await this.insertTranscriptSegments(transcript, videoId);
        totalSegments += segmentCount;

        successful++;
        console.log(`✅ [${i + 1}/${transcriptFiles.length}] ${youtubeId} - ${transcript.wordCount || 0} words, ${segmentCount} segments`);

      } catch (error) {
        failed++;
        console.error(`❌ [${i + 1}/${transcriptFiles.length}] ${youtubeId} - ${error.message}`);
      }

      // Progress update every 50 files
      if ((i + 1) % 50 === 0) {
        console.log(`📊 Progress: ${successful} success, ${failed} failed, ${transcriptFiles.length - i - 1} remaining`);
      }
    }

    return { successful, failed, totalSegments };
  }

  async insertTranscript(transcript, videoId, youtubeId) {
    // Check if transcript already exists
    const existingQuery = 'SELECT id FROM transcripts WHERE video_id = $1';
    const existingResult = await this.pool.query(existingQuery, [videoId]);

    if (existingResult.rows.length > 0) {
      // Update existing transcript
      const updateQuery = `
        UPDATE transcripts 
        SET full_text = $1, 
            language = $2, 
            confidence_score = $3,
            updated_at = NOW()
        WHERE video_id = $4
      `;

      const values = [
        transcript.fullTranscript,
        transcript.language || 'en',
        0.95, // Default confidence score
        videoId
      ];

      await this.pool.query(updateQuery, values);
    } else {
      // Insert new transcript
      const insertQuery = `
        INSERT INTO transcripts (id, video_id, full_text, language, confidence_score, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
      `;

      const values = [
        videoId,
        transcript.fullTranscript,
        transcript.language || 'en',
        0.95 // Default confidence score
      ];

      await this.pool.query(insertQuery, values);
    }
  }

  async insertTranscriptSegments(transcript, videoId) {
    if (!transcript.timestamps || transcript.timestamps.length === 0) {
      return 0;
    }

    // Delete existing segments for this video
    await this.pool.query('DELETE FROM transcript_segments WHERE video_id = $1', [videoId]);

    // Insert new segments in batches
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < transcript.timestamps.length; i += batchSize) {
      const batch = transcript.timestamps.slice(i, i + batchSize);
      
      const values = [];
      const placeholders = [];
      
      batch.forEach((segment, index) => {
        const baseIndex = values.length;
        values.push(
          videoId,
          i + index,
          segment.start || 0,
          segment.duration || 0,
          segment.text || ''
        );
        placeholders.push(`(gen_random_uuid(), $${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, NOW())`);
      });

      if (values.length > 0) {
        const query = `
          INSERT INTO transcript_segments (id, video_id, segment_index, start_time, duration, text, created_at)
          VALUES ${placeholders.join(', ')}
        `;
        
        await this.pool.query(query, values);
        insertedCount += batch.length;
      }
    }

    return insertedCount;
  }

  async generateIntegrationReport(results) {
    try {
      // Get database statistics
      const transcriptCount = await this.pool.query('SELECT COUNT(*) as count FROM transcripts');
      const segmentCount = await this.pool.query('SELECT COUNT(*) as count FROM transcript_segments');
      const videoCount = await this.pool.query('SELECT COUNT(*) as count FROM videos');

      // Calculate total characters (since we don't have word_count in the schema)
      const totalCharsResult = await this.pool.query('SELECT SUM(LENGTH(full_text)) as total FROM transcripts');
      const totalChars = parseInt(totalCharsResult.rows[0].total || 0);
      const estimatedWords = Math.round(totalChars / 5); // Rough estimate: 5 chars per word

      const report = {
        integrationDate: new Date().toISOString(),
        filesProcessed: results.successful + results.failed,
        successfulIntegrations: results.successful,
        failedIntegrations: results.failed,
        successRate: ((results.successful / (results.successful + results.failed)) * 100).toFixed(1) + '%',
        databaseStatistics: {
          totalVideos: parseInt(videoCount.rows[0].count),
          totalTranscripts: parseInt(transcriptCount.rows[0].count),
          totalSegments: parseInt(segmentCount.rows[0].count),
          totalCharacters: totalChars,
          estimatedWords: estimatedWords,
          transcriptCoverage: ((parseInt(transcriptCount.rows[0].count) / parseInt(videoCount.rows[0].count)) * 100).toFixed(1) + '%'
        },
        summary: `Successfully integrated ${results.successful} transcripts into the database with ${results.totalSegments} searchable segments containing approximately ${estimatedWords.toLocaleString()} words.`
      };

      await fs.writeFile('./data/transcript-integration-report-fixed.json', JSON.stringify(report, null, 2));
      console.log('📋 Integration report saved to ./data/transcript-integration-report-fixed.json');

      return report;
    } catch (error) {
      console.error('❌ Failed to generate integration report:', error);
    }
  }
}

// Run the integration
async function main() {
  const integrator = new FixedTranscriptIntegrator();
  
  try {
    await integrator.start();
    console.log('\n🎯 DATABASE INTEGRATION COMPLETE!');
    console.log('Your Huberman Health AI Assistant now has full access to all transcript data!');
  } catch (error) {
    console.error('❌ Integration failed:', error);
    process.exit(1);
  }
}

main();