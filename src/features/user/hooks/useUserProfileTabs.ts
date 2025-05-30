import { useState, useCallback } from 'react';
import { type TabId, USER_PAGE_CONSTANTS } from '../components/constants';

/**
 * Interface for tab management state and actions
 */
export interface UseUserProfileTabsReturn {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  isTabActive: (tab: TabId) => boolean;
  availableTabs: typeof USER_PAGE_CONSTANTS.TABS;
}

/**
 * Custom hook for managing tab state in UserPage
 *
 * Provides:
 * - Active tab state management
 * - Tab switching functionality
 * - Tab active state checking
 * - Available tabs configuration
 *
 * @param defaultTab - Initial tab to display
 * @returns Tab management state and actions
 */
export function useUserProfileTabs(
  defaultTab: TabId = 'achievements'
): UseUserProfileTabsReturn {
  const [activeTab, setActiveTabState] = useState<TabId>(defaultTab);

  // Memoized tab switching handler
  const setActiveTab = useCallback((tab: TabId) => {
    setActiveTabState(tab);
  }, []);

  // Utility to check if a specific tab is active
  const isTabActive = useCallback(
    (tab: TabId) => {
      return activeTab === tab;
    },
    [activeTab]
  );

  return {
    activeTab,
    setActiveTab,
    isTabActive,
    availableTabs: USER_PAGE_CONSTANTS.TABS,
  };
}
