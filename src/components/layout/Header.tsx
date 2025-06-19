'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Search,
  Bell,
  Download,
  Gamepad2,
} from '@/components/ui/Icons';
import { Button } from '../ui/Button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover';
import { Input } from '../ui/Input';
import { OptimizedAvatar } from '../ui/OptimizedAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu';
// Removed Framer Motion - using CSS animations instead
import { cn } from '@/lib/utils';
import { throttle } from '@/lib/throttle';
import { useAuthStore, useAuthActions } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { NeonText } from '../ui/NeonText';
import { ThemeToggle } from '../ui/ThemeToggle';

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

  // Use Zustand auth state with useShallow for optimal performance
  const { isAuthenticated, userData, loading } = useAuthStore(
    useShallow(state => ({
      isAuthenticated: state.isAuthenticated,
      userData: state.userData,
      loading: state.loading,
    }))
  );

  const { signOut } = useAuthActions();

  // Memoize mobile menu style to prevent re-renders
  const mobileMenuStyle = useMemo(
    () => ({
      maxHeight: isMenuOpen ? '600px' : '0',
      opacity: isMenuOpen ? '1' : '0',
      overflow: 'hidden' as const,
    }),
    [isMenuOpen]
  );

  // Handle scroll effect with throttling for better performance
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    // Throttle the scroll handler to run at most once every 50ms
    const throttledHandleScroll = throttle(handleScroll, 50);

    // Check initial scroll position after mount
    handleScroll();

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledHandleScroll);
  }, []);

  // Close mobile menu when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };

    const throttledHandleResize = throttle(handleResize, 100);

    window.addEventListener('resize', throttledHandleResize);
    return () => window.removeEventListener('resize', throttledHandleResize);
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
    await signOut();
  };

  // UI handlers
  const toggleSearchOpen = useCallback(() => {
    setIsSearchOpen(prev => !prev);
  }, []);

  const toggleMenuOpen = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 right-0 left-0 z-40 min-h-[80px] w-full transition-all duration-300',
        scrolled
          ? 'cyber-card border-b-2 border-cyan-400/30 shadow-2xl shadow-cyan-500/20 backdrop-blur-xl'
          : 'border-b border-cyan-500/10 bg-slate-950/90 backdrop-blur-md'
      )}
      role="banner"
      suppressHydrationWarning
    >
      {/* Skip Navigation Links */}
      <div className="sr-only focus-within:not-sr-only">
        <a
          href="#main-content"
          className="absolute top-0 left-0 z-50 -translate-y-full transform bg-cyan-600 px-4 py-2 font-medium text-white transition-transform duration-200 focus:translate-y-0"
        >
          Skip to main content
        </a>
        <a
          href="#navigation"
          className="absolute top-0 left-24 z-50 -translate-y-full transform bg-cyan-600 px-4 py-2 font-medium text-white transition-transform duration-200 focus:translate-y-0"
        >
          Skip to navigation
        </a>
      </div>

      <div className="container mx-auto flex min-h-[80px] items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center"
          aria-label="Arcadia Home"
        >
          <Gamepad2 className="mr-2 h-8 w-8 text-cyan-400 transition-colors duration-300 group-hover:text-fuchsia-400" />
          <NeonText
            variant="solid"
            className="text-2xl transition-colors duration-300 group-hover:text-fuchsia-400"
          >
            Arcadia
          </NeonText>
        </Link>

        {/* Desktop Navigation */}
        <nav
          id="main-navigation"
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
          <div
            className={cn(
              'search-input-wrapper overflow-hidden transition-all duration-300',
              isSearchOpen ? 'w-[200px] opacity-100' : 'w-0 opacity-0'
            )}
          >
            <Input
              type="search"
              placeholder="Search..."
              className="h-10 border-cyan-500/50 bg-gray-800/50 text-white placeholder-gray-400 transition-colors duration-200 focus:border-fuchsia-500"
              aria-label="Search"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSearchOpen}
            className="h-11 min-h-[44px] w-11 min-w-[44px] rounded-full border border-cyan-500/30 text-cyan-300 transition-all duration-200 hover:border-cyan-400/60 hover:bg-cyan-500/10"
            aria-label="Toggle search"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-11 min-h-[44px] w-11 min-w-[44px] rounded-full border border-cyan-500/30 text-cyan-300 transition-all duration-200 hover:border-cyan-400/60 hover:bg-cyan-500/10"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" aria-hidden="true" />
                <span className="absolute -top-1 -right-1 block h-3 w-3 rounded-full bg-fuchsia-500 ring-2 ring-slate-900" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="cyber-card w-80 border-cyan-400/50 p-4 text-cyan-100 backdrop-blur-xl">
              <h3 className="mb-2 text-lg font-semibold">
                <NeonText variant="solid">Notifications</NeonText>
              </h3>
              <p className="text-cyan-300/80">No new notifications</p>
            </PopoverContent>
          </Popover>

          {/* Download Button */}
          <Link href="/download">
            <Button variant="primary" className="rounded-full">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </Link>

          {/* User Actions */}
          <div className="hidden items-center space-x-4 md:flex">
            {!loading && isAuthenticated && userData ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-11 min-h-[44px] w-11 min-w-[44px] rounded-full border border-cyan-500/30 text-cyan-300 transition-all duration-200 hover:border-cyan-400/60 hover:bg-cyan-500/10 focus:ring-2 focus:ring-cyan-400"
                    aria-label="User menu"
                  >
                    <OptimizedAvatar
                      className="h-8 w-8 transition-transform duration-200 hover:scale-105"
                      src={
                        userData.avatar_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          userData.username || 'User'
                        )}&background=0D1117&color=06B6D4&bold=true&size=100`
                      }
                      alt={`${userData.username || 'User'}'s avatar`}
                      fallback={
                        userData.username?.charAt(0).toUpperCase() || 'U'
                      }
                    />
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
            ) : !loading ? (
              <div className="flex items-center gap-2">
                <Link href="/auth/login">
                  <Button
                    variant="ghost"
                    className="border border-cyan-500/30 text-cyan-200 hover:border-cyan-400/60 hover:bg-cyan-500/10 hover:text-cyan-300"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button variant="primary" className="rounded-full">
                    Sign Up
                  </Button>
                </Link>
              </div>
            ) : (
              // Loading state - show nothing or a spinner
              <div className="flex items-center gap-2">
                <div className="h-10 w-16 animate-pulse rounded bg-slate-800"></div>
                <div className="h-10 w-20 animate-pulse rounded bg-slate-800"></div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMenuOpen}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            className="min-h-[44px] min-w-[44px] border border-cyan-500/30 text-cyan-200 transition-colors duration-200 hover:border-cyan-400/60 hover:text-cyan-300"
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
      <nav
        className={cn(
          'mobile-menu cyber-card border-t border-cyan-500/30 backdrop-blur-xl transition-all duration-300 md:hidden',
          isMenuOpen ? 'mobile-menu-open' : 'mobile-menu-closed'
        )}
        id="mobile-menu"
        aria-label="Mobile Navigation"
        aria-hidden={!isMenuOpen}
        style={mobileMenuStyle}
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
              onClick={closeMenu}
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

          {/* Theme Toggle for Mobile */}
          <div className="flex items-center justify-center py-2">
            <ThemeToggle variant="toggle" />
          </div>
          {!loading && isAuthenticated && userData ? (
            <>
              <Link
                href={`/user`}
                className="block rounded-md px-3 py-2 text-lg font-medium text-gray-300 transition-colors duration-200 hover:text-cyan-400"
                onClick={closeMenu}
              >
                Profile
              </Link>
              <Link
                href="/settings"
                className="block rounded-md px-3 py-2 text-lg font-medium text-gray-300 transition-colors duration-200 hover:text-cyan-400"
                onClick={closeMenu}
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
          ) : !loading ? (
            <>
              <Link
                href="/auth/login"
                className="block rounded-md px-3 py-2 text-lg font-medium text-gray-300 transition-colors duration-200 hover:text-cyan-400"
                onClick={closeMenu}
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="block rounded-md px-3 py-2 text-lg font-medium text-cyan-400 transition-colors duration-200 hover:text-fuchsia-400"
                onClick={closeMenu}
              >
                Sign Up
              </Link>
            </>
          ) : (
            // Mobile loading state
            <>
              <div className="h-8 w-20 animate-pulse rounded bg-slate-800"></div>
              <div className="h-8 w-24 animate-pulse rounded bg-slate-800"></div>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

// Exportiere als memoized Komponente
export default memo(Header);
