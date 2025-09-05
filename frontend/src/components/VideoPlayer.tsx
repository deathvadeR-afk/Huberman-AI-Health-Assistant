import { useState } from 'react'

interface VideoPlayerProps {
  videoId: string
  title: string
  timestamps?: Array<{
    time: number
    label: string
    description: string
  }>
}

export default function VideoPlayer({ videoId, title, timestamps = [] }: VideoPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0)

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const jumpToTimestamp = (time: number) => {
    setCurrentTime(time)
    // In a real implementation, this would control the YouTube player
    const iframe = document.querySelector('iframe') as HTMLIFrameElement
    if (iframe) {
      // YouTube API would be used here to seek to specific time
      console.log(`Jumping to ${time} seconds in video ${videoId}`)
    }
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
      {/* Video Player */}
      <div className="relative aspect-video bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?start=${currentTime}&enablejsapi=1`}
          title={title}
          className="w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Video Info */}
      <div className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
        
        {/* Timestamp Navigation */}
        {timestamps.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-white mb-3">Key Timestamps</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {timestamps.map((timestamp, index) => (
                <button
                  key={index}
                  onClick={() => jumpToTimestamp(timestamp.time)}
                  className="w-full text-left p-3 bg-slate-700/30 hover:bg-slate-600/50 rounded-lg border border-slate-600 hover:border-blue-500/50 transition-all duration-200 group"
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-blue-400 font-mono text-sm bg-blue-500/10 px-2 py-1 rounded">
                      {formatTime(timestamp.time)}
                    </span>
                    <div className="flex-1">
                      <div className="text-white font-medium group-hover:text-blue-300 transition-colors">
                        {timestamp.label}
                      </div>
                      <div className="text-slate-400 text-sm mt-1">
                        {timestamp.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
