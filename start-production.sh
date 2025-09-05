#!/bin/bash

# Huberman Health AI Assistant - Production Startup Script
# This script starts the complete production-ready application

echo "🚀 Starting Huberman Health AI Assistant - Production Mode"
echo "============================================================"

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

if [ ! -f "backend/.env" ]; then
    echo "❌ Backend .env file not found."
    echo "📝 Please copy backend/.env.example to backend/.env and configure your API keys:"
    echo "   - OPENROUTER_API_KEY=your_openrouter_key"
    echo "   - APIFY_API_TOKEN=your_apify_token"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Start all services
echo ""
echo "🐳 Starting all services with Docker Compose..."
docker-compose up --build -d

# Wait for services to initialize
echo "⏳ Waiting for services to initialize (30 seconds)..."
sleep 30

# Health checks
echo ""
echo "🏥 Running health checks..."

# Check PostgreSQL
if docker exec huberman-postgres pg_isready -U huberman_user -d huberman_health_ai &> /dev/null; then
    echo "✅ PostgreSQL database is ready"
    
    # Check video count
    VIDEO_COUNT=$(docker exec huberman-postgres psql -U huberman_user -d huberman_health_ai -t -c "SELECT COUNT(*) FROM videos;" 2>/dev/null | tr -d ' ')
    echo "📹 Videos in database: $VIDEO_COUNT"
    
    if [ "$VIDEO_COUNT" -eq "0" ]; then
        echo "⚠️  No videos found. The application will use fallback data."
        echo "💡 To collect real Huberman Lab videos, run: npm run scrape:all"
    fi
else
    echo "❌ PostgreSQL database connection failed"
    exit 1
fi

# Check backend API
if curl -f http://localhost:3001/api/health &> /dev/null; then
    echo "✅ Backend API is healthy"
else
    echo "❌ Backend API health check failed"
    exit 1
fi

# Check frontend
if curl -f http://localhost:3000 &> /dev/null; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend health check failed"
    exit 1
fi

# Check Prometheus metrics
if curl -f http://localhost:3001/api/metrics &> /dev/null; then
    echo "✅ Prometheus metrics endpoint is working"
else
    echo "⚠️  Prometheus metrics endpoint not accessible"
fi

# Success message
echo ""
echo "🎉 HUBERMAN HEALTH AI ASSISTANT IS READY!"
echo "========================================"
echo ""
echo "📱 Application URLs:"
echo "   🌐 Frontend:           http://localhost:3000"
echo "   🔧 Backend API:        http://localhost:3001"
echo "   📊 API Health:         http://localhost:3001/api/health"
echo "   📈 Metrics:            http://localhost:3001/api/metrics"
echo "   🗄️  Prometheus:        http://localhost:9091"
echo ""
echo "🔧 Management Commands:"
echo "   View logs:             docker-compose logs -f"
echo "   Stop services:         docker-compose down"
echo "   Restart services:      docker-compose restart"
echo "   Collect more data:     npm run scrape:all"
echo ""
echo "✅ Your AI-powered health assistant is ready to help users find"
echo "   relevant content from Dr. Huberman's 392+ video library!"
echo ""
echo "🌐 Open http://localhost:3000 to start using the application"