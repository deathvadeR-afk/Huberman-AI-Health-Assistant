#!/bin/bash

# Huberman Health AI Assistant - Production Deployment Script
# This script deploys the complete application with all services

echo "🚀 Starting Huberman Health AI Assistant Deployment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if required environment variables are set
if [ ! -f "backend/.env" ]; then
    echo "❌ Backend .env file not found. Please copy backend/.env.example to backend/.env and configure it."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Step 1: Build and start all services
echo "📦 Building and starting all services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Step 2: Check database connection
echo "🔍 Checking database connection..."
if docker exec huberman-postgres pg_isready -U huberman_user -d huberman_health_ai; then
    echo "✅ Database is ready"
else
    echo "❌ Database connection failed"
    exit 1
fi

# Step 3: Check if we have video data
VIDEO_COUNT=$(docker exec huberman-postgres psql -U huberman_user -d huberman_health_ai -t -c "SELECT COUNT(*) FROM videos;" 2>/dev/null | tr -d ' ')

if [ "$VIDEO_COUNT" -gt "0" ]; then
    echo "✅ Found $VIDEO_COUNT videos in database"
else
    echo "⚠️  No videos found in database. Running data collection..."
    
    # Run data collection
    echo "📹 Collecting Huberman Lab videos and transcripts..."
    docker-compose exec backend node /app/scripts/collect-huberman-data.js
    
    # Check again
    VIDEO_COUNT=$(docker exec huberman-postgres psql -U huberman_user -d huberman_health_ai -t -c "SELECT COUNT(*) FROM videos;" 2>/dev/null | tr -d ' ')
    echo "✅ Data collection completed. Found $VIDEO_COUNT videos"
fi

# Step 4: Health checks
echo "🏥 Running health checks..."

# Check backend health
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend API is healthy"
else
    echo "❌ Backend API health check failed"
    exit 1
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend health check failed"
    exit 1
fi

# Check Prometheus metrics
if curl -f http://localhost:3001/api/metrics > /dev/null 2>&1; then
    echo "✅ Prometheus metrics endpoint is working"
else
    echo "⚠️  Prometheus metrics endpoint not accessible"
fi

# Step 5: Display deployment summary
echo ""
echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo ""
echo "📊 Application Status:"
echo "   🌐 Frontend:           http://localhost:3000"
echo "   🔧 Backend API:        http://localhost:3001"
echo "   📈 Prometheus:         http://localhost:9091"
echo "   🗄️  Database:          PostgreSQL running on port 5432"
echo "   📹 Videos in DB:       $VIDEO_COUNT"
echo ""
echo "🔧 Management Commands:"
echo "   View logs:             docker-compose logs -f"
echo "   Stop services:         docker-compose down"
echo "   Restart services:      docker-compose restart"
echo "   Update data:           docker-compose exec backend node /app/scripts/collect-huberman-data.js"
echo ""
echo "✅ Your Huberman Health AI Assistant is ready for use!"
echo "🌐 Open http://localhost:3000 to start using the application"