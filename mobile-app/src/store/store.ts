import { configureStore } from '@reduxjs/toolkit';
import { authApi } from './api/authApi';
import { fuelRecordApi } from './api/fuelRecordApi';
import authSlice from './slices/authSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    [authApi.reducerPath]: authApi.reducer,
    [fuelRecordApi.reducerPath]: fuelRecordApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authApi.middleware, fuelRecordApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
