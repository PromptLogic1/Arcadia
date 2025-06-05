'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { GiGamepadCross } from 'react-icons/gi';
import { BiSearchAlt } from 'react-icons/bi';
import { IoNotificationsSharp } from 'react-icons/io5';
import { FaDownload } from 'react-icons/fa';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuthStore, useAuthActions } from '@/lib/stores';
import { NeonText } from '../ui/NeonText';

// NeonText Component for Gradient Text
// const NeonText = ({
//   children,
//   className = '',
// }: {
//   children: React.ReactNode
//   className?: string
// }) => (
//   <span
//     className={`text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 font-bold ${className}`}
//   >
//     {children}
//   </span>
// )

// Navigation Item Interface
interface NavItem {
  href: string;
  label: string;
}

// Header Component
const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);
  const pathname = usePathname() ?? '';

  // Use Zustand auth state - selecting individual values
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const userData = useAuthStore(state => state.userData);
  // If other properties like authUser, loading, error are needed, select them individually too:
  // const authUser = useAuthStore((state) => state.authUser);
  // const loading = useAuthStore((state) => state.loading);
  // const error = useAuthStore((state) => state.error);

  const { clearUser } = useAuthActions();

  // Handle scroll effect remains the same
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Verbesserte isActive Funktion
  const isActive = useCallback(
    (path: string) => {
      if (path === '/' && pathname === '/') return true;
      if (path !== '/' && pathname.startsWith(path)) return true;
      return false;
    },
    [pathname]
  );

  // Verbesserte Navigation Items
  const navItems = useMemo<NavItem[]>(
    () => [
      { href: '/', label: 'Home' },
      { href: '/about', label: 'About' },
      { href: '/play-area', label: 'Play Area' },
      { href: '/challenge-hub', label: 'Challenge Hub' },
      { href: '/community', label: 'Community' },
    ],
    []
  );

  const handleSignOut = async () => {
    clearUser();
  };

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-[9999] w-full transition-all duration-300 ${
        scrolled
          ? 'cyber-card border-b-2 border-cyan-400/30 shadow-2xl shadow-cyan-500/20 backdrop-blur-xl'
          : 'border-b border-cyan-500/10 bg-slate-950/90 backdrop-blur-md'
      }`}
      role="banner"
      style={{ position: 'fixed', top: 0, zIndex: 9999 }}
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center"
          aria-label="Arcadia Home"
        >
          <GiGamepadCross className="mr-2 h-8 w-8 text-cyan-400 transition-colors duration-300 group-hover:text-fuchsia-400" />
          <NeonText
            variant="gradient"
            className="text-2xl transition-colors duration-300 group-hover:text-fuchsia-400"
          >
            Arcadia
          </NeonText>
        </Link>

        {/* Desktop Navigation */}
        <nav
          className="hidden space-x-6 md:flex"
          aria-label="Primary Navigation"
        >
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-md px-4 py-2 text-base font-medium transition-all duration-300',
                'hover:bg-cyan-500/20 hover:text-cyan-300 hover:shadow-lg hover:shadow-cyan-500/30',
                'group relative border border-transparent hover:border-cyan-500/30',
                isActive(item.href)
                  ? 'neon-glow-cyan border-cyan-400/50 bg-cyan-500/15 font-semibold text-cyan-300'
                  : 'text-cyan-200/90 hover:text-cyan-300'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center space-x-4 md:flex">
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
                  className="h-10 border-cyan-500/50 bg-gray-800/50 text-white placeholder-gray-400 transition-colors duration-200 focus:border-fuchsia-500"
                  aria-label="Search"
                />
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            variant="cyber-outline"
            size="sm"
            onClick={() => setIsSearchOpen(prev => !prev)}
            className="rounded-full border-cyan-500/30 hover:border-cyan-400/60"
            aria-label="Toggle search"
          >
            <BiSearchAlt className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="cyber-outline"
                size="icon"
                className="relative border-cyan-500/30 hover:border-cyan-400/60"
                aria-label="Notifications"
              >
                <IoNotificationsSharp className="h-6 w-6" aria-hidden="true" />
                <span className="animate-cyberpunk-glow absolute top-0 right-0 block h-2 w-2 rounded-full bg-fuchsia-500 ring-2 ring-slate-900" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="cyber-card w-80 border-cyan-400/50 p-4 text-cyan-100 backdrop-blur-xl">
              <h3 className="mb-2 text-lg font-semibold">
                <NeonText variant="gradient">Notifications</NeonText>
              </h3>
              <p className="text-cyan-300/80">No new notifications</p>
            </PopoverContent>
          </Popover>

          {/* Download Button */}
          <Link href="/download">
            <Button
              variant="cyber"
              className="rounded-full border-cyan-400/40 shadow-lg shadow-cyan-500/30"
            >
              <FaDownload className="mr-2 h-4 w-4" />
              Download
            </Button>
          </Link>

          {/* User Actions */}
          <div className="hidden items-center space-x-4 md:flex">
            {isAuthenticated && userData ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full focus:ring-2 focus:ring-cyan-400"
                    aria-label="User menu"
                  >
                    <Avatar className="h-10 w-10 transition-transform duration-200 hover:scale-110">
                      <AvatarImage
                        src={
                          userData.avatar_url ||
                          '/images/placeholder-avatar.jpg'
                        }
                        alt="User avatar"
                      />
                      <AvatarFallback>
                        {userData.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="cyber-card w-56 border-cyan-400/50 text-cyan-100 backdrop-blur-xl"
                  align="end"
                  forceMount
                >
                  <DropdownMenuItem asChild>
                    <Link href={`/user`} className="flex w-full items-center">
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex w-full items-center">
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-red-400 hover:bg-red-500/20 hover:text-red-300"
                  >
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login">
                  <Button
                    variant="cyber-outline"
                    className="border-cyan-500/30 text-cyan-200 hover:border-cyan-400/60 hover:bg-cyan-500/10 hover:text-cyan-300"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button
                    variant="cyber"
                    className="rounded-full shadow-lg shadow-cyan-500/30"
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
            onClick={() => setIsMenuOpen(prev => !prev)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            className="border border-cyan-500/30 text-cyan-200 transition-colors duration-200 hover:border-cyan-400/60 hover:text-cyan-300"
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
            className="cyber-card overflow-hidden border-t border-cyan-500/30 backdrop-blur-xl md:hidden"
            id="mobile-menu"
            aria-label="Mobile Navigation"
          >
            <div className="space-y-2 p-4">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-md border px-3 py-2 text-lg font-medium transition-colors duration-200 ${
                    isActive(item.href)
                      ? 'neon-glow-cyan border-cyan-400/50 bg-cyan-500/15 text-cyan-300'
                      : 'border-transparent text-cyan-200/90 hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300'
                  }`}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/download"
                className="block rounded-md px-3 py-2 text-lg font-medium text-cyan-400 transition-colors duration-200 hover:text-fuchsia-400"
                onClick={() => setIsMenuOpen(false)}
              >
                Download
              </Link>
              {isAuthenticated && userData ? (
                <>
                  <Link
                    href={`/user`}
                    className="block rounded-md px-3 py-2 text-lg font-medium text-gray-300 transition-colors duration-200 hover:text-cyan-400"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="block rounded-md px-3 py-2 text-lg font-medium text-gray-300 transition-colors duration-200 hover:text-cyan-400"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full rounded-md px-3 py-2 text-left text-lg font-medium text-red-400 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-300"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="block rounded-md px-3 py-2 text-lg font-medium text-gray-300 transition-colors duration-200 hover:text-cyan-400"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="block rounded-md px-3 py-2 text-lg font-medium text-cyan-400 transition-colors duration-200 hover:text-fuchsia-400"
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
  );
};

// Exportiere als memoized Komponente
export default memo(Header);
