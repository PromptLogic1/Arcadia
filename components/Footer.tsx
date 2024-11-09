'use client'

import Link from "next/link"
import { GamepadIcon } from 'lucide-react'
import NeonText from '@/components/ui/NeonText'

const Footer = () => {
  const currentYear = new Date().getFullYear()
  const links = [
    { href: '/privacy', label: 'Datenschutz' },
    { href: '/terms', label: 'Nutzungsbedingungen' },
    { href: '/contact', label: 'Kontakt' }
  ] as const

  return (
    <footer className="w-full border-t border-cyan-500 bg-gray-900 py-12">
      <div className="container mx-auto text-center">
        <Link href="/" className="flex items-center justify-center text-cyan-400 mb-4">
          <GamepadIcon className="h-6 w-6 mr-2" />
          <NeonText>Arcadia</NeonText>
        </Link>
        <p className="text-gray-400">&copy; {currentYear} Arcadia. Alle Rechte vorbehalten.</p>
        <div className="flex justify-center space-x-4 mt-4">
          {links.map(({ href, label }) => (
            <Link 
              key={href}
              href={href} 
              className="text-gray-300 hover:text-cyan-400 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}

export default Footer