import { useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { USER_PAGE_CONSTANTS } from './constants';
import type { TabId } from './constants';

/**
 * Props interface for TabNavigation component
 */
export interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

/**
 * TabNavigation Component
 *
 * Renders tab navigation buttons with:
 * - Active/inactive state styling
 * - Smooth transitions
 * - Accessible button controls
 * - Centered layout with backdrop blur
 *
 * Features:
 * - Type-safe tab IDs
 * - Performance-optimized click handlers
 * - Consistent styling with design system
 * - Keyboard navigation support
 */
export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  // Memoized click handler to prevent unnecessary re-renders
  const handleTabClick = useCallback(
    (tab: TabId) => {
      onTabChange(tab);
    },
    [onTabChange]
  );

  return (
    <div className="mb-8 flex justify-center">
      <div className="rounded-lg bg-gray-800/50 p-1 backdrop-blur-sm">
        {USER_PAGE_CONSTANTS.TABS.map(tab => (
          <Button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`px-6 capitalize transition-all duration-${USER_PAGE_CONSTANTS.ANIMATIONS.TAB_TRANSITION_DURATION} ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white'
                : 'bg-transparent text-gray-400 hover:text-white'
            }`}
            role="tab"
            aria-selected={activeTab === tab.id}
            tabIndex={0}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
