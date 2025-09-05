import { motion } from 'framer-motion'

const StatsCardSkeleton = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-slate-700"
    >
      <div className="text-center">
        <div className="h-8 bg-slate-600/50 rounded w-16 mx-auto mb-2 animate-pulse"></div>
        <div className="h-4 bg-slate-600/50 rounded w-12 mx-auto animate-pulse"></div>
      </div>
    </motion.div>
  )
}

export default StatsCardSkeleton
