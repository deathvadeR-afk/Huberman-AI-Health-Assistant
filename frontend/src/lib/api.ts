/**
 * API service for Huberman Health AI Assistant
 * Handles all communication with the backend server
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface SearchResult {
  id: string;
  youtube_id?: string;
  title: string;
  description: string;
  duration: string;
  views: string;
  relevanceScore?: number;
  searchSnippet?: string;
  matchedTopics?: string[];
  timestamps?: Array<{
    time: number;
    label: string;
    description: string;
  }>;
}

export interface QueryResponse {
  success: boolean;
  data?: {
    query: string;
    processedQuery: any;
    results: SearchResult[];
    totalResults: number;
    processingTime: number;
    cost: number;
    mode: string;
    aiProcessing?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

export interface HealthCheckResponse {
  success: boolean;
  data?: {
    status: string;
    timestamp: string;
    services: {
      server: { status: string };
      database: { status: string; message?: string };
      openrouter: { status: string; model?: string };
      apify: { status: string; actors?: string[] };
    };
    version: string;
    mode: string;
  };
}

/**
 * Makes a health check request to verify backend connectivity
 */
export async function checkHealth(): Promise<HealthCheckResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Health check failed:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Failed to connect to backend server'
      }
    };
  }
}

/**
 * Processes a health query and returns relevant video results
 */
export async function processQuery(query: string): Promise<QueryResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Query processing failed');
    }

    return data;
  } catch (error) {
    console.error('Query processing failed:', error);
    return {
      success: false,
      error: {
        code: 'QUERY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to process query'
      }
    };
  }
}

/**
 * Fetches videos with optional pagination and search
 */
export async function getVideos(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  try {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);

    const response = await fetch(`${API_BASE_URL}/api/videos?${searchParams}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch videos');
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch videos:', error);
    return {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch videos'
      }
    };
  }
}