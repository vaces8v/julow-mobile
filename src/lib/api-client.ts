/**
 * Julow Mobile — HTTP client for direct backend communication.
 *
 * Unlike the web (which uses a BFF proxy with httpOnly cookies),
 * the mobile app stores JWT tokens in SecureStore (Keychain / EncryptedSharedPrefs)
 * and attaches them as Bearer tokens in the Authorization header.
 */

import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// ── Config ───────────────────────────────────────────────────────

const DEV_API_URL = 'http://10.0.2.2:8000/api/v1';
const PROD_API_URL = 'https://backend.julow.ru/api/v1';

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  PROD_API_URL;

// ── Token storage ────────────────────────────────────────────────

const ACCESS_TOKEN_KEY = 'julow.access_token';
const REFRESH_TOKEN_KEY = 'julow.refresh_token';

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

// ── Error class ──────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  code: string;
  detail?: string;
  fieldErrors: Record<string, string>;

  constructor(
    status: number,
    code: string,
    detail?: string,
    fieldErrors: Record<string, string> = {},
  ) {
    super(detail ?? code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
  }
}

// ── Auth failure subscription ────────────────────────────────────

type AuthFailureListener = (err: ApiError) => void;
const authFailureListeners = new Set<AuthFailureListener>();

export function subscribeAuthFailure(fn: AuthFailureListener): () => void {
  authFailureListeners.add(fn);
  return () => { authFailureListeners.delete(fn); };
}

function emitAuthFailure(err: ApiError): void {
  authFailureListeners.forEach((fn) => {
    try { fn(err); } catch { /* noop */ }
  });
}

// ── Error parsing ────────────────────────────────────────────────

function parseBackendError(body: unknown): {
  code: string;
  message: string;
  fieldErrors: Record<string, string>;
} {
  if (!body || typeof body !== 'object') {
    return { code: 'UNKNOWN', message: 'Unknown error', fieldErrors: {} };
  }
  const b = body as Record<string, unknown>;
  const code = (b.error_code ?? b.code ?? 'UNKNOWN') as string;
  const message = (b.detail ?? b.message ?? 'Request failed') as string;
  const fieldErrors: Record<string, string> = {};
  if (Array.isArray(b.errors)) {
    for (const e of b.errors) {
      if (e && typeof e === 'object' && 'field' in e && 'message' in e) {
        fieldErrors[e.field as string] = e.message as string;
      }
    }
  }
  return { code, message, fieldErrors };
}

// ── Core fetch with auto-refresh ─────────────────────────────────

interface FetchOptions {
  method?: string;
  body?: Record<string, unknown> | unknown[] | null;
  params?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  noAuth?: boolean;
}

function buildQuery(params?: FetchOptions['params']): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) return refreshPromise;
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return false;

      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        await clearTokens();
        return false;
      }

      const json = await res.json();
      const data = json.data ?? json;
      if (data.access_token && data.refresh_token) {
        await setTokens(data.access_token, data.refresh_token);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { body, params, headers: optHeaders, method = 'GET', noAuth } = options;
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}${buildQuery(params)}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...optHeaders,
  };

  if (!noAuth) {
    const token = await getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  if (body !== undefined && body !== null && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let res = await fetch(url, {
    method,
    headers,
    body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
  });

  // Auto-refresh on 401
  if (res.status === 401 && !noAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newToken = await getAccessToken();
      if (newToken) headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, {
        method,
        headers,
        body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
      });
    }
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    const parsed = parseBackendError(errBody);
    const err = new ApiError(res.status, parsed.code, parsed.message, parsed.fieldErrors);
    if (res.status === 401) {
      await clearTokens();
      emitAuthFailure(err);
    }
    throw err;
  }

  if (res.status === 204) return undefined as unknown as T;
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) return undefined as unknown as T;
  return (await res.json()) as T;
}

// ── Public helpers ───────────────────────────────────────────────

export interface SuccessResponse<T> {
  success: boolean;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export async function apiGet<T>(
  path: string,
  params?: FetchOptions['params'],
): Promise<SuccessResponse<T>> {
  return apiFetch<SuccessResponse<T>>(path, { method: 'GET', params });
}

export async function apiGetPaginated<T>(
  path: string,
  params?: FetchOptions['params'],
): Promise<PaginatedResponse<T>> {
  return apiFetch<PaginatedResponse<T>>(path, { method: 'GET', params });
}

export async function apiPost<T>(
  path: string,
  body?: Record<string, unknown> | unknown[] | null,
): Promise<SuccessResponse<T>> {
  return apiFetch<SuccessResponse<T>>(path, { method: 'POST', body });
}

export async function apiPatch<T>(
  path: string,
  body?: Record<string, unknown> | unknown[] | null,
): Promise<SuccessResponse<T>> {
  return apiFetch<SuccessResponse<T>>(path, { method: 'PATCH', body });
}

export async function apiPut<T>(
  path: string,
  body?: Record<string, unknown> | unknown[] | null,
): Promise<SuccessResponse<T>> {
  return apiFetch<SuccessResponse<T>>(path, { method: 'PUT', body });
}

export async function apiDelete<T = void>(path: string): Promise<SuccessResponse<T>> {
  return apiFetch<SuccessResponse<T>>(path, { method: 'DELETE' });
}

// ── Auth endpoints (direct, no Bearer needed) ────────────────────

export async function authLogin(payload: {
  email: string;
  password: string;
  isRememberMe?: boolean;
}): Promise<{ accessToken: string; refreshToken: string; userId: string; email: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      is_remember_me: payload.isRememberMe ?? false,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    const parsed = parseBackendError(errBody);
    throw new ApiError(res.status, parsed.code, parsed.message, parsed.fieldErrors);
  }

  const json = await res.json();
  const data = json.data ?? json;
  await setTokens(data.access_token, data.refresh_token);
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    userId: data.user_id ?? data.id ?? '',
    email: payload.email,
  };
}

export async function authRegister(payload: {
  email: string;
  password: string;
}): Promise<{ userId: string; email: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    const parsed = parseBackendError(errBody);
    throw new ApiError(res.status, parsed.code, parsed.message, parsed.fieldErrors);
  }

  const json = await res.json();
  const data = json.data ?? json;
  return { userId: data.id ?? data.user_id ?? '', email: payload.email };
}

export async function authLogout(): Promise<void> {
  try {
    const token = await getAccessToken();
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } finally {
    await clearTokens();
  }
}

export { API_BASE_URL };
