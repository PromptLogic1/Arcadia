import { RootState } from '../index';

export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectUserRole = (state: RootState) => state.auth.user?.role;
export const selectUserId = (state: RootState) => state.auth.user?.id;
