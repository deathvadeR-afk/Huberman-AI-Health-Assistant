import { useState } from 'react'
import VideoPlayer from './VideoPlayer'

interface VideoResultProps {
  video: {
    id: string
    youtube_id?: string
    title: string
    description: string
    duration: string
    views: string
    relevance_score?: number
    search_snippet?: string
    timestamps?: Array<{
      time: number
      label: string
      description: string
    }>
  }
  showPlayer?: boolean
}

export default function VideoResult({ video, showPlayer = false }: VideoResultProps) {
  const [isPlayerOpen, setIsPlayerOpen] = useState(showPlayer)
  const [showFullDescription, setShowFullDescription] = useState(false)

  // Extract YouTube ID from various formats
  const getYouTubeId = (video: any): string => {
    if (video.youtube_id) return video.youtube_id
    if (video.id && video.id.includes('youtube')) return video.id.split('_')[1] || video.id
    // Mock YouTube ID for demo
    return 'dQw4w9WgXcQ' // Rick Roll as fallback for demo
  }

  const youtubeId = getYouTubeId(video)

  const truncateText = (text: string, maxLength: number = 150): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const mockTimestamps = [
    { time: 120, label: "Introduction", description: "Overview of the topic and key concepts" },
    { time: 480, label: "Scientific Background", description: "Research findings and mechanisms" },
    { time: 1200, label: "Practical Applications", description: "How to implement these strategies" },
    { time: 1800, label: "Common Mistakes", description: "What to avoid and troubleshooting" },
    { time: 2400, label: "Summary & Takeaways", description: "Key points and action items" }
  ]

  return (
    <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all duration-300">
      {/* Video Player Section */}
      {isPlayerOpen && (
        <div className="p-6 border-b border-slate-700">
          <VideoPlayer
            videoId={youtubeId}
            title={video.title}
            timestamps={video.timestamps || mockTimestamps}
          />
        </div>
      )}

      {/* Video Info Section */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white mb-2 hover:text-blue-300 transition-colors">
              {video.title}
            </h3>
            
            {/* Relevance Score */}
            {video.relevance_score && (
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-sm text-slate-400">Relevance:</span>
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(video.relevance_score! * 5)
                          ? 'text-yellow-400'
                          : 'text-slate-600'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span className="text-sm text-slate-400 ml-2">
                    {(video.relevance_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}

            {/* Search Snippet */}
            {video.search_snippet && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
                <p className="text-blue-200 text-sm font-medium mb-1">Key Insight:</p>
                <p className="text-slate-300 text-sm">{video.search_snippet}</p>
              </div>
            )}

            {/* Description */}
            <div className="text-slate-300 mb-4">
              <p className="leading-relaxed">
                {showFullDescription ? video.description : truncateText(video.description)}
              </p>
              {video.description.length > 150 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-blue-400 hover:text-blue-300 text-sm mt-2 underline"
                >
                  {showFullDescription ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>

            {/* Video Metadata */}
            <div className="flex items-center space-x-4 text-sm text-slate-400 mb-4">
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                <span>{video.duration}</span>
              </div>
              <span>•</span>
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                <span>{video.views}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsPlayerOpen(!isPlayerOpen)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              isPlayerOpen
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isPlayerOpen ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
                <span>Hide Player</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                <span>Watch Video</span>
              </>
            )}
          </button>

          <a
            href={`https://youtube.com/watch?v=${youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
            </svg>
            <span>Open in YouTube</span>
          </a>
        </div>
      </div>
    </div>
  )
}
