import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import { logout } from '../slices/authSlice';

// Use the computer's local IP instead of localhost for mobile simulator/device
const BASE_URL = __DEV__ 
  ? 'http://192.168.1.7:8081/api/fuel-records'   // Use your computer's IP for development
  : 'http://localhost:8081/api/fuel-records';     // Use localhost for production

// ---------------- Interfaces ----------------
export interface FuelReceiptResponse {
  id: number;
  stationName?: string;
  stationBrand?: string;
  amount?: number;
  liters?: number;
  pricePerLiter?: number;
  receiptImageUrl?: string;
  location?: string;
  purchaseDate?: string;
  createdAt: string;
  ocrProcessed: boolean;
  ocrConfidence?: number;
  rawOcrData?: string;
}

export interface UploadReceiptRequest {
  receiptImage: {
    uri: string;
    type: string;
    name: string;
  };
}

// ---------------- API ----------------
export const fuelRecordApi = createApi({
  reducerPath: 'fuelRecordApi',
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_URL,
    timeout: 25000, // Reduced timeout to 25 seconds for faster failure detection
    prepareHeaders: async (headers, { endpoint }) => {
      console.log('RTK Query - prepareHeaders called for endpoint:', endpoint);
      
      // DON'T set Content-Type for file uploads - let the browser set it automatically
      if (endpoint !== 'uploadReceipt') {
        headers.set('Content-Type', 'application/json');
        headers.set('Accept', 'application/json');
      } else {
        // For file uploads, only set Accept header, let browser handle Content-Type
        headers.set('Accept', 'application/json');
        console.log('RTK Query - Skipping Content-Type for file upload');
      }

      try {
        // Get authentication token
        const token = await SecureStore.getItemAsync('access_token');
        if (token) {
          headers.set('authorization', `Bearer ${token}`);
          console.log('RTK Query - Token added for', endpoint);
        } else {
          console.warn('RTK Query - No token found for', endpoint);
        }
      } catch (error) {
        console.error('RTK Query - Error getting token for', endpoint, error);
      }

      console.log('RTK Query - Headers prepared for', endpoint, ':', [...headers.entries()]);
      return headers;
    },
    fetchFn: async (...args) => {
      console.log('RTK Query - Making fetch request to:', args[0]);
      try {
        const response = await fetch(...args);
        console.log('RTK Query - Fetch response status:', response.status);
        
        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
          console.error('RTK Query - Authentication error, clearing stored credentials');
          // Clear stored credentials
          await SecureStore.deleteItemAsync('access_token');
          await SecureStore.deleteItemAsync('refresh_token');
          await SecureStore.deleteItemAsync('user_data');
          
          // Note: We can't dispatch logout here directly because we don't have access to dispatch
          // The component will need to handle this error and dispatch logout
        }
        
        return response;
      } catch (error) {
        console.error('RTK Query - Fetch error:', error);
        throw error;
      }
    },
  }),
  tagTypes: ['FuelRecord'],
  endpoints: (builder) => ({
    uploadReceipt: builder.mutation<FuelReceiptResponse, UploadReceiptRequest>({
      query: (data) => {
        const formData = new FormData();
        formData.append('receiptImage', data.receiptImage as any);

        console.log('RTK Query - Building upload request with:', {
          imageSize: data.receiptImage.uri ? 'present' : 'missing',
          imageName: data.receiptImage.name,
          imageType: data.receiptImage.type,
        });

        return {
          url: '/upload-receipt',
          method: 'POST',
          body: formData,
          // Don't set Content-Type manually - let the browser set it with boundary
        };
      },
      transformResponse: (response: FuelReceiptResponse) => {
        console.log('RTK Query - Upload successful, record ID:', response.id);
        return response;
      },
      invalidatesTags: ['FuelRecord'],
    }),

    getFuelRecords: builder.query<{
      content: FuelReceiptResponse[];
      totalElements: number;
      totalPages: number;
      number: number;
      size: number;
    }, { page?: number; size?: number }>({
      query: ({ page = 0, size = 20 } = {}) => {
        console.log('RTK Query - Making getFuelRecords request with params:', { page, size });
        return {
          url: `?page=${page}&size=${size}`,
          method: 'GET',
        };
      },
      transformResponse: (response: any) => {
        console.log('RTK Query - getFuelRecords response received:', response);
        return response;
      },
      transformErrorResponse: (response: any) => {
        console.error('RTK Query - getFuelRecords error:', response);
        return response;
      },
      providesTags: ['FuelRecord'],
    }),

    getFuelRecordById: builder.query<FuelReceiptResponse, number>({
      query: (id) => ({
        url: `/${id}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, id) => [{ type: 'FuelRecord', id }],
    }),

    deleteFuelRecord: builder.mutation<void, number>({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'FuelRecord', id }, 'FuelRecord'],
    }),
  }),
});

export const {
  useUploadReceiptMutation,
  useGetFuelRecordsQuery,
  useGetFuelRecordByIdQuery,
  useDeleteFuelRecordMutation,
} = fuelRecordApi;
