import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'http://192.168.0.102:8081/api/fuel-records';

// ---------------- Interfaces ----------------
export interface FuelReceiptResponse {
  id: number;
  stationName?: string;
  amount?: number;
  gallons?: number;
  pricePerGallon?: number;
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
    timeout: 120000,
    prepareHeaders: async (headers, { endpoint }) => {
      console.log('RTK Query - prepareHeaders called for endpoint:', endpoint);

      // TEMPORARY: Skip authentication for upload-receipt endpoint
      // if (endpoint === 'uploadReceipt') {
      //   console.log('RTK Query - TEMPORARY: Skipping authentication for uploadReceipt endpoint');
      //   return headers;
      // }

      try {
        // Get authentication token
        const token = await SecureStore.getItemAsync('access_token');
        if (!token) {
          console.error('RTK Query - No token found for', endpoint);
          return headers; // Return headers without auth, let backend handle the 401
        }

        headers.set('authorization', `Bearer ${token}`);

        // Validate token structure (but don't throw errors)
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            const now = Math.floor(Date.now() / 1000);
            if (now > payload.exp) {
              console.warn('RTK Query - Token appears expired for', endpoint, 'but proceeding with request');
              // Don't throw error, let the backend handle token expiry
            } else {
              console.log('RTK Query - Token is valid for', endpoint);
            }
          } else {
            console.warn('RTK Query - Invalid JWT format for', endpoint, 'but proceeding');
          }
        } catch (err) {
          console.warn('RTK Query - Could not parse token for', endpoint, err, 'but proceeding');
        }

      } catch (error) {
        console.error('RTK Query - Error in prepareHeaders for', endpoint, error);
        // Don't throw, just proceed without auth header
      }

      return headers;
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
          headers: { 'Content-Type': 'multipart/form-data' },
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
      query: ({ page = 0, size = 20 } = {}) => ({
        url: `?page=${page}&size=${size}`,
        method: 'GET',
      }),
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
