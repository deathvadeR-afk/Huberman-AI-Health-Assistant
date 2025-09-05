import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  icon: LucideIcon
  value: string
  label: string
  color?: string
  className?: string
}

const StatsCard: React.FC<StatsCardProps> = ({
  icon: Icon,
  value,
  label,
  color = 'text-primary-400',
  className = ''
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
      className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center ${className}`}
    >
      <div className="flex flex-col items-center space-y-2">
        <Icon className={`h-6 w-6 ${color}`} />
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-white/60">{label}</div>
      </div>
    </motion.div>
  )
}

export default StatsCard
