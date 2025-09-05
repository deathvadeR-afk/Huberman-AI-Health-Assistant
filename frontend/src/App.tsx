import { useState, useEffect } from 'react'
import VideoResult from './components/VideoResult'
import HealthDisclaimer from './components/HealthDisclaimer'
import { processQuery, checkHealth, type SearchResult } from './lib/api'

// SearchResult interface is now imported from api.ts

/**
 * Main App component for Huberman Health AI Assistant
 * Provides a simple two-page interface for health query search and results
 *
 * @component
 * @returns {JSX.Element} The main application interface
 */
function App() {
  // State management for navigation and search functionality
  const [currentPage, setCurrentPage] = useState('home')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [error, setError] = useState<string | null>(null)

  // Mock data for demonstration
  const stats = {
    totalVideos: 392,
    totalHours: 677,
    totalViews: '50M+',
    topics: 85
  }

  const popularTopics = [
    'Sleep Optimization',
    'Morning Routine',
    'Exercise Science',
    'Nutrition Basics',
    'Stress Management',
    'Focus Enhancement'
  ]

  // Check backend health on component mount
  useEffect(() => {
    const checkBackendHealth = async () => {
      const healthResponse = await checkHealth()
      if (healthResponse.success) {
        setBackendStatus('connected')
      } else {
        setBackendStatus('disconnected')
        setError('Backend server is not responding. Please ensure the server is running on http://localhost:3001')
      }
    }
    
    checkBackendHealth()
  }, [])

  const handleSearch = async (query: string) => {
    if (!query.trim()) return

    setIsLoading(true)
    setSearchQuery(query)
    setCurrentPage('search')
    setError(null)

    try {
      console.log('Searching for:', query)
      const response = await processQuery(query)
      
      if (response.success && response.data) {
        // Map the backend response to our frontend interface
        const mappedResults: SearchResult[] = response.data.results.map(result => ({
          id: result.id,
          youtube_id: result.youtube_id,
          title: result.title,
          description: result.description,
          duration: result.duration,
          views: result.views,
          relevance_score: result.relevanceScore,
          search_snippet: result.searchSnippet,
          timestamps: result.timestamps
        }))
        
        setSearchResults(mappedResults)
        console.log('Search completed:', mappedResults.length, 'results found')
      } else {
        setError(response.error?.message || 'Search failed')
        setSearchResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      setError('Failed to search. Please check your connection and try again.')
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const HomePage = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">H</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Huberman Health AI</h1>
                <p className="text-slate-400 text-sm">Evidence-Based Health Assistant</p>
              </div>
            </div>
            <nav className="hidden md:flex space-x-6">
              <button
                onClick={() => setCurrentPage('home')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'home'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => setCurrentPage('search')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'search'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                Search
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Backend Status */}
          {backendStatus === 'disconnected' && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-red-200 font-medium">Backend Server Disconnected</p>
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {backendStatus === 'connected' && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-green-200 font-medium">Backend Server Connected - AI Processing Enabled</p>
              </div>
            </div>
          )}

          {/* Health Disclaimer */}
          <HealthDisclaimer variant="banner" className="mb-12" />
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Optimize Your Health with
            <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent"> Science</span>
          </h2>
          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
            Access Dr. Andrew Huberman's evidence-based health protocols and insights.
            Search through 392 episodes of cutting-edge neuroscience research.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-16">
            <div className="relative">
              <input
                type="text"
                placeholder="Ask me anything about health, sleep, nutrition, exercise..."
                className="w-full px-6 py-4 text-lg bg-slate-800/50 border border-slate-600 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(e.currentTarget.value)
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector('input') as HTMLInputElement
                  handleSearch(input.value)
                }}
                className="absolute right-2 top-2 bottom-2 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
              >
                Search
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <div className="text-3xl font-bold text-blue-400 mb-2">{stats.totalVideos}</div>
              <div className="text-slate-400">Episodes</div>
            </div>
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <div className="text-3xl font-bold text-green-400 mb-2">{stats.totalHours}h</div>
              <div className="text-slate-400">Content</div>
            </div>
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <div className="text-3xl font-bold text-purple-400 mb-2">{stats.totalViews}</div>
              <div className="text-slate-400">Views</div>
            </div>
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <div className="text-3xl font-bold text-orange-400 mb-2">{stats.topics}</div>
              <div className="text-slate-400">Topics</div>
            </div>
          </div>

          {/* Popular Topics */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-8">Popular Topics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularTopics.map((topic, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(topic)}
                  className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-slate-600 rounded-xl p-6 text-left hover:from-blue-800/30 hover:to-purple-800/30 hover:border-blue-500/50 transition-all duration-300 group"
                >
                  <h4 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-300">
                    {topic}
                  </h4>
                  <p className="text-slate-400 text-sm">
                    Explore evidence-based strategies for {topic.toLowerCase()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )

  const SearchPage = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">H</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Huberman Health AI</h1>
                <p className="text-slate-400 text-sm">Evidence-Based Health Assistant</p>
              </div>
            </div>
            <nav className="hidden md:flex space-x-6">
              <button
                onClick={() => setCurrentPage('home')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'home'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => setCurrentPage('search')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'search'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                Search
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Search Section */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Backend Status */}
          {backendStatus === 'disconnected' && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-red-200 font-medium">Backend Server Disconnected</p>
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Health Disclaimer */}
          <HealthDisclaimer variant="banner" className="mb-8" />

          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Search Health Insights</h2>
            <p className="text-xl text-slate-300">
              Ask questions and discover evidence-based answers from Dr. Huberman's research
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="relative">
              <input
                type="text"
                placeholder="Ask me anything about health, sleep, nutrition, exercise..."
                defaultValue={searchQuery}
                className="w-full px-6 py-4 text-lg bg-slate-800/50 border border-slate-600 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(e.currentTarget.value)
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector('input') as HTMLInputElement
                  handleSearch(input.value)
                }}
                className="absolute right-2 top-2 bottom-2 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Search Results */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-slate-400 mt-4">Searching through Dr. Huberman's content...</p>
            </div>
          )}

          {!isLoading && searchResults.length > 0 && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">
                  Search Results for "{searchQuery}"
                </h3>
                <div className="text-slate-400 text-sm">
                  {searchResults.length} video{searchResults.length !== 1 ? 's' : ''} found
                </div>
              </div>

              {/* Health Disclaimer for Results */}
              <HealthDisclaimer variant="inline" />

              {/* Video Results */}
              <div className="space-y-6">
                {searchResults.map((result, index) => (
                  <VideoResult
                    key={result.id}
                    video={result}
                    showPlayer={index === 0} // Show player for first result by default
                  />
                ))}
              </div>
            </div>
          )}

          {!isLoading && error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
              <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <h3 className="text-lg font-medium text-red-200 mb-2">Search Error</h3>
              <p className="text-red-300">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}

          {!isLoading && !error && searchQuery && searchResults.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-400">No results found. Try a different search term.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )

  // Main render logic
  return (
    <div>
      {currentPage === 'home' ? <HomePage /> : <SearchPage />}
    </div>
  )
}

export default App