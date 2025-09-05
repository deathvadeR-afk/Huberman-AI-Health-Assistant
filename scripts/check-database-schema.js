#!/usr/bin/env node

/**
 * Check Database Schema
 * Inspects the current database schema to understand the existing structure
 */

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

// Load environment variables
dotenv.config({ path: './backend/.env' });

class DatabaseSchemaChecker {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async start() {
    console.log('🔍 Checking database schema...');
    
    try {
      // Test connection
      await this.pool.query('SELECT NOW()');
      console.log('✅ Database connected successfully');

      // Check all tables
      await this.checkTables();
      
      // Check transcripts table specifically
      await this.checkTranscriptsTable();
      
      // Check videos table
      await this.checkVideosTable();

    } catch (error) {
      console.error('❌ Schema check failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  async checkTables() {
    console.log('\n📊 Checking all tables...');
    
    const query = `
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    const result = await this.pool.query(query);
    
    console.log(`Found ${result.rows.length} tables:`);
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name} (${row.table_type})`);
    });
  }

  async checkTranscriptsTable() {
    console.log('\n📝 Checking transcripts table schema...');
    
    try {
      const query = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'transcripts' AND table_schema = 'public'
        ORDER BY ordinal_position;
      `;
      
      const result = await this.pool.query(query);
      
      if (result.rows.length === 0) {
        console.log('⚠️ Transcripts table does not exist');
        return;
      }
      
      console.log('Transcripts table columns:');
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
      
      // Check if there's any data
      const countResult = await this.pool.query('SELECT COUNT(*) as count FROM transcripts');
      console.log(`Current transcript records: ${countResult.rows[0].count}`);
      
    } catch (error) {
      console.log('⚠️ Error checking transcripts table:', error.message);
    }
  }

  async checkVideosTable() {
    console.log('\n📹 Checking videos table schema...');
    
    try {
      const query = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'videos' AND table_schema = 'public'
        ORDER BY ordinal_position;
      `;
      
      const result = await this.pool.query(query);
      
      if (result.rows.length === 0) {
        console.log('⚠️ Videos table does not exist');
        return;
      }
      
      console.log('Videos table columns:');
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
      
      // Check if there's any data
      const countResult = await this.pool.query('SELECT COUNT(*) as count FROM videos');
      console.log(`Current video records: ${countResult.rows[0].count}`);
      
    } catch (error) {
      console.log('⚠️ Error checking videos table:', error.message);
    }
  }
}

// Run the schema checker
async function main() {
  const checker = new DatabaseSchemaChecker();
  
  try {
    await checker.start();
    console.log('\n✅ Schema check complete!');
  } catch (error) {
    console.error('❌ Schema check failed:', error);
    process.exit(1);
  }
}

main();