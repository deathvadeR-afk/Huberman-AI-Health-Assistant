#!/usr/bin/env node

/**
 * Integrate Transcripts to Database
 * Loads all downloaded transcript files and integrates them into the database
 */

import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

const { Pool } = pg;

// Load environment variables
dotenv.config({ path: './backend/.env' });

class TranscriptDatabaseIntegrator {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    this.transcriptDir = './data/transcripts';
  }

  async start() {
    console.log('🚀 Starting transcript database integration...');
    
    try {
      // Test database connection
      console.log('🔌 Testing database connection...');
      await this.pool.query('SELECT NOW()');
      console.log('✅ Database connected successfully');

      // Create/update transcript tables
      console.log('📊 Setting up database schema...');
      await this.setupDatabaseSchema();

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

  async setupDatabaseSchema() {
    try {
      // Create transcripts table if it doesn't exist
      const createTranscriptsTable = `
        CREATE TABLE IF NOT EXISTS transcripts (
          id SERIAL PRIMARY KEY,
          video_id VARCHAR(20) NOT NULL,
          full_transcript TEXT,
          word_count INTEGER DEFAULT 0,
          segment_count INTEGER DEFAULT 0,
          language VARCHAR(10) DEFAULT 'en',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY (video_id) REFERENCES videos(youtube_id) ON DELETE CASCADE,
          UNIQUE(video_id)
        );
      `;

      // Create transcript_segments table if it doesn't exist
      const createSegmentsTable = `
        CREATE TABLE IF NOT EXISTS transcript_segments (
          id SERIAL PRIMARY KEY,
          video_id VARCHAR(20) NOT NULL,
          segment_index INTEGER NOT NULL,
          start_time DECIMAL(10,3) NOT NULL,
          duration DECIMAL(10,3) DEFAULT 0,
          text TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY (video_id) REFERENCES videos(youtube_id) ON DELETE CASCADE,
          UNIQUE(video_id, segment_index)
        );
      `;

      // Create indexes for better performance
      const createIndexes = `
        CREATE INDEX IF NOT EXISTS idx_transcripts_video_id ON transcripts(video_id);
        CREATE INDEX IF NOT EXISTS idx_transcript_segments_video_id ON transcript_segments(video_id);
        CREATE INDEX IF NOT EXISTS idx_transcript_segments_start_time ON transcript_segments(start_time);
        CREATE INDEX IF NOT EXISTS idx_transcript_segments_text ON transcript_segments USING gin(to_tsvector('english', text));
      `;

      await this.pool.query(createTranscriptsTable);
      await this.pool.query(createSegmentsTable);
      await this.pool.query(createIndexes);

      console.log('✅ Database schema setup complete');

    } catch (error) {
      console.error('❌ Failed to setup database schema:', error);
      throw error;
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
      const videoId = filename.replace('.json', '');
      
      try {
        // Read transcript file
        const filepath = path.join(this.transcriptDir, filename);
        const fileContent = await fs.readFile(filepath, 'utf8');
        const transcript = JSON.parse(fileContent);

        // Validate transcript data
        if (!transcript.fullTranscript || !transcript.timestamps) {
          console.log(`⚠️ [${i + 1}/${transcriptFiles.length}] ${videoId} - Missing transcript data`);
          failed++;
          continue;
        }

        // Check if video exists in database
        const videoCheck = await this.pool.query(
          'SELECT youtube_id FROM videos WHERE youtube_id = $1',
          [videoId]
        );

        if (videoCheck.rows.length === 0) {
          console.log(`⚠️ [${i + 1}/${transcriptFiles.length}] ${videoId} - Video not found in database`);
          failed++;
          continue;
        }

        // Insert/update transcript
        await this.insertTranscript(transcript, videoId);
        
        // Insert transcript segments
        const segmentCount = await this.insertTranscriptSegments(transcript, videoId);
        totalSegments += segmentCount;

        successful++;
        console.log(`✅ [${i + 1}/${transcriptFiles.length}] ${videoId} - ${transcript.wordCount} words, ${segmentCount} segments`);

      } catch (error) {
        failed++;
        console.error(`❌ [${i + 1}/${transcriptFiles.length}] ${videoId} - ${error.message}`);
      }

      // Progress update every 50 files
      if ((i + 1) % 50 === 0) {
        console.log(`📊 Progress: ${successful} success, ${failed} failed, ${transcriptFiles.length - i - 1} remaining`);
      }
    }

    return { successful, failed, totalSegments };
  }

  async insertTranscript(transcript, videoId) {
    const query = `
      INSERT INTO transcripts (video_id, full_transcript, word_count, segment_count, language, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (video_id) 
      DO UPDATE SET 
        full_transcript = EXCLUDED.full_transcript,
        word_count = EXCLUDED.word_count,
        segment_count = EXCLUDED.segment_count,
        language = EXCLUDED.language,
        updated_at = NOW()
    `;

    const values = [
      videoId,
      transcript.fullTranscript,
      transcript.wordCount || 0,
      transcript.timestamps ? transcript.timestamps.length : 0,
      transcript.language || 'en'
    ];

    await this.pool.query(query, values);
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
        placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5})`);
      });

      if (values.length > 0) {
        const query = `
          INSERT INTO transcript_segments (video_id, segment_index, start_time, duration, text)
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
      const totalWords = await this.pool.query('SELECT SUM(word_count) as total FROM transcripts');
      const videoCount = await this.pool.query('SELECT COUNT(*) as count FROM videos');

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
          totalWords: parseInt(totalWords.rows[0].total || 0),
          transcriptCoverage: ((parseInt(transcriptCount.rows[0].count) / parseInt(videoCount.rows[0].count)) * 100).toFixed(1) + '%'
        },
        summary: `Successfully integrated ${results.successful} transcripts into the database with ${results.totalSegments} searchable segments containing ${parseInt(totalWords.rows[0].total || 0).toLocaleString()} words.`
      };

      await fs.writeFile('./data/transcript-integration-report.json', JSON.stringify(report, null, 2));
      console.log('📋 Integration report saved to ./data/transcript-integration-report.json');

      return report;
    } catch (error) {
      console.error('❌ Failed to generate integration report:', error);
    }
  }
}

// Run the integration
async function main() {
  const integrator = new TranscriptDatabaseIntegrator();
  
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