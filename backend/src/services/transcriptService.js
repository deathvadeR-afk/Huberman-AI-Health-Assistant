import { YoutubeTranscript } from 'youtube-transcript';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('TranscriptService');

class TranscriptService {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Get transcript for a YouTube video using youtube-transcript library
     */
    async getVideoTranscript(videoId) {
        try {
            logger.info(`Fetching transcript for video ${videoId}...`);
            
            // Check cache first
            if (this.cache.has(videoId)) {
                logger.info(`Using cached transcript for ${videoId}`);
                return this.cache.get(videoId);
            }

            // Fetch transcript
            const transcriptArray = await YoutubeTranscript.fetchTranscript(videoId);
            
            if (!transcriptArray || transcriptArray.length === 0) {
                logger.warn(`No transcript available for video ${videoId}`);
                return null;
            }

            // Process transcript data
            const processedTranscript = this.processTranscriptData(videoId, transcriptArray);
            
            // Cache the result
            this.cache.set(videoId, processedTranscript);
            
            logger.info(`Successfully fetched transcript for ${videoId}: ${transcriptArray.length} segments`);
            return processedTranscript;
            
        } catch (error) {
            logger.error(`Error fetching transcript for video ${videoId}:`, error.message);
            return null;
        }
    }

    /**
     * Get transcripts for multiple videos
     */
    async getMultipleTranscripts(videoIds, maxConcurrent = 2) {
        try {
            logger.info(`Fetching transcripts for ${videoIds.length} videos...`);
            
            const results = [];
            
            // Process in small batches to avoid rate limiting
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
                
                // Add delay between batches to be respectful
                if (i + maxConcurrent < videoIds.length) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            
            logger.info(`Successfully fetched ${results.length} transcripts out of ${videoIds.length} requested`);
            return results;
            
        } catch (error) {
            logger.error('Error fetching multiple transcripts:', error);
            throw error;
        }
    }

    /**
     * Process raw transcript data into our format
     */
    processTranscriptData(videoId, transcriptArray) {
        const segments = transcriptArray.map(item => ({
            start_time: item.offset / 1000, // Convert milliseconds to seconds
            end_time: (item.offset + item.duration) / 1000,
            text: item.text,
            duration: item.duration / 1000
        }));

        const fullText = segments.map(seg => seg.text).join(' ');

        return {
            video_id: videoId,
            language: 'en', // youtube-transcript typically returns English
            transcript: fullText,
            segments: segments,
            segmentCount: segments.length,
            totalDuration: segments.length > 0 ? segments[segments.length - 1].end_time : 0
        };
    }

    /**
     * Search for specific topics in transcript segments
     */
    searchTranscriptForTopic(transcript, searchTerms) {
        if (!transcript || !transcript.segments) {
            return [];
        }

        const relevantSegments = [];
        const terms = Array.isArray(searchTerms) ? searchTerms : [searchTerms];
        
        for (const segment of transcript.segments) {
            const text = segment.text.toLowerCase();
            
            // Check if any search term appears in this segment
            const matchedTerms = terms.filter(term => 
                text.includes(term.toLowerCase())
            );
            
            if (matchedTerms.length > 0) {
                relevantSegments.push({
                    ...segment,
                    matched_terms: matchedTerms,
                    relevance_score: matchedTerms.length / terms.length
                });
            }
        }

        return relevantSegments.sort((a, b) => b.relevance_score - a.relevance_score);
    }

    /**
     * Find timestamps where specific topics are discussed
     */
    findTopicTimestamps(transcript, topic) {
        if (!transcript || !transcript.segments) {
            return [];
        }

        const relevantSegments = this.searchTranscriptForTopic(transcript, [topic]);
        const timestamps = [];

        for (const segment of relevantSegments) {
            // Find surrounding context
            const segmentIndex = transcript.segments.findIndex(s => s.start_time === segment.start_time);
            const contextStart = Math.max(0, segmentIndex - 2);
            const contextEnd = Math.min(transcript.segments.length - 1, segmentIndex + 2);
            
            const contextSegments = transcript.segments.slice(contextStart, contextEnd + 1);
            const contextText = contextSegments.map(s => s.text).join(' ');
            
            timestamps.push({
                start_time: segment.start_time,
                end_time: segment.end_time,
                title: `Discussion about ${topic}`,
                description: contextText.substring(0, 150) + '...',
                relevance_score: segment.relevance_score,
                matched_terms: segment.matched_terms
            });
        }

        return timestamps;
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            cachedTranscripts: this.cache.size,
            cacheKeys: Array.from(this.cache.keys())
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        logger.info('Transcript cache cleared');
    }
}

export { TranscriptService };
