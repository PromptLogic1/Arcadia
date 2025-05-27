import { cn } from '@/lib/utils'

interface SectionDividerProps {
  className?: string
}

const SectionDivider: React.FC<SectionDividerProps> = ({ className }) => {
  return (
    <div className={cn("w-full h-24 relative overflow-hidden", className)}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent" />
    </div>
  )
}

export default SectionDivider 