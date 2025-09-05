import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import { createLogger } from '../utils/logger.js';
import { TooManyRequestsError } from './errorHandler.js';

const logger = createLogger('RateLimiter');

// Rate limiter configuration
const rateLimiterConfig = {
    keyPrefix: 'huberman_health_ai',
    points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Number of requests
    duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 1000 || 900, // Per 15 minutes (900 seconds)
    blockDuration: 60, // Block for 1 minute if limit exceeded
};

// Create rate limiter instance
let rateLimiter;

// Always use memory store for now to avoid Redis connection issues
rateLimiter = new RateLimiterMemory(rateLimiterConfig);
logger.info('Rate limiter using memory store');

// Different rate limits for different endpoints
const endpointLimits = {
    '/api/query': {
        points: 20, // 20 queries per 15 minutes
        duration: 900,
        blockDuration: 300 // Block for 5 minutes
    },
    '/api/semantic-search': {
        points: 30, // 30 searches per 15 minutes
        duration: 900,
        blockDuration: 180 // Block for 3 minutes
    },
    '/api/videos': {
        points: 100, // 100 requests per 15 minutes
        duration: 900,
        blockDuration: 60 // Block for 1 minute
    }
};

export async function rateLimiterMiddleware(req, res, next) {
    try {
        // Get client identifier (IP address with optional user ID)
        const clientId = getClientId(req);
        
        // Determine rate limit based on endpoint
        const endpoint = getEndpointCategory(req.path);
        const limits = endpointLimits[endpoint] || rateLimiterConfig;
        
        // Create endpoint-specific rate limiter if needed
        const endpointLimiter = endpoint !== 'default' 
            ? new RateLimiterMemory({
                keyPrefix: `${rateLimiterConfig.keyPrefix}_${endpoint}`,
                ...limits
              })
            : rateLimiter;

        // Check rate limit
        const resRateLimiter = await endpointLimiter.consume(clientId);
        
        // Add rate limit headers
        res.set({
            'X-RateLimit-Limit': limits.points,
            'X-RateLimit-Remaining': resRateLimiter.remainingPoints,
            'X-RateLimit-Reset': new Date(Date.now() + resRateLimiter.msBeforeNext).toISOString()
        });

        // Log rate limit usage for monitoring
        if (resRateLimiter.remainingPoints < limits.points * 0.1) { // Less than 10% remaining
            logger.warn('Rate limit approaching for client', {
                clientId,
                endpoint,
                remaining: resRateLimiter.remainingPoints,
                limit: limits.points
            });
        }

        next();

    } catch (rejRes) {
        // Rate limit exceeded
        if (rejRes instanceof Error) {
            // Unexpected error
            logger.error('Rate limiter error:', rejRes);
            return next(rejRes);
        }

        // Rate limit exceeded
        const clientId = getClientId(req);
        const endpoint = getEndpointCategory(req.path);
        
        logger.warn('Rate limit exceeded', {
            clientId,
            endpoint,
            path: req.path,
            userAgent: req.get('User-Agent')
        });

        // Add rate limit headers
        res.set({
            'X-RateLimit-Limit': rejRes.totalHits,
            'X-RateLimit-Remaining': 0,
            'X-RateLimit-Reset': new Date(Date.now() + rejRes.msBeforeNext).toISOString(),
            'Retry-After': Math.round(rejRes.msBeforeNext / 1000)
        });

        const error = new TooManyRequestsError(
            `Rate limit exceeded. Try again in ${Math.round(rejRes.msBeforeNext / 1000)} seconds.`
        );
        
        return next(error);
    }
}

function getClientId(req) {
    // Use user ID if authenticated, otherwise use IP
    const userId = req.user?.id;
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    return userId ? `user_${userId}` : `ip_${ip}`;
}

function getEndpointCategory(path) {
    if (path.startsWith('/api/query')) return '/api/query';
    if (path.startsWith('/api/semantic-search')) return '/api/semantic-search';
    if (path.startsWith('/api/videos')) return '/api/videos';
    return 'default';
}

// Middleware for specific endpoints with custom limits
export function createCustomRateLimiter(points, duration, blockDuration = 60) {
    const customLimiter = new RateLimiterMemory({
        keyPrefix: `${rateLimiterConfig.keyPrefix}_custom`,
        points,
        duration,
        blockDuration
    });

    return async (req, res, next) => {
        try {
            const clientId = getClientId(req);
            const resRateLimiter = await customLimiter.consume(clientId);
            
            res.set({
                'X-RateLimit-Limit': points,
                'X-RateLimit-Remaining': resRateLimiter.remainingPoints,
                'X-RateLimit-Reset': new Date(Date.now() + resRateLimiter.msBeforeNext).toISOString()
            });

            next();

        } catch (rejRes) {
            if (rejRes instanceof Error) {
                return next(rejRes);
            }

            res.set({
                'X-RateLimit-Limit': points,
                'X-RateLimit-Remaining': 0,
                'X-RateLimit-Reset': new Date(Date.now() + rejRes.msBeforeNext).toISOString(),
                'Retry-After': Math.round(rejRes.msBeforeNext / 1000)
            });

            const error = new TooManyRequestsError(
                `Rate limit exceeded. Try again in ${Math.round(rejRes.msBeforeNext / 1000)} seconds.`
            );
            
            return next(error);
        }
    };
}

export default rateLimiterMiddleware;
