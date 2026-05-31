/**
 * Auth context for mobile — manages JWT token lifecycle,
 * user state, and login/logout flows.
 */

import NetInfo from '@react-native-community/netinfo';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  ApiError,
  authLogin,
  authLogout,
  authRegister,
  clearAllAuthState,
  ensureFreshAccessToken,
  getUserSnapshot,
  hasRestorableSession,
  hasStoredSession,
  setUserSnapshot,
  subscribeAuthFailure,
} from '@/lib/api-client';
import { signInWithOAuth, type MobileOAuthProvider } from '@/lib/oauth';
import { apiGet } from '@/lib/api-client';
import { clearDataCache } from '@/lib/cache/data-cache';
import { clearMutationQueue } from '@/lib/cache/mutation-queue';
import { scheduleSmartSyncOnReconnect } from '@/lib/cache/sync-engine';
import { isDeviceOffline } from '@/lib/network-status';
import { unregisterPushOnLogout } from '@/hooks/use-push-notifications';

export interface AuthUser {
  id: string;
  email: string;
  status: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOffline: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  loginWithOAuth: (provider: MobileOAuthProvider) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_BOOTSTRAP_TIMEOUT_MS = 10_000;

type BackendUser = {
  id: string;
  email: string;
  status: string;
  is_email_confirmed: boolean;
};

function mapBackendUser(data: BackendUser): AuthUser {
  return {
    id: data.id,
    email: data.email,
    status: data.status,
  };
}

async function persistUser(user: AuthUser): Promise<void> {
  await setUserSnapshot(user);
}

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  return err.status === 0 || err.status === 408 || err.code === 'NETWORK_ERROR' || err.code === 'TIMEOUT';
}

function isAuthError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}

async function loadOfflineUser(): Promise<AuthUser | null> {
  const snapshot = await getUserSnapshot();
  if (snapshot) return snapshot;
  if (await hasStoredSession()) {
    return { id: 'offline', email: '', status: 'active' };
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const authGeneration = useRef(0);

  const forceLogout = useCallback(async (generation: number) => {
    if (generation !== authGeneration.current) return;
    clearDataCache();
    clearMutationQueue();
    await clearAllAuthState();
    setUser(null);
    setIsOffline(false);
  }, []);

  const hydrateOfflineUser = useCallback(async (generation: number): Promise<boolean> => {
    const offlineUser = await loadOfflineUser();
    if (!offlineUser || generation !== authGeneration.current) return false;
    setUser(offlineUser);
    setIsOffline(true);
    return true;
  }, []);

  const fetchAndPersistUser = useCallback(async (generation: number): Promise<boolean> => {
    const res = await apiGet<BackendUser>('/account/me', undefined, {
      timeoutMs: AUTH_BOOTSTRAP_TIMEOUT_MS,
    });

    if (generation !== authGeneration.current) return false;

    const nextUser = mapBackendUser(res.data);
    await persistUser(nextUser);
    setUser(nextUser);
    setIsOffline(false);
    return true;
  }, []);

  const restoreSession = useCallback(async (generation: number) => {
    const canRestore = await hasRestorableSession();
    if (!canRestore || generation !== authGeneration.current) {
      if (generation === authGeneration.current) {
        setUser(null);
        setIsOffline(false);
      }
      return;
    }

    const offline = await isDeviceOffline();
    if (offline) {
      await hydrateOfflineUser(generation);
      return;
    }

    const token = await ensureFreshAccessToken();
    if (!token) {
      await forceLogout(generation);
      return;
    }

    try {
      await fetchAndPersistUser(generation);
    } catch (err) {
      if (generation !== authGeneration.current) return;

      if (isAuthError(err)) {
        await forceLogout(generation);
        return;
      }

      if (isNetworkError(err)) {
        await hydrateOfflineUser(generation);
        return;
      }

      await hydrateOfflineUser(generation);
    }
  }, [fetchAndPersistUser, forceLogout, hydrateOfflineUser]);

  const validateWhenOnline = useCallback(async (generation: number) => {
    if (generation !== authGeneration.current) return;

    const offline = await isDeviceOffline();
    if (offline) {
      setIsOffline(true);
      return;
    }

    const token = await ensureFreshAccessToken();
    if (!token) {
      await forceLogout(generation);
      return;
    }

    try {
      await fetchAndPersistUser(generation);
      scheduleSmartSyncOnReconnect();
    } catch (err) {
      if (generation !== authGeneration.current) return;

      if (isAuthError(err)) {
        await forceLogout(generation);
        return;
      }

      if (isNetworkError(err)) {
        setIsOffline(true);
        return;
      }

      setIsOffline(true);
    }
  }, [fetchAndPersistUser, forceLogout]);

  useEffect(() => {
    let cancelled = false;
    const generation = authGeneration.current;

    void (async () => {
      try {
        await restoreSession(generation);
      } finally {
        if (!cancelled && generation === authGeneration.current) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [restoreSession]);

  useEffect(() => {
    return subscribeAuthFailure(() => {
      authGeneration.current += 1;
      const generation = authGeneration.current;
      void forceLogout(generation).finally(() => {
        if (generation === authGeneration.current) {
          setIsLoading(false);
        }
      });
    });
  }, [forceLogout]);

  useEffect(() => {
    const onAppState = (state: AppStateStatus) => {
      if (state !== 'active') return;
      const generation = authGeneration.current;
      void validateWhenOnline(generation);
    };

    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [validateWhenOnline]);

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      if (!online) {
        setIsOffline(true);
        return;
      }

      const generation = authGeneration.current;
      if (!user) return;
      void validateWhenOnline(generation);
    });

    return () => sub();
  }, [user, validateWhenOnline]);

  const login = useCallback(async (email: string, password: string, remember = true) => {
    const result = await authLogin({ email, password, isRememberMe: remember });
    authGeneration.current += 1;
    const generation = authGeneration.current;
    setIsOffline(false);

    try {
      const res = await apiGet<BackendUser>('/account/me');
      if (generation !== authGeneration.current) return;
      const nextUser = mapBackendUser(res.data);
      await persistUser(nextUser);
      setUser(nextUser);
    } catch {
      const fallback: AuthUser = {
        id: result.userId,
        email: result.email,
        status: 'active',
      };
      await persistUser(fallback);
      setUser(fallback);
    }
  }, []);

  const loginWithOAuth = useCallback(async (provider: MobileOAuthProvider) => {
    const result = await signInWithOAuth(provider);
    authGeneration.current += 1;
    const generation = authGeneration.current;
    setIsOffline(false);

    try {
      const res = await apiGet<BackendUser>('/account/me');
      if (generation !== authGeneration.current) return;
      const nextUser = mapBackendUser(res.data);
      await persistUser(nextUser);
      setUser(nextUser);
    } catch {
      const fallback: AuthUser = {
        id: result.userId,
        email: result.email,
        status: 'active',
      };
      await persistUser(fallback);
      setUser(fallback);
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    await authRegister({ email, password });
  }, []);

  const logout = useCallback(async () => {
    authGeneration.current += 1;
    clearDataCache();
    clearMutationQueue();
    await unregisterPushOnLogout().catch(() => undefined);
    await authLogout();
    setUser(null);
    setIsOffline(false);
  }, []);

  const refreshUser = useCallback(async () => {
    const generation = authGeneration.current;
    setIsLoading(true);
    try {
      await restoreSession(generation);
    } finally {
      if (generation === authGeneration.current) {
        setIsLoading(false);
      }
    }
  }, [restoreSession]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      isOffline,
      login,
      loginWithOAuth,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, isOffline, login, loginWithOAuth, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const fallbackAuth: AuthContextValue = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  isOffline: false,
  login: async () => {},
  loginWithOAuth: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) return fallbackAuth;
  return ctx;
}
