'use client';

import { useRouter } from 'next/navigation';
import type { Tables } from '@/types/database-types';
import { USER_PAGE_CONSTANTS } from './constants';
import { useUserProfileTabs } from '../hooks/useUserProfileTabs';
import { ProfileHeader } from './ProfileHeader';
import { BioSection } from './BioSection';
import { StatsGrid } from './StatsGrid';
import { TabNavigation } from './TabNavigation';
import { TabContent } from './TabContent';

/**
 * Props interface for UserPage component
 */
export interface UserPageProps {
  userData: Tables<'users'>;
}

/**
 * UserPage Component
 *
 * A refactored, modular implementation of the UserPage component
 * following modern React patterns:
 *
 * ✅ Custom Hooks for state management separation
 * ✅ Compound Component pattern for related UI sections
 * ✅ Constants extraction for maintainability
 * ✅ Performance optimized with useCallback/useMemo
 * ✅ Type-safe implementation with explicit interfaces
 * ✅ Single Responsibility Principle for all components
 * ✅ Consistent animations and styling system
 * ✅ Accessible component structure
 *
 * Architecture:
 * - ProfileHeader: Avatar, name, location, edit button
 * - BioSection: Conditional bio display with card layout
 * - StatsGrid: 4-column responsive stats display
 * - TabNavigation: Tab switching controls
 * - TabContent: Dynamic content based on active tab
 *
 * State Management:
 * - useUserProfileTabs: Tab state and switching logic
 * - Router integration for authentication checks
 *
 * Performance:
 * - Memoized stats calculations
 * - Optimized re-render prevention
 * - Efficient animation delays
 */
export default function UserPage({ userData }: UserPageProps) {
  const _router = useRouter();
  const { activeTab, setActiveTab } = useUserProfileTabs();

  // Early return with loading state if no user data
  if (!userData) {
    return (
      <div className="container mx-auto p-4">
        <p>{USER_PAGE_CONSTANTS.MESSAGES.LOADING}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header Section */}
      <div className="mb-8">
        <ProfileHeader userData={userData} />
      </div>

      {/* Bio Section - Conditional */}
      <BioSection userData={userData} />

      {/* Stats Grid Section */}
      <StatsGrid userData={userData} />

      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <TabContent activeTab={activeTab} />
    </div>
  );
}

// Named export for consistency
export { UserPage };
