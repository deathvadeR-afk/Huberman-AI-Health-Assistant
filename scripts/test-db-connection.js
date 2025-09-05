#!/usr/bin/env node

/**
 * Test Database Connection and Video Count
 */

import { DatabaseService } from '../backend/src/services/databaseService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './backend/.env' });

async function testDatabase() {
  console.log('🔍 Testing database connection and video count...');
  
  const db = new DatabaseService();
  
  try {
    // Connect to database
    console.log('🔌 Connecting to database...');
    await db.connect();
    console.log('✅ Database connected successfully');
    
    // Check if videos table exists
    console.log('📊 Checking videos table...');
    const tableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'videos'
    `;
    const tableResult = await db.pool.query(tableQuery);
    
    if (tableResult.rows.length === 0) {
      console.log('❌ Videos table does not exist');
      return;
    }
    
    console.log('✅ Videos table exists');
    
    // Count total videos
    console.log('📹 Counting videos...');
    const countQuery = 'SELECT COUNT(*) as count FROM videos';
    const countResult = await db.pool.query(countQuery);
    const videoCount = parseInt(countResult.rows[0].count);
    
    console.log(`📊 Total videos in database: ${videoCount}`);
    
    if (videoCount === 0) {
      console.log('⚠️ No videos found in database');
      console.log('💡 Please run the data collection script first');
      return;
    }
    
    // Get sample videos
    console.log('📋 Getting sample videos...');
    const sampleQuery = `
      SELECT youtube_id, title, published_at 
      FROM videos 
      ORDER BY published_at DESC 
      LIMIT 5
    `;
    const sampleResult = await db.pool.query(sampleQuery);
    
    console.log('📋 Sample videos:');
    sampleResult.rows.forEach((video, idx) => {
      console.log(`   ${idx + 1}. ${video.title} (${video.youtube_id})`);
    });
    
    // Check transcripts table
    console.log('\n📝 Checking transcripts table...');
    const transcriptTableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'transcripts'
    `;
    const transcriptTableResult = await db.pool.query(transcriptTableQuery);
    
    if (transcriptTableResult.rows.length > 0) {
      console.log('✅ Transcripts table exists');
      
      const transcriptCountQuery = 'SELECT COUNT(*) as count FROM transcripts';
      const transcriptCountResult = await db.pool.query(transcriptCountQuery);
      const transcriptCount = parseInt(transcriptCountResult.rows[0].count);
      
      console.log(`📊 Existing transcripts in database: ${transcriptCount}`);
      console.log(`📈 Transcript coverage: ${((transcriptCount / videoCount) * 100).toFixed(1)}%`);
    } else {
      console.log('⚠️ Transcripts table does not exist');
    }
    
    console.log('\n✅ Database test completed successfully');
    console.log(`🎯 Ready to download transcripts for ${videoCount} videos`);
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await db.close();
  }
}

testDatabase().catch(console.error);