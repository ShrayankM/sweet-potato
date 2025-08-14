import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'http://192.168.0.102:8081/api/fuel-records';

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
  ocrConfidence?: string;
  rawOcrData?: string;
}

export interface UploadReceiptRequest {
  receiptImage: {
    uri: string;
    type: string;
    name: string;
  };
  stationName?: string;
  location?: string;
  purchaseDate?: string;
}

export const fuelRecordApi = createApi({
  reducerPath: 'fuelRecordApi',
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_URL,
    prepareHeaders: async (headers) => {
      const token = await SecureStore.getItemAsync('access_token');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['FuelRecord'],
  endpoints: (builder) => ({
    uploadReceipt: builder.mutation<FuelReceiptResponse, UploadReceiptRequest>({
      query: (data) => {
        const formData = new FormData();
        
        // Add the image file
        formData.append('receiptImage', data.receiptImage as any);
        
        // Add optional fields if provided
        if (data.stationName) {
          formData.append('stationName', data.stationName);
        }
        if (data.location) {
          formData.append('location', data.location);
        }
        if (data.purchaseDate) {
          formData.append('purchaseDate', data.purchaseDate);
        }

        return {
          url: '/upload-receipt',
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        };
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
