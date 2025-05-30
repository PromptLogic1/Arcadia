export const USER_PAGE_CONSTANTS = {
  ANIMATIONS: {
    HEADER_DELAY: 0,
    BIO_DELAY: 0.2,
    STATS_DELAY_BASE: 0.1,
    TAB_TRANSITION_DURATION: 0.3,
  },
  UI: {
    AVATAR_SIZE: 'h-32 w-32',
    GRID_LAYOUT: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    ICON_SIZE: 'h-6 w-6',
    STAT_ICON_SIZE: 'h-12 w-12',
  },
  TABS: [
    { id: 'achievements', label: 'Achievements' },
    { id: 'submissions', label: 'Submissions' },
  ] as const,
  MESSAGES: {
    LOADING: 'Loading user data...',
    ACHIEVEMENTS_COMING_SOON: 'Achievements coming soon...',
    SUBMISSIONS_COMING_SOON: 'Submissions history coming soon...',
    EDIT_PROFILE: 'Edit Profile',
  },
} as const;

export const STAT_COLORS = {
  EXPERIENCE: 'from-yellow-500 to-orange-500',
  ROLE: 'from-cyan-500 to-blue-500',
  MEMBER_SINCE: 'from-green-500 to-emerald-500',
  LAST_ACTIVITY: 'from-purple-500 to-pink-500',
} as const;

export type TabId = (typeof USER_PAGE_CONSTANTS.TABS)[number]['id'];
