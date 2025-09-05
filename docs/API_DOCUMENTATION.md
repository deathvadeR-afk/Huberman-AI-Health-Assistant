# API Documentation - Huberman Health AI Assistant

## 🌐 Base URL

```
Development: http://localhost:3001
Production: https://api.huberman-health-ai.com
```

## 🔐 Authentication

Currently, the API is publicly accessible without authentication. Future versions will implement JWT-based authentication.

## 📋 Common Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456789"
}
```

Error responses:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameter",
    "details": { /* error details */ }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456789"
}
```

## 🏥 Health & Status Endpoints

### GET /api/health

Returns the health status of the API and all connected services.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "services": {
      "database": {
        "status": "connected",
        "responseTime": 12
      },
      "openrouter": {
        "status": "available",
        "responseTime": 245
      },
      "apify": {
        "status": "available",
        "responseTime": 156
      }
    },
    "version": "1.0.0",
    "uptime": 86400
  }
}
```

### GET /api/metrics

Returns Prometheus-compatible metrics for monitoring.

**Response:** Plain text Prometheus metrics format

## 🔍 Query Processing Endpoints

### POST /api/query

Process a natural language health query and return relevant video recommendations.

**Request Body:**
```json
{
  "query": "How can I improve my sleep quality?",
  "options": {
    "maxResults": 5,
    "includeTimestamps": true,
    "minRelevanceScore": 0.7
  }
}
```

**Parameters:**
- `query` (string, required): Natural language health query
- `options.maxResults` (integer, optional): Maximum number of results (default: 5, max: 20)
- `options.includeTimestamps` (boolean, optional): Include timestamp segments (default: true)
- `options.minRelevanceScore` (number, optional): Minimum relevance score (default: 0.5)

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "How can I improve my sleep quality?",
    "processedQuery": {
      "healthTopics": ["sleep", "sleep hygiene", "circadian rhythm"],
      "symptoms": [],
      "intent": "improvement_advice"
    },
    "results": [
      {
        "id": "video_123",
        "youtube_id": "SwQhKFMxmDY",
        "title": "Master Your Sleep & Be More Alert When Awake",
        "description": "In this episode, I discuss the biology of sleep...",
        "duration": "2:15:30",
        "views": "1.2M views",
        "relevanceScore": 0.95,
        "searchSnippet": "This video covers comprehensive sleep optimization strategies...",
        "timestamps": [
          {
            "time": 1205,
            "label": "Sleep Hygiene Fundamentals",
            "description": "Core principles for better sleep quality"
          }
        ]
      }
    ],
    "totalResults": 1,
    "processingTime": 2100,
    "cost": 0.000041
  }
}
```

### POST /api/semantic-search

Perform semantic search across video transcripts without AI processing.

**Request Body:**
```json
{
  "query": "sleep optimization techniques",
  "options": {
    "maxResults": 10,
    "videoIds": ["video_123", "video_456"],
    "timeRange": {
      "start": "2023-01-01",
      "end": "2024-01-01"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "sleep optimization techniques",
    "results": [
      {
        "segmentId": "segment_789",
        "videoId": "video_123",
        "startTime": 1205.5,
        "endTime": 1285.2,
        "text": "The key to sleep optimization is understanding your circadian rhythm...",
        "similarityScore": 0.89
      }
    ],
    "totalResults": 15,
    "processingTime": 850
  }
}
```

## 📺 Video Management Endpoints

### GET /api/videos

Retrieve videos with pagination and filtering options.

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Results per page (default: 20, max: 100)
- `search` (string): Search in titles and descriptions
- `category` (string): Filter by health category
- `sortBy` (string): Sort by 'published', 'views', 'duration', 'relevance'
- `sortOrder` (string): 'asc' or 'desc' (default: 'desc')

**Response:**
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "id": "video_123",
        "youtubeId": "SwQhKFMxmDY",
        "title": "Master Your Sleep & Be More Alert When Awake",
        "description": "In this episode, I discuss...",
        "duration": "2:15:30",
        "durationSeconds": 8130,
        "viewCount": 1200000,
        "publishedAt": "2021-01-11T00:00:00Z",
        "thumbnailUrl": "https://img.youtube.com/vi/SwQhKFMxmDY/maxresdefault.jpg"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 25,
      "totalResults": 500,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

### GET /api/videos/:id

Get detailed information about a specific video.

**Response:**
```json
{
  "success": true,
  "data": {
    "video": {
      "id": "video_123",
      "youtubeId": "SwQhKFMxmDY",
      "title": "Master Your Sleep & Be More Alert When Awake",
      "description": "Full description...",
      "duration": "2:15:30",
      "durationSeconds": 8130,
      "viewCount": 1200000,
      "publishedAt": "2021-01-11T00:00:00Z",
      "thumbnailUrl": "https://...",
      "transcriptSegments": 1235,
      "healthTopics": ["sleep", "circadian rhythm", "alertness"],
      "relatedVideos": ["video_456", "video_789"]
    }
  }
}
```

### GET /api/videos/:id/segments

Get transcript segments for a specific video.

**Query Parameters:**
- `startTime` (number): Filter segments after this time (seconds)
- `endTime` (number): Filter segments before this time (seconds)
- `search` (string): Search within segment text
- `limit` (integer): Maximum segments to return (default: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "video_123",
    "segments": [
      {
        "id": "segment_789",
        "startTime": 1205.5,
        "endTime": 1285.2,
        "text": "The key to sleep optimization...",
        "segmentIndex": 45,
        "confidence": 0.95
      }
    ],
    "totalSegments": 1235,
    "filteredSegments": 15
  }
}
```

## 🔍 Search & Discovery Endpoints

### GET /api/search/topics

Get available health topics for browsing and filtering.

**Response:**
```json
{
  "success": true,
  "data": {
    "topics": [
      {
        "id": "topic_123",
        "name": "Sleep",
        "category": "Neuroscience",
        "description": "Sleep optimization, circadian rhythms, and sleep disorders",
        "videoCount": 45,
        "keywords": ["sleep", "circadian", "insomnia", "sleep hygiene"]
      }
    ],
    "categories": [
      {
        "name": "Neuroscience",
        "topicCount": 15,
        "videoCount": 120
      }
    ]
  }
}
```

## 🛠️ Data Collection Endpoints

### POST /api/scrape/videos

Initiate video scraping from Huberman Lab channel.

**Request Body:**
```json
{
  "options": {
    "maxVideos": 100,
    "forceRefresh": false,
    "includeDetails": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "job_123456",
    "status": "started",
    "estimatedDuration": 180,
    "message": "Video scraping job started"
  }
}
```

### POST /api/scrape/transcripts

Initiate transcript scraping for specific videos.

**Request Body:**
```json
{
  "videoIds": ["SwQhKFMxmDY", "nm1TxQj9IsQ"],
  "options": {
    "batchSize": 5,
    "priority": "normal"
  }
}
```

### GET /api/scrape/status/:jobId

Check the status of a scraping job.

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "job_123456",
    "status": "completed",
    "progress": {
      "completed": 50,
      "total": 50,
      "percentage": 100
    },
    "results": {
      "videosScraped": 50,
      "transcriptsExtracted": 48,
      "errors": 2
    },
    "startedAt": "2024-01-15T10:00:00Z",
    "completedAt": "2024-01-15T10:03:00Z",
    "duration": 180
  }
}
```

## ⚠️ Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `QUERY_TOO_LONG` | 400 | Query exceeds maximum length |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SERVICE_UNAVAILABLE` | 503 | External service unavailable |
| `PROCESSING_ERROR` | 500 | Internal processing error |
| `DATABASE_ERROR` | 500 | Database connection issue |

## 🚦 Rate Limiting

- **Default Limit**: 100 requests per 15 minutes per IP
- **Query Endpoint**: 20 requests per 5 minutes per IP
- **Headers**: Rate limit information in response headers
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

## 📊 Response Times

| Endpoint | Average | 95th Percentile | Notes |
|----------|---------|-----------------|-------|
| `/api/health` | 50ms | 100ms | Cached responses |
| `/api/query` | 2.1s | 4.5s | Includes AI processing |
| `/api/videos` | 200ms | 500ms | Database queries |
| `/api/semantic-search` | 800ms | 1.5s | Vector search |

## 🔧 SDK & Client Libraries

### JavaScript/TypeScript
```typescript
import { HubermanHealthAI } from '@huberman-health-ai/client';

const client = new HubermanHealthAI({
  baseUrl: 'http://localhost:3001',
  timeout: 30000
});

const results = await client.query('How can I improve my sleep?');
```

### Python
```python
from huberman_health_ai import Client

client = Client(base_url='http://localhost:3001')
results = client.query('How can I improve my sleep?')
```

## 📝 Changelog

### v1.0.0 (Current)
- Initial API release
- Health query processing
- Video search and retrieval
- Semantic search capabilities
- Data collection endpoints

### Planned Features
- User authentication and profiles
- Query history and favorites
- Advanced filtering options
- Webhook notifications for data updates
- GraphQL API endpoint
