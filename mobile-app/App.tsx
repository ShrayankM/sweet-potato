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
        
        console.log('App - Checking auth state:', { 
          hasToken: !!token, 
          hasUser: !!userString,
          tokenLength: token?.length 
        });
        
        if (token && userString) {
          // Validate token format and expiry
          try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              const now = Math.floor(Date.now() / 1000);
              
              if (now < payload.exp) {
                const user = JSON.parse(userString);
                console.log('App - Restoring valid session for user:', user.email);
                dispatch(restoreSession(user));
                return;
              } else {
                console.log('App - Token expired, clearing stored data');
                // Token expired, clear it
                await SecureStore.deleteItemAsync('access_token');
                await SecureStore.deleteItemAsync('refresh_token');
                await SecureStore.deleteItemAsync('user_data');
              }
            } else {
              console.log('App - Invalid token format, clearing stored data');
              // Invalid token format
              await SecureStore.deleteItemAsync('access_token');
              await SecureStore.deleteItemAsync('refresh_token');
              await SecureStore.deleteItemAsync('user_data');
            }
          } catch (tokenError) {
            console.error('App - Error parsing token:', tokenError);
            // Invalid token, clear it
            await SecureStore.deleteItemAsync('access_token');
            await SecureStore.deleteItemAsync('refresh_token');
            await SecureStore.deleteItemAsync('user_data');
          }
        }
        
        console.log('App - No valid session found, showing login');
        dispatch(setLoading(false));
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
