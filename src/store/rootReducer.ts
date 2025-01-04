import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userdataReducer from './slices/userDataSlice'

const rootReducer = combineReducers({
  auth: authReducer,
  userdata: userdataReducer
});

export default rootReducer;
