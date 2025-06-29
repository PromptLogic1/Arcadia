import React, { useCallback } from 'react';
import { MessageCircle, Calendar } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { NeonText } from '@/components/ui/NeonText';

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
export const CommunityHeader = React.memo(function CommunityHeader({
  activeTab,
  onTabChange,
}: CommunityHeaderProps) {
  // Memoized handlers to prevent unnecessary re-renders
  const handleDiscussionsClick = useCallback(() => {
    onTabChange('discussions');
  }, [onTabChange]);

  const handleEventsClick = useCallback(() => {
    onTabChange('events');
  }, [onTabChange]);
  return (
    <header className="glass-subtle relative border-b border-cyan-500/20">
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-fuchsia-500/5 to-transparent" />
      <div className="relative container mx-auto px-4 py-12">
        {/* Main Title */}
        <h1 className="mb-8 text-center text-5xl font-bold">
          <NeonText variant="solid" className="text-5xl">
            Arcadia Community
          </NeonText>
        </h1>

        {/* Navigation Tabs - Enhanced with Cyberpunk styling */}
        <div className="mb-8 flex justify-center">
          <div className="cyber-card border-cyan-500/30 bg-slate-900/70 p-2 backdrop-blur-md">
            <Button
              variant={activeTab === 'discussions' ? 'primary' : 'ghost'}
              size="lg"
              className={`mr-2 transition-all duration-300 ${
                activeTab === 'discussions' ? 'neon-glow-cyan' : ''
              }`}
              onClick={handleDiscussionsClick}
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Discussions
            </Button>
            <Button
              variant={activeTab === 'events' ? 'primary' : 'ghost'}
              size="lg"
              className={`transition-all duration-300 ${
                activeTab === 'events' ? 'neon-glow-emerald' : ''
              }`}
              onClick={handleEventsClick}
            >
              <Calendar className="mr-2 h-5 w-5" />
              Events
            </Button>
          </div>
        </div>

        {/* Enhanced Decorative Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-cyan-500/30" />
          </div>
          <div className="relative flex justify-center">
            <div className="cyber-card bg-slate-900/90 px-4 py-2">
              <div className="animate-glow h-3 w-3 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400 shadow-lg shadow-cyan-500/50" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
});
