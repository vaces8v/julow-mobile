/**
 * Julow Mobile — HTTP client for direct backend communication.
 *
 * Unlike the web (which uses a BFF proxy with httpOnly cookies),
 * the mobile app stores JWT tokens in SecureStore (Keychain / EncryptedSharedPrefs)
 * and attaches them as Bearer tokens in the Authorization header.
 */

import * as SecureStore from 'expo-secure-store';
import { fetch as expoFetch } from 'expo/fetch';

import { resolveApiBaseUrl } from './resolve-api-base-url';

// ── Config ───────────────────────────────────────────────────────

const DEFAULT_FETCH_TIMEOUT_MS = 12_000;

const API_BASE_URL = resolveApiBaseUrl();

// ── Token storage ────────────────────────────────────────────────

const ACCESS_TOKEN_KEY = 'julow.access_token';
const REFRESH_TOKEN_KEY = 'julow.refresh_token';
const USER_SNAPSHOT_KEY = 'julow.user_snapshot';

/** Mobile clients always use long-lived remember-me sessions on the backend. */
const MOBILE_DEFAULT_REMEMBER_ME = true;

export interface UserSnapshot {
  id: string;
  email: string;
  status: string;
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function getUserSnapshot(): Promise<UserSnapshot | null> {
  const raw = await SecureStore.getItemAsync(USER_SNAPSHOT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as UserSnapshot;
    if (parsed?.id && parsed?.email) return parsed;
  } catch {
    /* ignore corrupt snapshot */
  }
  return null;
}

export async function setUserSnapshot(user: UserSnapshot): Promise<void> {
  await SecureStore.setItemAsync(USER_SNAPSHOT_KEY, JSON.stringify(user));
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_SNAPSHOT_KEY);
}

export async function hasStoredSession(): Promise<boolean> {
  const [access, refresh] = await Promise.all([getAccessToken(), getRefreshToken()]);
  return !!(access || refresh);
}

// ── Error class ──────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  code: string;
  detail?: string;
  fieldErrors: Record<string, string>;
  url?: string;
  method?: string;

  constructor(
    status: number,
    code: string,
    detail?: string,
    fieldErrors: Record<string, string> = {},
    meta: { url?: string; method?: string } = {},
  ) {
    super(detail ?? `${meta.method ?? 'HTTP'} ${meta.url ?? ''} → ${status} ${code}`.trim());
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
    this.url = meta.url;
    this.method = meta.method;
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

function stringifyDetail(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const parts = value
      .map((v) => {
        if (v && typeof v === 'object' && 'msg' in (v as Record<string, unknown>)) {
          return String((v as Record<string, unknown>).msg);
        }
        return typeof v === 'string' ? v : JSON.stringify(v);
      })
      .filter(Boolean);
    return parts.length > 0 ? parts.join('; ') : undefined;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

function parseBackendError(body: unknown): {
  code: string;
  message: string;
  fieldErrors: Record<string, string>;
} {
  if (!body) {
    return { code: 'EMPTY_BODY', message: 'Empty response body', fieldErrors: {} };
  }

  if (typeof body === 'string') {
    return { code: 'NON_JSON', message: body.slice(0, 500), fieldErrors: {} };
  }

  if (typeof body !== 'object') {
    return { code: 'UNKNOWN', message: String(body), fieldErrors: {} };
  }

  const b = body as Record<string, unknown>;
  const code = (b.error_code ?? b.code ?? 'UNKNOWN') as string;
  const message =
    stringifyDetail(b.detail) ??
    stringifyDetail(b.message) ??
    stringifyDetail(b.error) ??
    (typeof b.title === 'string' ? b.title : undefined) ??
    'Request failed';

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

/** User-facing login/register error — never show raw JSON. */
export function getLoginErrorMessage(
  error: unknown,
  messages: { fallback: string; invalidCredentials: string },
): string {
  if (!(error instanceof ApiError)) {
    return messages.fallback;
  }

  const code = error.code.toUpperCase();
  if (
    error.status === 401 ||
    error.status === 403 ||
    code.includes('CREDENTIAL') ||
    code === 'INVALID_LOGIN' ||
    code === 'INVALID_PASSWORD'
  ) {
    return messages.invalidCredentials;
  }

  if (error.status === 408 || code === 'TIMEOUT' || code === 'NETWORK_ERROR') {
    return messages.fallback;
  }

  const fieldMsg = Object.values(error.fieldErrors).find(Boolean);
  if (fieldMsg) return fieldMsg;

  const text = (error.detail ?? error.message).trim();
  if (!text || text.startsWith('{') || text.startsWith('[')) {
    return messages.fallback;
  }

  return text.length > 160 ? messages.fallback : text;
}

async function readErrorBody(res: Response): Promise<unknown> {
  const ct = res.headers.get('content-type') ?? '';
  try {
    if (ct.includes('application/json')) {
      return await res.json();
    }
    const text = await res.text();
    return text;
  } catch {
    return null;
  }
}

// ── Core fetch with auto-refresh ─────────────────────────────────

interface FetchOptions {
  method?: string;
  body?: Record<string, unknown> | unknown[] | null;
  params?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  noAuth?: boolean;
  /** Skip token refresh retry — used during cold-start auth bootstrap. */
  noRefresh?: boolean;
  timeoutMs?: number;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await expoFetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(408, 'TIMEOUT', `Request timed out after ${timeoutMs}ms`, {}, {
        url,
        method: init.method ?? 'GET',
      });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
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
let refreshPromise: Promise<RefreshOutcome> | null = null;

/** Result of a refresh attempt — used to avoid logout on transient network errors. */
export type RefreshOutcome = 'refreshed' | 'invalid' | 'unavailable';

async function tryRefreshToken(): Promise<RefreshOutcome> {
  if (isRefreshing && refreshPromise) return refreshPromise;
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return 'invalid';

      const res = await fetchWithTimeout(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          await clearTokens();
          emitAuthFailure(
            new ApiError(res.status, 'SESSION_EXPIRED', 'Session expired', {}, {
              url: `${API_BASE_URL}/auth/refresh`,
              method: 'POST',
            }),
          );
          return 'invalid';
        }
        return 'unavailable';
      }

      const json = await res.json();
      const data = json.data ?? json;
      if (data.access_token && data.refresh_token) {
        await setTokens(data.access_token, data.refresh_token);
        return 'refreshed';
      }
      return 'invalid';
    } catch {
      return 'unavailable';
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

/** Ensures a valid access token is available — refreshes silently when needed. */
export async function ensureFreshAccessToken(): Promise<string | null> {
  const existing = await getAccessToken();
  if (existing) return existing;

  const outcome = await tryRefreshToken();
  if (outcome !== 'refreshed') return null;
  return getAccessToken();
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const {
    body,
    params,
    headers: optHeaders,
    method = 'GET',
    noAuth,
    noRefresh,
    timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
  } = options;
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

  let res: Response;
  try {
    res = await fetchWithTimeout(
      url,
      {
        method,
        headers,
        body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
      },
      timeoutMs,
    );
  } catch (error) {
    wrapAuthFetchError(error, url, method);
  }

  // Auto-refresh on 401
  let refreshOutcome: RefreshOutcome | null = null;
  if (res.status === 401 && !noAuth && !noRefresh) {
    refreshOutcome = await tryRefreshToken();
    if (refreshOutcome === 'refreshed') {
      const newToken = await getAccessToken();
      if (newToken) headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetchWithTimeout(
        url,
        {
          method,
          headers,
          body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
        },
        timeoutMs,
      );
    }
  }

  if (!res.ok) {
    const errBody = await readErrorBody(res);
    const parsed = parseBackendError(errBody);
    const err = new ApiError(
      res.status,
      parsed.code,
      parsed.message,
      parsed.fieldErrors,
      { url, method },
    );
    console.warn(
      `[api] ${method} ${url} → ${res.status} ${parsed.code}: ${parsed.message}`,
    );
    if (res.status === 401) {
      const sessionDead =
        refreshOutcome === 'invalid' ||
        (refreshOutcome === 'unavailable' && !(await getRefreshToken()));
      if (sessionDead) {
        await clearTokens();
        emitAuthFailure(err);
      }
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
  options?: Pick<FetchOptions, 'timeoutMs' | 'noRefresh'>,
): Promise<SuccessResponse<T>> {
  return apiFetch<SuccessResponse<T>>(path, { method: 'GET', params, ...options });
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

export async function apiPostMultipart<T>(
  path: string,
  form: FormData,
  options?: Pick<FetchOptions, 'timeoutMs'>,
): Promise<SuccessResponse<T>> {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS } = options ?? {};
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = await getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetchWithTimeout(url, { method: 'POST', headers, body: form }, timeoutMs);

  let refreshOutcome: RefreshOutcome | null = null;
  if (res.status === 401) {
    refreshOutcome = await tryRefreshToken();
    if (refreshOutcome === 'refreshed') {
      const newToken = await getAccessToken();
      if (newToken) headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetchWithTimeout(url, { method: 'POST', headers, body: form }, timeoutMs);
    }
  }

  if (!res.ok) {
    const errBody = await readErrorBody(res);
    const parsed = parseBackendError(errBody);
    const err = new ApiError(
      res.status,
      parsed.code,
      parsed.message,
      parsed.fieldErrors,
      { url, method: 'POST' },
    );
    console.warn(`[api] POST ${url} → ${res.status} ${parsed.code}: ${parsed.message}`);
    if (res.status === 401) {
      const sessionDead =
        refreshOutcome === 'invalid' ||
        (refreshOutcome === 'unavailable' && !(await getRefreshToken()));
      if (sessionDead) {
        await clearTokens();
        emitAuthFailure(err);
      }
    }
    throw err;
  }

  if (res.status === 204) return { success: true, data: undefined as unknown as T };
  return (await res.json()) as SuccessResponse<T>;
}

// ── Auth endpoints (direct, no Bearer needed) ────────────────────

function wrapAuthFetchError(error: unknown, url: string, method: string): never {
  if (error instanceof ApiError) throw error;
  const message = error instanceof Error ? error.message : 'Network request failed';
  throw new ApiError(0, 'NETWORK_ERROR', message, {}, { url, method });
}

export async function authLogin(payload: {
  email: string;
  password: string;
  isRememberMe?: boolean;
}): Promise<{ accessToken: string; refreshToken: string; userId: string; email: string }> {
  const url = `${API_BASE_URL}/auth/login`;
  let res: Response;
  try {
    res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
        is_remember_me: payload.isRememberMe ?? MOBILE_DEFAULT_REMEMBER_ME,
      }),
    });
  } catch (error) {
    wrapAuthFetchError(error, url, 'POST');
  }

  if (!res.ok) {
    const errBody = await readErrorBody(res);
    const parsed = parseBackendError(errBody);
    console.warn(`[api] POST ${API_BASE_URL}/auth/login → ${res.status}: ${parsed.message}`);
    throw new ApiError(
      res.status,
      parsed.code,
      parsed.message,
      parsed.fieldErrors,
      { url: `${API_BASE_URL}/auth/login`, method: 'POST' },
    );
  }

  const json = await res.json();
  const data = json.data ?? json;
  await setTokens(data.access_token, data.refresh_token);
  const userId = data.user_id ?? data.id ?? data.user?.id ?? '';
  const email = data.user?.email ?? payload.email;
  await setUserSnapshot({ id: userId, email, status: data.user?.status ?? 'active' });
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    userId,
    email,
  };
}

export async function authRegister(payload: {
  email: string;
  password: string;
}): Promise<{ userId: string; email: string }> {
  const url = `${API_BASE_URL}/auth/register`;
  let res: Response;
  try {
    res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
      }),
    });
  } catch (error) {
    wrapAuthFetchError(error, url, 'POST');
  }

  if (!res.ok) {
    const errBody = await readErrorBody(res);
    const parsed = parseBackendError(errBody);
    console.warn(`[api] POST ${API_BASE_URL}/auth/register → ${res.status}: ${parsed.message}`);
    throw new ApiError(
      res.status,
      parsed.code,
      parsed.message,
      parsed.fieldErrors,
      { url: `${API_BASE_URL}/auth/register`, method: 'POST' },
    );
  }

  const json = await res.json();
  const data = json.data ?? json;
  return { userId: data.id ?? data.user_id ?? '', email: payload.email };
}

export async function authLogout(): Promise<void> {
  // Backend has no /auth/logout — sessions are revoked via DELETE /account/sessions/{id}.
  // Local token wipe is sufficient for mobile sign-out.
  await clearTokens();
}

/** Confirm web QR login — caller must already be authenticated on mobile. */
export async function authConfirmQrLogin(qrToken: string): Promise<void> {
  await apiPost<{ message: string }>('/auth/qr/confirm', { qr_token: qrToken });
}

/** OAuth authorize URL (no Bearer — pre-login). */
export async function fetchOAuthAuthorizeUrl(
  providerCode: string,
  redirectUri: string,
): Promise<string> {
  const path = `/auth/oauth/${providerCode}/authorize`;
  const url = `${API_BASE_URL}${path}?${new URLSearchParams({ redirect_uri: redirectUri }).toString()}`;
  let res: Response;
  try {
    res = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    wrapAuthFetchError(error, url, 'GET');
  }

  if (!res.ok) {
    const errBody = await readErrorBody(res);
    const parsed = parseBackendError(errBody);
    throw new ApiError(res.status, parsed.code, parsed.message, parsed.fieldErrors, {
      url,
      method: 'GET',
    });
  }

  const json = await res.json();
  const data = json.data ?? json;
  const authorizeUrl = data.authorize_url as string | undefined;
  if (!authorizeUrl) {
    throw new ApiError(502, 'INVALID_RESPONSE', 'Missing authorize_url', {}, { url, method: 'GET' });
  }
  return authorizeUrl;
}

/** Complete OAuth login — stores tokens like password login. */
export async function authOAuthLogin(payload: {
  provider: string;
  authorizationCode: string;
  redirectUri: string;
}): Promise<{ userId: string; email: string }> {
  const url = `${API_BASE_URL}/auth/login/oauth`;
  let res: Response;
  try {
    res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        provider: payload.provider,
        authorization_code: payload.authorizationCode,
        redirect_uri: payload.redirectUri,
        is_remember_me: MOBILE_DEFAULT_REMEMBER_ME,
      }),
    });
  } catch (error) {
    wrapAuthFetchError(error, url, 'POST');
  }

  if (!res.ok) {
    const errBody = await readErrorBody(res);
    const parsed = parseBackendError(errBody);
    throw new ApiError(res.status, parsed.code, parsed.message, parsed.fieldErrors, {
      url,
      method: 'POST',
    });
  }

  const json = await res.json();
  const data = json.data ?? json;
  await setTokens(data.access_token, data.refresh_token);
  const userId = data.user_id ?? data.id ?? data.user?.id ?? '';
  const email = data.user?.email ?? '';
  await setUserSnapshot({ id: userId, email, status: data.user?.status ?? 'active' });
  return { userId, email };
}

export { API_BASE_URL };
