import { configureStore } from '@reduxjs/toolkit';
import examReducer from './examSlice';
import preferencesReducer from './preferencesSlice';

export const store = configureStore({
  reducer: {
    exam: examReducer,
    preferences: preferencesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
