#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

dotenv.config({ path: './backend/.env' });

async function checkStatus() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('📊 Checking Integration Status...\n');

    // Videos
    const videoResult = await pool.query('SELECT COUNT(*) as count FROM videos');
    const videoCount = parseInt(videoResult.rows[0].count);
    console.log(`📹 Videos: ${videoCount}`);

    // Transcripts
    const transcriptResult = await pool.query('SELECT COUNT(*) as count FROM transcripts');
    const transcriptCount = parseInt(transcriptResult.rows[0].count);
    console.log(`📝 Transcripts: ${transcriptCount}`);

    // Segments
    const segmentResult = await pool.query('SELECT COUNT(*) as count FROM transcript_segments');
    const segmentCount = parseInt(segmentResult.rows[0].count);
    console.log(`🔗 Segments: ${segmentCount}`);

    // Coverage
    const coverage = videoCount > 0 ? ((transcriptCount / videoCount) * 100).toFixed(1) : 0;
    console.log(`📈 Coverage: ${coverage}%`);

    // Sample data
    if (transcriptCount > 0) {
      const sampleResult = await pool.query(`
        SELECT v.title, v.youtube_id, LENGTH(t.full_text) as text_length
        FROM videos v
        JOIN transcripts t ON v.id = t.video_id
        ORDER BY t.created_at DESC
        LIMIT 3
      `);
      
      console.log('\n📋 Recent Integrations:');
      sampleResult.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.title} (${row.text_length} chars)`);
      });
    }

    console.log(`\n${transcriptCount > 0 ? '✅' : '⚠️'} Integration Status: ${transcriptCount > 0 ? 'COMPLETE' : 'PENDING'}`);

  } catch (error) {
    console.error('❌ Status check failed:', error);
  } finally {
    await pool.end();
  }
}

checkStatus();