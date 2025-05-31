import React from 'react';
import { MessageCircle, Calendar } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';

// =============================================================================
// TYPES
// =============================================================================

export interface CommunityHeaderProps {
  activeTab: 'discussions' | 'events';
  onTabChange: (tab: 'discussions' | 'events') => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Community header with title and navigation tabs
 *
 * Features:
 * - Animated gradient title
 * - Tab navigation between discussions and events
 * - Consistent styling with project theme
 */
export function CommunityHeader({
  activeTab,
  onTabChange,
}: CommunityHeaderProps) {
  return (
    <header className="relative">
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-fuchsia-500/5 to-transparent" />
      <div className="relative container mx-auto px-4 py-8">
        {/* Main Title */}
        <h1 className="mb-6 text-center text-4xl font-bold">
          <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-yellow-400 bg-clip-text text-transparent drop-shadow-lg">
            Arcadia Community
          </span>
        </h1>

        {/* Navigation Tabs */}
        <div className="mb-8 flex justify-center">
          <div className="rounded-lg border border-gray-700/50 bg-gray-800/50 p-1 backdrop-blur-sm">
            <NeonButton
              className={`mr-1 transition-all duration-300 ${
                activeTab === 'discussions'
                  ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-lg shadow-cyan-500/20'
                  : 'bg-gray-800/50 text-gray-300 hover:text-white'
              }`}
              onClick={() => onTabChange('discussions')}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Discussions
            </NeonButton>
            <NeonButton
              className={`transition-all duration-300 ${
                activeTab === 'events'
                  ? 'bg-gradient-to-r from-lime-500 to-emerald-500 text-white shadow-lg shadow-lime-500/20'
                  : 'bg-gray-800/50 text-gray-300 hover:text-white'
              }`}
              onClick={() => onTabChange('events')}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Events
            </NeonButton>
          </div>
        </div>

        {/* Decorative Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700/50" />
          </div>
          <div className="relative flex justify-center">
            <div className="bg-gray-900 px-2">
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 duration-1000" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
