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
        className="relative w-full border-t border-cyan-500/30 bg-gradient-to-b from-slate-900/95 via-slate-950 to-black/95 backdrop-blur-sm overflow-hidden"
      >
        <FloatingElements variant="particles" count={15} speed="slow" color="cyan" repositioning={true} />
        
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
                <NeonText variant="gradient" className="text-3xl font-bold transition-all duration-300 group-hover:scale-105">
                  Arcadia
                </NeonText>
              </Link>
              
              <p className="text-cyan-200/80 mb-6 leading-relaxed">
                The ultimate cyberpunk gaming platform featuring real-time multiplayer bingo, 
                competitive challenges, and immersive community experiences.
              </p>
              
              {/* Social Links */}
              <div className="flex space-x-4">
                {socialLinks.map(({ href, label }) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex h-10 w-10 items-center justify-center rounded-full cyber-card border-cyan-500/30 text-cyan-400 transition-all duration-300 hover:border-cyan-400/60 hover:bg-cyan-400/10 hover:text-cyan-300 hover:scale-110 text-xs font-bold"
                    aria-label={label}
                  >
                    {label.charAt(0)}
                    <span className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/0 via-cyan-400/20 to-cyan-400/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 blur-sm" />
                  </a>
                ))}
              </div>
            </div>

            {/* Platform Links */}
            <div>
              <h3 className="mb-4 text-lg font-bold text-cyan-300 neon-glow-cyan">
                Platform
              </h3>
              <ul className="space-y-3">
                {footerSections.platform.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="group relative text-cyan-200/70 transition-all duration-300 hover:text-cyan-200 hover:translate-x-1"
                    >
                      <span className="relative z-10">{label}</span>
                      <span className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/10 to-cyan-400/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support Links */}
            <div>
              <h3 className="mb-4 text-lg font-bold text-purple-300 neon-glow-purple">
                Support
              </h3>
              <ul className="space-y-3">
                {footerSections.support.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="group relative text-cyan-200/70 transition-all duration-300 hover:text-cyan-200 hover:translate-x-1"
                    >
                      <span className="relative z-10">{label}</span>
                      <span className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-400/10 to-purple-400/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal & Stats */}
            <div>
              <h3 className="mb-4 text-lg font-bold text-emerald-300 neon-glow-emerald">
                Legal
              </h3>
              <ul className="space-y-3 mb-8">
                {footerSections.legal.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="group relative text-cyan-200/70 transition-all duration-300 hover:text-cyan-200 hover:translate-x-1"
                    >
                      <span className="relative z-10">{label}</span>
                      <span className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/10 to-emerald-400/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded" />
                    </Link>
                  </li>
                ))}
              </ul>
              
              {/* Platform Stats */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-fuchsia-300 neon-glow-fuchsia mb-3">Live Stats</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-2 rounded cyber-card border-cyan-500/20">
                    <span className="text-cyan-400 text-lg">👥</span>
                    <span className="text-sm">
                      <span className="font-bold text-cyan-300 neon-glow-cyan">10K+</span> Active Players
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 p-2 rounded cyber-card border-purple-500/20">
                    <span className="text-purple-400 text-lg">🏆</span>
                    <span className="text-sm">
                      <span className="font-bold text-purple-300 neon-glow-purple">500+</span> Challenges
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 p-2 rounded cyber-card border-emerald-500/20">
                    <span className="text-emerald-400 text-lg">⚡</span>
                    <span className="text-sm">
                      <span className="font-bold text-emerald-300 neon-glow-emerald">24/7</span> Live Games
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
                <span className="px-2 py-1 rounded cyber-card border-cyan-500/30 text-cyan-300 font-mono">v2.0.0</span>
                <span className="h-1 w-1 rounded-full bg-cyan-400/50 animate-cyberpunk-glow" />
                <span className="px-2 py-1 rounded cyber-card border-emerald-500/30 text-emerald-300 font-mono">
                  <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></span>
                  Online
                </span>
              </div>
            </div>
          </div>
        </div>
        
          {/* Decorative bottom glow */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
          <div className="absolute bottom-0 left-1/2 h-4 w-32 -translate-x-1/2 bg-gradient-to-t from-cyan-400/20 to-transparent blur-sm" />
        </div>
      </CyberpunkBackground>
    </footer>
  );
};

export default Footer;