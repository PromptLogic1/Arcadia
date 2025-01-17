import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import bingoBoardReducer from './slices/bingoboardSlice';
import bingoCardsReducer from './slices/bingocardsSlice';
import bingogeneratorReducer from './slices/bingogeneratorSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  bingoBoard: bingoBoardReducer,
  bingoCards: bingoCardsReducer,
  bingogenerator: bingogeneratorReducer
});

export default rootReducer;
