'use client'

import { LucideIcon } from 'lucide-react'

interface ComingSoonProps {
  icon: LucideIcon
  title: string
}

export function ComingSoon({ icon: Icon, title }: ComingSoonProps) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-full bg-gray-700/50 flex items-center justify-center mx-auto mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-xl text-gray-400">
        {title} settings coming soon...
      </h3>
    </div>
  )
} 