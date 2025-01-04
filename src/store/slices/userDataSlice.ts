import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface userdata {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    role: 'user' | 'premium' | 'moderator' | 'admin';
    experience_points: number;
    land: string | null;
    region: string | null;
    city: string | null;
    bio: string | null;
    last_login_at: string | null;
    created_at: string;
}

interface userdataState {
    userdata: userdata | null; // Normaler Benutzer
    loading: boolean;
    error: string | null;
  }

const initialState: userdataState = {
    userdata: null,
    loading: false,
    error: null,
  }

const userdataSlice = createSlice({
    name: 'userdata',
    initialState,
    reducers: {
      setuserdataLoading: (state, action: PayloadAction<boolean>) => {
        state.loading = action.payload;
      },
      setuserdataError: (state, action: PayloadAction<string | null>) => {
        state.error = action.payload;
      },
      setuserdata: (state, action: PayloadAction<userdata>) => {
        state.userdata = action.payload;
        state.error = null;
      },
      clearuserdata: (state) => {
        state.userdata = null;
      },
    },
  });

export const selectuserdata = (state: { userdata: userdataState }) => state.userdata.userdata;

export const { 
    setuserdataLoading, 
    setuserdataError, 
    setuserdata,
    clearuserdata 
  } = userdataSlice.actions;
  
  export default userdataSlice.reducer;