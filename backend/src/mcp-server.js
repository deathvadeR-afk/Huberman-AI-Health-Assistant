#!/usr/bin/env node

/**
 * Model Context Protocol (MCP) Server for Huberman Health AI Assistant
 * Implements MCP specification for health query processing and semantic search
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import dotenv from 'dotenv';
import axios from 'axios';
import { ApifyClient } from 'apify-client';
import { createLogger } from './utils/logger.js';
import { DatabaseService } from './services/databaseService.js';
import { OpenRouterService } from './services/openRouterService.js';
import { SemanticSearchService } from './services/semanticSearchService.js';

// Load environment variables
dotenv.config();

const logger = createLogger('MCPServer');

class HubermanHealthMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'huberman-health-ai',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize services
    this.db = new DatabaseService();
    this.openRouter = new OpenRouterService();
    this.semanticSearch = new SemanticSearchService();
    this.apifyClient = new ApifyClient({
      token: process.env.APIFY_API_TOKEN
    });

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'process_health_query',
            description: 'Process a health-related query and find relevant Huberman Lab content',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The health query to process'
                },
                userId: {
                  type: 'string',
                  description: 'Optional user ID for tracking',
                  optional: true
                }
              },
              required: ['query']
            }
          },
          {
            name: 'semantic_search',
            description: 'Perform semantic search across video transcripts',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results',
                  default: 10
                },
                minRelevanceScore: {
                  type: 'number',
                  description: 'Minimum relevance score (0-1)',
                  default: 0.1
                }
              },
              required: ['query']
            }
          },
          {
            name: 'extract_timestamps',
            description: 'Extract relevant timestamps from a video based on query',
            inputSchema: {
              type: 'object',
              properties: {
                videoId: {
                  type: 'string',
                  description: 'Video ID to extract timestamps from'
                },
                query: {
                  type: 'string',
                  description: 'Query to find relevant timestamps for'
                }
              },
              required: ['videoId', 'query']
            }
          },
          {
            name: 'get_video_stats',
            description: 'Get statistics about videos in the database',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'scrape_huberman_videos',
            description: 'Scrape videos from Huberman Lab YouTube channel',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Maximum number of videos to scrape',
                  default: 50
                },
                includeTranscripts: {
                  type: 'boolean',
                  description: 'Whether to scrape transcripts as well',
                  default: true
                }
              },
              required: []
            }
          },
          {
            name: 'get_health_topics',
            description: 'Get available health topics from the database',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: 'Optional category filter',
                  optional: true
                }
              },
              required: []
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'process_health_query':
            return await this.processHealthQuery(args);
          
          case 'semantic_search':
            return await this.performSemanticSearch(args);
          
          case 'extract_timestamps':
            return await this.extractTimestamps(args);
          
          case 'get_video_stats':
            return await this.getVideoStats(args);
          
          case 'scrape_huberman_videos':
            return await this.scrapeHubermanVideos(args);
          
          case 'get_health_topics':
            return await this.getHealthTopics(args);
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        logger.error(`Tool ${name} failed:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  async processHealthQuery(args) {
    const { query, userId } = args;
    const startTime = Date.now();

    logger.info(`Processing health query: "${query}"`);

    try {
      // Step 1: AI-powered query analysis
      const processedQuery = await this.openRouter.processHealthQuery(query);
      
      // Step 2: Semantic search across video database
      const searchResults = await this.semanticSearch.searchTranscripts(query, {
        limit: 10,
        minRelevanceScore: 0.1
      });

      // Step 3: Enhance results with AI insights
      const enhancedResults = await Promise.all(
        searchResults.map(async (result) => {
          const timestamps = await this.extractRelevantTimestamps(result.id, query);
          return {
            ...result,
            timestamps,
            aiInsight: await this.generateHealthInsight(result, query)
          };
        })
      );

      const processingTime = Date.now() - startTime;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: {
                query,
                processedQuery,
                results: enhancedResults,
                totalResults: enhancedResults.length,
                processingTime,
                userId,
                timestamp: new Date().toISOString()
              }
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      logger.error('Health query processing failed:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: {
                code: 'QUERY_PROCESSING_ERROR',
                message: error.message
              }
            }, null, 2)
          }
        ]
      };
    }
  }

  async performSemanticSearch(args) {
    const { query, limit = 10, minRelevanceScore = 0.1 } = args;

    logger.info(`Performing semantic search: "${query}"`);

    try {
      const results = await this.semanticSearch.searchTranscripts(query, {
        limit,
        minRelevanceScore
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: {
                query,
                results,
                totalResults: results.length,
                searchParams: { limit, minRelevanceScore }
              }
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      logger.error('Semantic search failed:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: {
                code: 'SEMANTIC_SEARCH_ERROR',
                message: error.message
              }
            }, null, 2)
          }
        ]
      };
    }
  }

  async extractTimestamps(args) {
    const { videoId, query } = args;

    logger.info(`Extracting timestamps for video ${videoId} with query: "${query}"`);

    try {
      const timestamps = await this.extractRelevantTimestamps(videoId, query);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: {
                videoId,
                query,
                timestamps,
                totalTimestamps: timestamps.length
              }
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      logger.error('Timestamp extraction failed:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: {
                code: 'TIMESTAMP_EXTRACTION_ERROR',
                message: error.message
              }
            }, null, 2)
          }
        ]
      };
    }
  }

  async getVideoStats(args) {
    logger.info('Getting video statistics');

    try {
      const stats = await this.db.getVideoStats();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: stats
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      logger.error('Failed to get video stats:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: {
                code: 'STATS_ERROR',
                message: error.message
              }
            }, null, 2)
          }
        ]
      };
    }
  }

  async scrapeHubermanVideos(args) {
    const { limit = 50, includeTranscripts = true } = args;

    logger.info(`Starting to scrape ${limit} Huberman Lab videos`);

    try {
      // Use Apify channel scraper
      const channelInput = {
        channelUrls: ['https://www.youtube.com/@hubermanlab'],
        maxVideos: limit,
        includeVideoDetails: true
      };

      const channelRun = await this.apifyClient.actor('1p1aa7gcSydPkAE0d').call(channelInput);
      const { items: videos } = await this.apifyClient.dataset(channelRun.defaultDatasetId).listItems();

      logger.info(`Scraped ${videos.length} videos from channel`);

      // Store videos in database
      const storedVideos = [];
      for (const video of videos) {
        const storedVideo = await this.db.storeVideo(video);
        storedVideos.push(storedVideo);
      }

      // Scrape transcripts if requested
      let transcriptResults = [];
      if (includeTranscripts && videos.length > 0) {
        logger.info('Starting transcript scraping...');
        
        const transcriptInput = {
          videoUrls: videos.slice(0, Math.min(10, videos.length)).map(v => v.url), // Limit to 10 for initial run
          language: 'en'
        };

        const transcriptRun = await this.apifyClient.actor('faVsWy9VTSNVIhWpR').call(transcriptInput);
        const { items: transcripts } = await this.apifyClient.dataset(transcriptRun.defaultDatasetId).listItems();

        // Store transcripts
        for (const transcript of transcripts) {
          const segments = await this.db.storeTranscript(transcript);
          transcriptResults.push({
            videoUrl: transcript.videoUrl,
            segmentCount: segments.length
          });
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: {
                videosScraped: videos.length,
                videosStored: storedVideos.length,
                transcriptsProcessed: transcriptResults.length,
                apifyRunIds: {
                  channel: channelRun.id,
                  transcripts: includeTranscripts ? transcriptResults.map(t => t.runId) : []
                }
              }
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      logger.error('Video scraping failed:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: {
                code: 'SCRAPING_ERROR',
                message: error.message
              }
            }, null, 2)
          }
        ]
      };
    }
  }

  async getHealthTopics(args) {
    const { category } = args;

    logger.info(`Getting health topics${category ? ` for category: ${category}` : ''}`);

    try {
      const topics = await this.db.getHealthTopics(category);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: {
                topics,
                totalTopics: topics.length,
                category: category || 'all'
              }
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      logger.error('Failed to get health topics:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: {
                code: 'TOPICS_ERROR',
                message: error.message
              }
            }, null, 2)
          }
        ]
      };
    }
  }

  // Helper methods
  async extractRelevantTimestamps(videoId, query) {
    try {
      const segments = await this.db.getVideoSegments(videoId);
      const relevantSegments = segments.filter(segment => {
        const queryWords = query.toLowerCase().split(' ');
        return queryWords.some(word => 
          segment.text.toLowerCase().includes(word) ||
          segment.label?.toLowerCase().includes(word)
        );
      });

      return relevantSegments.map(segment => ({
        time: segment.startTime,
        label: segment.label || 'Relevant Content',
        description: segment.text.substring(0, 120) + '...'
      }));
    } catch (error) {
      logger.error('Failed to extract timestamps:', error);
      return [];
    }
  }

  async generateHealthInsight(result, query) {
    try {
      const insight = await this.openRouter.generateHealthInsight(result, query);
      return insight;
    } catch (error) {
      logger.error('Failed to generate health insight:', error);
      return `This content discusses ${result.title} which may be relevant to your query about ${query}.`;
    }
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      logger.error('MCP Server error:', error);
    };

    process.on('SIGINT', async () => {
      logger.info('Shutting down MCP server...');
      await this.cleanup();
      process.exit(0);
    });
  }

  async cleanup() {
    try {
      await this.db.close();
      logger.info('MCP server cleanup completed');
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }

  async start() {
    logger.info('Starting Huberman Health MCP Server...');
    
    try {
      // Initialize database connection
      await this.db.connect();
      
      // Start MCP server
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      logger.info('🚀 Huberman Health MCP Server started successfully');
      logger.info('📡 Server ready to handle MCP requests');
      logger.info('🏥 Health query processing enabled');
      logger.info('🔍 Semantic search enabled');
      logger.info('⏰ Timestamp extraction enabled');
      
    } catch (error) {
      logger.error('Failed to start MCP server:', error);
      throw error;
    }
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new HubermanHealthMCPServer();
  server.start().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

export { HubermanHealthMCPServer };