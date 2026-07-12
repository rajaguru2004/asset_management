import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '@/types/api';

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor — attach the bearer token when running in the browser.
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — unwrap the backend envelope and normalize errors.
axiosInstance.interceptors.response.use(
  (response) => {
    // Leave blob responses untouched (file downloads).
    if (response.config.responseType === 'blob') {
      return response;
    }
    // Backend returns { success, data, message }. Return response.data so
    // callers receive the envelope directly.
    return response.data;
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized — clear the session and bounce to /login.
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    const apiError: ApiError = {
      success: false,
      statusCode: error.response?.status || 500,
      message: error.response?.data?.message || error.message || 'An error occurred',
      timestamp: error.response?.data?.timestamp || new Date().toISOString(),
      path: originalRequest?.url || '',
      errors: error.response?.data?.errors ?? null,
    };

    return Promise.reject(apiError);
  }
);

export default axiosInstance;
