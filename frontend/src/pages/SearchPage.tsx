import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Search, Filter, SortAsc, Loader2, AlertCircle, Sparkles, Mic, X, Clock, TrendingUp } from 'lucide-react'

import { healthQuery, semanticSearch } from '../lib/api.ts'
import SearchInterface from '../components/SearchInterface.tsx'
import VideoCard from '../components/VideoCard.tsx'
import LoadingSpinner from '../components/LoadingSpinner.tsx'

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [isSearching, setIsSearching] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Get search results
  const { data: searchResults, isLoading, error, refetch } = useQuery({
    queryKey: ['healthQuery', query],
    queryFn: () => healthQuery(query),
    enabled: !!query,
  })

  useEffect(() => {
    const urlQuery = searchParams.get('q')
    if (urlQuery && urlQuery !== query) {
      setQuery(urlQuery)
    }
  }, [searchParams])

  const handleSearch = async (newQuery: string) => {
    setIsSearching(true)
    setQuery(newQuery)
    setSearchParams({ q: newQuery })
    
    try {
      await refetch()
    } finally {
      setIsSearching(false)
    }
  }

  const handleVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser')
      return
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    setIsListening(true)

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setQuery(transcript)
      handleSearch(transcript)
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  const popularSearches = [
    'How to improve sleep quality',
    'Best morning routine for productivity',
    'Supplements for brain health',
    'Optimal exercise timing',
    'How to reduce stress and anxiety',
    'Improve focus and concentration',
    'Cold exposure benefits',
    'Intermittent fasting protocols'
  ]

  const loading = isLoading || isSearching

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Search Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Search Health Insights
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Ask questions and discover evidence-based answers from Dr. Huberman's research
            </p>
          </div>

          {/* Enhanced Search Interface */}
          <div className="relative max-w-4xl mx-auto">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative bg-slate-800/50 backdrop-blur-xl border border-slate-600 rounded-2xl p-2 transition-all duration-300 group-hover:border-slate-500 group-focus-within:border-blue-500/50 group-focus-within:ring-2 group-focus-within:ring-blue-500/20">
                <div className="flex items-center space-x-3">
                  <div className="pl-4">
                    <Search className="w-6 h-6 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setShowSuggestions(e.target.value.length > 0)
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch(query)}
                    placeholder="Ask me anything about health, sleep, nutrition, exercise..."
                    className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none text-lg py-3"
                    disabled={loading}
                  />

                  {/* Voice Search Button */}
                  <button
                    onClick={handleVoiceSearch}
                    disabled={isListening || loading}
                    className={`p-3 rounded-xl transition-all duration-200 ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white'
                    }`}
                    title="Voice Search"
                  >
                    {isListening ? (
                      <div className="w-5 h-5 bg-white rounded-full animate-pulse" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </button>

                  {/* Search Button */}
                  <button
                    onClick={() => handleSearch(query)}
                    disabled={!query.trim() || loading}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Search</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Popular Searches */}
            {!query && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6"
              >
                <p className="text-gray-400 text-sm mb-3 text-center">Popular searches:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {popularSearches.slice(0, 6).map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearch(search)}
                      className="text-sm bg-slate-800/30 hover:bg-slate-700/50 text-gray-300 hover:text-white px-3 py-2 rounded-lg transition-all duration-200 border border-slate-700 hover:border-slate-600"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Search Results */}
        {query && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-500 mx-auto mb-4" />
                  <p className="text-white/70">Searching through 677+ hours of content...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="card-premium text-center py-8">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Search Error</h3>
                <p className="text-white/70 mb-4">
                  Sorry, we encountered an error while searching. Please try again.
                </p>
                <button
                  onClick={() => refetch()}
                  className="btn-primary"
                >
                  Try Again
                </button>
              </div>
            )}

            {searchResults && !loading && (
              <>
                {/* Search Summary */}
                <div className="card-premium mb-8">
                  <div className="flex items-start space-x-4">
                    <div className="bg-gradient-to-r from-primary-600 to-accent-500 p-2 rounded-lg">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Search Results for "{query}"
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-white/70">
                        <div>
                          <span className="font-medium text-white">Results:</span> {searchResults.results.length}
                        </div>
                        <div>
                          <span className="font-medium text-white">Processing Time:</span> {searchResults.metadata.processingTime}ms
                        </div>
                        <div>
                          <span className="font-medium text-white">Query Type:</span> {searchResults.processedQuery.queryType}
                        </div>
                      </div>

                      {/* Health Topics Identified */}
                      {searchResults.processedQuery.healthTopics.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-white mb-2">Related Health Topics:</p>
                          <div className="flex flex-wrap gap-2">
                            {searchResults.processedQuery.healthTopics.map((topic, index) => (
                              <span
                                key={index}
                                className="bg-primary-600/20 text-primary-300 px-3 py-1 rounded-full text-xs"
                              >
                                {topic.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Results Grid */}
                {searchResults.results.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {searchResults.results.map((video, index) => (
                      <motion.div
                        key={video.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                      >
                        <VideoCard
                          video={video}
                          showRelevanceScore={true}
                          searchTerms={searchResults.processedQuery.searchTerms}
                        />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="card-premium text-center py-12">
                    <Search className="h-12 w-12 text-white/40 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Results Found</h3>
                    <p className="text-white/70 mb-4">
                      We couldn't find any videos matching your search. Try rephrasing your question or using different keywords.
                    </p>
                    <div className="text-sm text-white/60">
                      <p className="mb-2">Suggestions:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Use more general terms (e.g., "sleep" instead of "sleep optimization protocols")</li>
                        <li>Try asking a question (e.g., "How can I improve my sleep?")</li>
                        <li>Check for typos in your search query</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {searchResults.recommendations && searchResults.recommendations.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="mt-12"
                  >
                    <h2 className="text-2xl font-bold text-white mb-6">You Might Also Like</h2>
                    <div className="space-y-6">
                      {searchResults.recommendations.map((recommendation, index) => (
                        <div key={index} className="card-premium">
                          <h3 className="text-lg font-semibold text-white mb-4">
                            {recommendation.title}
                          </h3>
                          {recommendation.items && recommendation.items.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {recommendation.items.slice(0, 3).map((item, itemIndex) => (
                                <div
                                  key={itemIndex}
                                  className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors duration-200"
                                >
                                  <h4 className="font-medium text-white mb-2">
                                    {item.title || item.name}
                                  </h4>
                                  {item.view_count && (
                                    <p className="text-sm text-white/60">
                                      {item.view_count.toLocaleString()} views
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* Empty State */}
        {!query && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center py-12"
          >
            <Search className="h-16 w-16 text-white/40 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">
              Start Your Health Journey
            </h2>
            <p className="text-white/70 max-w-md mx-auto">
              Enter a health question above to discover evidence-based insights from Dr. Huberman's research.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default SearchPage
