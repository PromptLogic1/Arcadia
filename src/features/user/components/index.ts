// Main Components
export { default as UserPage } from './UserPage';

// Sub-Components
export { ProfileHeader } from './ProfileHeader';
export { BioSection } from './BioSection';
export { StatsGrid } from './StatsGrid';
export { TabNavigation } from './TabNavigation';
export { TabContent } from './TabContent';

// Hooks
export { useUserProfileTabs } from '../hooks/useUserProfileTabs';

// Constants and Types
export { USER_PAGE_CONSTANTS, STAT_COLORS } from './constants';
export type { TabId } from './constants';

// Type Exports for External Use
export type { UserPageProps } from './UserPage';
export type { ProfileHeaderProps } from './ProfileHeader';
export type { BioSectionProps } from './BioSection';
export type { StatsGridProps, StatConfig } from './StatsGrid';
export type { TabNavigationProps } from './TabNavigation';
export type { TabContentProps } from './TabContent';
export type { UseUserProfileTabsReturn } from '../hooks/useUserProfileTabs';
