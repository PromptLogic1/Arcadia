import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './rootReducer';
import logger from './middleware/logger';

// Create store instance
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: false, // For handling Date objects
    }).concat(logger),
})

// Export types
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Export store selectors
export * from './selectors'
