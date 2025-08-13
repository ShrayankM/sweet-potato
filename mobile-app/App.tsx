import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';

import { store } from './src/store/store';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import { useAppSelector, useAppDispatch } from './src/store/hooks';
import LoadingScreen from './src/screens/LoadingScreen';
import { setLoading, restoreSession } from './src/store/slices/authSlice';

function AppContent() {
  const { isAuthenticated, isLoading } = useAppSelector(state => state.auth);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const token = await SecureStore.getItemAsync('access_token');
        const userString = await SecureStore.getItemAsync('user_data');
        
        if (token && userString) {
          const user = JSON.parse(userString);
          dispatch(restoreSession(user));
        } else {
          dispatch(setLoading(false));
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
        dispatch(setLoading(false));
      }
    };

    checkAuthState();
  }, [dispatch]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <StatusBar style="auto" />
      <AppContent />
    </Provider>
  );
}
