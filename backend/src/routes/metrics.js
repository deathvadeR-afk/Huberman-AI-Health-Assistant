import express from 'express';
import { MetricsService } from '../services/metricsService.js';
import { createLogger } from '../utils/logger.js';

const router = express.Router();
const logger = createLogger('MetricsRoutes');

// Initialize metrics service
const metricsService = new MetricsService();

// Prometheus metrics endpoint
router.get('/', async (req, res, next) => {
    try {
        const metrics = await metricsService.getMetrics();
        
        res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
        res.send(metrics);
        
    } catch (error) {
        logger.error('Error getting Prometheus metrics:', error);
        next(error);
    }
});

// JSON metrics endpoint for dashboards
router.get('/json', async (req, res, next) => {
    try {
        const metrics = await metricsService.getMetricsAsJson();
        
        res.json({
            metrics,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Error getting JSON metrics:', error);
        next(error);
    }
});

// Health metrics endpoint
router.get('/health', async (req, res, next) => {
    try {
        const healthMetrics = await metricsService.getHealthMetrics();
        
        res.json(healthMetrics);
        
    } catch (error) {
        logger.error('Error getting health metrics:', error);
        next(error);
    }
});

// System status endpoint
router.get('/status', async (req, res, next) => {
    try {
        const status = {
            service: 'Huberman Health AI Assistant',
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
        };

        res.json(status);
        
    } catch (error) {
        logger.error('Error getting system status:', error);
        next(error);
    }
});

export default router;
