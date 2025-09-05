import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Search, Brain, Sparkles, Target, TrendingUp, Clock, Users, Play, ArrowRight, Zap, Heart, Star } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { getVideoStats, getPopularVideos, healthQuery } from '../lib/api.ts'
import { formatNumber } from '../lib/utils.ts'
import SearchInterface from '../components/SearchInterface.tsx'
import VideoCard from '../components/VideoCard.tsx'
import StatsCard from '../components/StatsCard.tsx'
import VideoCardSkeleton from '../components/VideoCardSkeleton'
import StatsCardSkeleton from '../components/StatsCardSkeleton'

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const navigate = useNavigate()

  // Fetch video statistics
  const { data: stats } = useQuery({
    queryKey: ['videoStats'],
    queryFn: getVideoStats,
  })

  // Fetch popular videos
  const { data: popularVideos } = useQuery({
    queryKey: ['popularVideos'],
    queryFn: () => getPopularVideos({ limit: 6 }),
  })

  const handleSearch = async (query: string) => {
    if (!query.trim()) return
    setIsSearching(true)
    try {
      // Navigate to search page with query
      navigate(`/search?q=${encodeURIComponent(query)}`)
    } finally {
      setIsSearching(false)
    }
  }

  const handleQuickSearch = (topic: string) => {
    navigate(`/search?q=${encodeURIComponent(topic)}`)
  }

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Search',
      description: 'Ask natural health questions and get precise, science-based answers from 677+ hours of content.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Target,
      title: 'Personalized Insights',
      description: 'Get tailored recommendations based on your specific health goals and interests.',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Zap,
      title: 'Instant Results',
      description: 'Find relevant video segments and timestamps in seconds, not hours of searching.',
      color: 'from-orange-500 to-red-500'
    }
  ]

  const popularTopics = [
    { name: 'Sleep Optimization', icon: '🛌', query: 'How to improve sleep quality and duration', color: 'from-indigo-500 to-purple-600' },
    { name: 'Morning Routine', icon: '🌅', query: 'Best morning routine for productivity', color: 'from-yellow-500 to-orange-500' },
    { name: 'Supplements', icon: '💊', query: 'What supplements does Huberman recommend', color: 'from-green-500 to-emerald-600' },
    { name: 'Exercise Timing', icon: '🏃', query: 'Optimal exercise timing for health', color: 'from-red-500 to-pink-600' },
    { name: 'Stress Management', icon: '🧘', query: 'How to reduce stress and anxiety', color: 'from-blue-500 to-cyan-600' },
    { name: 'Focus & Attention', icon: '🎯', query: 'How to improve focus and concentration', color: 'from-purple-500 to-violet-600' },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white mb-6">
                Your AI-Powered
                <span className="block gradient-text">
                  Health Assistant
                </span>
              </h1>
              <p className="text-xl sm:text-2xl text-white/80 mb-8 max-w-3xl mx-auto leading-relaxed">
                Discover evidence-based health insights from Dr. Andrew Huberman's extensive research. 
                Ask questions, get personalized recommendations, and optimize your health with science.
              </p>
            </motion.div>

            {/* Search Interface */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="max-w-2xl mx-auto mb-12"
            >
              <SearchInterface
                onSearch={handleSearch}
                placeholder="Ask me anything about health, sleep, nutrition, exercise..."
                isLoading={isSearching}
              />
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-16"
            >
              {stats ? (
                // Real stats
                <>
                  <StatsCard
                    icon={Play}
                    value={stats.total.toString()}
                    label="Videos"
                    color="text-blue-400"
                  />
                  <StatsCard
                    icon={Clock}
                    value={`${stats.totalHours}h`}
                    label="Content"
                    color="text-green-400"
                  />
                  <StatsCard
                    icon={Users}
                    value={formatNumber(stats.totalViews)}
                    label="Views"
                    color="text-purple-400"
                  />
                  <StatsCard
                    icon={TrendingUp}
                    value={formatNumber(stats.averageViews)}
                    label="Avg Views"
                    color="text-orange-400"
                  />
                </>
              ) : (
                // Loading skeletons
                Array.from({ length: 4 }).map((_, index) => (
                  <StatsCardSkeleton key={index} />
                ))
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Why Choose Our AI Assistant?
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Powered by advanced AI and trained on Dr. Huberman's complete body of work
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.2 }}
                  className="card-premium group hover:scale-105 transition-transform duration-300"
                >
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.color} mb-4`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-white/70 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Popular Topics Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-6">Explore Popular Topics</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Jump into the most searched health and wellness topics from Dr. Huberman's research
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularTopics.map((topic, index) => (
              <motion.button
                key={topic.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickSearch(topic.query)}
                className={`group relative bg-gradient-to-r ${topic.color} p-6 rounded-xl text-left transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/25`}
              >
                <div className="flex items-center space-x-4">
                  <div className="text-3xl">{topic.icon}</div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">{topic.name}</h3>
                    <p className="text-white/80 text-sm group-hover:text-white transition-colors">
                      Click to explore this topic
                    </p>
                  </div>
                </div>
                <ArrowRight className="absolute top-6 right-6 w-5 h-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-200" />
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Videos Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex items-center justify-between mb-12"
            >
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Most Popular Content
                </h2>
                <p className="text-xl text-white/70">
                  Discover the most watched episodes from the Huberman Lab
                </p>
              </div>
              <Link
                to="/search?sort=popular"
                className="btn-secondary hidden sm:inline-flex"
              >
                View All
              </Link>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularVideos && popularVideos.videos.length > 0 ? (
                // Real videos
                popularVideos.videos.map((video, index) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                  >
                    <VideoCard video={video} />
                  </motion.div>
                ))
              ) : (
                // Loading skeletons
                Array.from({ length: 6 }).map((_, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                  >
                    <VideoCardSkeleton />
                  </motion.div>
                ))
              )}
            </div>

            <div className="text-center mt-8 sm:hidden">
              <Link to="/search?sort=popular" className="btn-secondary">
                View All Popular Videos
              </Link>
            </div>
          </div>
        </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="card-premium"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Optimize Your Health?
            </h2>
            <p className="text-xl text-white/70 mb-8">
              Start exploring science-based health insights tailored to your needs
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/search" className="btn-primary">
                <Search className="h-5 w-5 mr-2" />
                Start Searching
              </Link>
              <Link to="/topics" className="btn-secondary">
                <Brain className="h-5 w-5 mr-2" />
                Browse Topics
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
