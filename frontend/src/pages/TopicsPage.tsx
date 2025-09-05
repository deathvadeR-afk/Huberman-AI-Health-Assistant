import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Search, TrendingUp, Users, Play } from 'lucide-react'
import { Link } from 'react-router-dom'

import { getHealthTopics } from '../lib/api.ts'
import LoadingSpinner from '../components/LoadingSpinner.tsx'

const TopicsPage: React.FC = () => {
  const { data: topicsData, isLoading, error } = useQuery({
    queryKey: ['healthTopics'],
    queryFn: getHealthTopics,
  })

  const topicCategories = topicsData?.topics.reduce((acc, topic) => {
    const category = topic.category || 'General'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(topic)
    return acc
  }, {} as Record<string, typeof topicsData.topics>) || {}

  const categoryIcons = {
    'Sleep': '😴',
    'Nutrition': '🥗',
    'Exercise': '💪',
    'Mental Health': '🧠',
    'Supplements': '💊',
    'Neuroscience': '🔬',
    'General': '📚',
  }

  const categoryColors = {
    'Sleep': 'from-blue-500 to-indigo-600',
    'Nutrition': 'from-green-500 to-emerald-600',
    'Exercise': 'from-orange-500 to-red-600',
    'Mental Health': 'from-purple-500 to-pink-600',
    'Supplements': 'from-yellow-500 to-orange-600',
    'Neuroscience': 'from-cyan-500 to-blue-600',
    'General': 'from-gray-500 to-slate-600',
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading health topics..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Error Loading Topics</h1>
          <p className="text-white/70 mb-6">We couldn't load the health topics. Please try again.</p>
          <Link to="/" className="btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Health Topics
          </h1>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Explore evidence-based insights organized by health categories from Dr. Huberman's research
          </p>
        </motion.div>

        {/* Stats */}
        {topicsData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          >
            <div className="card-premium text-center">
              <BookOpen className="h-8 w-8 text-primary-400 mx-auto mb-3" />
              <div className="text-2xl font-bold text-white">{topicsData.total}</div>
              <div className="text-white/60">Total Topics</div>
            </div>
            
            <div className="card-premium text-center">
              <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-3" />
              <div className="text-2xl font-bold text-white">{Object.keys(topicCategories).length}</div>
              <div className="text-white/60">Categories</div>
            </div>
            
            <div className="card-premium text-center">
              <Search className="h-8 w-8 text-purple-400 mx-auto mb-3" />
              <div className="text-2xl font-bold text-white">AI-Powered</div>
              <div className="text-white/60">Search</div>
            </div>
          </motion.div>
        )}

        {/* Topics by Category */}
        <div className="space-y-12">
          {Object.entries(topicCategories).map(([category, topics], categoryIndex) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className={`bg-gradient-to-r ${categoryColors[category] || categoryColors.General} p-3 rounded-xl`}>
                  <span className="text-2xl">{categoryIcons[category] || categoryIcons.General}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{category}</h2>
                  <p className="text-white/60">{topics.length} topics available</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topics.map((topic, topicIndex) => (
                  <motion.div
                    key={topic.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: (categoryIndex * 0.1) + (topicIndex * 0.05) }}
                    whileHover={{ y: -5 }}
                    className="card-premium group cursor-pointer"
                  >
                    <Link to={`/search?q=${encodeURIComponent(topic.name)}`} className="block">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-white group-hover:text-primary-300 transition-colors duration-200">
                          {topic.name}
                        </h3>
                        <Search className="h-4 w-4 text-white/40 group-hover:text-primary-400 transition-colors duration-200" />
                      </div>

                      {topic.description && (
                        <p className="text-white/70 text-sm mb-4 line-clamp-3">
                          {topic.description}
                        </p>
                      )}

                      {topic.keywords && topic.keywords.length > 0 && (
                        <div className="mb-4">
                          <div className="flex flex-wrap gap-1">
                            {topic.keywords.slice(0, 3).map((keyword, index) => (
                              <span
                                key={index}
                                className="bg-white/10 text-white/70 px-2 py-1 rounded-full text-xs"
                              >
                                {keyword}
                              </span>
                            ))}
                            {topic.keywords.length > 3 && (
                              <span className="text-white/50 text-xs px-2 py-1">
                                +{topic.keywords.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-white/60 pt-3 border-t border-white/10">
                        <span>Click to search</span>
                        <div className="flex items-center space-x-1">
                          <Play className="h-3 w-3" />
                          <span>Find videos</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-16 text-center"
        >
          <div className="card-premium max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-4">
              Can't Find What You're Looking For?
            </h2>
            <p className="text-white/70 mb-6">
              Use our AI-powered search to ask specific questions and get personalized recommendations
            </p>
            <Link to="/search" className="btn-primary">
              <Search className="h-5 w-5 mr-2" />
              Start Searching
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default TopicsPage
