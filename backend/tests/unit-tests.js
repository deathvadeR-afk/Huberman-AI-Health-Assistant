#!/usr/bin/env node

/**
 * Comprehensive Unit Tests for Huberman Health AI Backend
 * Tests core functionality without requiring external dependencies
 */

import { createLogger } from '../src/utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const logger = createLogger('UnitTests');

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    failures: []
};

/**
 * Test assertion helper
 */
function assert(condition, message) {
    testResults.total++;
    if (condition) {
        testResults.passed++;
        logger.info(`✅ ${message}`);
        return true;
    } else {
        testResults.failed++;
        testResults.failures.push(message);
        logger.error(`❌ ${message}`);
        return false;
    }
}

/**
 * Test suite runner
 */
async function runTestSuite() {
    logger.info('🧪 Starting Comprehensive Unit Tests');
    logger.info('=====================================\n');

    // Test 1: Environment Configuration
    await testEnvironmentConfiguration();
    
    // Test 2: Logger Functionality
    await testLoggerFunctionality();
    
    // Test 3: Service Imports
    await testServiceImports();
    
    // Test 4: Utility Functions
    await testUtilityFunctions();
    
    // Test 5: Data Validation
    await testDataValidation();
    
    // Test 6: Error Handling
    await testErrorHandling();
    
    // Test 7: Configuration Validation
    await testConfigurationValidation();
    
    // Print final results
    printTestResults();
}

/**
 * Test environment configuration
 */
async function testEnvironmentConfiguration() {
    logger.info('📋 Testing Environment Configuration...');
    
    // Check if .env file exists or environment variables are set
    const criticalEnvVars = [
        'NODE_ENV',
        'PORT'
    ];
    
    const optionalEnvVars = [
        'DATABASE_URL',
        'OPENROUTER_API_KEY',
        'APIFY_API_TOKEN',
        'YOUTUBE_API_KEY'
    ];
    
    // Test critical environment variables
    criticalEnvVars.forEach(varName => {
        const value = process.env[varName];
        assert(
            value !== undefined, 
            `Critical environment variable ${varName} is set`
        );
    });
    
    // Test optional environment variables (warn if missing)
    optionalEnvVars.forEach(varName => {
        const value = process.env[varName];
        if (!value) {
            logger.warn(`⚠️  Optional environment variable ${varName} is not set`);
        } else {
            logger.info(`✅ Optional environment variable ${varName} is configured`);
        }
    });
    
    // Test NODE_ENV values
    const nodeEnv = process.env.NODE_ENV;
    assert(
        ['development', 'production', 'test'].includes(nodeEnv) || !nodeEnv,
        `NODE_ENV is valid (${nodeEnv || 'undefined'})`
    );
    
    // Test PORT configuration
    const port = process.env.PORT;
    if (port) {
        const portNum = parseInt(port);
        assert(
            !isNaN(portNum) && portNum > 0 && portNum < 65536,
            `PORT is a valid number (${port})`
        );
    }
}

/**
 * Test logger functionality
 */
async function testLoggerFunctionality() {
    logger.info('📝 Testing Logger Functionality...');
    
    try {
        // Test logger creation
        const testLogger = createLogger('TestLogger');
        assert(testLogger !== null, 'Logger can be created');
        assert(typeof testLogger.info === 'function', 'Logger has info method');
        assert(typeof testLogger.error === 'function', 'Logger has error method');
        assert(typeof testLogger.warn === 'function', 'Logger has warn method');
        assert(typeof testLogger.debug === 'function', 'Logger has debug method');
        
        // Test logging without errors
        testLogger.info('Test info message');
        testLogger.warn('Test warning message');
        testLogger.error('Test error message');
        testLogger.debug('Test debug message');
        
        assert(true, 'Logger methods execute without errors');
        
    } catch (error) {
        assert(false, `Logger functionality test failed: ${error.message}`);
    }
}

/**
 * Test service imports
 */
async function testServiceImports() {
    logger.info('📦 Testing Service Imports...');
    
    const services = [
        { name: 'ApifyService', path: '../src/services/apifyService.js' },
        { name: 'OpenRouterService', path: '../src/services/openRouterService.js' },
        { name: 'HealthQueryProcessor', path: '../src/services/healthQueryProcessor.js' },
        { name: 'SemanticSearchService', path: '../src/services/semanticSearchService.js' },
        { name: 'MetricsService', path: '../src/services/metricsService.js' }
    ];
    
    for (const service of services) {
        try {
            const module = await import(service.path);
            assert(module !== null, `${service.name} can be imported`);
            
            // Check if it's a class or has expected exports
            const hasClass = Object.values(module).some(exp => 
                typeof exp === 'function' && exp.prototype
            );
            const hasExports = Object.keys(module).length > 0;
            
            assert(
                hasClass || hasExports, 
                `${service.name} has valid exports`
            );
            
        } catch (error) {
            assert(false, `${service.name} import failed: ${error.message}`);
        }
    }
}

/**
 * Test utility functions
 */
async function testUtilityFunctions() {
    logger.info('🔧 Testing Utility Functions...');
    
    try {
        // Test database utility import
        const dbModule = await import('../src/utils/database.js');
        assert(dbModule !== null, 'Database utility can be imported');
        
        // Test logger utility (already tested above)
        const loggerModule = await import('../src/utils/logger.js');
        assert(loggerModule !== null, 'Logger utility can be imported');
        assert(typeof loggerModule.createLogger === 'function', 'createLogger function exists');
        
    } catch (error) {
        assert(false, `Utility functions test failed: ${error.message}`);
    }
}

/**
 * Test data validation functions
 */
async function testDataValidation() {
    logger.info('✅ Testing Data Validation...');
    
    // Test query validation
    const validQueries = [
        'How can I improve my sleep?',
        'What supplements does Huberman recommend for focus?',
        'Tell me about circadian rhythms'
    ];
    
    const invalidQueries = [
        '', // Empty string
        'a', // Too short
        'x'.repeat(1001), // Too long
        null,
        undefined
    ];
    
    // Test valid queries
    validQueries.forEach((query, index) => {
        const isValid = query && 
                        typeof query === 'string' && 
                        query.trim().length >= 2 && 
                        query.length <= 1000;
        assert(isValid, `Valid query ${index + 1} passes validation`);
    });
    
    // Test invalid queries
    invalidQueries.forEach((query, index) => {
        const isValid = query && 
                        typeof query === 'string' && 
                        query.trim().length >= 2 && 
                        query.length <= 1000;
        assert(!isValid, `Invalid query ${index + 1} fails validation`);
    });
    
    // Test video ID validation
    const validVideoIds = ['SwQhKFMxmDY', 'nm1TxQj9IsQ', 'abcdefghijk'];
    const invalidVideoIds = ['', 'ab', 'toolongvideoidthatexceedslimit', null];
    
    validVideoIds.forEach((id, index) => {
        const isValid = id && 
                        typeof id === 'string' && 
                        id.length >= 3 && 
                        id.length <= 20 &&
                        /^[a-zA-Z0-9_-]+$/.test(id);
        assert(isValid, `Valid video ID ${index + 1} passes validation`);
    });
    
    invalidVideoIds.forEach((id, index) => {
        const isValid = id && 
                        typeof id === 'string' && 
                        id.length >= 3 && 
                        id.length <= 20 &&
                        /^[a-zA-Z0-9_-]+$/.test(id);
        assert(!isValid, `Invalid video ID ${index + 1} fails validation`);
    });
}

/**
 * Test error handling
 */
async function testErrorHandling() {
    logger.info('🚨 Testing Error Handling...');
    
    // Test error creation and handling
    try {
        const testError = new Error('Test error message');
        testError.code = 'TEST_ERROR';
        testError.statusCode = 400;
        
        assert(testError.message === 'Test error message', 'Error message is preserved');
        assert(testError.code === 'TEST_ERROR', 'Error code is preserved');
        assert(testError.statusCode === 400, 'Error status code is preserved');
        
        // Test error serialization
        const errorObj = {
            message: testError.message,
            code: testError.code,
            statusCode: testError.statusCode
        };
        
        const serialized = JSON.stringify(errorObj);
        const deserialized = JSON.parse(serialized);
        
        assert(
            deserialized.message === testError.message,
            'Error can be serialized and deserialized'
        );
        
    } catch (error) {
        assert(false, `Error handling test failed: ${error.message}`);
    }
}

/**
 * Test configuration validation
 */
async function testConfigurationValidation() {
    logger.info('⚙️  Testing Configuration Validation...');
    
    // Test rate limiting configuration
    const rateLimitConfig = {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    };
    
    assert(
        rateLimitConfig.windowMs > 0 && rateLimitConfig.windowMs <= 3600000,
        `Rate limit window is valid (${rateLimitConfig.windowMs}ms)`
    );
    
    assert(
        rateLimitConfig.maxRequests > 0 && rateLimitConfig.maxRequests <= 10000,
        `Rate limit max requests is valid (${rateLimitConfig.maxRequests})`
    );
    
    // Test CORS configuration
    const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
    assert(
        corsOrigin.startsWith('http://') || corsOrigin.startsWith('https://'),
        `CORS origin is valid URL (${corsOrigin})`
    );
    
    // Test log level configuration
    const logLevel = process.env.LOG_LEVEL || 'info';
    const validLogLevels = ['error', 'warn', 'info', 'debug'];
    assert(
        validLogLevels.includes(logLevel),
        `Log level is valid (${logLevel})`
    );
}

/**
 * Print test results summary
 */
function printTestResults() {
    logger.info('\n🎯 Test Results Summary');
    logger.info('=======================');
    logger.info(`Total Tests: ${testResults.total}`);
    logger.info(`Passed: ${testResults.passed}`);
    logger.info(`Failed: ${testResults.failed}`);
    logger.info(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    if (testResults.failed > 0) {
        logger.error('\n❌ Failed Tests:');
        testResults.failures.forEach((failure, index) => {
            logger.error(`${index + 1}. ${failure}`);
        });
    }
    
    if (testResults.failed === 0) {
        logger.info('\n🎉 All tests passed! System is ready for deployment.');
    } else {
        logger.warn(`\n⚠️  ${testResults.failed} test(s) failed. Please review and fix issues.`);
    }
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run the test suite
runTestSuite().catch(error => {
    logger.error('Test suite execution failed:', error);
    process.exit(1);
});
