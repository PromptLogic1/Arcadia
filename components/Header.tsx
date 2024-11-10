'use client'

import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  GamepadIcon,
  Search,
  Bell,
  Menu,
  X,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from "@/lib/utils"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { User } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'

// NeonText Component for Gradient Text
const NeonText = ({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) => (
  <span
    className={`text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 font-bold ${className}`}
  >
    {children}
  </span>
)

// Navigation Item Interface
interface NavItem {
  href: string
  label: string
}

// Header Component
const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false)
  const [scrolled, setScrolled] = useState<boolean>(false)
  const pathname = usePathname() ?? ''
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      
      if (_event === 'SIGNED_OUT') {
        window.location.href = '/'
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  // Handle Scroll to Change Header Style
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Verbesserte isActive Funktion
  const isActive = useCallback(
    (path: string) => {
      if (path === '/' && pathname === '/') return true
      if (path !== '/' && pathname.startsWith(path)) return true
      return false
    },
    [pathname]
  )

  // Verbesserte Navigation Items
  const navItems = useMemo<NavItem[]>(() => [
    { href: '/', label: 'Home' },
    { href: '/challenges', label: 'Challenges' },
    { href: '/community', label: 'Community' },
    { href: '/about', label: 'About' },
  ], [])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/75 shadow-lg'
          : 'bg-transparent'
      }`}
      role="banner"
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center group" aria-label="Arcadia Home">
          <GamepadIcon className="h-8 w-8 mr-2 text-cyan-400 group-hover:text-fuchsia-400 transition-colors duration-300" />
          <NeonText className="text-2xl group-hover:text-fuchsia-400 transition-colors duration-300">
            Arcadia
          </NeonText>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-6" aria-label="Primary Navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-4 py-2 text-base font-medium rounded-md transition-all duration-200",
                "hover:bg-cyan-500/10 hover:text-cyan-400",
                isActive(item.href)
                  ? "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 font-semibold"
                  : "text-gray-200 hover:text-cyan-400"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-4">
          {/* Search */}
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                key="search-input"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '200px', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <Input
                  type="search"
                  placeholder="Search..."
                  className="h-10 bg-gray-800/50 border-cyan-500/50 text-white placeholder-gray-400 focus:border-fuchsia-500 transition-colors duration-200"
                  aria-label="Search"
                />
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSearchOpen(prev => !prev)}
            className={cn(
              "text-gray-200 hover:text-cyan-400 hover:bg-cyan-500/10",
              "transition-all duration-200 rounded-full",
              "focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            )}
            aria-label="Toggle search"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-gray-300 hover:text-cyan-400 transition-colors duration-200"
                aria-label="Notifications"
              >
                <Bell className="h-6 w-6" aria-hidden="true" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-fuchsia-500 ring-2 ring-gray-900" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-gray-800 border-cyan-500/50 text-white p-4">
              <h3 className="font-semibold text-lg mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
                Notifications
              </h3>
              <p className="text-gray-400">No new notifications</p>
            </PopoverContent>
          </Popover>

          {/* Download Button */}
          <Link href="/download">
            <Button
              variant="outline"
              className={cn(
                "border-2 border-cyan-500 text-cyan-400",
                "hover:bg-cyan-500 hover:text-white",
                "transition-all duration-200 rounded-full",
                "shadow-lg shadow-cyan-500/20"
              )}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </Link>

          {/* User Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {/* ... other buttons like search and notifications ... */}

            {user ? (
              // Show User Dropdown when logged in
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full focus:ring-2 focus:ring-cyan-400"
                    aria-label="User menu"
                  >
                    <Avatar className="h-10 w-10 transition-transform duration-200 hover:scale-110">
                      <AvatarImage src={user.user_metadata.avatar_url || "/images/placeholder-avatar.jpg"} alt="User avatar" />
                      <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 bg-gray-800 border-cyan-500/50 text-white"
                  align="end"
                  forceMount
                >
                  <DropdownMenuItem asChild>
                    <Link href="/user/user-page" className="flex items-center w-full">
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/user/settings" className="flex items-center w-full">
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="text-red-400 cursor-pointer hover:bg-red-500/10"
                  >
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // Show Sign In/Up buttons when logged out
              <div className="flex items-center gap-2">
                <Link href="/auth/login">
                  <Button
                    variant="ghost"
                    className="text-gray-200 hover:text-cyan-400 hover:bg-cyan-500/10"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button
                    className={cn(
                      "bg-gradient-to-r from-cyan-500 to-fuchsia-500",
                      "text-white font-medium px-6 py-2 rounded-full",
                      "hover:opacity-90 transition-all duration-200",
                      "shadow-lg shadow-cyan-500/25"
                    )}
                  >
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            className="text-gray-300 hover:text-cyan-400 transition-colors duration-200"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.nav
            key="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-gray-800 overflow-hidden"
            id="mobile-menu"
            aria-label="Mobile Navigation"
          >
            <div className="p-4 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block py-2 px-3 rounded-md text-lg font-medium transition-colors duration-200 ${
                    isActive(item.href)
                      ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500'
                      : 'text-gray-300 hover:text-cyan-400'
                  }`}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/download"
                className="block py-2 px-3 rounded-md text-lg font-medium text-cyan-400 hover:text-fuchsia-400 transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Download
              </Link>
              {user ? (
                <>
                  <Link
                    href="/user/user-page"
                    className="block py-2 px-3 rounded-md text-lg font-medium text-gray-300 hover:text-cyan-400 transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/user/settings"
                    className="block py-2 px-3 rounded-md text-lg font-medium text-gray-300 hover:text-cyan-400 transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left py-2 px-3 rounded-md text-lg font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors duration-200"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="block py-2 px-3 rounded-md text-lg font-medium text-gray-300 hover:text-cyan-400 transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="block py-2 px-3 rounded-md text-lg font-medium text-cyan-400 hover:text-fuchsia-400 transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}

// Exportiere als memoized Komponente
export default memo(Header)
