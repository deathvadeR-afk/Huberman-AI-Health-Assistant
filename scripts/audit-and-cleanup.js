#!/usr/bin/env node

/**
 * Codebase Audit and Cleanup Script
 * Organizes scripts, removes duplicates, and ensures proper structure
 */

import fs from 'fs/promises';
import path from 'path';

class CodebaseAuditor {
  constructor() {
    this.scriptsToKeep = [
      // Essential integration scripts
      'integrate-transcripts-corrected.js', // Final working version
      'check-database-schema.js',
      'test-db-connection.js',
      
      // Data collection scripts
      'get-all-huberman-videos.js',
      'final-transcript-downloader.js', // Best transcript downloader
      
      // Verification scripts
      'verify-integration-success.js',
      'test-complete-system.js',
      
      // Utility scripts
      'quick-schema-check.js'
    ];
    
    this.scriptsToArchive = [
      // Duplicate/outdated integration scripts
      'integrate-transcripts-fixed.js',
      'integrate-transcripts-to-database.js',
      
      // Duplicate downloaders
      'collect-all-huberman-transcripts.js',
      'collect-huberman-data.js',
      'complete-huberman-collection.js',
      'comprehensive-huberman-collection.js',
      'download-all-transcripts-manual.js',
      'download-all-transcripts-simple.js',
      'download-huberman-transcripts.js',
      'download-transcripts.js',
      'enhanced-transcript-downloader.js',
      'quick-transcript-download.js',
      
      // Debug scripts (keep for reference)
      'debug-channel-scraper.js',
      'debug-full-transcript.js',
      'debug-transcript.js',
      'fixed-channel-scraper.js',
      
      // Utility scripts that are duplicates
      'get-all-transcripts-from-db.js',
      'verify-transcript-integration.js',
      'check-integration-status.js',
      'fix-transcript-format.js'
    ];
  }

  async start() {
    console.log('🔍 Starting codebase audit and cleanup...');
    
    try {
      // Create archive directory
      await this.createArchiveDirectory();
      
      // Archive duplicate scripts
      await this.archiveScripts();
      
      // Create documentation
      await this.createScriptDocumentation();
      
      // Verify essential files
      await this.verifyEssentialFiles();
      
      // Clean up data directory
      await this.organizeDataDirectory();
      
      console.log('\n✅ CODEBASE AUDIT COMPLETE!');
      console.log('===========================');
      console.log('📁 Organized scripts directory');
      console.log('📚 Created documentation');
      console.log('🗂️ Archived duplicate files');
      console.log('✨ Codebase is now clean and organized');
      
    } catch (error) {
      console.error('❌ Audit failed:', error);
      throw error;
    }
  }

  async createArchiveDirectory() {
    const archiveDir = './scripts/archive';
    try {
      await fs.mkdir(archiveDir, { recursive: true });
      console.log('📁 Created archive directory');
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async archiveScripts() {
    console.log('🗂️ Archiving duplicate scripts...');
    
    for (const script of this.scriptsToArchive) {
      try {
        const sourcePath = `./scripts/${script}`;
        const archivePath = `./scripts/archive/${script}`;
        
        // Check if source exists
        try {
          await fs.access(sourcePath);
          await fs.rename(sourcePath, archivePath);
          console.log(`   📦 Archived: ${script}`);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            console.log(`   ⚠️ Could not archive ${script}: ${error.message}`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Error archiving ${script}: ${error.message}`);
      }
    }
  }

  async createScriptDocumentation() {
    const documentation = `# Scripts Directory Documentation

## Active Scripts (Production Ready)

### Integration Scripts
- **integrate-transcripts-corrected.js** - Final working transcript integration script
  - Uses correct database schema
  - Handles both transcripts and segments
  - Includes proper error handling

### Database Scripts
- **check-database-schema.js** - Validates database schema
- **test-db-connection.js** - Tests database connectivity
- **quick-schema-check.js** - Quick schema validation utility

### Data Collection Scripts
- **get-all-huberman-videos.js** - Fetches all Huberman Lab video metadata
- **final-transcript-downloader.js** - Downloads transcripts from YouTube

### Verification Scripts
- **verify-integration-success.js** - Verifies transcript integration success
- **test-complete-system.js** - End-to-end system testing

## Archived Scripts

All duplicate, outdated, or experimental scripts have been moved to \`./archive/\` directory.
These are kept for reference but should not be used in production.

## Usage Instructions

### To integrate transcripts:
\`\`\`bash
node scripts/integrate-transcripts-corrected.js
\`\`\`

### To verify integration:
\`\`\`bash
node scripts/verify-integration-success.js
\`\`\`

### To test the complete system:
\`\`\`bash
node scripts/test-complete-system.js
\`\`\`

## Maintenance

- Keep only essential scripts in the main directory
- Archive experimental or duplicate scripts
- Update this documentation when adding new scripts
- Test all scripts before deployment

Generated on: ${new Date().toISOString()}
`;

    await fs.writeFile('./scripts/README.md', documentation);
    console.log('📚 Created scripts documentation');
  }

  async verifyEssentialFiles() {
    console.log('🔍 Verifying essential files...');
    
    const essentialFiles = [
      './backend/src/services/transcriptService.js',
      './backend/src/routes/transcripts.js',
      './backend/src/controllers/transcriptController.js',
      './frontend/src/components/TranscriptSearch.jsx',
      './database/migrations/',
      './docker-compose.yml',
      './package.json',
      './README.md'
    ];

    for (const file of essentialFiles) {
      try {
        await fs.access(file);
        console.log(`   ✅ ${file}`);
      } catch (error) {
        console.log(`   ⚠️ Missing: ${file}`);
      }
    }
  }

  async organizeDataDirectory() {
    console.log('🗂️ Organizing data directory...');
    
    try {
      // Create organized subdirectories
      const subdirs = ['reports', 'backups', 'logs'];
      
      for (const subdir of subdirs) {
        await fs.mkdir(`./data/${subdir}`, { recursive: true });
      }
      
      // Move report files to reports directory
      const reportFiles = [
        'final-transcript-report.json',
        'transcript-download-summary.json',
        'transcript-integration-report-fixed.json'
      ];
      
      for (const reportFile of reportFiles) {
        try {
          const sourcePath = `./data/${reportFile}`;
          const destPath = `./data/reports/${reportFile}`;
          
          await fs.access(sourcePath);
          await fs.rename(sourcePath, destPath);
          console.log(`   📊 Moved report: ${reportFile}`);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            console.log(`   ⚠️ Could not move ${reportFile}: ${error.message}`);
          }
        }
      }
      
      console.log('   ✅ Data directory organized');
      
    } catch (error) {
      console.log(`   ❌ Error organizing data directory: ${error.message}`);
    }
  }
}

// Run the audit
async function main() {
  const auditor = new CodebaseAuditor();
  
  try {
    await auditor.start();
    console.log('\n🎯 AUDIT COMPLETE!');
    console.log('Your codebase is now clean and organized!');
  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

main();