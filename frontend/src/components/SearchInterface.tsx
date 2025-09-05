import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, Sparkles, Mic, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getSearchSuggestions } from '../lib/api.ts'
import { debounce } from '../lib/utils.ts'

interface SearchInterfaceProps {
  onSearch: (query: string) => void
  placeholder?: string
  isLoading?: boolean
  initialQuery?: string
  showSuggestions?: boolean
  className?: string
}

const SearchInterface: React.FC<SearchInterfaceProps> = ({
  onSearch,
  placeholder = "Ask me anything about health...",
  isLoading = false,
  initialQuery = '',
  showSuggestions = true,
  className = ''
}) => {
  const [query, setQuery] = useState(initialQuery)
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Debounced search suggestions
  const debouncedGetSuggestions = debounce((searchQuery: string) => {
    if (searchQuery.length >= 2) {
      refetch()
    }
  }, 300)

  const { data: suggestions, refetch } = useQuery({
    queryKey: ['searchSuggestions', query],
    queryFn: () => getSearchSuggestions(query),
    enabled: false,
  })

  useEffect(() => {
    if (query.length >= 2 && showSuggestions) {
      debouncedGetSuggestions(query)
    }
  }, [query, showSuggestions])

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestionsDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
      setShowSuggestionsDropdown(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    if (value.length >= 2 && showSuggestions) {
      setShowSuggestionsDropdown(true)
    } else {
      setShowSuggestionsDropdown(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    onSearch(suggestion)
    setShowSuggestionsDropdown(false)
  }

  const handleVoiceSearch = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      const recognition = new SpeechRecognition()
      
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setQuery(transcript)
        setIsListening(false)
      }

      recognition.onerror = () => {
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.start()
    }
  }

  const clearQuery = () => {
    setQuery('')
    setShowSuggestionsDropdown(false)
    inputRef.current?.focus()
  }

  const exampleQueries = [
    "How can I improve my sleep quality?",
    "What supplements does Huberman recommend?",
    "Best morning routine for productivity",
    "How to reduce stress and anxiety",
    "Optimal exercise timing for health"
  ]

  return (
    <div className={`relative w-full ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative group">
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-accent-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 transition-all duration-300 group-hover:border-white/30 group-focus-within:border-primary-500/50 group-focus-within:ring-2 group-focus-within:ring-primary-500/20">
              <div className="flex items-center space-x-3">
                <Search className="h-6 w-6 text-white/60 flex-shrink-0" />
                
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={handleInputChange}
                  onFocus={() => {
                    if (query.length >= 2 && showSuggestions) {
                      setShowSuggestionsDropdown(true)
                    }
                  }}
                  placeholder={placeholder}
                  className="flex-1 bg-transparent text-white placeholder-white/60 focus:outline-none text-lg"
                  disabled={isLoading}
                />

                <div className="flex items-center space-x-2">
                  {query && (
                    <button
                      type="button"
                      onClick={clearQuery}
                      className="p-1 text-white/60 hover:text-white transition-colors duration-200"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}

                  {/* Voice Search Button */}
                  <button
                    type="button"
                    onClick={handleVoiceSearch}
                    disabled={isListening}
                    className="p-2 text-white/60 hover:text-white transition-colors duration-200 disabled:opacity-50"
                  >
                    {isListening ? (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <Mic className="h-5 w-5 text-red-400" />
                      </motion.div>
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </button>

                  {/* Search Button */}
                  <button
                    type="submit"
                    disabled={!query.trim() || isLoading}
                    className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 disabled:from-gray-600 disabled:to-gray-700 text-white p-2 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Sparkles className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Suggestions Dropdown */}
          <AnimatePresence>
            {showSuggestionsDropdown && suggestions?.suggestions && suggestions.suggestions.length > 0 && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-2 z-50 max-h-64 overflow-y-auto"
              >
                {suggestions.suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    className="w-full text-left px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 flex items-center space-x-3"
                  >
                    <Search className="h-4 w-4 text-white/40" />
                    <span className="flex-1">{suggestion.text}</span>
                    {suggestion.type && (
                      <span className="text-xs text-white/40 bg-white/10 px-2 py-1 rounded-full">
                        {suggestion.type}
                      </span>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>

      {/* Example Queries */}
      {!query && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6"
        >
          <p className="text-white/60 text-sm mb-3">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {exampleQueries.map((example, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(example)}
                className="text-sm bg-white/5 hover:bg-white/10 text-white/70 hover:text-white px-3 py-2 rounded-lg transition-all duration-200 border border-white/10 hover:border-white/20"
              >
                {example}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default SearchInterface
