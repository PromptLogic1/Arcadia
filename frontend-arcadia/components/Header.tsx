'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from "next/link"
import { usePathname } from 'next/navigation'
import { GamepadIcon, Search, Bell, UserPlus, Menu, X, Download } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { motion, AnimatePresence } from "framer-motion"

const NeonText = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 font-bold ${className}`}>
    {children}
  </span>
)

interface NavItem {
  href: string
  label: string
}

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false)
  const [scrolled, setScrolled] = useState<boolean>(false)
  const pathname = usePathname() ?? ''

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems: NavItem[] = [
    { href: '/', label: 'Home' },
    { href: '/challenges', label: 'Challenges' },
    { href: '/community', label: 'Community' },
    { href: '/about', label: 'About' },
  ]

  const isActive = useCallback((path: string) => pathname === path, [pathname])

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/75 shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center group">
          <GamepadIcon className="h-8 w-8 mr-2 text-cyan-400 group-hover:text-fuchsia-400 transition-colors duration-300" />
          <NeonText className="text-2xl group-hover:text-fuchsia-400 transition-colors duration-300">
            Arcadia
          </NeonText>
        </Link>

        <nav className="hidden md:flex space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-md text-base font-medium transition-all duration-200 ${
                isActive(item.href)
                  ? "bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 text-white"
                  : "text-gray-300 hover:bg-gray-800/50 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                key="search-input"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "200px", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
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
            size="icon"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className="text-gray-300 hover:text-cyan-400 transition-colors duration-200"
            aria-label="Toggle search"
          >
            <Search className="h-6 w-6" aria-hidden="true" />
          </Button>
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
          <Link href="/download">
            <Button
              variant="outline"
              className="h-10 bg-transparent border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 transition-all duration-300 flex items-center"
              aria-label="Download"
            >
              <Download className="h-6 w-6 mr-2" aria-hidden="true" />
              Download
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full"
                aria-label="User menu"
              >
                <Avatar className="h-10 w-10 transition-transform duration-200 hover:scale-110">
                  <AvatarImage src="/placeholder-avatar.jpg" alt="User avatar" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 bg-gray-800 border-cyan-500/50 text-white"
              align="end"
              forceMount
            >
              <DropdownMenuItem className="cursor-pointer hover:bg-gray-700">
                <Link href="/profile" className="flex items-center w-full">
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-gray-700">
                <Link href="/settings" className="flex items-center w-full">
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-gray-700">
                <Link href="/logout" className="flex items-center w-full text-red-400">
                  Log out
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/signin">
            <Button
              className="h-10 bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600 text-white transition-all duration-300 flex items-center"
              aria-label="Sign In"
            >
              <UserPlus className="h-6 w-6 mr-2" aria-hidden="true" />
              Sign In
            </Button>
          </Link>
        </div>

        <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
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

      <AnimatePresence>
        {isMenuOpen && (
          <motion.nav
            key="mobile-menu"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-gray-800 p-4"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block py-2 text-base font-medium transition-colors duration-200 ${
                  isActive(item.href)
                    ? "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500"
                    : "text-gray-300 hover:text-cyan-400"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/download"
              className="block py-2 text-base font-medium text-cyan-400 hover:text-fuchsia-400 transition-colors duration-200"
              onClick={() => setIsMenuOpen(false)}
            >
              Download
            </Link>
            <Link
              href="/profile"
              className="block py-2 text-base font-medium text-gray-300 hover:text-cyan-400 transition-colors duration-200"
              onClick={() => setIsMenuOpen(false)}
            >
              Profile
            </Link>
            <Link
              href="/signin"
              className="block py-2 text-base font-medium text-gray-300 hover:text-cyan-400 transition-colors duration-200"
              onClick={() => setIsMenuOpen(false)}
            >
              Sign In
            </Link>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}

export default Header
