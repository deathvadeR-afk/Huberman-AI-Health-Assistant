# Deployment Guide - Huberman Health AI Assistant

## 🎯 Deployment Overview

This guide provides step-by-step instructions for deploying the Huberman Health AI Assistant to production environments. The system supports multiple deployment strategies from simple VPS hosting to scalable cloud deployments.

## 📋 Prerequisites

### System Requirements

**Minimum Production Requirements:**
- **CPU**: 2 vCPUs
- **Memory**: 4GB RAM
- **Storage**: 50GB SSD
- **Network**: 100 Mbps bandwidth
- **OS**: Ubuntu 20.04+ or similar Linux distribution

**Recommended Production Requirements:**
- **CPU**: 4 vCPUs
- **Memory**: 8GB RAM
- **Storage**: 100GB SSD
- **Network**: 1 Gbps bandwidth
- **Load Balancer**: For high availability

### Required Services

1. **PostgreSQL 15+** with pgvector extension
2. **Node.js 20+** runtime environment
3. **Docker** (optional but recommended)
4. **SSL Certificate** for HTTPS
5. **Domain Name** for production access

### API Keys and Accounts

- **OpenRouter API Key**: For AI processing ([openrouter.ai](https://openrouter.ai))
- **Apify API Token**: For data scraping ([apify.com](https://apify.com))
- **YouTube Data API Key**: For video metadata ([console.cloud.google.com](https://console.cloud.google.com))

## 🏗️ Deployment Options

### Option 1: Docker Deployment (Recommended)

#### **Step 1: Server Setup**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login to apply Docker group changes
```

#### **Step 2: Application Setup**

```bash
# Clone repository
git clone <your-repository-url>
cd huberman-health-ai-assistant

# Create production environment file
cp .env.example .env.production
```

#### **Step 3: Environment Configuration**

Edit `.env.production`:

```bash
# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database Configuration
DATABASE_URL=postgresql://username:password@postgres:5432/huberman_health_ai

# API Keys
OPENROUTER_API_KEY=your_openrouter_api_key_here
APIFY_API_TOKEN=your_apify_api_token_here
YOUTUBE_API_KEY=your_youtube_api_key_here

# Security
CORS_ORIGIN=https://yourdomain.com
JWT_SECRET=your_super_secure_jwt_secret_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log
```

#### **Step 4: Docker Compose Setup**

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_DB: huberman_health_ai
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    ports:
      - "3001:3001"
    depends_on:
      - postgres
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./ssl:/etc/ssl/certs
    restart: unless-stopped

  data-pipeline:
    build:
      context: ./data-pipeline
      dockerfile: Dockerfile
    env_file:
      - .env.production
    depends_on:
      - postgres
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    # Run as cron job, not continuous service
    profiles: ["cron"]

volumes:
  postgres_data:
```

#### **Step 5: Build and Deploy**

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Option 2: Manual VPS Deployment

#### **Step 1: Server Preparation**

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL with pgvector
sudo apt install postgresql postgresql-contrib
sudo -u postgres createuser --interactive
sudo -u postgres createdb huberman_health_ai

# Install pgvector extension
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

#### **Step 2: Database Setup**

```sql
-- Connect to PostgreSQL
sudo -u postgres psql huberman_health_ai

-- Enable pgvector extension
CREATE EXTENSION vector;

-- Create application user
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE huberman_health_ai TO app_user;
```

#### **Step 3: Application Deployment**

```bash
# Clone and setup application
git clone <your-repository-url>
cd huberman-health-ai-assistant

# Install backend dependencies
cd backend
npm ci --production
cd ..

# Install frontend dependencies and build
cd frontend
npm ci
npm run build
cd ..

# Install data pipeline dependencies
cd data-pipeline
npm ci --production
cd ..

# Setup environment
cp .env.example .env
# Edit .env with production values
```

#### **Step 4: Process Management with PM2**

```bash
# Install PM2
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'huberman-backend',
      script: 'backend/src/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'huberman-data-pipeline',
      script: 'data-pipeline/src/index.js',
      cron_restart: '0 6 * * *', // Daily at 6 AM
      autorestart: false
    }
  ]
};
EOF

# Start applications
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🌐 Web Server Configuration

### Nginx Configuration

Create `/etc/nginx/sites-available/huberman-health-ai`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.com.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.com.key;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Frontend
    location / {
        root /var/www/huberman-health-ai/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/huberman-health-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 SSL Certificate Setup

### Using Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

### Using Custom SSL Certificate

```bash
# Copy certificate files
sudo cp yourdomain.com.crt /etc/ssl/certs/
sudo cp yourdomain.com.key /etc/ssl/private/
sudo chmod 600 /etc/ssl/private/yourdomain.com.key
```

## 📊 Monitoring Setup

### Health Check Endpoint

The application provides a health check endpoint at `/api/health`:

```bash
# Test health check
curl https://yourdomain.com/api/health

# Expected response
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "database": { "status": "connected" },
      "openrouter": { "status": "available" },
      "apify": { "status": "available" }
    }
  }
}
```

### Monitoring with Uptime Kuma

```bash
# Install Uptime Kuma
docker run -d --restart=always -p 3001:3001 -v uptime-kuma:/app/data --name uptime-kuma louislam/uptime-kuma:1

# Configure monitors:
# - HTTP(s) monitor for https://yourdomain.com/api/health
# - Keyword monitor looking for "healthy"
# - Response time monitoring
```

### Log Monitoring

```bash
# Setup log rotation
sudo tee /etc/logrotate.d/huberman-health-ai << EOF
/var/log/huberman-health-ai/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload all
    endscript
}
EOF
```

## 🔄 Database Migrations

### Initial Database Setup

```sql
-- Run these commands in PostgreSQL
\c huberman_health_ai;

-- Create tables (run the schema from docs/TECHNICAL_ARCHITECTURE.md)
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcript_segments_embedding 
ON transcript_segments USING ivfflat (embedding vector_cosine_ops);

-- Verify setup
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Backup Strategy

```bash
# Create backup script
cat > /usr/local/bin/backup-huberman-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/huberman-health-ai"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h localhost -U app_user huberman_health_ai | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_backup_$DATE.sql.gz"
EOF

chmod +x /usr/local/bin/backup-huberman-db.sh

# Schedule daily backups
echo "0 2 * * * /usr/local/bin/backup-huberman-db.sh" | sudo crontab -
```

## 🚀 Recommended Hosting Platforms

### 1. DigitalOcean Droplet

**Configuration**: 4 vCPU, 8GB RAM, 160GB SSD  
**Cost**: ~$48/month  
**Pros**: Simple setup, good performance, managed databases available  
**Setup**: Use the manual VPS deployment method

### 2. AWS EC2 + RDS

**Configuration**: t3.large EC2 + db.t3.micro RDS PostgreSQL  
**Cost**: ~$60/month  
**Pros**: Scalable, managed database, extensive monitoring  
**Setup**: Use Docker deployment with RDS connection

### 3. Google Cloud Platform

**Configuration**: e2-standard-2 + Cloud SQL PostgreSQL  
**Cost**: ~$55/month  
**Pros**: Good AI/ML integration, global CDN  
**Setup**: Use Docker deployment with Cloud SQL

### 4. Vercel (Frontend) + Railway (Backend)

**Configuration**: Vercel Pro + Railway Pro  
**Cost**: ~$40/month  
**Pros**: Automatic deployments, serverless scaling  
**Setup**: Deploy frontend to Vercel, backend to Railway

## 🔧 Environment-Specific Configurations

### Development Environment

```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://localhost:5432/huberman_health_ai_dev
LOG_LEVEL=debug
CORS_ORIGIN=http://localhost:3000
```

### Staging Environment

```bash
NODE_ENV=staging
PORT=3001
DATABASE_URL=postgresql://staging-db:5432/huberman_health_ai_staging
LOG_LEVEL=info
CORS_ORIGIN=https://staging.yourdomain.com
```

### Production Environment

```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://prod-db:5432/huberman_health_ai
LOG_LEVEL=warn
CORS_ORIGIN=https://yourdomain.com
```

## 🚨 Troubleshooting Guide

### Common Issues

**1. Database Connection Errors**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U app_user -d huberman_health_ai

# Check pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';
```

**2. High Memory Usage**
```bash
# Monitor memory usage
htop

# Restart services if needed
pm2 restart all

# Check for memory leaks
node --inspect backend/src/server.js
```

**3. API Rate Limiting Issues**
```bash
# Check rate limit configuration
grep -r "RATE_LIMIT" .env

# Monitor API usage
tail -f logs/app.log | grep "rate limit"
```

**4. SSL Certificate Issues**
```bash
# Check certificate validity
openssl x509 -in /etc/ssl/certs/yourdomain.com.crt -text -noout

# Test SSL configuration
curl -I https://yourdomain.com
```

### Performance Optimization

**1. Database Optimization**
```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM transcript_segments WHERE embedding <-> '[...]' < 0.5;

-- Update statistics
ANALYZE transcript_segments;

-- Reindex if needed
REINDEX INDEX idx_transcript_segments_embedding;
```

**2. Application Optimization**
```bash
# Enable Node.js production optimizations
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=4096"

# Use cluster mode for better CPU utilization
pm2 start ecosystem.config.js
```

## 📈 Scaling Considerations

### Horizontal Scaling

**Load Balancer Configuration** (Nginx):
```nginx
upstream backend {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    location /api/ {
        proxy_pass http://backend;
    }
}
```

### Database Scaling

**Read Replicas**:
```bash
# Setup read replica for search queries
DATABASE_READ_URL=postgresql://readonly-user:password@read-replica:5432/huberman_health_ai
```

**Connection Pooling**:
```javascript
// Use connection pooling for better performance
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
```

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] SSL certificates obtained
- [ ] Database setup and migrations run
- [ ] API keys validated
- [ ] Domain DNS configured
- [ ] Backup strategy implemented

### Deployment
- [ ] Application deployed and running
- [ ] Health checks passing
- [ ] SSL/HTTPS working
- [ ] API endpoints responding
- [ ] Frontend loading correctly
- [ ] Database connections stable

### Post-Deployment
- [ ] Monitoring setup and alerting configured
- [ ] Log rotation configured
- [ ] Backup schedule verified
- [ ] Performance monitoring active
- [ ] Security headers verified
- [ ] Load testing completed

## 🔄 CI/CD Pipeline Setup

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: |
        cd backend && npm ci
        cd ../frontend && npm ci
        cd ../data-pipeline && npm ci

    - name: Run tests
      run: |
        cd backend && npm test
        cd ../frontend && npm run build

    - name: Security audit
      run: |
        cd backend && npm audit --audit-level high
        cd ../frontend && npm audit --audit-level high

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
    - uses: actions/checkout@v3

    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /var/www/huberman-health-ai
          git pull origin main
          docker-compose -f docker-compose.prod.yml down
          docker-compose -f docker-compose.prod.yml up -d --build

    - name: Health check
      run: |
        sleep 30
        curl -f https://yourdomain.com/api/health || exit 1
```

### Docker Production Files

Create `backend/Dockerfile.prod`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/
COPY tests/ ./tests/

EXPOSE 3001

USER node

CMD ["node", "src/server.js"]
```

Create `frontend/Dockerfile.prod`:

```dockerfile
FROM node:20-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🎉 Deployment Complete

Your Huberman Health AI Assistant is now deployed and ready for production use!

**Next Steps**:
1. Monitor application performance and logs
2. Set up regular database backups
3. Configure monitoring and alerting
4. Plan for scaling as user base grows
5. Regular security updates and maintenance

For ongoing support and maintenance, refer to the monitoring dashboard and log files for system health and performance metrics.
