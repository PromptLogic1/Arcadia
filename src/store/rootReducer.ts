import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import bingoBoardReducer from './slices/bingoboardSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  bingoBoard: bingoBoardReducer,
});

export default rootReducer;
