#!/usr/bin/env node

import { YouTubeApiScraper } from './src/scrapers/youtubeApiScraper.js';

console.log('🚀 Starting Huberman Lab video collection...');

const scraper = new YouTubeApiScraper();

try {
    // Show quota usage info first
    await scraper.checkQuotaUsage();
    
    console.log('📹 Starting to scrape videos (first 50 for testing)...');
    
    // Start with 50 videos for testing
    const videos = await scraper.scrapeHubermanVideos(50);
    
    console.log(`✅ Successfully scraped ${videos.length} videos`);
    
    // Get statistics
    const stats = await scraper.getScrapingStats();
    
    if (stats) {
        console.log('\n📊 Collection Statistics:');
        console.log(`   Total Videos: ${stats.totalVideos}`);
        console.log(`   Latest Video: ${stats.latestVideo}`);
        console.log(`   Oldest Video: ${stats.oldestVideo}`);
        console.log(`   Average Duration: ${Math.round(stats.averageDuration / 60)} minutes`);
        console.log(`   Total Content: ${Math.round(stats.totalDuration / 3600)} hours`);
        console.log(`   Average Views: ${stats.averageViews?.toLocaleString()}`);
        console.log(`   Total Views: ${stats.totalViews?.toLocaleString()}`);
    }
    
    console.log('\n🎉 Video collection completed successfully!');
    console.log('💡 Run this script again with a higher number to collect more videos.');
    
} catch (error) {
    console.error('❌ Video collection failed:', error.message);
    console.error(error.stack);
} finally {
    // Clean up database connection
    await scraper.db.close();
    process.exit(0);
}
