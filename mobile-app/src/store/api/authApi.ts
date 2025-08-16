import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';

// Use the computer's local IP instead of localhost for mobile simulator/device  
const BASE_URL = __DEV__ 
  ? 'http://192.168.1.7:8082/api/auth'     // Use your computer's IP for development
  : 'http://localhost:8082/api/auth';      // Use localhost for production

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  userName: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    userName: string;
  };
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_URL,
    prepareHeaders: async (headers, { endpoint }) => {
      console.log('Auth API - prepareHeaders called for endpoint:', endpoint);
      
      // Add common headers
      headers.set('Content-Type', 'application/json');
      headers.set('Accept', 'application/json');
      
      const token = await SecureStore.getItemAsync('access_token');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
        console.log('Auth API - Token added for', endpoint);
      } else {
        console.log('Auth API - No token found for', endpoint);
      }
      
      console.log('Auth API - Headers prepared for', endpoint, ':', [...headers.entries()]);
      return headers;
    },
    fetchFn: async (...args) => {
      console.log('Auth API - Making fetch request to:', args[0]);
      try {
        const response = await fetch(...args);
        console.log('Auth API - Fetch response status:', response.status);
        return response;
      } catch (error) {
        console.error('Auth API - Fetch error:', error);
        throw error;
      }
    },
  }),
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => {
        console.log('Auth API - Making login request with:', { email: credentials.email });
        return {
          url: '/login',
          method: 'POST',
          body: credentials,
        };
      },
      transformResponse: (response: AuthResponse) => {
        console.log('Auth API - Login successful for user:', response.user.email);
        return response;
      },
      transformErrorResponse: (response: any) => {
        console.error('Auth API - Login error:', response);
        return response;
      },
    }),
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (userData) => {
        console.log('Auth API - Making register request with:', { email: userData.email, userName: userData.userName });
        return {
          url: '/register',
          method: 'POST',
          body: userData,
        };
      },
      transformResponse: (response: AuthResponse) => {
        console.log('Auth API - Registration successful for user:', response.user.email);
        return response;
      },
      transformErrorResponse: (response: any) => {
        console.error('Auth API - Register error:', response);
        return response;
      },
    }),
    refreshToken: builder.mutation<{ token: string }, { refreshToken: string }>({
      query: (data) => ({
        url: '/refresh',
        method: 'POST',
        body: data,
      }),
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/logout',
        method: 'POST',
              }),
      }),
      forgotPassword: builder.mutation<{message: string}, {email: string}>({
        query: (body) => ({
          url: '/forgot-password',
          method: 'POST',
          body,
        }),
      }),
      verifyOtp: builder.mutation<{message: string}, {email: string; otp: string}>({
        query: (body) => ({
          url: '/verify-otp',
          method: 'POST',
          body,
        }),
      }),
      resetPassword: builder.mutation<{message: string}, {email: string; otp: string; newPassword: string}>({
        query: (body) => ({
          url: '/reset-password',
          method: 'POST',
          body,
        }),
      }),
    }),
  });

export const { 
  useLoginMutation, 
  useRegisterMutation, 
  useRefreshTokenMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useVerifyOtpMutation,
  useResetPasswordMutation
} = authApi;
