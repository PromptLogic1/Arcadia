import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './rootReducer';
import logger from './middleware/logger'; // Optional: Logging Middleware

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
});

// Typen für den Store
export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;

export default store;
