import { RootState } from '@/src/store'

export const selectIsAuthenticated = (state: RootState) => 
  Boolean(state.auth.userdata && state.auth.authUser)
export const selectUserData = (state: RootState) => state.auth.userdata
export const selectAuthUser = (state: RootState) => state.auth.authUser
export const selectUserRole = (state: RootState) => 
  state.auth.authUser?.userRole || 'user'