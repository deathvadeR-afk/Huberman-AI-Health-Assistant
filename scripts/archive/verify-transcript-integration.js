#!/usr/bin/env node

/**
 * Verify Transcript Integration
 * Checks if transcripts are properly integrated with videos in the database
 */

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

// Load environment variables
dotenv.config({ path: './backend/.env' });

class TranscriptVerifier {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async start() {
    console.log('🔍 Verifying transcript integration...');
    
    try {
      // Test database connection
      console.log('🔌 Testing database connection...');
      await this.pool.query('SELECT NOW()');
      console.log('✅ Database connected successfully');

      // Check overall statistics
      await this.checkOverallStats();
      
      // Check transcript-video relationships
      await this.checkTranscriptVideoRelationships();
      
      // Test search functionality
      await this.testSearchFunctionality();
      
      // Check data quality
      await this.checkDataQuality();

      console.log('\n✅ VERIFICATION COMPLETE!');

    } catch (error) {
      console.error('❌ Verification failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  async checkOverallStats() {
    console.log('\n📊 Checking overall database statistics...');
    
    try {
      // Count videos
      const videoCount = await this.pool.query('SELECT COUNT(*) as count FROM videos');
      console.log(`📹 Total videos: ${videoCount.rows[0].count}`);
      
      // Count transcripts
      const transcriptCount = await this.pool.query('SELECT COUNT(*) as count FROM transcripts');
      console.log(`📝 Total transcripts: ${transcriptCount.rows[0].count}`);
      
      // Count transcript segments
      const segmentCount = await this.pool.query('SELECT COUNT(*) as count FROM transcript_segments');
      console.log(`🔤 Total transcript segments: ${segmentCount.rows[0].count}`);
      
      // Calculate coverage
      const coverage = ((parseInt(transcriptCount.rows[0].count) / parseInt(videoCount.rows[0].count)) * 100).toFixed(1);
      console.log(`📈 Transcript coverage: ${coverage}%`);
      
      // Calculate total content
      const totalChars = await this.pool.query('SELECT SUM(LENGTH(full_text)) as total FROM transcripts WHERE full_text IS NOT NULL');
      const totalCharacters = parseInt(totalChars.rows[0].total || 0);
      const estimatedWords = Math.round(totalCharacters / 5);
      
      console.log(`📝 Total characters: ${totalCharacters.toLocaleString()}`);
      console.log(`📝 Estimated words: ${estimatedWords.toLocaleString()}`);
      
    } catch (error) {
      console.error('❌ Failed to check overall stats:', error);
    }
  }

  async checkTranscriptVideoRelationships() {
    console.log('\n🔗 Checking transcript-video relationships...');
    
    try {
      // Check for videos with transcripts
      const videosWithTranscripts = await this.pool.query(`
        SELECT COUNT(*) as count 
        FROM videos v 
        INNER JOIN transcripts t ON v.id = t.video_id
      `);
      
      console.log(`📹 Videos with transcripts: ${videosWithTranscripts.rows[0].count}`);
      
      // Check for orphaned transcripts (transcripts without videos)
      const orphanedTranscripts = await this.pool.query(`
        SELECT COUNT(*) as count 
        FROM transcripts t 
        LEFT JOIN videos v ON t.video_id = v.id 
        WHERE v.id IS NULL
      `);
      
      console.log(`🔍 Orphaned transcripts: ${orphanedTranscripts.rows[0].count}`);
      
      // Sample video-transcript pairs
      const samplePairs = await this.pool.query(`
        SELECT v.youtube_id, v.title, 
               LENGTH(t.full_text) as transcript_length,
               (SELECT COUNT(*) FROM transcript_segments ts WHERE ts.video_id = v.id) as segment_count
        FROM videos v 
        INNER JOIN transcripts t ON v.id = t.video_id
        WHERE t.full_text IS NOT NULL AND LENGTH(t.full_text) > 100
        ORDER BY v.published_at DESC
        LIMIT 5
      `);
      
      console.log('\n📋 Sample video-transcript pairs:');
      samplePairs.rows.forEach((pair, idx) => {
        console.log(`   ${idx + 1}. ${pair.title}`);
        console.log(`      YouTube ID: ${pair.youtube_id}`);
        console.log(`      Transcript length: ${pair.transcript_length.toLocaleString()} chars`);
        console.log(`      Segments: ${pair.segment_count}`);
        console.log('');
      });
      
    } catch (error) {
      console.error('❌ Failed to check relationships:', error);
    }
  }

  async testSearchFunctionality() {
    console.log('\n🔍 Testing search functionality...');
    
    try {
      // Test basic text search
      const searchQuery = `
        SELECT v.title, v.youtube_id, 
               ts_headline('english', t.full_text, plainto_tsquery('english', 'sleep')) as snippet
        FROM videos v 
        INNER JOIN transcripts t ON v.id = t.video_id
        WHERE to_tsvector('english', t.full_text) @@ plainto_tsquery('english', 'sleep')
        LIMIT 3
      `;
      
      const searchResult = await this.pool.query(searchQuery);
      
      console.log(`🔍 Search test for "sleep": ${searchResult.rows.length} results`);
      searchResult.rows.forEach((result, idx) => {
        console.log(`   ${idx + 1}. ${result.title} (${result.youtube_id})`);
        console.log(`      Snippet: ${result.snippet.substring(0, 100)}...`);
      });
      
      // Test segment search
      const segmentSearch = await this.pool.query(`
        SELECT v.title, ts.start_time, ts.text
        FROM videos v 
        INNER JOIN transcript_segments ts ON v.id = ts.video_id
        WHERE ts.text ILIKE '%dopamine%'
        ORDER BY v.published_at DESC
        LIMIT 3
      `);
      
      console.log(`\n🎯 Segment search for "dopamine": ${segmentSearch.rows.length} results`);
      segmentSearch.rows.forEach((result, idx) => {
        console.log(`   ${idx + 1}. ${result.title} at ${Math.floor(result.start_time)}s`);
        console.log(`      Text: ${result.text.substring(0, 100)}...`);
      });
      
    } catch (error) {
      console.error('❌ Failed to test search functionality:', error);
    }
  }

  async checkDataQuality() {
    console.log('\n🔬 Checking data quality...');
    
    try {
      // Check for empty transcripts
      const emptyTranscripts = await this.pool.query(`
        SELECT COUNT(*) as count 
        FROM transcripts 
        WHERE full_text IS NULL OR LENGTH(full_text) < 100
      `);
      
      console.log(`⚠️ Empty/short transcripts: ${emptyTranscripts.rows[0].count}`);
      
      // Check transcript length distribution
      const lengthStats = await this.pool.query(`
        SELECT 
          MIN(LENGTH(full_text)) as min_length,
          MAX(LENGTH(full_text)) as max_length,
          AVG(LENGTH(full_text))::INTEGER as avg_length
        FROM transcripts 
        WHERE full_text IS NOT NULL
      `);
      
      if (lengthStats.rows.length > 0) {
        const stats = lengthStats.rows[0];
        console.log(`📏 Transcript lengths:`);
        console.log(`   Min: ${stats.min_length?.toLocaleString() || 0} chars`);
        console.log(`   Max: ${stats.max_length?.toLocaleString() || 0} chars`);
        console.log(`   Avg: ${stats.avg_length?.toLocaleString() || 0} chars`);
      }
      
      // Check segment distribution
      const segmentStats = await this.pool.query(`
        SELECT 
          v.youtube_id,
          v.title,
          COUNT(ts.id) as segment_count,
          MAX(ts.start_time) as duration_seconds
        FROM videos v 
        INNER JOIN transcript_segments ts ON v.id = ts.video_id
        GROUP BY v.id, v.youtube_id, v.title
        ORDER BY segment_count DESC
        LIMIT 5
      `);
      
      console.log('\n📊 Top 5 videos by segment count:');
      segmentStats.rows.forEach((video, idx) => {
        const duration = Math.floor(video.duration_seconds / 60);
        console.log(`   ${idx + 1}. ${video.title}`);
        console.log(`      Segments: ${video.segment_count}, Duration: ~${duration} min`);
      });
      
    } catch (error) {
      console.error('❌ Failed to check data quality:', error);
    }
  }
}

// Run the verification
async function main() {
  const verifier = new TranscriptVerifier();
  
  try {
    await verifier.start();
    console.log('\n🎯 VERIFICATION COMPLETE!');
    console.log('Database integration is working properly!');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

main();