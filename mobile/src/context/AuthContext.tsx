/**
 * Contexto de autenticação do app mobile.
 *
 * O JWT é persistido com `expo-secure-store` (Keychain no iOS / Keystore no
 * Android), nunca em `AsyncStorage` puro, por se tratar de uma credencial de
 * sessão. Ver https://docs.expo.dev/versions/latest/sdk/securestore/.
 */

import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { login as loginRequest } from '../api/auth';
import { setAuthToken, setUnauthorizedHandler } from '../api/client';
import type { AuthUser } from '../api/types';

const TOKEN_KEY = 'evok_erp_jwt_token';
const USER_KEY = 'evok_erp_jwt_user';

interface AuthContextValue {
  /** `true` enquanto o token salvo ainda está sendo lido do SecureStore no boot do app. */
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  const clearSession = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
    await SecureStore.deleteItemAsync(USER_KEY).catch(() => undefined);
  }, []);

  // Restaura sessão salva ao abrir o app.
  useEffect(() => {
    (async () => {
      try {
        const [token, storedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (token && storedUser) {
          setAuthToken(token);
          setUser(JSON.parse(storedUser) as AuthUser);
        }
      } catch {
        // SecureStore indisponível/corrompido: trata como deslogado.
        await clearSession();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [clearSession]);

  // Registra o handler global de 401 (sessão expirada/token inválido em qualquer chamada).
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: authUser } = await loginRequest(email, password);
    setAuthToken(token);
    setUser(authUser);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(authUser));
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ isLoading, isAuthenticated: user !== null, user, login, logout }),
    [isLoading, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  }
  return ctx;
}
