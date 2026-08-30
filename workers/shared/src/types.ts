export interface ApiResponse<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedMeta {
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface PaginatedResponse<T> {
  ok: true;
  data: T[];
  meta: PaginatedMeta;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;
export type PaginatedResult<T> = PaginatedResponse<T> | ApiError;

export type DomainCode = 'QR' | 'AL' | 'AR' | 'WV' | 'CM' | 'PL' | 'CORE' | 'LX';

export interface AuthContext {
  userId: string;
  workspaceId?: string;
  role?: string;
  isAdmin: boolean;
}

export interface PaginateOptions {
  page?: number;
  per_page?: number;
}

export interface PaginatedRows<T> {
  rows: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}
