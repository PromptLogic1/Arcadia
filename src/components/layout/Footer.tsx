import { memo } from 'react';
import Link from 'next/link';
import { GamepadIcon } from '@/components/ui/Icons';
import { NeonText } from '../ui/NeonText';
import CyberpunkBackground from '../ui/CyberpunkBackground';
import dynamic from 'next/dynamic';

const FloatingElements = dynamic(
  () => import('@/components/ui/FloatingElements'),
  { ssr: false }
);

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerSections = {
    platform: [
      { href: '/about', label: 'About Arcadia' },
      { href: '/challenge-hub', label: 'Challenge Hub' },
      { href: '/community', label: 'Community' },
      { href: '/play-area', label: 'Play Area' },
    ],
    support: [
      { href: '/help', label: 'Help Center' },
      { href: '/contact', label: 'Contact Us' },
      { href: '/feedback', label: 'Feedback' },
      { href: '/bug-report', label: 'Bug Reports' },
    ],
    legal: [
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
      { href: '/cookies', label: 'Cookie Policy' },
      { href: '/community-guidelines', label: 'Community Guidelines' },
    ],
  } as const;

  const socialLinks = [
    { href: 'https://github.com/arcadia', label: 'GitHub' },
    { href: 'https://twitter.com/arcadia', label: 'Twitter' },
    { href: 'https://discord.gg/arcadia', label: 'Discord' },
    { href: 'mailto:hello@arcadia.com', label: 'Email' },
  ] as const;

  return (
    <footer className="relative w-full">
      <CyberpunkBackground
        variant="circuit"
        intensity="medium"
        className="relative w-full overflow-hidden border-t border-cyan-500/30 bg-gradient-to-b from-slate-900/95 via-slate-950 to-black/95 backdrop-blur-sm"
        data-testid="footer-cyberpunk-background"
      >
        <FloatingElements
          variant="particles"
          count={5}
          speed="slow"
          color="cyan"
          className="opacity-30"
        />

        <div className="relative z-20">
          <div className="container mx-auto px-4 py-8 sm:py-12 lg:py-16">
            {/* Main Footer Content */}
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-4">
              {/* Brand Section */}
              <div className="sm:col-span-2 lg:col-span-1">
                <Link
                  href="/"
                  className="group mb-4 inline-flex items-center text-cyan-400 transition-all duration-300 hover:text-fuchsia-400"
                  data-testid="footer-brand-link"
                >
                  <GamepadIcon className="mr-2 h-6 w-6 flex-shrink-0 transition-colors duration-300 group-hover:text-fuchsia-400 sm:h-8 sm:w-8" />
                  <NeonText
                    variant="solid"
                    className="text-2xl font-bold transition-all duration-300 group-hover:scale-105 sm:text-3xl"
                  >
                    Arcadia
                  </NeonText>
                </Link>

                <p className="mb-6 text-sm leading-relaxed text-cyan-100/90 sm:text-base">
                  The ultimate cyberpunk gaming platform featuring real-time
                  multiplayer bingo, competitive challenges, and immersive
                  community experiences.
                </p>

                {/* Social Links */}
                <div className="flex space-x-4">
                  {socialLinks.map(({ href, label }) => (
                    <a
                      key={href}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group cyber-card relative flex h-10 w-10 items-center justify-center rounded-full border-cyan-500/30 text-xs font-bold text-cyan-400 transition-all duration-300 hover:scale-105 hover:border-cyan-400/60 hover:bg-cyan-400/10 hover:text-cyan-300"
                      aria-label={label}
                    >
                      {label.charAt(0)}
                      <span className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/0 via-cyan-400/20 to-cyan-400/0 opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-100" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Platform Links */}
              <div>
                <h3 className="neon-glow-cyan mb-4 text-lg font-bold text-cyan-300">
                  Platform
                </h3>
                <ul className="space-y-3">
                  {footerSections.platform.map(({ href, label }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="group relative text-cyan-100/80 transition-all duration-300 hover:translate-x-1 hover:text-cyan-100"
                        data-testid={`footer-platform-link-${href.replace('/', '')}`}
                      >
                        <span className="relative z-10">{label}</span>
                        <span className="absolute inset-0 rounded bg-gradient-to-r from-cyan-400/0 via-cyan-400/10 to-cyan-400/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Support Links */}
              <div>
                <h3 className="neon-glow-purple mb-4 text-lg font-bold text-purple-300">
                  Support
                </h3>
                <ul className="space-y-3">
                  {footerSections.support.map(({ href, label }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="group relative text-cyan-100/80 transition-all duration-300 hover:translate-x-1 hover:text-cyan-100"
                        data-testid={`footer-support-link-${href.replace('/', '')}`}
                      >
                        <span className="relative z-10">{label}</span>
                        <span className="absolute inset-0 rounded bg-gradient-to-r from-purple-400/0 via-purple-400/10 to-purple-400/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal & Stats */}
              <div>
                <h3 className="neon-glow-emerald mb-4 text-lg font-bold text-emerald-300">
                  Legal
                </h3>
                <ul className="mb-8 space-y-3">
                  {footerSections.legal.map(({ href, label }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="group relative text-cyan-100/80 transition-all duration-300 hover:translate-x-1 hover:text-cyan-100"
                        data-testid={`footer-legal-link-${href.replace('/', '')}`}
                      >
                        <span className="relative z-10">{label}</span>
                        <span className="absolute inset-0 rounded bg-gradient-to-r from-emerald-400/0 via-emerald-400/10 to-emerald-400/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>

                {/* Platform Stats */}
                <div className="mt-6 space-y-4 sm:mt-8">
                  <h4 className="neon-glow-fuchsia mb-3 text-base font-bold text-fuchsia-300 sm:text-sm">
                    Live Stats
                  </h4>
                  <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-3 sm:grid-cols-1">
                    <div className="cyber-card flex items-center space-x-3 rounded border-cyan-500/20 p-3 sm:p-2">
                      <span className="text-xl text-cyan-400 sm:text-lg">
                        👥
                      </span>
                      <span className="text-sm">
                        <span className="neon-glow-cyan font-bold text-cyan-300">
                          10K+
                        </span>{' '}
                        <span className="hidden sm:inline">Active Players</span>
                        <span className="sm:hidden">Players</span>
                      </span>
                    </div>
                    <div className="cyber-card flex items-center space-x-3 rounded border-purple-500/20 p-3 sm:p-2">
                      <span className="text-xl text-purple-400 sm:text-lg">
                        🏆
                      </span>
                      <span className="text-sm">
                        <span className="neon-glow-purple font-bold text-purple-300">
                          500+
                        </span>{' '}
                        Challenges
                      </span>
                    </div>
                    <div className="cyber-card flex items-center space-x-3 rounded border-emerald-500/20 p-3 sm:p-2">
                      <span className="text-xl text-emerald-400 sm:text-lg">
                        ⚡
                      </span>
                      <span className="text-sm">
                        <span className="neon-glow-emerald font-bold text-emerald-300">
                          24/7
                        </span>{' '}
                        <span className="hidden sm:inline">Live Games</span>
                        <span className="sm:hidden">Live</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="mt-8 border-t border-cyan-500/20 pt-6 sm:mt-12 sm:pt-8 lg:mt-16">
              <div className="flex flex-col items-center justify-between space-y-4 text-center lg:flex-row lg:space-y-0 lg:text-left">
                <div className="text-cyan-300/70">
                  <p className="mb-1 text-sm sm:text-base">
                    &copy; {currentYear} Arcadia. All rights reserved.
                  </p>
                  <p className="text-xs text-cyan-400/60 sm:text-sm">
                    Built with 💖 for the gaming community
                  </p>
                </div>

                <div className="flex items-center space-x-3 text-xs sm:space-x-4 sm:text-sm">
                  <span className="cyber-card rounded border-cyan-500/30 px-2 py-1 font-mono text-cyan-300">
                    v2.0.0
                  </span>
                  <span className="animate-gentle-glow h-1 w-1 rounded-full bg-cyan-400/50" />
                  <span className="cyber-card rounded border-emerald-500/30 px-2 py-1 font-mono text-emerald-300">
                    <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400 sm:mr-2"></span>
                    Online
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative bottom glow */}
          <div className="absolute right-0 bottom-0 left-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
          <div className="absolute bottom-0 left-1/2 h-4 w-32 -translate-x-1/2 bg-gradient-to-t from-cyan-400/20 to-transparent blur-sm" />
        </div>
      </CyberpunkBackground>
    </footer>
  );
};

export default memo(Footer);
