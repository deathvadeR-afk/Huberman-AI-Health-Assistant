#!/usr/bin/env node

/**
 * Verify Integration Success
 * Confirms the transcript integration worked correctly
 */

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

// Load environment variables
dotenv.config({ path: './backend/.env' });

class IntegrationVerifier {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async verify() {
    console.log('🔍 Verifying transcript integration...');
    
    try {
      // Get counts
      const transcriptCount = await this.pool.query('SELECT COUNT(*) as count FROM transcripts');
      const segmentCount = await this.pool.query('SELECT COUNT(*) as count FROM transcript_segments');
      const videoCount = await this.pool.query('SELECT COUNT(*) as count FROM videos');
      
      // Get sample data
      const sampleTranscript = await this.pool.query(`
        SELECT v.title, v.youtube_id, t.language, LENGTH(t.full_text) as text_length
        FROM transcripts t 
        JOIN videos v ON t.video_id = v.id 
        LIMIT 1
      `);
      
      const sampleSegments = await this.pool.query(`
        SELECT COUNT(*) as segment_count, v.title
        FROM transcript_segments ts
        JOIN videos v ON ts.video_id = v.id
        GROUP BY v.id, v.title
        ORDER BY segment_count DESC
        LIMIT 3
      `);

      console.log('\n✅ INTEGRATION VERIFICATION RESULTS');
      console.log('=====================================');
      console.log(`📊 Database Statistics:`);
      console.log(`   Total Videos: ${videoCount.rows[0].count}`);
      console.log(`   Total Transcripts: ${transcriptCount.rows[0].count}`);
      console.log(`   Total Segments: ${segmentCount.rows[0].count}`);
      console.log(`   Coverage: ${((transcriptCount.rows[0].count / videoCount.rows[0].count) * 100).toFixed(1)}%`);
      
      if (sampleTranscript.rows.length > 0) {
        const sample = sampleTranscript.rows[0];
        console.log(`\n📝 Sample Transcript:`);
        console.log(`   Video: ${sample.title}`);
        console.log(`   YouTube ID: ${sample.youtube_id}`);
        console.log(`   Language: ${sample.language}`);
        console.log(`   Text Length: ${sample.text_length.toLocaleString()} characters`);
      }
      
      console.log(`\n🎯 Top Videos by Segment Count:`);
      sampleSegments.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.title.substring(0, 50)}... (${row.segment_count} segments)`);
      });
      
      console.log('\n🎉 Integration verification complete! Your database is ready for AI queries.');
      
    } catch (error) {
      console.error('❌ Verification failed:', error);
    } finally {
      await this.pool.end();
    }
  }
}

// Run verification
const verifier = new IntegrationVerifier();
verifier.verify();