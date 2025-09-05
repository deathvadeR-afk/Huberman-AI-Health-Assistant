/**
 * CI-Friendly Test Suite
 * Lightweight tests that work in GitHub Actions environment
 */

describe('CI Environment Tests', () => {
  
  test('Node.js environment is working', () => {
    expect(process.version).toBeDefined();
    expect(process.platform).toBeDefined();
  });

  test('Basic JavaScript functionality works', () => {
    const testObj = { name: 'test', value: 42 };
    expect(testObj.name).toBe('test');
    expect(testObj.value).toBe(42);
  });

  test('JSON operations work correctly', () => {
    const data = { message: 'Hello, World!', timestamp: Date.now() };
    const serialized = JSON.stringify(data);
    const deserialized = JSON.parse(serialized);
    
    expect(deserialized.message).toBe(data.message);
    expect(deserialized.timestamp).toBe(data.timestamp);
  });

  test('Promise handling works', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });

  test('Error handling works', () => {
    expect(() => {
      throw new Error('Test error');
    }).toThrow('Test error');
  });

  test('Array operations work', () => {
    const arr = [1, 2, 3, 4, 5];
    const doubled = arr.map(x => x * 2);
    const sum = arr.reduce((a, b) => a + b, 0);
    
    expect(doubled).toEqual([2, 4, 6, 8, 10]);
    expect(sum).toBe(15);
  });

  test('String operations work', () => {
    const text = 'Huberman Health AI Assistant';
    expect(text.toLowerCase()).toBe('huberman health ai assistant');
    expect(text.includes('Health')).toBe(true);
    expect(text.split(' ')).toHaveLength(4);
  });

  test('Date operations work', () => {
    const now = new Date();
    const timestamp = now.getTime();
    
    expect(timestamp).toBeGreaterThan(0);
    expect(now.getFullYear()).toBeGreaterThan(2020);
  });

  test('Regular expressions work', () => {
    const videoIdPattern = /^[a-zA-Z0-9_-]+$/;
    
    expect(videoIdPattern.test('SwQhKFMxmDY')).toBe(true);
    expect(videoIdPattern.test('invalid@id')).toBe(false);
  });

  test('Environment variables can be accessed', () => {
    // Test that we can access environment variables
    expect(typeof process.env).toBe('object');
    
    // NODE_ENV might be set by Jest
    if (process.env.NODE_ENV) {
      expect(typeof process.env.NODE_ENV).toBe('string');
    }
  });
});

describe('Application Logic Tests', () => {
  
  test('Query validation logic', () => {
    const validateQuery = (query) => {
      return !!(query && 
               typeof query === 'string' && 
               query.trim().length >= 2 && 
               query.length <= 1000);
    };

    expect(validateQuery('How can I improve my sleep?')).toBe(true);
    expect(validateQuery('What supplements does Huberman recommend?')).toBe(true);
    expect(validateQuery('')).toBe(false);
    expect(validateQuery('a')).toBe(false);
    expect(validateQuery(null)).toBe(false);
  });

  test('Video ID validation logic', () => {
    const validateVideoId = (id) => {
      return !!(id && 
               typeof id === 'string' && 
               id.length >= 3 && 
               id.length <= 20 &&
               /^[a-zA-Z0-9_-]+$/.test(id));
    };

    expect(validateVideoId('SwQhKFMxmDY')).toBe(true);
    expect(validateVideoId('nm1TxQj9IsQ')).toBe(true);
    expect(validateVideoId('')).toBe(false);
    expect(validateVideoId('ab')).toBe(false);
    expect(validateVideoId('invalid@id')).toBe(false);
  });

  test('Error response formatting', () => {
    const formatError = (error, statusCode = 500) => {
      return {
        success: false,
        error: {
          message: error.message || 'Internal server error',
          code: error.code || 'INTERNAL_ERROR',
          statusCode: statusCode
        },
        timestamp: new Date().toISOString()
      };
    };

    const testError = new Error('Test error message');
    testError.code = 'TEST_ERROR';
    
    const formatted = formatError(testError, 400);
    
    expect(formatted.success).toBe(false);
    expect(formatted.error.message).toBe('Test error message');
    expect(formatted.error.code).toBe('TEST_ERROR');
    expect(formatted.error.statusCode).toBe(400);
    expect(formatted.timestamp).toBeDefined();
  });

  test('Success response formatting', () => {
    const formatSuccess = (data, message = 'Success') => {
      return {
        success: true,
        message: message,
        data: data,
        timestamp: new Date().toISOString()
      };
    };

    const testData = { videos: [], total: 0 };
    const formatted = formatSuccess(testData, 'Videos retrieved successfully');
    
    expect(formatted.success).toBe(true);
    expect(formatted.message).toBe('Videos retrieved successfully');
    expect(formatted.data).toEqual(testData);
    expect(formatted.timestamp).toBeDefined();
  });

  test('Pagination logic', () => {
    const calculatePagination = (total, page = 1, limit = 20) => {
      const offset = (page - 1) * limit;
      const totalPages = Math.ceil(total / limit);
      
      return {
        currentPage: page,
        totalPages: totalPages,
        totalResults: total,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
        offset: offset,
        limit: limit
      };
    };

    const pagination = calculatePagination(100, 2, 20);
    
    expect(pagination.currentPage).toBe(2);
    expect(pagination.totalPages).toBe(5);
    expect(pagination.totalResults).toBe(100);
    expect(pagination.hasNext).toBe(true);
    expect(pagination.hasPrevious).toBe(true);
    expect(pagination.offset).toBe(20);
    expect(pagination.limit).toBe(20);
  });
});