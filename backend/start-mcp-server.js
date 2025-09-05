#!/usr/bin/env node

/**
 * Start the Huberman Health MCP Server
 */

import { HubermanHealthMCPServer } from './src/mcp-server.js';
import { createLogger } from './src/utils/logger.js';

const logger = createLogger('MCPServerStarter');

async function startMCPServer() {
  try {
    logger.info('🚀 Starting Huberman Health MCP Server...');
    
    const server = new HubermanHealthMCPServer();
    await server.start();
    
    logger.info('✅ MCP Server started successfully');
    logger.info('📡 Server ready to handle MCP requests');
    
    // Keep the process alive
    process.on('SIGINT', async () => {
      logger.info('🛑 Shutting down MCP server...');
      await server.cleanup();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('🛑 Shutting down MCP server...');
      await server.cleanup();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('❌ Failed to start MCP server:', error);
    process.exit(1);
  }
}

startMCPServer();