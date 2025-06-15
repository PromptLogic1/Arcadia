'use client';

import React, { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Trophy, Zap, Puzzle } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import CyberpunkBackground from '@/components/ui/CyberpunkBackground';
import FloatingElements from '@/components/ui/FloatingElements';

// Dynamically import heavy components to reduce initial bundle size
const BingoBoardsHub = dynamic(
  () => import('@/features/bingo-boards/components/BingoBoardsHub'),
  {
    loading: () => <LoadingSpinner className="h-12 w-12" />,
    ssr: false,
  }
);

const SpeedRuns = dynamic(
  () =>
    import('@/features/Speedruns/SpeedRuns').then(mod => ({
      default: mod.SpeedRuns,
    })),
  {
    loading: () => <LoadingSpinner className="h-12 w-12" />,
    ssr: false,
  }
);

const AchievementHunt = dynamic(
  () =>
    import('@/features/achievement-hunt/AchievementHunt').then(mod => ({
      default: mod.AchievementHunt,
    })),
  {
    loading: () => <LoadingSpinner className="h-12 w-12" />,
    ssr: false,
  }
);

const PuzzleQuests = dynamic(
  () =>
    import('@/features/puzzle-quests/PuzzleQuests').then(mod => ({
      default: mod.PuzzleQuests,
    })),
  {
    loading: () => <LoadingSpinner className="h-12 w-12" />,
    ssr: false,
  }
);

export default function Challenges() {
  const [activeTab, setActiveTab] = useState('bingo');

  // Memoize tab switching handler
  const handleTabChange = React.useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  // Memoize the content rendering to avoid unnecessary re-renders
  const renderContent = React.useMemo(() => {
    switch (activeTab) {
      case 'bingo':
        return <BingoBoardsHub />;
      case 'speedrun':
        return <SpeedRuns />;
      case 'achievements':
        return <AchievementHunt />;
      case 'puzzles':
        return <PuzzleQuests />;
      default:
        return <BingoBoardsHub />;
    }
  }, [activeTab]);

  return (
    <div className="flex min-h-screen flex-col text-cyan-100">
      <CyberpunkBackground
        variant="grid"
        intensity="medium"
        className="fixed inset-0 bg-gradient-to-b from-slate-950/90 via-slate-900/95 to-slate-950/90"
      />
      <FloatingElements
        variant="particles"
        count={15}
        speed="fast"
        color="cyan"
        className="fixed inset-0"
      />
      <main className="relative z-10 container mx-auto max-w-7xl flex-grow px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation Tabs - Enhanced Cyberpunk Design */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => handleTabChange('bingo')}
            className={cn(
              'flex items-center justify-between rounded-lg px-6 py-4 sm:py-3',
              'group relative w-full overflow-hidden transition-all duration-300 ease-in-out',
              'border border-gray-700/50 bg-gray-900/80 backdrop-blur-sm',
              activeTab === 'bingo'
                ? 'cyber-card-selected neon-glow-cyan border-cyan-400/80 bg-cyan-900/30 shadow-lg shadow-cyan-500/20'
                : 'hover:border-cyan-400/60 hover:bg-gray-800/80'
            )}
          >
            {activeTab === 'bingo' && (
              <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
            )}
            <span className="font-semibold">Bingo Boards</span>
            <svg
              className={cn(
                'ml-2 h-5 w-5 transition-all duration-300',
                activeTab === 'bingo'
                  ? 'text-cyan-400 drop-shadow-lg'
                  : 'group-hover:text-cyan-400'
              )}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="3" x2="15" y2="21" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
          </button>

          <button
            onClick={() => handleTabChange('speedrun')}
            className={cn(
              'flex items-center justify-between rounded-lg px-6 py-4 sm:py-3',
              'group relative w-full overflow-hidden transition-all duration-300 ease-in-out',
              'border border-gray-700/50 bg-gray-900/80 backdrop-blur-sm',
              activeTab === 'speedrun'
                ? 'cyber-card-selected neon-glow-purple border-violet-400/80 bg-violet-900/30 shadow-lg shadow-violet-500/20'
                : 'hover:border-violet-400/60 hover:bg-gray-800/80'
            )}
          >
            {activeTab === 'speedrun' && (
              <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-violet-400 to-transparent" />
            )}
            <span className="font-semibold">Speed Runs</span>
            <Zap
              className={cn(
                'ml-2 h-5 w-5 transition-all duration-300',
                activeTab === 'speedrun'
                  ? 'text-violet-400 drop-shadow-lg'
                  : 'group-hover:text-violet-400'
              )}
            />
          </button>

          <button
            onClick={() => handleTabChange('achievements')}
            className={cn(
              'flex items-center justify-between rounded-lg px-6 py-4 sm:py-3',
              'group relative w-full overflow-hidden transition-all duration-300 ease-in-out',
              'border border-gray-700/50 bg-gray-900/80 backdrop-blur-sm',
              activeTab === 'achievements'
                ? 'cyber-card-selected neon-glow-fuchsia border-fuchsia-400/80 bg-fuchsia-900/30 shadow-lg shadow-fuchsia-500/20'
                : 'hover:border-fuchsia-400/60 hover:bg-gray-800/80'
            )}
          >
            {activeTab === 'achievements' && (
              <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-fuchsia-400 to-transparent" />
            )}
            <span className="font-semibold">Achievement Hunt</span>
            <Trophy
              className={cn(
                'ml-2 h-5 w-5 transition-all duration-300',
                activeTab === 'achievements'
                  ? 'text-fuchsia-400 drop-shadow-lg'
                  : 'group-hover:text-fuchsia-400'
              )}
            />
          </button>

          <button
            onClick={() => handleTabChange('puzzles')}
            className={cn(
              'flex items-center justify-between rounded-lg px-6 py-4 sm:py-3',
              'group relative w-full overflow-hidden transition-all duration-300 ease-in-out',
              'border border-gray-700/50 bg-gray-900/80 backdrop-blur-sm',
              activeTab === 'puzzles'
                ? 'cyber-card-selected neon-glow-cyan border-teal-400/80 bg-teal-900/30 shadow-lg shadow-teal-500/20'
                : 'hover:border-teal-400/60 hover:bg-gray-800/80'
            )}
          >
            {activeTab === 'puzzles' && (
              <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent" />
            )}
            <span className="font-semibold">Puzzle Quests</span>
            <Puzzle
              className={cn(
                'ml-2 h-5 w-5 transition-all duration-300',
                activeTab === 'puzzles'
                  ? 'text-teal-400 drop-shadow-lg'
                  : 'group-hover:text-teal-400'
              )}
            />
          </button>
        </div>

        {/* Content */}
        <Suspense fallback={<LoadingSpinner className="h-12 w-12" />}>
          {renderContent}
        </Suspense>
      </main>
    </div>
  );
}
