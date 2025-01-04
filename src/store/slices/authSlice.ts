import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// User States
export type UserRole = 'user' | 'premium' | 'moderator' | 'admin';

interface AuthUser {
  id: string; // Auth ID 
  email: string | null;
  phone: string | null;
  display_name?: string;
  provider?: string;
  userRole: 'user' | 'admin' | 'moderator' | 'premium'; // Rolle des Benutzers (Standard: 'user')
}

interface AuthState {
  authUser: AuthUser | null; // Auth Benutzer
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  authUser: null,
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
    clearUser: (state) => {
      state.authUser = null;
      state.isAuthenticated = false;
    },
  },
});

// Selektoren für einfachen Zugriff auf States und Berechtigungen
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectgetAuthUser = (state: { auth: AuthState }) => state.auth.authUser;
export const selectgetUserRole = (state: { auth: AuthState }) => state.auth.authUser?.userRole;

export const { 
  setLoading, 
  setError, 
  setAuthUser,
  clearUser 
} = authSlice.actions;

export default authSlice.reducer;
