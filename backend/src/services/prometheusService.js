import prometheus from 'prom-client';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('PrometheusService');

class PrometheusService {
    constructor() {
        // Create a Registry to register the metrics
        this.register = new prometheus.Registry();
        
        // Add default metrics
        prometheus.collectDefaultMetrics({ register: this.register });
        
        // Custom metrics for Huberman Health AI
        this.metrics = {
            // Query processing metrics
            queryProcessingTime: new prometheus.Histogram({
                name: 'huberman_query_processing_duration_seconds',
                help: 'Time spent processing health queries',
                labelNames: ['query_type', 'success'],
                buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
            }),
            
            queryCount: new prometheus.Counter({
                name: 'huberman_queries_total',
                help: 'Total number of health queries processed',
                labelNames: ['query_type', 'status']
            }),
            
            // AI API usage metrics
            aiApiCalls: new prometheus.Counter({
                name: 'huberman_ai_api_calls_total',
                help: 'Total number of AI API calls',
                labelNames: ['model', 'endpoint', 'status']
            }),
            
            aiApiCost: new prometheus.Gauge({
                name: 'huberman_ai_api_cost_dollars',
                help: 'Current AI API cost in dollars'
            }),
            
            aiTokensUsed: new prometheus.Counter({
                name: 'huberman_ai_tokens_used_total',
                help: 'Total AI tokens used',
                labelNames: ['model', 'type'] // type: prompt, completion
            }),
            
            // Search result metrics
            searchResults: new prometheus.Histogram({
                name: 'huberman_search_results_count',
                help: 'Number of search results returned',
                buckets: [0, 1, 5, 10, 20, 50, 100]
            }),
            
            searchRelevanceScore: new prometheus.Histogram({
                name: 'huberman_search_relevance_score',
                help: 'Average relevance score of search results',
                buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
            }),
            
            // Database metrics
            databaseQueries: new prometheus.Counter({
                name: 'huberman_database_queries_total',
                help: 'Total number of database queries',
                labelNames: ['operation', 'table', 'status']
            }),
            
            databaseQueryTime: new prometheus.Histogram({
                name: 'huberman_database_query_duration_seconds',
                help: 'Time spent on database queries',
                labelNames: ['operation', 'table'],
                buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
            }),
            
            // Video and transcript metrics
            videosInDatabase: new prometheus.Gauge({
                name: 'huberman_videos_in_database_total',
                help: 'Total number of videos in database'
            }),
            
            transcriptsInDatabase: new prometheus.Gauge({
                name: 'huberman_transcripts_in_database_total',
                help: 'Total number of transcripts in database'
            }),
            
            // Scraping metrics
            scrapingJobs: new prometheus.Counter({
                name: 'huberman_scraping_jobs_total',
                help: 'Total number of scraping jobs',
                labelNames: ['type', 'status'] // type: videos, transcripts
            }),
            
            scrapingDuration: new prometheus.Histogram({
                name: 'huberman_scraping_duration_seconds',
                help: 'Time spent on scraping jobs',
                labelNames: ['type'],
                buckets: [10, 30, 60, 300, 600, 1800, 3600]
            }),
            
            // User interaction metrics
            userSessions: new prometheus.Counter({
                name: 'huberman_user_sessions_total',
                help: 'Total number of user sessions'
            }),
            
            videoPlays: new prometheus.Counter({
                name: 'huberman_video_plays_total',
                help: 'Total number of video plays',
                labelNames: ['video_id']
            }),
            
            timestampJumps: new prometheus.Counter({
                name: 'huberman_timestamp_jumps_total',
                help: 'Total number of timestamp jumps',
                labelNames: ['video_id']
            }),
            
            // Error metrics
            errors: new prometheus.Counter({
                name: 'huberman_errors_total',
                help: 'Total number of errors',
                labelNames: ['type', 'endpoint', 'error_code']
            })
        };
        
        // Register all metrics
        Object.values(this.metrics).forEach(metric => {
            this.register.registerMetric(metric);
        });
        
        logger.info('Prometheus metrics initialized');
    }
    
    // Query processing metrics
    recordQueryProcessing(queryType, duration, success = true) {
        this.metrics.queryProcessingTime
            .labels(queryType, success.toString())
            .observe(duration / 1000); // Convert to seconds
            
        this.metrics.queryCount
            .labels(queryType, success ? 'success' : 'error')
            .inc();
    }
    
    // AI API metrics
    recordAIApiCall(model, endpoint, status, cost = 0, tokens = {}) {
        this.metrics.aiApiCalls
            .labels(model, endpoint, status)
            .inc();
            
        if (cost > 0) {
            this.metrics.aiApiCost.inc(cost);
        }
        
        if (tokens.prompt) {
            this.metrics.aiTokensUsed
                .labels(model, 'prompt')
                .inc(tokens.prompt);
        }
        
        if (tokens.completion) {
            this.metrics.aiTokensUsed
                .labels(model, 'completion')
                .inc(tokens.completion);
        }
    }
    
    // Search result metrics
    recordSearchResults(count, avgRelevanceScore = 0) {
        this.metrics.searchResults.observe(count);
        
        if (avgRelevanceScore > 0) {
            this.metrics.searchRelevanceScore.observe(avgRelevanceScore);
        }
    }
    
    // Database metrics
    recordDatabaseQuery(operation, table, duration, success = true) {
        this.metrics.databaseQueries
            .labels(operation, table, success ? 'success' : 'error')
            .inc();
            
        this.metrics.databaseQueryTime
            .labels(operation, table)
            .observe(duration / 1000); // Convert to seconds
    }
    
    // Update database counts
    updateDatabaseCounts(videoCount, transcriptCount) {
        this.metrics.videosInDatabase.set(videoCount);
        this.metrics.transcriptsInDatabase.set(transcriptCount);
    }
    
    // Scraping metrics
    recordScrapingJob(type, duration, success = true) {
        this.metrics.scrapingJobs
            .labels(type, success ? 'success' : 'error')
            .inc();
            
        this.metrics.scrapingDuration
            .labels(type)
            .observe(duration / 1000); // Convert to seconds
    }
    
    // User interaction metrics
    recordUserSession() {
        this.metrics.userSessions.inc();
    }
    
    recordVideoPlay(videoId) {
        this.metrics.videoPlays.labels(videoId).inc();
    }
    
    recordTimestampJump(videoId) {
        this.metrics.timestampJumps.labels(videoId).inc();
    }
    
    // Error metrics
    recordError(type, endpoint, errorCode) {
        this.metrics.errors
            .labels(type, endpoint, errorCode.toString())
            .inc();
    }
    
    // Get metrics for Prometheus scraping
    async getMetrics() {
        return await this.register.metrics();
    }
    
    // Get metrics in JSON format for API
    async getMetricsJSON() {
        const metrics = await this.register.getMetricsAsJSON();
        return metrics;
    }
    
    // Health check for monitoring
    getHealthStatus() {
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            metricsCount: Object.keys(this.metrics).length,
            registeredMetrics: this.register._metrics.size
        };
    }
    
    // Reset metrics (for testing)
    reset() {
        this.register.resetMetrics();
        logger.info('Prometheus metrics reset');
    }
}

export { PrometheusService };
