#!/usr/bin/env node

/**
 * Corrected Transcript Database Integration
 * Uses the correct database schema with proper column names
 */

import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

const { Pool } = pg;

// Load environment variables
dotenv.config({ path: './backend/.env' });

class CorrectedTranscriptIntegrator {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    this.transcriptDir = './data/transcripts';
  }

  async start() {
    console.log('🚀 Starting corrected transcript database integration...');
    
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

      console.log('\n🎉 TRANSCRIPT INTEGRATION COMPLETE!');
      console.log('===================================');
      console.log(`📊 Integration Results:`);
      console.log(`   ✅ Successfully integrated: ${results.successful}`);
      console.log(`   ❌ Failed integrations: ${results.failed}`);
      console.log(`   📝 Total transcript segments: ${results.totalSegments}`);
      console.log(`   📈 Success Rate: ${((results.successful / transcriptFiles.length) * 100).toFixed(1)}%`);

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
      return files.filter(f => f.endsWith('.json'));
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

        // Insert/update transcript
        const transcriptId = await this.insertTranscript(transcript, videoId);
        
        // Insert transcript segments
        const segmentCount = await this.insertTranscriptSegments(transcript, videoId, transcriptId);
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

  async insertTranscript(transcript, videoId) {
    // Check if transcript already exists
    const existingQuery = 'SELECT id FROM transcripts WHERE video_id = $1';
    const existingResult = await this.pool.query(existingQuery, [videoId]);

    let transcriptId;

    if (existingResult.rows.length > 0) {
      // Update existing transcript
      transcriptId = existingResult.rows[0].id;
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
        RETURNING id
      `;

      const values = [
        videoId,
        transcript.fullTranscript,
        transcript.language || 'en',
        0.95 // Default confidence score
      ];

      const result = await this.pool.query(insertQuery, values);
      transcriptId = result.rows[0].id;
    }

    return transcriptId;
  }

  async insertTranscriptSegments(transcript, videoId, transcriptId) {
    if (!transcript.timestamps || transcript.timestamps.length === 0) {
      return 0;
    }

    // Delete existing segments for this video
    await this.pool.query('DELETE FROM transcript_segments WHERE video_id = $1', [videoId]);

    let insertedCount = 0;

    // Insert segments one by one to handle errors gracefully
    for (const segment of transcript.timestamps) {
      try {
        const startTime = parseFloat(segment.start || 0);
        const duration = parseFloat(segment.duration || 0);
        const endTime = startTime + duration;
        
        const insertQuery = `
          INSERT INTO transcript_segments (
            id, transcript_id, video_id, start_time, end_time, text, 
            speaker, confidence_score, created_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW()
          )
        `;
        
        const values = [
          transcriptId,
          videoId,
          startTime,
          endTime,
          segment.text || '',
          'Host', // Default speaker
          0.95 // Default confidence
        ];
        
        await this.pool.query(insertQuery, values);
        insertedCount++;
      } catch (error) {
        console.log(`⚠️ Failed to insert segment: ${error.message}`);
      }
    }

    return insertedCount;
  }
}

// Run the integration
async function main() {
  const integrator = new CorrectedTranscriptIntegrator();
  
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