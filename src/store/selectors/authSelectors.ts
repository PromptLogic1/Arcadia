import { RootState } from '../index';

export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectAuthUser = (state: RootState) => state.auth.authUser;
export const selectUserRole = (state: RootState) => state.auth.authUser?.userRole;
export const selectUserData = (state: RootState) => state.auth.userdata;