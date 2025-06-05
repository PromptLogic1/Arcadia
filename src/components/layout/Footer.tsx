import Link from 'next/link';
import { GamepadIcon } from 'lucide-react';
import { NeonText } from '../ui/NeonText';
import CyberpunkBackground from '../ui/CyberpunkBackground';
import FloatingElements from '../ui/FloatingElements';

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
      >
        <FloatingElements
          variant="particles"
          count={15}
          speed="slow"
          color="cyan"
          repositioning={true}
        />

        <div className="relative z-20">
          <div className="container mx-auto px-4 py-16">
            {/* Main Footer Content */}
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-4">
              {/* Brand Section */}
              <div className="lg:col-span-1">
                <Link
                  href="/"
                  className="group mb-6 flex items-center text-cyan-400 transition-all duration-300 hover:text-fuchsia-400"
                >
                  <GamepadIcon className="mr-3 h-8 w-8 transition-colors duration-300 group-hover:text-fuchsia-400" />
                  <NeonText
                    variant="gradient"
                    className="text-3xl font-bold transition-all duration-300 group-hover:scale-105"
                  >
                    Arcadia
                  </NeonText>
                </Link>

                <p className="mb-6 leading-relaxed text-cyan-200/80">
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
                      className="group cyber-card relative flex h-10 w-10 items-center justify-center rounded-full border-cyan-500/30 text-xs font-bold text-cyan-400 transition-all duration-300 hover:scale-110 hover:border-cyan-400/60 hover:bg-cyan-400/10 hover:text-cyan-300"
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
                        className="group relative text-cyan-200/70 transition-all duration-300 hover:translate-x-1 hover:text-cyan-200"
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
                        className="group relative text-cyan-200/70 transition-all duration-300 hover:translate-x-1 hover:text-cyan-200"
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
                        className="group relative text-cyan-200/70 transition-all duration-300 hover:translate-x-1 hover:text-cyan-200"
                      >
                        <span className="relative z-10">{label}</span>
                        <span className="absolute inset-0 rounded bg-gradient-to-r from-emerald-400/0 via-emerald-400/10 to-emerald-400/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>

                {/* Platform Stats */}
                <div className="space-y-4">
                  <h4 className="neon-glow-fuchsia mb-3 text-sm font-bold text-fuchsia-300">
                    Live Stats
                  </h4>
                  <div className="space-y-3">
                    <div className="cyber-card flex items-center space-x-3 rounded border-cyan-500/20 p-2">
                      <span className="text-lg text-cyan-400">👥</span>
                      <span className="text-sm">
                        <span className="neon-glow-cyan font-bold text-cyan-300">
                          10K+
                        </span>{' '}
                        Active Players
                      </span>
                    </div>
                    <div className="cyber-card flex items-center space-x-3 rounded border-purple-500/20 p-2">
                      <span className="text-lg text-purple-400">🏆</span>
                      <span className="text-sm">
                        <span className="neon-glow-purple font-bold text-purple-300">
                          500+
                        </span>{' '}
                        Challenges
                      </span>
                    </div>
                    <div className="cyber-card flex items-center space-x-3 rounded border-emerald-500/20 p-2">
                      <span className="text-lg text-emerald-400">⚡</span>
                      <span className="text-sm">
                        <span className="neon-glow-emerald font-bold text-emerald-300">
                          24/7
                        </span>{' '}
                        Live Games
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="mt-16 border-t border-cyan-500/20 pt-8">
              <div className="flex flex-col items-center justify-between space-y-4 text-center lg:flex-row lg:space-y-0 lg:text-left">
                <div className="text-cyan-300/70">
                  <p className="mb-1">
                    &copy; {currentYear} Arcadia. All rights reserved.
                  </p>
                  <p className="text-sm text-cyan-400/60">
                    Built with 💖 for the gaming community
                  </p>
                </div>

                <div className="flex items-center space-x-4 text-sm">
                  <span className="cyber-card rounded border-cyan-500/30 px-2 py-1 font-mono text-cyan-300">
                    v2.0.0
                  </span>
                  <span className="animate-cyberpunk-glow h-1 w-1 rounded-full bg-cyan-400/50" />
                  <span className="cyber-card rounded border-emerald-500/30 px-2 py-1 font-mono text-emerald-300">
                    <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400"></span>
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

export default Footer;
