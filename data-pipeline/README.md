# Huberman Health AI Data Pipeline

The data collection and processing pipeline for the Huberman Health AI Assistant. Handles scraping, processing, and storing YouTube video metadata and transcripts from the Huberman Lab channel.

## 🎯 Purpose

The data pipeline is responsible for:
- Scraping video metadata from the Huberman Lab YouTube channel
- Extracting transcripts with precise timestamps
- Processing and cleaning transcript data
- Storing structured data for search and analysis
- Maintaining data freshness and quality

## 🏗️ Architecture

```
data-pipeline/
├── src/
│   ├── index.js            # Main pipeline orchestrator
│   ├── scrapers/           # Data collection modules
│   │   ├── videoScraper.js     # Apify video scraping
│   │   ├── transcriptScraper.js # Apify transcript scraping
│   │   └── youtubeApiScraper.js # YouTube Data API scraping
│   ├── processors/         # Data processing modules
│   │   ├── dataProcessor.js    # Main data processing logic
│   │   ├── transcriptProcessor.js # Transcript cleaning and segmentation
│   │   └── metadataProcessor.js # Video metadata processing
│   └── utils/              # Utility functions
│       ├── database.js     # Database operations
│       ├── logger.js       # Logging configuration
│       └── validators.js   # Data validation
├── data/                   # Data storage
│   └── output/            # Processed data files
└── processors/            # Legacy processing scripts
```

## 🔧 Services Overview

### Video Scraper
- **Purpose**: Collects video metadata from Huberman Lab channel
- **Method**: Uses Apify Channel Scraper actor
- **Output**: Video titles, descriptions, URLs, view counts, publish dates
- **Frequency**: Daily updates for new content

### Transcript Scraper
- **Purpose**: Extracts timestamped transcripts from videos
- **Method**: Uses Apify Transcript Scraper actor
- **Output**: Segmented transcripts with precise timestamps
- **Features**: Automatic retry, error handling, progress tracking

### Data Processor
- **Purpose**: Cleans and structures scraped data
- **Features**: 
  - Duplicate detection and removal
  - Data validation and sanitization
  - Transcript segmentation and indexing
  - Metadata enrichment

## 🚀 Usage

### Installation
```bash
cd data-pipeline
npm install
```

### Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Configure API keys
APIFY_API_TOKEN=your_apify_api_token_here
YOUTUBE_API_KEY=your_youtube_api_key_here
DATABASE_URL=postgresql://username:password@localhost:5432/huberman_health_ai
```

### Running the Pipeline

#### Full Pipeline
```bash
# Run complete data collection and processing
npm start
```

#### Individual Components
```bash
# Scrape videos only
npm run scrape:videos

# Scrape transcripts only
npm run scrape:transcripts

# Process existing data
npm run process:data
```

#### Development Mode
```bash
# Run with auto-reload
npm run dev
```

### Monitoring
```bash
# Check pipeline status
npm run status
```

## 📊 Data Flow

1. **Video Collection**
   - Scrape Huberman Lab channel for video metadata
   - Store video information in database
   - Track new videos and updates

2. **Transcript Extraction**
   - For each video, extract timestamped transcript
   - Clean and segment transcript data
   - Store transcript segments with metadata

3. **Data Processing**
   - Validate and clean all collected data
   - Create searchable indexes
   - Generate summary statistics

4. **Quality Assurance**
   - Check for missing or corrupted data
   - Validate transcript accuracy
   - Monitor data freshness

## 🔍 Data Structure

### Video Metadata
```javascript
{
  id: "uuid",
  youtube_id: "SwQhKFMxmDY",
  title: "Master Your Sleep & Be More Alert When Awake",
  description: "In this episode, I discuss...",
  duration_seconds: 8100,
  view_count: 1200000,
  like_count: 45000,
  published_at: "2021-01-11T00:00:00Z",
  thumbnail_url: "https://...",
  channel_name: "Andrew Huberman",
  raw_data: { /* original scraped data */ }
}
```

### Transcript Segments
```javascript
{
  id: "uuid",
  video_id: "video_uuid",
  start_time: 120.5,
  end_time: 125.8,
  text: "Sleep is fundamental to...",
  segment_index: 15,
  confidence_score: 0.95,
  processed_at: "2024-01-15T10:30:00Z"
}
```

## ⚙️ Configuration

### Scraping Configuration
```javascript
// Video scraping settings
const VIDEO_SCRAPER_CONFIG = {
  maxVideos: 1000,
  includeVideoDetails: true,
  includeComments: false,
  includeSubtitles: false
};

// Transcript scraping settings
const TRANSCRIPT_SCRAPER_CONFIG = {
  batchSize: 10,
  retryAttempts: 3,
  timeoutMs: 30000
};
```

### Processing Configuration
```javascript
// Data processing settings
const PROCESSOR_CONFIG = {
  minSegmentLength: 10, // seconds
  maxSegmentLength: 300, // seconds
  confidenceThreshold: 0.8,
  duplicateThreshold: 0.95
};
```

## 📈 Performance

### Scraping Performance
- **Videos**: ~500 videos in 2-3 minutes
- **Transcripts**: ~10 videos per minute
- **Processing**: ~1000 segments per second

### Resource Usage
- **Memory**: ~200MB during processing
- **Storage**: ~50MB per 100 videos with transcripts
- **API Calls**: Optimized to minimize costs

## 🔒 Error Handling

The pipeline includes comprehensive error handling:

- **Network Errors**: Automatic retry with exponential backoff
- **API Limits**: Rate limiting and quota management
- **Data Validation**: Schema validation for all scraped data
- **Partial Failures**: Continue processing despite individual failures

## 📝 Logging

Structured logging with different levels:
- **INFO**: Normal operation progress
- **WARN**: Non-critical issues (missing data, retries)
- **ERROR**: Critical failures requiring attention
- **DEBUG**: Detailed operation information

Log files are stored in `../logs/data-pipeline.log`

## 🧪 Testing

```bash
# Run all tests
npm test

# Test individual scrapers
npm run test:scrapers

# Test data processing
npm run test:processors
```

## 📊 Monitoring & Metrics

The pipeline tracks:
- Videos scraped per run
- Transcript extraction success rate
- Processing time and performance
- Data quality metrics
- Error rates and types

## 🚀 Deployment

### Docker Deployment
```bash
# Build image
docker build -t huberman-data-pipeline .

# Run pipeline
docker run -e APIFY_API_TOKEN=xxx huberman-data-pipeline
```

### Scheduled Execution
Set up cron jobs for regular data updates:
```bash
# Daily video updates at 6 AM
0 6 * * * cd /path/to/data-pipeline && npm run scrape:videos

# Weekly full transcript update
0 2 * * 0 cd /path/to/data-pipeline && npm run scrape:transcripts
```

## 🤝 Contributing

1. Follow the existing code structure and patterns
2. Add comprehensive error handling
3. Include logging for all major operations
4. Test with small data sets before full runs
5. Document any new configuration options
6. Update this README for significant changes

## 📋 Troubleshooting

### Common Issues

**Apify API Errors**
- Check API token validity
- Verify actor IDs are correct
- Monitor API usage limits

**Database Connection Issues**
- Verify DATABASE_URL format
- Check database server status
- Ensure proper permissions

**Memory Issues**
- Reduce batch sizes
- Process data in smaller chunks
- Monitor memory usage during runs
