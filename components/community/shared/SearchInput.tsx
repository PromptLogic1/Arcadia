'use client'

import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export const SearchInput: React.FC<SearchInputProps> = ({ 
  value, 
  onChange, 
  placeholder = "Search discussions...",
  className = ""
}) => {
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '/' && e.ctrlKey) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  return (
    <div className={`relative group ${className}`}>
      <Search 
        className={`
          absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 
          ${isFocused ? 'text-cyan-400' : 'text-cyan-300'} 
          transition-colors duration-200
        `}
      />
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="
          bg-gray-800/90
          border-2
          border-gray-700
          hover:border-cyan-500/70
          focus:border-cyan-400 
          focus:ring-2
          focus:ring-cyan-400/30
          pl-10 
          pr-10
          h-12
          text-base
          font-medium
          text-white
          placeholder:text-cyan-300/50
          transition-all
          duration-200
          min-w-[300px]
          shadow-lg
          shadow-black/10
          rounded-lg
        "
        aria-label={placeholder}
      />
      <AnimatePresence>
        {value && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cyan-300 hover:text-cyan-400 transition-colors"
            onClick={() => onChange('')}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>
      {isFocused && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          exit={{ scaleX: 0 }}
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-fuchsia-500"
        />
      )}
      <div 
        className={`
          absolute inset-0 -z-10 rounded-lg opacity-0 
          group-hover:opacity-100 transition-opacity duration-300
          bg-gradient-to-r from-cyan-500/10 to-fuchsia-500/10 blur-sm
        `}
      />
    </div>
  )
} 