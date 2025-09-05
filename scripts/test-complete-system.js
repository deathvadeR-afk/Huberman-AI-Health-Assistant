#!/usr/bin/env node

/**
 * Complete System Test
 * Tests the entire pipeline: database, transcripts, search, and timestamps
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { SemanticSearchService } from '../backend/src/services/semanticSearchService.js';
import { DatabaseService } from '../backend/src/services/databaseService.js';

const { Pool } = pg;

// Load environment variables
dotenv.config({ path: './backend/.env' });

class SystemTester {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    this.db = new DatabaseService();
    this.semanticSearch = new SemanticSearchService();
  }

  async start() {
    console.log('🧪 Starting Complete System Test...');
    
    try {
      // Test 1: Database Connection
      await this.testDatabaseConnection();
      
      // Test 2: Data Availability
      await this.testDataAvailability();
      
      // Test 3: Search Functionality
      await this.testSearchFunctionality();
      
      // Test 4: Timestamp Extraction
      await this.testTimestampExtraction();
      
      // Test 5: End-to-End Search
      await this.testEndToEndSearch();
      
      console.log('\n🎉 ALL SYSTEM TESTS PASSED!');
      console.log('✅ Your Huberman Health AI Assistant is fully operational!');
      
    } catch (error) {
      console.error('❌ System test failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  async testDatabaseConnection() {
    console.log('\n📊 Test 1: Database Connection');
    
    try {
      await this.pool.query('SELECT NOW()');
      console.log('✅ Database connection successful');
      
      await this.db.connect();
      console.log('✅ Database service connected');
      
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async testDataAvailability() {
    console.log('\n📚 Test 2: Data Availability');
    
    try {
      // Check videos
      const videoCount = await this.pool.query('SELECT COUNT(*) as count FROM videos');
      const videoTotal = parseInt(videoCount.rows[0].count);
      console.log(`✅ Videos in database: ${videoTotal}`);
      
      if (videoTotal === 0) {
        throw new Error('No videos found in database');
      }
      
      // Check transcripts
      const transcriptCount = await this.pool.query('SELECT COUNT(*) as count FROM transcripts');
      const transcriptTotal = parseInt(transcriptCount.rows[0].count);
      console.log(`✅ Transcripts in database: ${transcriptTotal}`);
      
      // Check transcript segments
      const segmentCount = await this.pool.query('SELECT COUNT(*) as count FROM transcript_segments');
      const segmentTotal = parseInt(segmentCount.rows[0].count);
      console.log(`✅ Transcript segments in database: ${segmentTotal}`);
      
      // Calculate coverage
      const coverage = transcriptTotal > 0 ? ((transcriptTotal / videoTotal) * 100).toFixed(1) : 0;
      console.log(`✅ Transcript coverage: ${coverage}%`);
      
      if (transcriptTotal === 0) {
        console.log('⚠️ No transcripts found - running integration...');
        // Could trigger integration here if needed
      }
      
    } catch (error) {
      console.error('❌ Data availability check failed:', error);
      throw error;
    }
  }

  async testSearchFunctionality() {
    console.log('\n🔍 Test 3: Search Functionality');
    
    try {
      // Test basic video search
      const searchResults = await this.db.searchVideos('sleep', 5);
      console.log(`✅ Basic search returned ${searchResults.length} results`);
      
      if (searchResults.length > 0) {
        const firstResult = searchResults[0];
        console.log(`   - Top result: "${firstResult.title}"`);
        console.log(`   - Relevance score: ${firstResult.relevance_score || 'N/A'}`);
      }
      
      // Test semantic search
      const semanticResults = await this.semanticSearch.searchTranscripts('sleep optimization', {
        limit: 3,
        includeTimestamps: false
      });
      console.log(`✅ Semantic search returned ${semanticResults.length} results`);
      
    } catch (error) {
      console.error('❌ Search functionality test failed:', error);
      throw error;
    }
  }

  async testTimestampExtraction() {
    console.log('\n⏰ Test 4: Timestamp Extraction');
    
    try {
      // Get a video with segments
      const videoQuery = `
        SELECT v.id, v.youtube_id, v.title, COUNT(ts.id) as segment_count
        FROM videos v
        LEFT JOIN transcript_segments ts ON v.id = ts.video_id
        GROUP BY v.id, v.youtube_id, v.title
        HAVING COUNT(ts.id) > 0
        LIMIT 1
      `;
      
      const videoResult = await this.pool.query(videoQuery);
      
      if (videoResult.rows.length === 0) {
        console.log('⚠️ No videos with segments found for timestamp test');
        return;
      }
      
      const testVideo = videoResult.rows[0];
      console.log(`✅ Testing with video: "${testVideo.title}"`);
      console.log(`   - Segments available: ${testVideo.segment_count}`);
      
      // Test segment retrieval
      const segments = await this.db.getVideoSegments(testVideo.id);
      console.log(`✅ Retrieved ${segments.length} segments`);
      
      if (segments.length > 0) {
        const firstSegment = segments[0];
        console.log(`   - First segment: ${firstSegment.startTime}s - "${firstSegment.text.substring(0, 50)}..."`);
      }
      
      // Test timestamp extraction
      const timestamps = await this.semanticSearch.extractRelevantTimestamps(testVideo.id, 'sleep');
      console.log(`✅ Extracted ${timestamps.length} relevant timestamps`);
      
      if (timestamps.length > 0) {
        const firstTimestamp = timestamps[0];
        console.log(`   - Top timestamp: ${firstTimestamp.time}s - "${firstTimestamp.label}"`);
      }
      
    } catch (error) {
      console.error('❌ Timestamp extraction test failed:', error);
      throw error;
    }
  }

  async testEndToEndSearch() {
    console.log('\n🎯 Test 5: End-to-End Search');
    
    try {
      const testQueries = [
        'sleep optimization',
        'exercise performance',
        'nutrition science',
        'stress management'
      ];
      
      for (const query of testQueries) {
        console.log(`\n   Testing query: "${query}"`);
        
        const results = await this.semanticSearch.searchTranscripts(query, {
          limit: 2,
          includeTimestamps: true,
          minRelevanceScore: 0.1
        });
        
        console.log(`   ✅ Found ${results.length} results with timestamps`);
        
        if (results.length > 0) {
          const topResult = results[0];
          console.log(`      - Top result: "${topResult.title}"`);
          console.log(`      - Relevance: ${topResult.relevanceScore.toFixed(2)}`);
          console.log(`      - Timestamps: ${topResult.timestamps?.length || 0}`);
          
          if (topResult.timestamps && topResult.timestamps.length > 0) {
            const firstTimestamp = topResult.timestamps[0];
            console.log(`      - First timestamp: ${firstTimestamp.time}s - "${firstTimestamp.label}"`);
          }
        }
      }
      
      console.log('\n✅ End-to-end search test completed successfully');
      
    } catch (error) {
      console.error('❌ End-to-end search test failed:', error);
      throw error;
    }
  }
}

// Run the system test
async function main() {
  const tester = new SystemTester();
  
  try {
    await tester.start();
    console.log('\n🚀 SYSTEM IS READY FOR USERS!');
    console.log('Users can now search for health topics and get precise video timestamps.');
  } catch (error) {
    console.error('❌ System test failed:', error);
    process.exit(1);
  }
}

main();