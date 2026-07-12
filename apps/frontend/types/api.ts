// Generic API envelope + pagination types shared across the app.

/** Standard success envelope returned by the backend. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

/** Normalized error shape produced by the axios response interceptor. */
export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
  errors?: unknown;
}

/** Paginated list payload (the `data` field of a list response). */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
