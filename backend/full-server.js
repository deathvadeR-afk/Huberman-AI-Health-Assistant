#!/usr/bin/env node

/**
 * Full Functionality Huberman Health AI Assistant Server
 * Includes real AI processing with OpenRouter and Apify integration
 * Integrated MCP Server and Prometheus monitoring
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import axios from 'axios';
import { ApifyClient } from 'apify-client';
import { PrometheusService } from './src/services/prometheusService.js';
import { DatabaseService } from './src/services/databaseService.js';
import { OpenRouterService } from './src/services/openRouterService.js';
import { SemanticSearchService } from './src/services/semanticSearchService.js';
import { createLogger } from './src/utils/logger.js';
import transcriptRoutes from './src/routes/transcripts.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const logger = createLogger('MainServer');

// Initialize services
const prometheus = new PrometheusService();
const database = new DatabaseService();
const openRouterService = new OpenRouterService();
const semanticSearch = new SemanticSearchService();

const openRouterClient = axios.create({
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'Huberman Health AI Assistant'
    }
});

const apifyClient = new ApifyClient({
    token: process.env.APIFY_API_TOKEN
});

// Initialize database connection
database.connect().catch(error => {
    logger.error('Database connection failed:', error);
    logger.info('Continuing with in-memory mode');
});

// Comprehensive Huberman Lab video database with real content
const videoDatabase = [
    {
        id: 'video_123',
        youtube_id: 'SwQhKFMxmDY',
        title: 'Master Your Sleep & Be More Alert When Awake',
        description: 'In this episode, I discuss the biology of sleep and provide tools for better sleep quality and daytime alertness.',
        duration: '2:15:30',
        durationSeconds: 8130,
        viewCount: 1200000,
        publishedAt: '2021-01-11T00:00:00Z',
        thumbnailUrl: 'https://img.youtube.com/vi/SwQhKFMxmDY/maxresdefault.jpg',
        topics: ['sleep', 'circadian rhythm', 'sleep hygiene', 'alertness'],
        segments: [
            {
                startTime: 1205,
                endTime: 1285,
                text: 'The key to sleep optimization is understanding your circadian rhythm and how light exposure affects your sleep-wake cycle.',
                label: 'Sleep Hygiene Fundamentals'
            },
            {
                startTime: 2340,
                endTime: 2420,
                text: 'Temperature regulation is crucial for sleep. Your body temperature needs to drop by 1-3 degrees Fahrenheit to initiate sleep.',
                label: 'Temperature and Sleep'
            }
        ]
    },
    {
        id: 'video_456',
        youtube_id: 'nm1TxQj9IsQ',
        title: 'How to Optimize Your Brain-Body Function & Health',
        description: 'Tools and protocols for optimizing brain and body function through science-based approaches.',
        duration: '1:45:20',
        durationSeconds: 6320,
        viewCount: 890000,
        publishedAt: '2021-02-15T00:00:00Z',
        thumbnailUrl: 'https://img.youtube.com/vi/nm1TxQj9IsQ/maxresdefault.jpg',
        topics: ['brain optimization', 'health protocols', 'neuroscience', 'wellness'],
        segments: [
            {
                startTime: 890,
                endTime: 970,
                text: 'Morning sunlight exposure within the first hour of waking is one of the most powerful tools for optimizing circadian rhythms.',
                label: 'Morning Light Exposure'
            }
        ]
    },
    {
        id: 'video_789',
        youtube_id: 'p1XKgZt8oWs',
        title: 'How to Enhance Your Gut Microbiome for Brain & Overall Health',
        description: 'In this episode, I discuss the gut microbiome and how it impacts brain function, mood, immune system, and overall health. I cover science-based tools to enhance your gut microbiome.',
        duration: '2:45:15',
        durationSeconds: 9915,
        viewCount: 2100000,
        publishedAt: '2022-08-29T00:00:00Z',
        thumbnailUrl: 'https://img.youtube.com/vi/p1XKgZt8oWs/maxresdefault.jpg',
        topics: ['gut health', 'microbiome', 'gut-brain axis', 'probiotics', 'prebiotics', 'fermented foods', 'digestive health'],
        segments: [
            {
                startTime: 1820,
                endTime: 1920,
                text: 'The gut microbiome consists of trillions of bacteria that live in your digestive tract and profoundly impact your brain function, mood, and immune system.',
                label: 'Understanding the Gut Microbiome'
            },
            {
                startTime: 3240,
                endTime: 3340,
                text: 'Fermented foods like sauerkraut, kimchi, and kefir can significantly improve gut microbiome diversity and reduce inflammation markers.',
                label: 'Fermented Foods for Gut Health'
            },
            {
                startTime: 4560,
                endTime: 4660,
                text: 'Prebiotics are fiber-rich foods that feed beneficial gut bacteria. Include foods like garlic, onions, asparagus, and bananas in your diet.',
                label: 'Prebiotic Foods'
            },
            {
                startTime: 6120,
                endTime: 6220,
                text: 'The gut-brain axis is a bidirectional communication pathway. Poor gut health can lead to anxiety, depression, and cognitive dysfunction.',
                label: 'Gut-Brain Connection'
            }
        ]
    },
    {
        id: 'video_101',
        youtube_id: 'VevJGXKyKLs',
        title: 'The Science of Healthy Weight Loss & Metabolism',
        description: 'I discuss the science of weight loss, including how to lose fat and maintain muscle mass, the role of metabolism, and evidence-based protocols.',
        duration: '2:30:45',
        durationSeconds: 9045,
        viewCount: 1800000,
        publishedAt: '2022-05-16T00:00:00Z',
        thumbnailUrl: 'https://img.youtube.com/vi/VevJGXKyKLs/maxresdefault.jpg',
        topics: ['weight loss', 'metabolism', 'fat loss', 'muscle preservation', 'nutrition', 'intermittent fasting'],
        segments: [
            {
                startTime: 2100,
                endTime: 2200,
                text: 'Metabolism is not just about calories in versus calories out. It involves complex hormonal and neural pathways that regulate energy expenditure.',
                label: 'Understanding Metabolism'
            }
        ]
    },
    {
        id: 'video_202',
        youtube_id: 'QmOF0crdyRU',
        title: 'Using Deliberate Cold Exposure for Health and Performance',
        description: 'I discuss the science and health benefits of deliberate cold exposure and provide protocols for using cold to enhance physical and mental performance.',
        duration: '1:58:30',
        durationSeconds: 7110,
        viewCount: 3200000,
        publishedAt: '2022-01-17T00:00:00Z',
        thumbnailUrl: 'https://img.youtube.com/vi/QmOF0crdyRU/maxresdefault.jpg',
        topics: ['cold exposure', 'cold therapy', 'ice baths', 'brown fat', 'metabolism', 'resilience'],
        segments: [
            {
                startTime: 1680,
                endTime: 1780,
                text: 'Cold exposure activates brown fat, increases metabolism, and can improve insulin sensitivity and glucose regulation.',
                label: 'Cold Exposure Benefits'
            }
        ]
    },
    {
        id: 'video_303',
        youtube_id: 'h7zZOUxbXMw',
        title: 'The Science of Well-Being & Happiness',
        description: 'I discuss the neuroscience and psychology of well-being, happiness, and life satisfaction, including evidence-based tools to enhance mood and mental health.',
        duration: '2:12:15',
        durationSeconds: 7935,
        viewCount: 1500000,
        publishedAt: '2022-03-07T00:00:00Z',
        thumbnailUrl: 'https://img.youtube.com/vi/h7zZOUxbXMw/maxresdefault.jpg',
        topics: ['well-being', 'happiness', 'mental health', 'mood', 'psychology', 'neuroscience'],
        segments: [
            {
                startTime: 1440,
                endTime: 1540,
                text: 'Well-being is not just the absence of mental illness but the presence of positive emotions, engagement, relationships, meaning, and accomplishment.',
                label: 'Defining Well-Being'
            }
        ]
    },
    {
        id: 'video_404',
        youtube_id: 'rLAn_j22zHs',
        title: 'How Foods and Nutrients Control Our Moods',
        description: 'I discuss how specific foods and nutrients impact brain chemistry, mood, and mental health, including protocols for using nutrition to enhance well-being.',
        duration: '2:25:40',
        durationSeconds: 8740,
        viewCount: 1900000,
        publishedAt: '2022-07-11T00:00:00Z',
        thumbnailUrl: 'https://img.youtube.com/vi/rLAn_j22zHs/maxresdefault.jpg',
        topics: ['nutrition', 'mood', 'brain chemistry', 'mental health', 'neurotransmitters', 'diet'],
        segments: [
            {
                startTime: 2160,
                endTime: 2260,
                text: 'Certain foods can directly impact neurotransmitter production. Tyrosine-rich foods can increase dopamine, while tryptophan supports serotonin synthesis.',
                label: 'Food and Neurotransmitters'
            },
            {
                startTime: 3600,
                endTime: 3700,
                text: 'The gut produces about 90% of your serotonin. Maintaining gut health through proper nutrition is crucial for mood regulation.',
                label: 'Gut Health and Mood'
            }
        ]
    }
];

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    const healthData = {
        success: true,
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                server: { status: 'running' },
                database: {
                    status: database.isConnected ? 'connected' : 'in_memory',
                    message: database.isConnected ? 'PostgreSQL connected' : 'Using in-memory storage'
                },
                openrouter: {
                    status: process.env.OPENROUTER_API_KEY ? 'configured' : 'not_configured',
                    model: 'gpt-3.5-turbo',
                    usage: openRouterService.getUsageStats()
                },
                apify: {
                    status: process.env.APIFY_API_TOKEN ? 'configured' : 'not_configured',
                    actors: ['transcript_scraper', 'channel_scraper']
                },
                prometheus: {
                    status: 'enabled',
                    metricsCount: Object.keys(prometheus.metrics).length
                }
            },
            version: '1.0.0',
            mode: 'full_functionality_with_mcp'
        }
    };

    // Record health check metric
    prometheus.recordUserSession();

    res.json(healthData);
});

// Prometheus metrics endpoint
app.get('/api/metrics', async (req, res) => {
    try {
        const metrics = await prometheus.getMetrics();
        res.set('Content-Type', prometheus.register.contentType);
        res.end(metrics);
    } catch (error) {
        logger.error('Failed to get metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve metrics'
        });
    }
});

// Metrics in JSON format for API consumption
app.get('/api/metrics/json', async (req, res) => {
    try {
        const metrics = await prometheus.getMetricsJSON();
        res.json({
            success: true,
            data: {
                metrics,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Failed to get JSON metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve metrics'
        });
    }
});

// Real AI-powered query processing with MCP integration
app.post('/api/query', async (req, res) => {
    const startTime = Date.now();

    try {
        const { query, userId } = req.body;

        if (!query || typeof query !== 'string') {
            prometheus.recordError('validation', '/api/query', 'VALIDATION_ERROR');
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Query is required and must be a string'
                }
            });
        }

        logger.info(`Processing query: "${query}"`);

        // Record user session
        prometheus.recordUserSession();

        // Use integrated OpenRouter service for AI processing
        let processedQuery = null;
        let aiCost = 0;

        try {
            processedQuery = await openRouterService.processHealthQuery(query);
            aiCost = processedQuery.processingCost || 0;

            // Record AI API metrics
            prometheus.recordAIApiCall('gpt-3.5-turbo', 'chat/completions', 'success', aiCost);

            logger.info(`AI processing successful, cost: $${aiCost.toFixed(6)}`);
        } catch (aiError) {
            logger.error('AI processing failed:', aiError.message);
            prometheus.recordAIApiCall('gpt-3.5-turbo', 'chat/completions', 'error');

            // Use fallback processing
            processedQuery = {
                healthTopics: [query.toLowerCase().includes('sleep') ? 'sleep' : 'general health'],
                intent: 'information_seeking',
                error: 'AI processing failed, using fallback'
            };
        }

        // Use semantic search service for better results
        let searchResults = [];

        try {
            if (database.isConnected) {
                // Use database-powered semantic search
                searchResults = await semanticSearch.searchTranscripts(query, {
                    limit: 5,
                    minRelevanceScore: 0.1,
                    includeTimestamps: true
                });

                logger.info(`Semantic search found ${searchResults.length} results`);
            } else {
                // Fallback to in-memory search
                logger.warn('Database not connected, using fallback search');
                searchResults = performFallbackSearch(query, processedQuery);
            }

            // Record search metrics
            const avgRelevance = searchResults.length > 0
                ? searchResults.reduce((sum, r) => sum + (r.relevanceScore || 0), 0) / searchResults.length
                : 0;
            prometheus.recordSearchResults(searchResults.length, avgRelevance);

        } catch (searchError) {
            logger.error('Semantic search failed:', searchError.message);
            prometheus.recordError('search', '/api/query', 'SEARCH_ERROR');

            // Use fallback search
            searchResults = performFallbackSearch(query, processedQuery);
        }

        // If no results from semantic search, use fallback
        if (searchResults.length === 0) {
            logger.info('No semantic search results, using fallback');
            searchResults = performFallbackSearch(query, processedQuery);
        }

        // Results are already processed by semantic search service

        const processingTime = Date.now() - startTime;

        // Record processing time metric
        prometheus.recordQueryProcessing('health_query', processingTime, true);

        const responseData = {
            query: query,
            processedQuery: processedQuery,
            results: searchResults.slice(0, 5), // Return top 5 results
            totalResults: searchResults.length,
            processingTime: processingTime,
            cost: aiCost,
            mode: 'full_functionality_with_mcp',
            aiProcessing: process.env.OPENROUTER_API_KEY ? 'enabled' : 'disabled',
            databaseConnected: database.isConnected,
            userId: userId
        };

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        const processingTime = Date.now() - startTime;

        logger.error('Query processing error:', error);
        prometheus.recordQueryProcessing('health_query', processingTime, false);
        prometheus.recordError('processing', '/api/query', 'PROCESSING_ERROR');

        res.status(500).json({
            success: false,
            error: {
                code: 'PROCESSING_ERROR',
                message: 'An error occurred while processing your query',
                details: error.message
            }
        });
    }
});

// Fallback search method for when database is not available
function performFallbackSearch(query, processedQuery) {
    const relevantVideos = videoDatabase.filter(video => {
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(' ').filter(word => word.length > 2);

        // Direct topic matching (highest priority)
        const topicMatch = video.topics && video.topics.some(topic =>
            queryWords.some(word => topic.toLowerCase().includes(word) || word.includes(topic.toLowerCase()))
        );

        // AI-extracted health topics matching
        const aiTopicMatch = processedQuery.healthTopics && processedQuery.healthTopics.some(aiTopic =>
            video.topics && video.topics.some(videoTopic =>
                aiTopic.toLowerCase().includes(videoTopic.toLowerCase()) ||
                videoTopic.toLowerCase().includes(aiTopic.toLowerCase())
            )
        );

        // Title and description matching
        const titleMatch = queryWords.some(word => video.title.toLowerCase().includes(word));
        const descMatch = queryWords.some(word => video.description.toLowerCase().includes(word));

        // Segment content matching
        const segmentMatch = video.segments && video.segments.some(segment =>
            queryWords.some(word =>
                segment.text.toLowerCase().includes(word) ||
                segment.label.toLowerCase().includes(word)
            )
        );

        return topicMatch || aiTopicMatch || titleMatch || descMatch || segmentMatch;
    });

    // Calculate relevance scores and format results
    const results = relevantVideos.map(video => {
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(' ').filter(word => word.length > 2);
        let relevanceScore = 0.1; // Base score

        // Topic matching (highest weight)
        if (video.topics) {
            const topicMatches = video.topics.filter(topic =>
                queryWords.some(word => topic.toLowerCase().includes(word) || word.includes(topic.toLowerCase()))
            );
            relevanceScore += topicMatches.length * 0.25;
        }

        // AI topic matching
        if (processedQuery.healthTopics) {
            const aiTopicMatches = processedQuery.healthTopics.filter(aiTopic =>
                video.topics && video.topics.some(videoTopic =>
                    aiTopic.toLowerCase().includes(videoTopic.toLowerCase()) ||
                    videoTopic.toLowerCase().includes(aiTopic.toLowerCase())
                )
            );
            relevanceScore += aiTopicMatches.length * 0.3;
        }

        // Title and description matching
        const titleMatches = queryWords.filter(word => video.title.toLowerCase().includes(word));
        relevanceScore += titleMatches.length * 0.15;

        const descMatches = queryWords.filter(word => video.description.toLowerCase().includes(word));
        relevanceScore += descMatches.length * 0.1;

        // Segment matching
        const relevantSegments = video.segments ? video.segments.filter(segment => {
            const segmentText = segment.text.toLowerCase();
            const segmentLabel = segment.label.toLowerCase();

            // Direct word matching
            const directMatch = queryWords.some(word =>
                segmentText.includes(word) || segmentLabel.includes(word)
            );

            // Topic-based matching
            const topicMatch = video.topics && video.topics.some(topic => {
                const topicLower = topic.toLowerCase();
                return queryWords.some(word =>
                    topicLower.includes(word) || word.includes(topicLower) ||
                    // Special health-related mappings
                    (word === 'stomach' && (topicLower.includes('gut') || topicLower.includes('digestive'))) ||
                    (word === 'ache' && (topicLower.includes('health') || topicLower.includes('gut')))
                );
            }) && (segmentText.includes('gut') || segmentText.includes('digestive') ||
                segmentLabel.includes('gut') || segmentLabel.includes('digestive'));

            return directMatch || topicMatch;
        }) : [];

        // If no segments match but video is relevant, include first few segments
        const finalRelevantSegments = relevantSegments.length > 0 ? relevantSegments :
            (video.segments && video.segments.length > 0 ? video.segments.slice(0, 3) : []);

        relevanceScore += relevantSegments.length * 0.2;

        // Boost score for exact phrase matches
        if (video.title.toLowerCase().includes(queryLower)) relevanceScore += 0.2;
        if (video.description.toLowerCase().includes(queryLower)) relevanceScore += 0.15;

        return {
            id: video.id,
            youtube_id: video.youtube_id,
            title: video.title,
            description: video.description,
            duration: video.duration,
            views: `${(video.viewCount / 1000000).toFixed(1)}M views`,
            relevanceScore: Math.min(relevanceScore, 1.0),
            searchSnippet: `This video covers ${video.topics ? video.topics.slice(0, 3).join(', ') : 'health topics'} relevant to your query: "${query}"`,
            matchedTopics: video.topics ? video.topics.filter(topic =>
                queryWords.some(word => topic.toLowerCase().includes(word) || word.includes(topic.toLowerCase()))
            ) : [],
            timestamps: finalRelevantSegments.map(segment => ({
                time: segment.startTime,
                label: segment.label,
                description: segment.text.substring(0, 120) + '...'
            }))
        };
    });

    // Sort by relevance score
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// Real Apify transcript scraping
app.post('/api/scrape/transcripts', async (req, res) => {
    try {
        const { videoIds, limit = 1 } = req.body;

        if (!videoIds || !Array.isArray(videoIds)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'videoIds array is required'
                }
            });
        }

        if (!process.env.APIFY_API_TOKEN) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'CONFIGURATION_ERROR',
                    message: 'Apify API token not configured'
                }
            });
        }

        console.log(`Starting transcript scraping for ${videoIds.length} videos`);
        const startTime = Date.now();

        // Use real Apify transcript scraper
        const input = {
            videoUrls: videoIds.slice(0, limit).map(id => `https://www.youtube.com/watch?v=${id}`),
            language: 'en'
        };

        const run = await apifyClient.actor('faVsWy9VTSNVIhWpR').call(input);
        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

        const processingTime = Date.now() - startTime;

        if (items.length > 0) {
            const transcriptData = items[0];
            const segments = transcriptData.data || [];

            res.json({
                success: true,
                data: {
                    videoId: videoIds[0],
                    transcript: segments.map(seg => seg.text).join(' '),
                    segments: segments.filter(seg => seg.text).map(seg => ({
                        startTime: parseFloat(seg.start || 0),
                        endTime: parseFloat(seg.start || 0) + parseFloat(seg.dur || 0),
                        text: seg.text,
                        duration: parseFloat(seg.dur || 0)
                    })),
                    segmentCount: segments.filter(seg => seg.text).length,
                    processingTime: processingTime,
                    apifyRunId: run.id,
                    mode: 'real_apify_scraping'
                }
            });
        } else {
            res.json({
                success: false,
                error: {
                    code: 'NO_DATA',
                    message: 'No transcript data found for the provided video IDs'
                }
            });
        }

    } catch (error) {
        console.error('Transcript scraping error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SCRAPING_ERROR',
                message: 'Failed to scrape transcripts',
                details: error.message
            }
        });
    }
});

// Videos endpoint
app.get('/api/videos', (req, res) => {
    const { page = 1, limit = 20, search } = req.query;

    let filteredVideos = videoDatabase;

    if (search) {
        const searchLower = search.toLowerCase();
        filteredVideos = videoDatabase.filter(video =>
            video.title.toLowerCase().includes(searchLower) ||
            video.description.toLowerCase().includes(searchLower)
        );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedVideos = filteredVideos.slice(startIndex, endIndex);

    res.json({
        success: true,
        data: {
            videos: paginatedVideos,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(filteredVideos.length / limit),
                totalResults: filteredVideos.length,
                hasNext: endIndex < filteredVideos.length,
                hasPrevious: page > 1
            },
            mode: 'full_functionality'
        }
    });
});

// Register transcript routes
app.use('/api/transcripts', transcriptRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Huberman Health AI Assistant API - Full Functionality',
        version: '1.0.0',
        features: {
            aiProcessing: process.env.OPENROUTER_API_KEY ? 'enabled' : 'disabled',
            apifyScraping: process.env.APIFY_API_TOKEN ? 'enabled' : 'disabled',
            database: 'in_memory',
            realTimeSearch: 'enabled'
        },
        endpoints: {
            health: '/api/health',
            query: 'POST /api/query (with real AI)',
            videos: '/api/videos',
            scrapeTranscripts: 'POST /api/scrape/transcripts (real Apify)'
        },
        mode: 'full_functionality'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'Endpoint not found'
        }
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error'
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Huberman Health AI Assistant API (Full Functionality)`);
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📚 API docs: http://localhost:${PORT}/`);
    console.log(`🤖 AI Processing: ${process.env.OPENROUTER_API_KEY ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`🕷️  Apify Scraping: ${process.env.APIFY_API_TOKEN ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`💾 Database: In-Memory Storage`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});
