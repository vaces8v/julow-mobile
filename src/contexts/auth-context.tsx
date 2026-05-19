/**
 * Auth context for mobile — manages JWT token lifecycle,
 * user state, and login/logout flows.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  authLogin,
  authLogout,
  authRegister,
  clearTokens,
  getAccessToken,
  subscribeAuthFailure,
  ApiError,
} from '@/lib/api-client';
import { apiGet } from '@/lib/api-client';

export interface AuthUser {
  id: string;
  email: string;
  status: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        setUser(null);
        return;
      }
      type BackendUser = {
        id: string;
        email: string;
        status: string;
        is_email_confirmed: boolean;
      };
      const res = await apiGet<BackendUser>('/account/me');
      setUser({
        id: res.data.id,
        email: res.data.email,
        status: res.data.status,
      });
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    fetchMe().finally(() => setIsLoading(false));
  }, [fetchMe]);

  useEffect(() => {
    return subscribeAuthFailure(() => {
      setUser(null);
    });
  }, []);

  const login = useCallback(async (email: string, password: string, remember = false) => {
    const result = await authLogin({ email, password, isRememberMe: remember });
    setUser({ id: result.userId, email: result.email, status: 'active' });
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    await authRegister({ email, password });
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refreshUser: fetchMe,
    }),
    [user, isLoading, login, register, logout, fetchMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const fallbackAuth: AuthContextValue = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  // Return fallback during expo-router layout discovery (renders screens
  // before providers are mounted). Without this, the app crashes on startup.
  if (!ctx) return fallbackAuth;
  return ctx;
}
