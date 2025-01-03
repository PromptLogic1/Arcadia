import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  profile: { name: string; email: string } | null;
  loading: boolean;
}

const initialState: UserState = {
  profile: null,
  loading: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setProfile(state, action: PayloadAction<{ name: string; email: string }>) {
      state.profile = action.payload;
    },
    clearProfile(state) {
      state.profile = null;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
});

export const { setProfile, clearProfile, setLoading } = userSlice.actions;

export default userSlice.reducer;
