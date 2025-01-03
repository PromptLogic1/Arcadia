import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Tables } from '@/types/database.types';

// User States
export type UserState = 'GUEST' | 'AUTHENTICATED';
export type UserRole = 'user' | 'premium' | 'moderator' | 'admin';

interface AuthUser {
  id: string; // Auth ID 
  email: string | null;
  phone: string | null;
  display_name?: string;
  provider?: string;
  role: 'user' | 'admin' | 'moderator' | 'premium'; // Rolle des Benutzers (Standard: 'user')
}

interface AuthState {
  authUser: AuthUser | null; // Normaler Benutzer
  userRole: UserRole | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  permissions: string[];  // Berechtigungen basierend auf Rolle
}

const initialState: AuthState = {
  authUser: null,
  userRole: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  permissions: []
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
      state.userRole = null;
      state.isAuthenticated = false;
      state.permissions = [];
    },
  },
});

// Selektoren für einfachen Zugriff auf States und Berechtigungen
export const selectUserRole = (state: { auth: AuthState }) => state.auth.userRole;
export const selectPermissions = (state: { auth: AuthState }) => state.auth.permissions;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;

// Helper-Funktion zur Berechtigungsprüfung
export const hasPermission = (state: { auth: AuthState }, permission: string) => 
  state.auth.permissions.includes(permission);

export const { 
  setLoading, 
  setError, 
  setAuthUser,
  clearUser 
} = authSlice.actions;

export default authSlice.reducer;
