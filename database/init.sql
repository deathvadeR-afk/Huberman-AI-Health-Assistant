-- Initialize Huberman Health AI Database
-- This script sets up the complete database schema with pgvector extension

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youtube_id VARCHAR(20) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    duration_seconds INTEGER,
    view_count BIGINT,
    like_count BIGINT,
    published_at TIMESTAMP WITH TIME ZONE,
    thumbnail_url TEXT,
    channel_name VARCHAR(255) DEFAULT 'Andrew Huberman',
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transcript segments table
CREATE TABLE IF NOT EXISTS transcript_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    start_time DECIMAL(10,3) NOT NULL,
    end_time DECIMAL(10,3) NOT NULL,
    text TEXT NOT NULL,
    segment_index INTEGER NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.95,
    embedding vector(1536), -- OpenAI embedding dimension
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create health topics table
CREATE TABLE IF NOT EXISTS health_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100),
    description TEXT,
    keywords TEXT[],
    video_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create query logs table for analytics and cost tracking
CREATE TABLE IF NOT EXISTS query_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT NOT NULL,
    processed_query JSONB,
    results_count INTEGER,
    processing_time_ms INTEGER,
    cost_usd DECIMAL(10,6),
    user_ip VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scraping jobs table for tracking data collection
CREATE TABLE IF NOT EXISTS scraping_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(50) NOT NULL, -- 'videos' or 'transcripts'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    apify_run_id VARCHAR(100),
    videos_processed INTEGER DEFAULT 0,
    transcripts_processed INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_details JSONB
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_videos_youtube_id ON videos (youtube_id);
CREATE INDEX IF NOT EXISTS idx_videos_published_at ON videos (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_view_count ON videos (view_count DESC);

CREATE INDEX IF NOT EXISTS idx_transcript_segments_video_id ON transcript_segments (video_id);
CREATE INDEX IF NOT EXISTS idx_transcript_segments_time ON transcript_segments (video_id, start_time);
CREATE INDEX IF NOT EXISTS idx_transcript_segments_text ON transcript_segments USING gin(to_tsvector('english', text));

-- Vector similarity search index (will be created after data is inserted)
-- CREATE INDEX idx_transcript_segments_embedding ON transcript_segments USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_health_topics_name ON health_topics (name);
CREATE INDEX IF NOT EXISTS idx_health_topics_category ON health_topics (category);

CREATE INDEX IF NOT EXISTS idx_query_logs_created_at ON query_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_logs_success ON query_logs (success);

CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs (status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_created_at ON scraping_jobs (created_at DESC);

-- Insert sample health topics
INSERT INTO health_topics (name, category, description, keywords) VALUES
('Sleep', 'Neuroscience', 'Sleep optimization, circadian rhythms, and sleep disorders', ARRAY['sleep', 'circadian', 'insomnia', 'sleep hygiene', 'melatonin']),
('Exercise', 'Fitness', 'Physical exercise, strength training, and cardiovascular health', ARRAY['exercise', 'fitness', 'strength', 'cardio', 'workout']),
('Nutrition', 'Health', 'Diet, supplements, and nutritional science', ARRAY['nutrition', 'diet', 'supplements', 'vitamins', 'food']),
('Stress Management', 'Mental Health', 'Stress reduction, anxiety management, and mental wellness', ARRAY['stress', 'anxiety', 'meditation', 'mindfulness', 'cortisol']),
('Focus & Productivity', 'Cognitive Science', 'Attention, concentration, and cognitive enhancement', ARRAY['focus', 'attention', 'productivity', 'concentration', 'dopamine']),
('Hormones', 'Endocrinology', 'Hormone optimization and endocrine health', ARRAY['hormones', 'testosterone', 'estrogen', 'thyroid', 'insulin']),
('Cold Exposure', 'Biohacking', 'Cold therapy, ice baths, and cold adaptation', ARRAY['cold', 'ice bath', 'cold therapy', 'brown fat', 'thermogenesis']),
('Heat Exposure', 'Biohacking', 'Sauna, heat therapy, and heat adaptation', ARRAY['sauna', 'heat', 'heat therapy', 'heat shock proteins']),
('Light Therapy', 'Circadian Biology', 'Light exposure, phototherapy, and circadian regulation', ARRAY['light', 'phototherapy', 'circadian', 'blue light', 'red light']),
('Breathing', 'Physiology', 'Breathwork, respiratory health, and breathing techniques', ARRAY['breathing', 'breathwork', 'respiratory', 'oxygen', 'CO2'])
ON CONFLICT (name) DO NOTHING;

-- Insert sample video data (this will be replaced by real scraped data)
INSERT INTO videos (youtube_id, title, description, duration_seconds, view_count, published_at, thumbnail_url) VALUES
('SwQhKFMxmDY', 'Master Your Sleep & Be More Alert When Awake', 'In this episode, I discuss the biology of sleep and provide tools for better sleep quality and daytime alertness.', 8130, 1200000, '2021-01-11T00:00:00Z', 'https://img.youtube.com/vi/SwQhKFMxmDY/maxresdefault.jpg'),
('nm1TxQj9IsQ', 'How to Optimize Your Brain-Body Function & Health', 'Tools and protocols for optimizing brain and body function through science-based approaches.', 6320, 890000, '2021-02-15T00:00:00Z', 'https://img.youtube.com/vi/nm1TxQj9IsQ/maxresdefault.jpg'),
('h7zZOUxbXMw', 'The Science of Well-Being', 'Evidence-based strategies for improving mental and physical well-being.', 7200, 750000, '2021-03-01T00:00:00Z', 'https://img.youtube.com/vi/h7zZOUxbXMw/maxresdefault.jpg')
ON CONFLICT (youtube_id) DO NOTHING;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_health_topics_updated_at BEFORE UPDATE ON health_topics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO huberman_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO huberman_user;

-- Display setup completion message
DO $$
BEGIN
    RAISE NOTICE 'Huberman Health AI database initialized successfully!';
    RAISE NOTICE 'Database: huberman_health_ai';
    RAISE NOTICE 'User: huberman_user';
    RAISE NOTICE 'Extensions: vector (pgvector)';
    RAISE NOTICE 'Tables created: videos, transcript_segments, health_topics, query_logs, scraping_jobs';
    RAISE NOTICE 'Sample data inserted: % health topics, % videos', 
        (SELECT COUNT(*) FROM health_topics),
        (SELECT COUNT(*) FROM videos);
END $$;
