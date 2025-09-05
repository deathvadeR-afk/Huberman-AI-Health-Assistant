# Huberman Health AI Assistant

An AI-powered health assistant that searches Andrew Huberman's podcast library to answer user queries with specific video recommendations and timestamps.

## 🎯 Project Overview

This application allows users to ask health-related questions and receive relevant video recommendations from the Huberman Lab podcast, complete with exact timestamps where topics are discussed.

**Example**: User asks "I have stomach ache" → System finds relevant Huberman video with timestamp where he discusses digestive health.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │  Data Pipeline  │
│   (React+Vite)  │◄──►│   (Node.js)     │◄──►│   (Apify)       │
│                 │    │   MCP Server    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │   PostgreSQL    │              │
         └──────────────►│   + pgvector    │◄─────────────┘
                        │                 │
                        └─────────────────┘
```

## 🚀 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express.js, MCP Server, Winston Logging
- **Database**: PostgreSQL with pgvector extension
- **AI**: OpenRouter API (multiple LLM models), Cost-efficient processing
- **Data Collection**: Apify (YouTube Channel & Transcript Scrapers)
- **Monitoring**: Prometheus
- **Deployment**: Docker, Docker Compose

## 📋 Prerequisites

- Node.js 18+ 
- Docker Desktop
- Apify API Token
- OpenRouter API Key

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/deathvadeR-afk/Huberman-AI-Health-Assistant.git
   cd huberman-health-ai-assistant
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   # Copy example files and fill in your API keys
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   cp data-pipeline/.env.example data-pipeline/.env
   ```

4. **Start the database**
   ```bash
   docker-compose up postgres redis -d
   ```

5. **Run data collection (first time setup)**
   ```bash
   npm run scrape:all
   ```

6. **Start the development servers**
   ```bash
   npm run dev
   ```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start all development servers
- `npm run dev:backend` - Start backend only
- `npm run dev:frontend` - Start frontend only
- `npm run dev:data-pipeline` - Start data pipeline
- `npm run test` - Run all tests
- `npm run lint` - Lint all projects
- `npm run docker:up` - Start all services with Docker

### Project Structure

```
huberman-health-ai-assistant/
├── backend/                 # MCP Server & API
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── services/        # Business logic
│   │   ├── models/          # Database models
│   │   ├── middleware/      # Express middleware
│   │   └── utils/           # Utility functions
│   └── tests/
├── frontend/               # Next.js React App
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Next.js pages
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API services
│   │   └── utils/           # Utility functions
│   └── public/
├── data-pipeline/          # Apify scrapers & processing
│   ├── src/
│   │   ├── scrapers/        # Apify scraper configurations
│   │   ├── processors/      # Data processing logic
│   │   └── utils/           # Utility functions
│   └── data/
├── monitoring/             # Prometheus configuration
├── docker/                 # Docker configurations
└── docs/                   # Documentation
```

## 🔍 API Endpoints

### Health Query API
- `POST /api/query` - Submit health query and get video recommendations
- `GET /api/videos/:id` - Get specific video details
- `GET /api/videos/:id/segments` - Get video transcript segments

### Analytics API
- `GET /api/analytics/queries` - Get query analytics
- `GET /api/analytics/popular-topics` - Get popular health topics

## 🎯 Usage

1. **Ask a health question**: "How can I improve my sleep quality?"
2. **Get video recommendations**: System returns relevant Huberman Lab videos
3. **Jump to specific timestamps**: Click on timestamps to go directly to relevant content
4. **Explore related topics**: Browse suggested related health topics

## 📊 Monitoring

Access monitoring dashboards:
- Prometheus: http://localhost:9091
- Application metrics: http://localhost:3001/api/metrics

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run specific test suites
npm run test:backend
npm run test:frontend
npm run test:data-pipeline

# Run tests in watch mode
npm run test:watch
```

## 🚀 Deployment

1. **Build for production**
   ```bash
   npm run build
   ```

2. **Deploy with Docker**
   ```bash
   docker-compose up -d
   ```

## 📝 Environment Variables

See `.env.example` files in each directory for required environment variables.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Andrew Huberman and the Huberman Lab team for the incredible content
- Apify for providing the data scraping infrastructure
- OpenRouter for cost-effective AI API access
