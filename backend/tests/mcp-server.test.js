#!/usr/bin/env node

import { MCPServer } from '../src/server.js';
import { createLogger } from '../src/utils/logger.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const logger = createLogger('MCPServerTest');

async function testMCPServer() {
    logger.info('🧪 Testing MCP Server...');
    
    let server;
    
    try {
        // Check environment variables
        const requiredEnvVars = ['DATABASE_URL'];
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }
        
        logger.info('✅ Environment variables found');
        
        // Start the server
        server = new MCPServer();
        await server.start();
        
        // Wait a moment for server to fully start
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const baseUrl = `http://localhost:${process.env.PORT || 3001}`;
        
        // Test 1: Health check
        logger.info('🔍 Testing health check endpoint...');
        const healthResponse = await axios.get(`${baseUrl}/health`);
        
        if (healthResponse.status === 200 && healthResponse.data.status === 'healthy') {
            logger.info('✅ Health check passed');
        } else {
            throw new Error('Health check failed');
        }
        
        // Test 2: Video stats
        logger.info('🔍 Testing video stats endpoint...');
        const statsResponse = await axios.get(`${baseUrl}/api/videos/stats`);
        
        if (statsResponse.status === 200 && statsResponse.data.total > 0) {
            logger.info(`✅ Video stats: ${statsResponse.data.total} videos, ${statsResponse.data.totalHours} hours`);
        } else {
            logger.warn('⚠️ Video stats endpoint returned no data (database might be empty)');
        }
        
        // Test 3: Health topics
        logger.info('🔍 Testing health topics endpoint...');
        const topicsResponse = await axios.get(`${baseUrl}/api/health/topics`);
        
        if (topicsResponse.status === 200) {
            logger.info(`✅ Health topics: ${topicsResponse.data.topics.length} topics found`);
        } else {
            logger.warn('⚠️ Health topics endpoint failed');
        }
        
        // Test 4: Metrics endpoint
        logger.info('🔍 Testing metrics endpoint...');
        const metricsResponse = await axios.get(`${baseUrl}/api/metrics/health`);
        
        if (metricsResponse.status === 200) {
            logger.info('✅ Metrics endpoint working');
        } else {
            logger.warn('⚠️ Metrics endpoint failed');
        }
        
        // Test 5: Health query (if we have data)
        if (statsResponse.data.total > 0) {
            logger.info('🔍 Testing health query endpoint...');
            
            try {
                const queryResponse = await axios.post(`${baseUrl}/api/query`, {
                    query: 'How can I improve my sleep?',
                    userId: 'test-user'
                }, {
                    timeout: 30000 // 30 second timeout
                });
                
                if (queryResponse.status === 200 && queryResponse.data.results) {
                    logger.info(`✅ Health query: Found ${queryResponse.data.results.length} results`);
                } else {
                    logger.warn('⚠️ Health query returned no results');
                }
            } catch (queryError) {
                logger.warn('⚠️ Health query test failed:', queryError.message);
            }
        }
        
        logger.info('🎉 All MCP Server tests completed!');
        logger.info('💡 Server is running and ready for use');
        
        // Keep server running for manual testing
        logger.info('🚀 Server is running at:');
        logger.info(`   Health Check: ${baseUrl}/health`);
        logger.info(`   API Documentation: ${baseUrl}/api`);
        logger.info(`   Metrics: ${baseUrl}/api/metrics`);
        logger.info('');
        logger.info('Press Ctrl+C to stop the server');
        
        // Keep the process alive
        process.on('SIGINT', async () => {
            logger.info('🛑 Shutting down test server...');
            if (server) {
                await server.shutdown();
            }
            process.exit(0);
        });
        
    } catch (error) {
        logger.error('❌ MCP Server test failed:', error.message);
        console.error('Full error details:', error);
        console.error('Stack trace:', error.stack);

        if (error.code === 'ECONNREFUSED') {
            logger.info('🔧 Troubleshooting tips:');
            logger.info('1. Make sure PostgreSQL is running (docker-compose up postgres -d)');
            logger.info('2. Check your DATABASE_URL in the .env file');
            logger.info('3. Ensure all dependencies are installed (npm install)');
        } else if (error.message.includes('environment variables')) {
            logger.info('🔧 Please set up your environment variables:');
            logger.info('1. Copy backend/.env.example to backend/.env');
            logger.info('2. Fill in your database connection details');
        }
        
        if (server) {
            await server.shutdown();
        }
        process.exit(1);
    }
}

testMCPServer();
