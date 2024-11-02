import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { CardWrapperProps } from '../types'

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

export const CardWrapper: React.FC<CardWrapperProps> = ({
  children,
  onClick,
  className = '',
  hoverAccentColor = 'cyan'
}) => {
  const hoverColors = {
    cyan: 'hover:border-cyan-500 hover:shadow-cyan-500/20',
    fuchsia: 'hover:border-fuchsia-500 hover:shadow-fuchsia-500/20',
    lime: 'hover:border-lime-500 hover:shadow-lime-500/20'
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
    >
      <Card
        className={`w-full mb-4 bg-gray-800 border-cyan-500 transition-all duration-300 hover:shadow-lg cursor-pointer group ${hoverColors[hoverAccentColor]} ${className}`}
        onClick={onClick}
      >
        {children}
      </Card>
    </motion.div>
  )
} 