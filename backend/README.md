# Huberman Health AI Backend

The backend service for the Huberman Health AI Assistant, providing RESTful API endpoints for health query processing, video search, and data collection.

## 🏗️ Architecture

The backend follows a modular service-oriented architecture:

```
backend/
├── src/
│   ├── server.js           # Main MCP server entry point
│   ├── services/           # Business logic services
│   │   ├── apifyService.js         # YouTube data scraping
│   │   ├── openRouterService.js    # AI model interactions
│   │   ├── healthQueryProcessor.js # Health query processing
│   │   ├── semanticSearchService.js # Semantic search
│   │   ├── metricsService.js       # Performance metrics
│   │   ├── transcriptService.js    # Transcript processing
│   │   └── youtubeService.js       # YouTube Data API
│   ├── routes/             # API route handlers
│   │   ├── health.js       # Health check endpoints
│   │   ├── videos.js       # Video management
│   │   ├── search.js       # Search functionality
│   │   └── metrics.js      # Metrics endpoints
│   ├── middleware/         # Express middleware
│   │   ├── errorHandler.js # Error handling
│   │   └── rateLimiter.js  # Rate limiting
│   └── utils/              # Utility functions
│       ├── database.js     # Database connection
│       └── logger.js       # Logging configuration
└── tests/                  # Test files
    └── mcp-server.test.js  # Server integration tests
```

## 🚀 Services Overview

### ApifyService
- **Purpose**: Scrapes YouTube videos and transcripts using Apify actors
- **Key Methods**: `scrapeHubermanVideos()`, `scrapeVideoTranscripts()`
- **Dependencies**: Apify API token

### OpenRouterService
- **Purpose**: Handles AI model interactions for health query processing
- **Key Methods**: `processHealthQuery()`, `semanticSearch()`
- **Features**: Cost tracking, multiple model support, budget management

### HealthQueryProcessor
- **Purpose**: Processes user health queries and finds relevant content
- **Key Methods**: `processQuery()`, `extractHealthTopics()`
- **Features**: Query classification, symptom extraction

### SemanticSearchService
- **Purpose**: Performs semantic search across video transcripts
- **Key Methods**: `searchTranscripts()`, `findSimilarContent()`
- **Features**: Vector similarity, relevance scoring

## 📡 API Endpoints

### Health & Status
- `GET /api/health` - Health check and service status
- `GET /api/metrics` - Application metrics and performance data

### Video Management
- `GET /api/videos` - List videos with pagination and filtering
- `GET /api/videos/:id` - Get specific video details
- `GET /api/videos/:id/segments` - Get video transcript segments

### Search & Query
- `POST /api/query` - Process health queries and get recommendations
- `POST /api/semantic-search` - Perform semantic search across content
- `GET /api/search/topics` - Get available health topics

### Data Collection
- `POST /api/scrape/videos` - Scrape videos from Huberman Lab channel
- `POST /api/scrape/transcripts` - Scrape transcripts for specific videos
- `GET /api/scrape/status/:runId` - Check scraping job status

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
NODE_ENV=development
PORT=3001
HOST=localhost

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/huberman_health_ai

# OpenRouter API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Apify API Configuration
APIFY_API_TOKEN=your_apify_api_token_here

# YouTube Data API Configuration
YOUTUBE_API_KEY=your_youtube_api_key_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

## 🛠️ Development

### Installation
```bash
cd backend
npm install
```

### Running the Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run server integration test
npm run test:server
```

### Linting
```bash
# Check code style
npm run lint

# Fix code style issues
npm run lint:fix
```

## 📊 Monitoring

The backend includes comprehensive monitoring:

- **Health Checks**: `/api/health` endpoint for service status
- **Metrics**: Prometheus-compatible metrics at `/api/metrics`
- **Logging**: Structured logging with Winston
- **Error Tracking**: Comprehensive error handling and reporting

## 🔒 Security Features

- **Rate Limiting**: Prevents API abuse
- **CORS Protection**: Configurable cross-origin resource sharing
- **Helmet**: Security headers for Express
- **Input Validation**: Request validation and sanitization
- **Error Handling**: Secure error responses without information leakage

## 🚀 Deployment

The backend is containerized with Docker:

```bash
# Build Docker image
docker build -t huberman-health-ai-backend .

# Run container
docker run -p 3001:3001 huberman-health-ai-backend
```

## 📝 API Documentation

For detailed API documentation, start the server and visit:
- Health check: `http://localhost:3001/api/health`
- API status: `http://localhost:3001/`

## 🤝 Contributing

1. Follow the existing code style and patterns
2. Add JSDoc comments for all public methods
3. Include tests for new functionality
4. Update documentation as needed
5. Ensure all linting passes before committing
