import client from 'prom-client';
import { createLogger } from '../utils/logger.js';
import { DatabaseManager } from '../utils/database.js';

const logger = createLogger('MetricsService');

export class MetricsService {
    constructor() {
        this.db = new DatabaseManager();
        this.register = new client.Registry();

        // Clear any existing metrics to avoid conflicts
        client.register.clear();

        // Initialize Prometheus metrics
        this.initializeMetrics();

        // Set up default metrics collection
        client.collectDefaultMetrics({
            register: this.register,
            prefix: 'huberman_health_ai_'
        });
    }

    initializeMetrics() {
        // HTTP request metrics
        this.httpRequestDuration = new client.Histogram({
            name: 'huberman_health_ai_http_request_duration_seconds',
            help: 'Duration of HTTP requests in seconds',
            labelNames: ['method', 'route', 'status_code'],
            buckets: [0.1, 0.5, 1, 2, 5, 10]
        });

        this.httpRequestTotal = new client.Counter({
            name: 'huberman_health_ai_http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'route', 'status_code']
        });

        // Health query metrics
        this.healthQueryTotal = new client.Counter({
            name: 'huberman_health_ai_health_queries_total',
            help: 'Total number of health queries processed',
            labelNames: ['query_type', 'status']
        });

        this.healthQueryDuration = new client.Histogram({
            name: 'huberman_health_ai_health_query_duration_seconds',
            help: 'Duration of health query processing in seconds',
            labelNames: ['query_type'],
            buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
        });

        this.searchResultsCount = new client.Histogram({
            name: 'huberman_health_ai_search_results_count',
            help: 'Number of search results returned',
            buckets: [0, 1, 5, 10, 20, 50, 100]
        });

        // Database metrics
        this.databaseQueryDuration = new client.Histogram({
            name: 'huberman_health_ai_database_query_duration_seconds',
            help: 'Duration of database queries in seconds',
            labelNames: ['operation'],
            buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5]
        });

        this.databaseConnectionsActive = new client.Gauge({
            name: 'huberman_health_ai_database_connections_active',
            help: 'Number of active database connections'
        });

        // Video content metrics
        this.videosTotal = new client.Gauge({
            name: 'huberman_health_ai_videos_total',
            help: 'Total number of videos in the database'
        });

        this.videoContentHours = new client.Gauge({
            name: 'huberman_health_ai_video_content_hours_total',
            help: 'Total hours of video content'
        });

        // User engagement metrics
        this.userQueriesPerHour = new client.Gauge({
            name: 'huberman_health_ai_user_queries_per_hour',
            help: 'Number of user queries in the last hour'
        });

        this.popularHealthTopics = new client.Gauge({
            name: 'huberman_health_ai_popular_health_topics',
            help: 'Most queried health topics',
            labelNames: ['topic']
        });

        // Register all metrics
        this.register.registerMetric(this.httpRequestDuration);
        this.register.registerMetric(this.httpRequestTotal);
        this.register.registerMetric(this.healthQueryTotal);
        this.register.registerMetric(this.healthQueryDuration);
        this.register.registerMetric(this.searchResultsCount);
        this.register.registerMetric(this.databaseQueryDuration);
        this.register.registerMetric(this.databaseConnectionsActive);
        this.register.registerMetric(this.videosTotal);
        this.register.registerMetric(this.videoContentHours);
        this.register.registerMetric(this.userQueriesPerHour);
        this.register.registerMetric(this.popularHealthTopics);
    }

    async initialize() {
        try {
            logger.info('Initializing Metrics Service...');
            
            // Update initial metrics
            await this.updateContentMetrics();
            
            // Set up periodic metrics updates
            this.setupPeriodicUpdates();
            
            logger.info('✅ Metrics Service initialized');
        } catch (error) {
            logger.error('Failed to initialize Metrics Service:', error);
            throw error;
        }
    }

    setupPeriodicUpdates() {
        // Update content metrics every 5 minutes
        setInterval(async () => {
            try {
                await this.updateContentMetrics();
                await this.updateEngagementMetrics();
            } catch (error) {
                logger.error('Error updating periodic metrics:', error);
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    async updateContentMetrics() {
        try {
            const stats = await this.db.getVideoStats();
            
            this.videosTotal.set(parseInt(stats.total_videos) || 0);
            this.videoContentHours.set(Math.round((stats.total_duration || 0) / 3600));
            
        } catch (error) {
            logger.error('Error updating content metrics:', error);
        }
    }

    async updateEngagementMetrics() {
        try {
            // Get queries from the last hour
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            
            const queryCountResult = await this.db.query(
                'SELECT COUNT(*) as count FROM user_queries WHERE created_at > $1',
                [oneHourAgo]
            );
            
            this.userQueriesPerHour.set(parseInt(queryCountResult.rows[0]?.count) || 0);

            // Update popular health topics
            const popularTopicsResult = await this.db.query(`
                SELECT ht.name, COUNT(uq.id) as query_count
                FROM health_topics ht
                LEFT JOIN user_queries uq ON uq.query_text ILIKE '%' || ht.name || '%'
                WHERE uq.created_at > $1
                GROUP BY ht.name
                ORDER BY query_count DESC
                LIMIT 10
            `, [oneHourAgo]);

            // Reset popular topics gauge
            this.popularHealthTopics.reset();
            
            popularTopicsResult.rows.forEach(row => {
                this.popularHealthTopics.set({ topic: row.name }, parseInt(row.query_count));
            });

        } catch (error) {
            logger.error('Error updating engagement metrics:', error);
        }
    }

    recordRequest(method, path, statusCode, duration) {
        const route = this.normalizeRoute(path);
        
        this.httpRequestTotal.inc({
            method: method.toUpperCase(),
            route,
            status_code: statusCode.toString()
        });

        this.httpRequestDuration.observe({
            method: method.toUpperCase(),
            route,
            status_code: statusCode.toString()
        }, duration / 1000); // Convert to seconds
    }

    recordQuery(query, resultCount, processingTime, queryType = 'general') {
        this.healthQueryTotal.inc({
            query_type: queryType,
            status: 'success'
        });

        this.healthQueryDuration.observe({
            query_type: queryType
        }, processingTime / 1000); // Convert to seconds

        this.searchResultsCount.observe(resultCount);
    }

    recordQueryError(queryType = 'general') {
        this.healthQueryTotal.inc({
            query_type: queryType,
            status: 'error'
        });
    }

    recordDatabaseQuery(operation, duration) {
        this.databaseQueryDuration.observe({
            operation
        }, duration / 1000); // Convert to seconds
    }

    updateDatabaseConnections(activeConnections) {
        this.databaseConnectionsActive.set(activeConnections);
    }

    normalizeRoute(path) {
        // Normalize routes to avoid high cardinality
        if (path.startsWith('/api/videos/') && path.match(/\/api\/videos\/[^\/]+$/)) {
            return '/api/videos/:id';
        }
        if (path.startsWith('/api/health/topics/') && path.match(/\/api\/health\/topics\/[^\/]+$/)) {
            return '/api/health/topics/:id';
        }
        if (path.startsWith('/api/recommendations/') && path.match(/\/api\/recommendations\/[^\/]+$/)) {
            return '/api/recommendations/:videoId';
        }
        
        return path;
    }

    async getMetrics() {
        return this.register.metrics();
    }

    async getMetricsAsJson() {
        const metrics = await this.register.getMetricsAsJSON();
        return metrics;
    }

    async getHealthMetrics() {
        try {
            // Get current system health metrics
            const stats = await this.db.getVideoStats();
            
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const queryCountResult = await this.db.query(
                'SELECT COUNT(*) as count FROM user_queries WHERE created_at > $1',
                [oneHourAgo]
            );

            return {
                system: {
                    status: 'healthy',
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    timestamp: new Date().toISOString()
                },
                content: {
                    totalVideos: parseInt(stats.total_videos) || 0,
                    totalHours: Math.round((stats.total_duration || 0) / 3600),
                    averageViews: Math.round(stats.average_views || 0),
                    latestVideo: stats.latest_video_date
                },
                usage: {
                    queriesLastHour: parseInt(queryCountResult.rows[0]?.count) || 0,
                    totalQueries: await this.getTotalQueries()
                }
            };

        } catch (error) {
            logger.error('Error getting health metrics:', error);
            return {
                system: {
                    status: 'error',
                    error: error.message,
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    async getTotalQueries() {
        try {
            const result = await this.db.query('SELECT COUNT(*) as count FROM user_queries');
            return parseInt(result.rows[0]?.count) || 0;
        } catch (error) {
            return 0;
        }
    }

    async cleanup() {
        try {
            // Clear any intervals
            logger.info('Metrics Service cleanup completed');
        } catch (error) {
            logger.error('Error during metrics cleanup:', error);
        }
    }
}

export default MetricsService;
