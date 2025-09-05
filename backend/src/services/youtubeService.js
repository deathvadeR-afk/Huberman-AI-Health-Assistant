import { google } from 'googleapis';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('YouTubeService');

class YouTubeService {
    constructor() {
        this.apiKey = process.env.YOUTUBE_API_KEY;
        this.youtube = google.youtube({
            version: 'v3',
            auth: this.apiKey
        });
        
        // Huberman Lab channel ID
        this.hubermanChannelId = 'UC2D2CMWXMOVWx7giW1n3LIg';
        this.hubermanChannelHandle = '@hubermanlab';
    }

    /**
     * Get Huberman Lab channel information
     */
    async getChannelInfo() {
        try {
            logger.info('Fetching Huberman Lab channel information...');
            
            const response = await this.youtube.channels.list({
                part: ['snippet', 'statistics', 'contentDetails'],
                id: [this.hubermanChannelId]
            });

            if (response.data.items.length === 0) {
                throw new Error('Huberman Lab channel not found');
            }

            const channel = response.data.items[0];
            return {
                id: channel.id,
                title: channel.snippet.title,
                description: channel.snippet.description,
                subscriberCount: parseInt(channel.statistics.subscriberCount),
                videoCount: parseInt(channel.statistics.videoCount),
                viewCount: parseInt(channel.statistics.viewCount),
                uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads,
                thumbnails: channel.snippet.thumbnails
            };
        } catch (error) {
            logger.error('Error fetching channel info:', error);
            throw error;
        }
    }

    /**
     * Get all videos from Huberman Lab channel
     */
    async getAllVideos(maxResults = 500) {
        try {
            logger.info(`Fetching up to ${maxResults} videos from Huberman Lab...`);
            
            // First get channel info to get uploads playlist
            const channelInfo = await this.getChannelInfo();
            const uploadsPlaylistId = channelInfo.uploadsPlaylistId;
            
            const allVideos = [];
            let nextPageToken = null;
            let totalFetched = 0;

            do {
                const response = await this.youtube.playlistItems.list({
                    part: ['snippet', 'contentDetails'],
                    playlistId: uploadsPlaylistId,
                    maxResults: Math.min(50, maxResults - totalFetched), // YouTube API max is 50 per request
                    pageToken: nextPageToken
                });

                const videoIds = response.data.items.map(item => item.contentDetails.videoId);
                
                // Get detailed video information
                const videoDetails = await this.getVideoDetails(videoIds);
                allVideos.push(...videoDetails);
                
                totalFetched += response.data.items.length;
                nextPageToken = response.data.nextPageToken;
                
                logger.info(`Fetched ${totalFetched} videos so far...`);
                
                // Add small delay to respect rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } while (nextPageToken && totalFetched < maxResults);

            logger.info(`Successfully fetched ${allVideos.length} videos from Huberman Lab`);
            return allVideos;
            
        } catch (error) {
            logger.error('Error fetching videos:', error);
            throw error;
        }
    }

    /**
     * Get detailed information for specific video IDs
     */
    async getVideoDetails(videoIds) {
        try {
            if (!videoIds || videoIds.length === 0) {
                return [];
            }

            const response = await this.youtube.videos.list({
                part: ['snippet', 'statistics', 'contentDetails'],
                id: videoIds
            });

            return response.data.items.map(video => ({
                youtube_id: video.id,
                title: video.snippet.title,
                description: video.snippet.description,
                published_at: new Date(video.snippet.publishedAt),
                duration_seconds: this.parseDuration(video.contentDetails.duration),
                view_count: parseInt(video.statistics.viewCount || 0),
                like_count: parseInt(video.statistics.likeCount || 0),
                comment_count: parseInt(video.statistics.commentCount || 0),
                thumbnail_url: video.snippet.thumbnails.maxres?.url || 
                             video.snippet.thumbnails.high?.url || 
                             video.snippet.thumbnails.medium?.url,
                url: `https://www.youtube.com/watch?v=${video.id}`,
                channel_name: video.snippet.channelTitle,
                tags: video.snippet.tags || [],
                category_id: video.snippet.categoryId,
                default_language: video.snippet.defaultLanguage,
                raw_data: video
            }));
        } catch (error) {
            logger.error('Error fetching video details:', error);
            throw error;
        }
    }

    /**
     * Get video captions/transcripts
     */
    async getVideoTranscript(videoId) {
        try {
            logger.info(`Fetching transcript for video ${videoId}...`);
            
            // First, get available captions
            const captionsResponse = await this.youtube.captions.list({
                part: ['snippet'],
                videoId: videoId
            });

            if (captionsResponse.data.items.length === 0) {
                logger.warn(`No captions available for video ${videoId}`);
                return null;
            }

            // Find English captions
            const englishCaption = captionsResponse.data.items.find(
                caption => caption.snippet.language === 'en' || 
                          caption.snippet.language === 'en-US'
            ) || captionsResponse.data.items[0]; // Fallback to first available

            try {
                // Download the caption
                const captionResponse = await this.youtube.captions.download({
                    id: englishCaption.id,
                    tfmt: 'srt' // SubRip format with timestamps
                });

                // Parse SRT format to extract timestamps and text
                const transcript = this.parseSRTTranscript(captionResponse.data);
                
                return {
                    video_id: videoId,
                    language: englishCaption.snippet.language,
                    transcript: transcript.fullText,
                    segments: transcript.segments
                };
                
            } catch (downloadError) {
                logger.warn(`Could not download captions for video ${videoId}:`, downloadError.message);
                return null;
            }
            
        } catch (error) {
            logger.error(`Error fetching transcript for video ${videoId}:`, error);
            return null;
        }
    }

    /**
     * Get transcripts for multiple videos
     */
    async getMultipleTranscripts(videoIds, maxConcurrent = 3) {
        try {
            logger.info(`Fetching transcripts for ${videoIds.length} videos...`);
            
            const results = [];
            
            // Process in batches to respect rate limits
            for (let i = 0; i < videoIds.length; i += maxConcurrent) {
                const batch = videoIds.slice(i, i + maxConcurrent);
                
                const batchPromises = batch.map(async (videoId) => {
                    try {
                        const transcript = await this.getVideoTranscript(videoId);
                        return transcript;
                    } catch (error) {
                        logger.error(`Error getting transcript for ${videoId}:`, error);
                        return null;
                    }
                });

                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults.filter(result => result !== null));
                
                logger.info(`Processed batch ${Math.floor(i/maxConcurrent) + 1}, got ${batchResults.filter(r => r).length} transcripts`);
                
                // Add delay between batches
                if (i + maxConcurrent < videoIds.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            logger.info(`Successfully fetched ${results.length} transcripts`);
            return results;
            
        } catch (error) {
            logger.error('Error fetching multiple transcripts:', error);
            throw error;
        }
    }

    /**
     * Parse YouTube duration format (PT1H2M3S) to seconds
     */
    parseDuration(duration) {
        if (!duration) return 0;
        
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;
        
        const hours = parseInt(match[1] || 0);
        const minutes = parseInt(match[2] || 0);
        const seconds = parseInt(match[3] || 0);
        
        return hours * 3600 + minutes * 60 + seconds;
    }

    /**
     * Parse SRT transcript format
     */
    parseSRTTranscript(srtData) {
        const segments = [];
        let fullText = '';
        
        if (typeof srtData !== 'string') {
            return { segments: [], fullText: '' };
        }
        
        const blocks = srtData.split('\n\n').filter(block => block.trim());
        
        for (const block of blocks) {
            const lines = block.split('\n');
            if (lines.length >= 3) {
                const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
                if (timeMatch) {
                    const startTime = this.timeToSeconds(timeMatch[1]);
                    const endTime = this.timeToSeconds(timeMatch[2]);
                    const text = lines.slice(2).join(' ').replace(/<[^>]*>/g, ''); // Remove HTML tags
                    
                    segments.push({
                        start_time: startTime,
                        end_time: endTime,
                        text: text,
                        duration: endTime - startTime
                    });
                    
                    fullText += text + ' ';
                }
            }
        }
        
        return {
            segments: segments,
            fullText: fullText.trim()
        };
    }

    /**
     * Convert SRT time format to seconds
     */
    timeToSeconds(timeString) {
        const [time, milliseconds] = timeString.split(',');
        const [hours, minutes, seconds] = time.split(':').map(Number);
        return hours * 3600 + minutes * 60 + seconds + parseInt(milliseconds) / 1000;
    }

    /**
     * Search videos by query
     */
    async searchVideos(query, maxResults = 20) {
        try {
            logger.info(`Searching for videos with query: "${query}"`);
            
            const response = await this.youtube.search.list({
                part: ['snippet'],
                channelId: this.hubermanChannelId,
                q: query,
                type: ['video'],
                maxResults: maxResults,
                order: 'relevance'
            });

            const videoIds = response.data.items.map(item => item.id.videoId);
            const videoDetails = await this.getVideoDetails(videoIds);
            
            return videoDetails;
            
        } catch (error) {
            logger.error('Error searching videos:', error);
            throw error;
        }
    }

    /**
     * Get API quota usage info
     */
    getQuotaInfo() {
        // YouTube Data API v3 has a default quota of 10,000 units per day
        // Different operations cost different amounts of quota
        return {
            dailyQuota: 10000,
            operationCosts: {
                'channels.list': 1,
                'videos.list': 1,
                'playlistItems.list': 1,
                'captions.list': 50,
                'captions.download': 200,
                'search.list': 100
            },
            note: 'Monitor your quota usage in Google Cloud Console'
        };
    }
}

export { YouTubeService };
