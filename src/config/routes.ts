export const ROUTES = {
  CHALLENGE_HUB: '/challenge-hub',
  CHALLENGE_BOARD: (id: string) => `/challenge-hub/${id}`,
  // Remove or update any edit-specific routes
  // Before: CHALLENGE_EDIT: '/challengehub/:id/edit'
  // After: CHALLENGE_BOARD: '/challengehub/:id'
  PLAY_AREA: '/play-area',
  PLAY_AREA_BINGO: '/play-area/bingo',
  PLAY_AREA_QUICK: '/play-area/quick',
} as const;
