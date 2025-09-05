import { motion } from 'framer-motion'
import { Play, Clock, Eye, ThumbsUp, Calendar, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Video } from '../lib/api.ts'
import { formatDuration, formatNumber, formatDate, getYouTubeVideoId, getYouTubeThumbnail } from '../lib/utils.ts'

interface VideoCardProps {
  video: Video
  showRelevanceScore?: boolean
  searchTerms?: string[]
  className?: string
}

const VideoCard: React.FC<VideoCardProps> = ({
  video,
  showRelevanceScore = false,
  searchTerms = [],
  className = ''
}) => {
  const videoId = getYouTubeVideoId(video.url) || video.youtube_id
  const thumbnailUrl = video.thumbnail_url || (videoId ? getYouTubeThumbnail(videoId) : '')

  const highlightText = (text: string) => {
    if (!searchTerms.length) return text
    
    let highlightedText = text
    searchTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi')
      highlightedText = highlightedText.replace(
        regex, 
        '<mark class="bg-yellow-200/20 text-yellow-300 px-1 rounded">$1</mark>'
      )
    })
    
    return highlightedText
  }

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className={`card-premium group cursor-pointer ${className}`}
    >
      <Link to={`/video/${video.id}`} className="block">
        {/* Thumbnail */}
        <div className="relative aspect-video mb-4 overflow-hidden rounded-xl">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-600/20 to-accent-600/20 flex items-center justify-center">
              <Play className="h-12 w-12 text-white/60" />
            </div>
          )}
          
          {/* Play Overlay */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
              <Play className="h-6 w-6 text-white fill-white" />
            </div>
          </div>

          {/* Duration Badge */}
          {video.duration_seconds && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded-lg flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{formatDuration(video.duration_seconds)}</span>
            </div>
          )}

          {/* Relevance Score Badge */}
          {showRelevanceScore && video.relevance_score && (
            <div className="absolute top-2 left-2 bg-primary-600/90 text-white text-xs px-2 py-1 rounded-lg">
              {Math.round(video.relevance_score * 100)}% match
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-3">
          {/* Title */}
          <h3 
            className="font-semibold text-white line-clamp-2 leading-tight group-hover:text-primary-300 transition-colors duration-200"
            dangerouslySetInnerHTML={{ __html: highlightText(video.title) }}
          />

          {/* Description */}
          {(video.search_snippet || video.description) && (
            <p 
              className="text-white/70 text-sm line-clamp-3 leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: highlightText(video.search_snippet || video.description?.substring(0, 150) + '...' || '') 
              }}
            />
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-white/60">
            <div className="flex items-center space-x-4">
              {video.view_count && (
                <div className="flex items-center space-x-1">
                  <Eye className="h-3 w-3" />
                  <span>{formatNumber(video.view_count)}</span>
                </div>
              )}
              
              {video.like_count && (
                <div className="flex items-center space-x-1">
                  <ThumbsUp className="h-3 w-3" />
                  <span>{formatNumber(video.like_count)}</span>
                </div>
              )}
            </div>

            {video.published_at && (
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(video.published_at)}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-white/60">Watch on</span>
              <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-red-400 hover:text-red-300 transition-colors duration-200 flex items-center space-x-1"
              >
                <span className="text-xs font-medium">YouTube</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                // Add to favorites or bookmark functionality
              }}
              className="text-white/60 hover:text-white transition-colors duration-200"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default VideoCard
