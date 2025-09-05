#!/usr/bin/env node
import pg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pg;

dotenv.config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkSchema() {
  try {
    console.log('Checking transcript_segments schema...');
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'transcript_segments' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('transcript_segments columns:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    // Test a simple insert
    console.log('\nTesting insert...');
    const testResult = await pool.query(`
      INSERT INTO transcript_segments (id, video_id, start_time, duration, text, created_at)
      VALUES (gen_random_uuid(), gen_random_uuid(), 0, 1, 'test', NOW())
      RETURNING id;
    `);
    console.log('Insert successful:', testResult.rows[0].id);
    
    // Clean up test
    await pool.query('DELETE FROM transcript_segments WHERE text = $1', ['test']);
    console.log('Test cleanup complete');
    
  } catch (error) {
    console.error('Schema check failed:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();