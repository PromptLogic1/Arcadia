/**
 * User Profile Store
 *
 * Zustand store for user profile UI state management.
 * Contains only UI state - no server data (handled by TanStack Query).
 */

import { createWithEqualityFn } from 'zustand/traditional';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

// Tab types for user profile
export type UserProfileTab =
  | 'overview'
  | 'stats'
  | 'activity'
  | 'achievements'
  | 'settings';

// Activity filter options
export interface ActivityFilters {
  type?: string;
  dateRange?: {
    from: string;
    to: string;
  };
  limit: number;
  showPointsOnly: boolean;
}

// Edit mode states
export interface EditFormState {
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  showCancelDialog: boolean;
}

// UI state interface
interface UserProfileState {
  // Tab navigation
  activeTab: UserProfileTab;

  // Edit mode
  editForm: EditFormState;

  // Activity view
  activityFilters: ActivityFilters;
  showActivityDetails: boolean;
  selectedActivityId: string | null;

  // Stats view
  showDetailedStats: boolean;
  statsTimeRange: 'week' | 'month' | 'year' | 'all';

  // Achievements view
  showCompletedAchievements: boolean;
  achievementCategory: 'all' | 'recent' | 'gaming' | 'social' | 'special';

  // General UI
  showProfilePicDialog: boolean;
  showDeleteAccountDialog: boolean;
  isCompactView: boolean;
}

// Actions interface
interface UserProfileActions {
  // Tab navigation
  setActiveTab: (tab: UserProfileTab) => void;

  // Edit mode actions
  enterEditMode: () => void;
  exitEditMode: () => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setShowCancelDialog: (show: boolean) => void;
  resetEditForm: () => void;

  // Activity actions
  setActivityFilters: (filters: Partial<ActivityFilters>) => void;
  setShowActivityDetails: (show: boolean) => void;
  setSelectedActivityId: (id: string | null) => void;
  resetActivityFilters: () => void;

  // Stats actions
  setShowDetailedStats: (show: boolean) => void;
  setStatsTimeRange: (range: UserProfileState['statsTimeRange']) => void;

  // Achievements actions
  setShowCompletedAchievements: (show: boolean) => void;
  setAchievementCategory: (
    category: UserProfileState['achievementCategory']
  ) => void;

  // General UI actions
  setShowProfilePicDialog: (show: boolean) => void;
  setShowDeleteAccountDialog: (show: boolean) => void;
  setIsCompactView: (compact: boolean) => void;

  // Reset all state
  resetAllState: () => void;
}

// Combined store type
type UserProfileStore = UserProfileState & UserProfileActions;

// Default activity filters
const defaultActivityFilters: ActivityFilters = {
  type: undefined,
  dateRange: undefined,
  limit: 20,
  showPointsOnly: false,
};

// Default edit form state
const defaultEditForm: EditFormState = {
  isEditing: false,
  hasUnsavedChanges: false,
  showCancelDialog: false,
};

// Initial state
const initialState: UserProfileState = {
  activeTab: 'overview',
  editForm: defaultEditForm,
  activityFilters: defaultActivityFilters,
  showActivityDetails: false,
  selectedActivityId: null,
  showDetailedStats: false,
  statsTimeRange: 'month',
  showCompletedAchievements: true,
  achievementCategory: 'all',
  showProfilePicDialog: false,
  showDeleteAccountDialog: false,
  isCompactView: false,
};

/**
 * User Profile Zustand Store
 */
export const useUserProfileStore = createWithEqualityFn<UserProfileStore>()(
  devtools(
    set => ({
      // Initial state
      ...initialState,

      // Tab navigation
      setActiveTab: tab => set({ activeTab: tab }, false, 'setActiveTab'),

      // Edit mode actions
      enterEditMode: () =>
        set(
          state => ({
            editForm: {
              ...state.editForm,
              isEditing: true,
            },
          }),
          false,
          'enterEditMode'
        ),

      exitEditMode: () =>
        set(
          () => ({
            editForm: {
              ...defaultEditForm,
              isEditing: false,
            },
          }),
          false,
          'exitEditMode'
        ),

      setHasUnsavedChanges: hasChanges =>
        set(
          state => ({
            editForm: {
              ...state.editForm,
              hasUnsavedChanges: hasChanges,
            },
          }),
          false,
          'setHasUnsavedChanges'
        ),

      setShowCancelDialog: show =>
        set(
          state => ({
            editForm: {
              ...state.editForm,
              showCancelDialog: show,
            },
          }),
          false,
          'setShowCancelDialog'
        ),

      resetEditForm: () =>
        set({ editForm: defaultEditForm }, false, 'resetEditForm'),

      // Activity actions
      setActivityFilters: filters =>
        set(
          state => ({
            activityFilters: {
              ...state.activityFilters,
              ...filters,
            },
          }),
          false,
          'setActivityFilters'
        ),

      setShowActivityDetails: show =>
        set({ showActivityDetails: show }, false, 'setShowActivityDetails'),

      setSelectedActivityId: id =>
        set({ selectedActivityId: id }, false, 'setSelectedActivityId'),

      resetActivityFilters: () =>
        set(
          { activityFilters: defaultActivityFilters },
          false,
          'resetActivityFilters'
        ),

      // Stats actions
      setShowDetailedStats: show =>
        set({ showDetailedStats: show }, false, 'setShowDetailedStats'),

      setStatsTimeRange: range =>
        set({ statsTimeRange: range }, false, 'setStatsTimeRange'),

      // Achievements actions
      setShowCompletedAchievements: show =>
        set(
          { showCompletedAchievements: show },
          false,
          'setShowCompletedAchievements'
        ),

      setAchievementCategory: category =>
        set({ achievementCategory: category }, false, 'setAchievementCategory'),

      // General UI actions
      setShowProfilePicDialog: show =>
        set({ showProfilePicDialog: show }, false, 'setShowProfilePicDialog'),

      setShowDeleteAccountDialog: show =>
        set(
          { showDeleteAccountDialog: show },
          false,
          'setShowDeleteAccountDialog'
        ),

      setIsCompactView: compact =>
        set({ isCompactView: compact }, false, 'setIsCompactView'),

      // Reset all state
      resetAllState: () => set(initialState, false, 'resetAllState'),
    }),
    {
      name: 'user-profile-store',
    }
  )
);

// Selectors for optimized re-renders
export const useUserProfileState = () =>
  useUserProfileStore(
    useShallow(state => ({
      activeTab: state.activeTab,
      editForm: state.editForm,
      activityFilters: state.activityFilters,
      showActivityDetails: state.showActivityDetails,
      selectedActivityId: state.selectedActivityId,
      showDetailedStats: state.showDetailedStats,
      statsTimeRange: state.statsTimeRange,
      showCompletedAchievements: state.showCompletedAchievements,
      achievementCategory: state.achievementCategory,
      showProfilePicDialog: state.showProfilePicDialog,
      showDeleteAccountDialog: state.showDeleteAccountDialog,
      isCompactView: state.isCompactView,
    }))
  );

export const useUserProfileActions = () =>
  useUserProfileStore(
    useShallow(state => ({
      setActiveTab: state.setActiveTab,
      enterEditMode: state.enterEditMode,
      exitEditMode: state.exitEditMode,
      setHasUnsavedChanges: state.setHasUnsavedChanges,
      setShowCancelDialog: state.setShowCancelDialog,
      resetEditForm: state.resetEditForm,
      setActivityFilters: state.setActivityFilters,
      setShowActivityDetails: state.setShowActivityDetails,
      setSelectedActivityId: state.setSelectedActivityId,
      resetActivityFilters: state.resetActivityFilters,
      setShowDetailedStats: state.setShowDetailedStats,
      setStatsTimeRange: state.setStatsTimeRange,
      setShowCompletedAchievements: state.setShowCompletedAchievements,
      setAchievementCategory: state.setAchievementCategory,
      setShowProfilePicDialog: state.setShowProfilePicDialog,
      setShowDeleteAccountDialog: state.setShowDeleteAccountDialog,
      setIsCompactView: state.setIsCompactView,
      resetAllState: state.resetAllState,
    }))
  );

// Convenience selectors for specific sections
export const useUserProfileTabState = () =>
  useUserProfileStore(
    useShallow(state => ({
      activeTab: state.activeTab,
      setActiveTab: state.setActiveTab,
    }))
  );

export const useUserProfileEditState = () =>
  useUserProfileStore(
    useShallow(state => ({
      editForm: state.editForm,
      enterEditMode: state.enterEditMode,
      exitEditMode: state.exitEditMode,
      setHasUnsavedChanges: state.setHasUnsavedChanges,
      setShowCancelDialog: state.setShowCancelDialog,
      resetEditForm: state.resetEditForm,
    }))
  );

export const useUserProfileActivityState = () =>
  useUserProfileStore(
    useShallow(state => ({
      activityFilters: state.activityFilters,
      showActivityDetails: state.showActivityDetails,
      selectedActivityId: state.selectedActivityId,
      setActivityFilters: state.setActivityFilters,
      setShowActivityDetails: state.setShowActivityDetails,
      setSelectedActivityId: state.setSelectedActivityId,
      resetActivityFilters: state.resetActivityFilters,
    }))
  );
