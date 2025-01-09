import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import bingoBoardReducer from './slices/bingoboardSlice';
import bingoCardsReducer from './slices/bingocardsSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  bingoBoard: bingoBoardReducer,
  bingoCards: bingoCardsReducer,
});

export default rootReducer;
