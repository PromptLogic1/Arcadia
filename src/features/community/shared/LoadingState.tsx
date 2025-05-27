'use client'

import { Skeleton } from "@/components/ui/skeleton"
import { motion } from "framer-motion"

interface LoadingStateProps {
  count?: number
  className?: string
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  count = 3,
  className = "h-40"
}) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: i * 0.1 }}
      >
        <Skeleton className={`w-full ${className} bg-gray-800/50`} />
      </motion.div>
    ))}
  </div>
) 