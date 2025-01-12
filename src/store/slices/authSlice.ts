import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UUID } from 'crypto';

// User States
export type UserRole = 'user' | 'premium' | 'moderator' | 'admin';

interface userdata {
  id: UUID;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  experience_points: number;
  land: string | null;
  region: string | null;
  city: string | null;
  bio: string | null;
  role: UserRole;
  last_login_at: string | null;
  created_at: string;
}

interface AuthUser {
  id: UUID; // Auth ID 
  email: string | null;
  phone: string | null;
  auth_username: string | null;
  provider: string | null;
  userRole: UserRole; // Rolle des Benutzers (Standard: 'user')
}

interface AuthState {
  authUser: AuthUser | null; // Auth Benutzer
  userdata: userdata | null; // Userdata Benutzer
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  authUser: null,
  userdata: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setAuthUser: (state, action: PayloadAction<AuthUser>) => {
      state.authUser = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    },
    setUserdata: (state, action: PayloadAction<userdata>) => {
      state.userdata = action.payload;
      state.error = null;
    },
    clearUser: (state) => {
      state.authUser = null;
      state.userdata = null;
      state.isAuthenticated = false;
      state.error = null;
    },
  },
});

export const { 
  setLoading, 
  setError, 
  setAuthUser,
  setUserdata,
  clearUser 
} = authSlice.actions;

export default authSlice.reducer;
