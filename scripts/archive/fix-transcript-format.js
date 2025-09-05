#!/usr/bin/env node

/**
 * Fix Transcript Format
 * Processes the downloaded transcripts and formats them properly
 */

import fs from 'fs/promises';
import path from 'path';

async function fixTranscriptFormat() {
  console.log('🔧 Fixing transcript format...');
  
  try {
    const transcriptDir = './data/transcripts';
    const files = await fs.readdir(transcriptDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    console.log(`📁 Found ${jsonFiles.length} transcript files to process`);
    
    let processedCount = 0;
    let totalWords = 0;
    
    for (const filename of jsonFiles) {
      const filepath = path.join(transcriptDir, filename);
      
      try {
        const content = await fs.readFile(filepath, 'utf8');
        const data = JSON.parse(content);
        
        // Check if this file needs processing (has the old format)
        if (!data.transcript && !data.fullTranscript) {
          console.log(`⚠️ Skipping ${filename} - no transcript data found`);
          continue;
        }
        
        // If transcript is already a string, skip
        if (typeof data.transcript === 'string') {
          console.log(`✅ ${filename} already processed`);
          continue;
        }
        
        // Process the transcript array format
        let fullTranscript = '';
        let timestamps = [];
        
        if (Array.isArray(data.transcript)) {
          for (const segment of data.transcript) {
            if (segment.text) {
              fullTranscript += segment.text + ' ';
              
              if (segment.start) {
                timestamps.push({
                  start: parseFloat(segment.start),
                  duration: parseFloat(segment.dur || 0),
                  text: segment.text
                });
              }
            }
          }
        }
        
        // Clean up the transcript text
        fullTranscript = fullTranscript.trim();
        const wordCount = fullTranscript.split(' ').length;
        totalWords += wordCount;
        
        // Update the data structure
        const updatedData = {
          ...data,
          transcript: fullTranscript,
          fullTranscript: fullTranscript, // Keep both for compatibility
          timestamps: timestamps,
          wordCount: wordCount,
          processedAt: new Date().toISOString()
        };
        
        // Save the updated file
        await fs.writeFile(filepath, JSON.stringify(updatedData, null, 2));
        
        processedCount++;
        console.log(`✅ Processed ${filename} - ${wordCount} words`);
        
      } catch (error) {
        console.error(`❌ Failed to process ${filename}:`, error.message);
      }
    }
    
    console.log('\n🎉 Transcript format fixing completed!');
    console.log(`📊 Processed ${processedCount} files`);
    console.log(`📝 Total words: ${totalWords.toLocaleString()}`);
    console.log(`📈 Average words per transcript: ${Math.round(totalWords / processedCount)}`);
    
    return { processedCount, totalWords };
    
  } catch (error) {
    console.error('❌ Failed to fix transcript format:', error);
    throw error;
  }
}

// Run the fixer
fixTranscriptFormat().catch(console.error);