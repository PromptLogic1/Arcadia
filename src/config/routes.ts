export const ROUTES = {
  CHALLENGE_HUB: '/challengehub',
  BOARD_EDIT: (id: string) => `/challengehub/${id}/edit`,
  // ... other routes
} as const 