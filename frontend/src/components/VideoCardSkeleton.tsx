import { motion } from 'framer-motion'

const VideoCardSkeleton = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-slate-700"
    >
      {/* Thumbnail Skeleton */}
      <div className="aspect-video bg-slate-700/50 rounded-lg mb-4 animate-pulse">
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-12 h-12 bg-slate-600/50 rounded-full animate-pulse"></div>
        </div>
      </div>
      
      {/* Title Skeleton */}
      <div className="space-y-2 mb-3">
        <div className="h-4 bg-slate-600/50 rounded animate-pulse"></div>
        <div className="h-4 bg-slate-600/50 rounded w-3/4 animate-pulse"></div>
      </div>
      
      {/* Stats Skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-3 bg-slate-600/50 rounded w-16 animate-pulse"></div>
        <div className="h-3 bg-slate-600/50 rounded w-20 animate-pulse"></div>
      </div>
    </motion.div>
  )
}

export default VideoCardSkeleton
