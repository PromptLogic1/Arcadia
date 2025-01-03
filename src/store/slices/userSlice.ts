import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Tables } from '@/types/database.types';

interface UserState {
  profile: Tables['users']['Row'] | null;
  loading: boolean;
  error: string | null;
  // Zusätzliche User-spezifische States
  editMode: boolean;
  unsavedChanges: boolean;
  profileVisibility: {
    profile: 'public' | 'private';
    achievements: 'public' | 'private';
    submissions: 'public' | 'private';
  };
}

const initialState: UserState = {
  profile: null,
  loading: false,
  error: null,
  editMode: false,
  unsavedChanges: false,
  profileVisibility: {
    profile: 'public',
    achievements: 'public',
    submissions: 'public'
  }
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setProfile(state, action: PayloadAction<Tables['users']['Row']>) {
      state.profile = action.payload;
      state.profileVisibility = {
        profile: action.payload.profile_visibility as 'public' | 'private',
        achievements: action.payload.achievements_visibility as 'public' | 'private',
        submissions: action.payload.submissions_visibility as 'public' | 'private'
      };
      state.error = null;
    },
    updateProfile(state, action: PayloadAction<Partial<Tables['users']['Row']>>) {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
        state.unsavedChanges = true;
      }
    },
    setEditMode(state, action: PayloadAction<boolean>) {
      state.editMode = action.payload;
    },
    clearUnsavedChanges(state) {
      state.unsavedChanges = false;
    },
    updateVisibility(
      state,
      action: PayloadAction<{
        type: 'profile' | 'achievements' | 'submissions';
        visibility: 'public' | 'private';
      }>
    ) {
      const { type, visibility } = action.payload;
      state.profileVisibility[type] = visibility;
      if (state.profile) {
        state.profile[`${type}_visibility`] = visibility;
      }
    },
    clearProfile(state) {
      state.profile = null;
      state.editMode = false;
      state.unsavedChanges = false;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    }
  },
});

// Selektoren
export const selectProfile = (state: { user: UserState }) => state.user.profile;
export const selectIsEditing = (state: { user: UserState }) => state.user.editMode;
export const selectHasUnsavedChanges = (state: { user: UserState }) => state.user.unsavedChanges;
export const selectVisibility = (state: { user: UserState }) => state.user.profileVisibility;

export const {
  setProfile,
  updateProfile,
  setEditMode,
  clearUnsavedChanges,
  updateVisibility,
  clearProfile,
  setLoading,
  setError
} = userSlice.actions;

export default userSlice.reducer;
