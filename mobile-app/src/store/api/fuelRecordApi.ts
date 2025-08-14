import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'http://192.168.0.102:8081/api/fuel-records';

// ---------------- Token Caching ----------------
let lastToken: string | null = null;
let lastTokenFetchTime = 0;

async function getTokenCached() {
  const now = Date.now();
  // Refresh token every 5 seconds
  if (!lastToken || now - lastTokenFetchTime > 5000) {
    lastToken = await SecureStore.getItemAsync('access_token');
    lastTokenFetchTime = now;
  }
  return lastToken;
}

// ---------------- Duplicate Request Tracking ----------------
const activeRequests = new Map<string, number>();
const DUPLICATE_WINDOW = 2000; // ms

function getRequestKey(endpoint: string, body: any) {
  // Special case: treat all FormData uploads as identical
  if (body instanceof FormData) {
    return `${endpoint}_FORMDATA`;
  }
  try {
    return `${endpoint}_${JSON.stringify(body)}`;
  } catch {
    return `${endpoint}_UNSERIALIZABLE`;
  }
}

function isDuplicateRequest(endpoint: string, body: any) {
  const key = getRequestKey(endpoint, body);
  const now = Date.now();

  // Clean up old entries (>5s)
  for (const [reqKey, timestamp] of activeRequests.entries()) {
    if (now - timestamp > 5000) activeRequests.delete(reqKey);
  }

  // Check for recent duplicate
  if (activeRequests.has(key) && now - activeRequests.get(key)! < DUPLICATE_WINDOW) {
    console.warn(`RTK Query - Duplicate request for ${endpoint} blocked`);
    return true;
  }

  activeRequests.set(key, now);
  return false;
}

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

// ---------------- API ----------------
export const fuelRecordApi = createApi({
  reducerPath: 'fuelRecordApi',
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_URL,
    timeout: 120000,
    prepareHeaders: async (headers, { endpoint, body }) => {
      console.log('RTK Query - prepareHeaders called for endpoint:', endpoint);

      // 1. Block duplicates early
      if (isDuplicateRequest(endpoint, body)) {
        throw new Error(`Duplicate request for ${endpoint} within ${DUPLICATE_WINDOW}ms`);
      }

      // 2. Get cached token
      const token = await getTokenCached();
      if (!token) {
        console.error('RTK Query - No token found, blocking request for', endpoint);
        throw new Error(`No authentication token available for ${endpoint} - please log in again`);
      }

      headers.set('authorization', `Bearer ${token}`);

      // 3. Validate token structure
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const now = Math.floor(Date.now() / 1000);
          if (now > payload.exp) {
            throw new Error('Authentication token has expired - please log in again');
          }
        } else {
          console.error('RTK Query - INVALID JWT FORMAT for', endpoint);
        }
      } catch (err) {
        console.error('RTK Query - Error parsing token for', endpoint, err);
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
        if (data.stationName) formData.append('stationName', data.stationName);
        if (data.location) formData.append('location', data.location);
        if (data.purchaseDate) formData.append('purchaseDate', data.purchaseDate);

        console.log('RTK Query - Building upload request with:', {
          imageSize: data.receiptImage.uri ? 'present' : 'missing',
          stationName: data.stationName || 'not provided',
          location: data.location || 'not provided',
          purchaseDate: data.purchaseDate || 'not provided',
        });

        return {
          url: '/upload-receipt',
          method: 'POST',
          body: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
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
