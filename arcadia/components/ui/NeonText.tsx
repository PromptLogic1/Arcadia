import React from 'react'

interface NeonTextProps {
  children: React.ReactNode
  className?: string
}

const NeonText: React.FC<NeonTextProps> = ({ children, className = '' }) => (
  <span
    className={`text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400 ${className}`}
  >
    {children}
  </span>
)

export default NeonText