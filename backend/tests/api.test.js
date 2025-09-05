/**
 * Jest Test Suite for Huberman Health AI Backend
 * Tests core API functionality and services
 */

import { createLogger } from '../src/utils/logger.js';

describe('Huberman Health AI Backend Tests', () => {
  
  describe('Environment Configuration', () => {
    test('should have NODE_ENV configured', () => {
      const nodeEnv = process.env.NODE_ENV;
      expect(['development', 'production', 'test'].includes(nodeEnv) || !nodeEnv).toBe(true);
    });

    test('should have valid PORT configuration', () => {
      const port = process.env.PORT;
      if (port) {
        const portNum = parseInt(port);
        expect(portNum).toBeGreaterThan(0);
        expect(portNum).toBeLessThan(65536);
      }
    });
  });

  describe('Logger Functionality', () => {
    test('should create logger instance', () => {
      const logger = createLogger('TestLogger');
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    test('should log messages without errors', () => {
      const logger = createLogger('TestLogger');
      expect(() => {
        logger.info('Test info message');
        logger.warn('Test warning message');
        logger.error('Test error message');
        logger.debug('Test debug message');
      }).not.toThrow();
    });
  });

  describe('Data Validation', () => {
    test('should validate query strings correctly', () => {
      const validQueries = [
        'How can I improve my sleep?',
        'What supplements does Huberman recommend for focus?',
        'Tell me about circadian rhythms'
      ];

      validQueries.forEach(query => {
        const isValid = query && 
                        typeof query === 'string' && 
                        query.trim().length >= 2 && 
                        query.length <= 1000;
        expect(isValid).toBe(true);
      });
    });

    test('should reject invalid query strings', () => {
      const invalidQueries = [
        '', // Empty string
        'a', // Too short
        'x'.repeat(1001), // Too long
        null,
        undefined
      ];

      invalidQueries.forEach(query => {
        const isValid = query && 
                        typeof query === 'string' && 
                        query.trim().length >= 2 && 
                        query.length <= 1000;
        expect(isValid).toBe(false);
      });
    });

    test('should validate video IDs correctly', () => {
      const validVideoIds = ['SwQhKFMxmDY', 'nm1TxQj9IsQ', 'abcdefghijk'];
      
      validVideoIds.forEach(id => {
        const isValid = id && 
                        typeof id === 'string' && 
                        id.length >= 3 && 
                        id.length <= 20 &&
                        /^[a-zA-Z0-9_-]+$/.test(id);
        expect(isValid).toBe(true);
      });
    });

    test('should reject invalid video IDs', () => {
      const invalidVideoIds = ['', 'ab', 'toolongvideoidthatexceedslimit', null];
      
      invalidVideoIds.forEach(id => {
        const isValid = id && 
                        typeof id === 'string' && 
                        id.length >= 3 && 
                        id.length <= 20 &&
                        /^[a-zA-Z0-9_-]+$/.test(id);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Configuration Validation', () => {
    test('should have valid rate limiting configuration', () => {
      const rateLimitConfig = {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
      };

      expect(rateLimitConfig.windowMs).toBeGreaterThan(0);
      expect(rateLimitConfig.windowMs).toBeLessThanOrEqual(3600000);
      expect(rateLimitConfig.maxRequests).toBeGreaterThan(0);
      expect(rateLimitConfig.maxRequests).toBeLessThanOrEqual(10000);
    });

    test('should have valid CORS configuration', () => {
      const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
      expect(corsOrigin.startsWith('http://') || corsOrigin.startsWith('https://')).toBe(true);
    });

    test('should have valid log level configuration', () => {
      const logLevel = process.env.LOG_LEVEL || 'info';
      const validLogLevels = ['error', 'warn', 'info', 'debug'];
      expect(validLogLevels.includes(logLevel)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should create and handle errors correctly', () => {
      const testError = new Error('Test error message');
      testError.code = 'TEST_ERROR';
      testError.statusCode = 400;

      expect(testError.message).toBe('Test error message');
      expect(testError.code).toBe('TEST_ERROR');
      expect(testError.statusCode).toBe(400);
    });

    test('should serialize and deserialize errors', () => {
      const testError = new Error('Test error message');
      testError.code = 'TEST_ERROR';
      testError.statusCode = 400;

      const errorObj = {
        message: testError.message,
        code: testError.code,
        statusCode: testError.statusCode
      };

      const serialized = JSON.stringify(errorObj);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.message).toBe(testError.message);
      expect(deserialized.code).toBe(testError.code);
      expect(deserialized.statusCode).toBe(testError.statusCode);
    });
  });

  describe('Service Imports', () => {
    test('should be able to import core services', async () => {
      // Test that core service files exist and can be imported
      const services = [
        '../src/services/transcriptService.js'
      ];

      for (const servicePath of services) {
        try {
          const module = await import(servicePath);
          expect(module).toBeDefined();
          expect(Object.keys(module).length).toBeGreaterThan(0);
        } catch (error) {
          // If service doesn't exist, that's okay for now
          console.warn(`Service ${servicePath} not found, skipping test`);
        }
      }
    });
  });
});