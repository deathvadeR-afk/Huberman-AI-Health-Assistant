import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Play, Clock, Eye, ThumbsUp, Calendar, ExternalLink, Share2 } from 'lucide-react'

import { getVideo } from '../lib/api.ts'
import { formatDuration, formatNumber, formatDate } from '../lib/utils.ts'
import LoadingSpinner from '../components/LoadingSpinner.tsx'
import VideoCard from '../components/VideoCard.tsx'

const VideoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  const { data: video, isLoading, error } = useQuery({
    queryKey: ['video', id],
    queryFn: () => getVideo(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading video details..." />
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Video Not Found</h1>
          <p className="text-white/70 mb-6">The video you're looking for doesn't exist.</p>
          <Link to="/" className="btn-primary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <Link
            to="/search"
            className="inline-flex items-center text-white/70 hover:text-white transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="card-premium"
            >
              {/* Video Thumbnail */}
              <div className="relative aspect-video mb-6 overflow-hidden rounded-xl">
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl flex items-center space-x-2 transition-colors duration-200"
                  >
                    <Play className="h-5 w-5" />
                    <span>Watch on YouTube</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              {/* Video Info */}
              <div className="space-y-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                  {video.title}
                </h1>

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-4 text-white/60">
                  {video.duration_seconds && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatDuration(video.duration_seconds)}</span>
                    </div>
                  )}
                  
                  {video.view_count && (
                    <div className="flex items-center space-x-1">
                      <Eye className="h-4 w-4" />
                      <span>{formatNumber(video.view_count)} views</span>
                    </div>
                  )}
                  
                  {video.like_count && (
                    <div className="flex items-center space-x-1">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{formatNumber(video.like_count)} likes</span>
                    </div>
                  )}
                  
                  {video.published_at && (
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(video.published_at)}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {video.description && (
                  <div className="prose prose-invert max-w-none">
                    <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
                      {video.description}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center space-x-4 pt-4 border-t border-white/10">
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Watch Video
                  </a>
                  
                  <button
                    onClick={() => {
                      navigator.share?.({
                        title: video.title,
                        url: window.location.href,
                      }) || navigator.clipboard.writeText(window.location.href)
                    }}
                    className="btn-secondary"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-6"
            >
              {/* Health Topics */}
              {video.healthTopics && video.healthTopics.length > 0 && (
                <div className="card-premium">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Health Topics Covered
                  </h3>
                  <div className="space-y-2">
                    {video.healthTopics.map((topic) => (
                      <Link
                        key={topic.id}
                        to={`/topics/${topic.id}`}
                        className="block bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-colors duration-200"
                      >
                        <div className="font-medium text-white">{topic.name}</div>
                        <div className="text-sm text-white/60">{topic.category}</div>
                        {topic.relevance_score && (
                          <div className="text-xs text-primary-400 mt-1">
                            {Math.round(topic.relevance_score * 100)}% relevance
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Video Stats */}
              <div className="card-premium">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Video Statistics
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-white/60">Duration</span>
                    <span className="text-white">
                      {video.duration_seconds ? formatDuration(video.duration_seconds) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Views</span>
                    <span className="text-white">
                      {video.view_count ? formatNumber(video.view_count) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Likes</span>
                    <span className="text-white">
                      {video.like_count ? formatNumber(video.like_count) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Published</span>
                    <span className="text-white">
                      {video.published_at ? formatDate(video.published_at) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoPage
