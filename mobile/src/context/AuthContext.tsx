/**
 * Contexto de autenticação do app mobile.
 *
 * O JWT é persistido com `expo-secure-store` (Keychain no iOS / Keystore no
 * Android), nunca em `AsyncStorage` puro, por se tratar de uma credencial de
 * sessão. Ver https://docs.expo.dev/versions/latest/sdk/securestore/.
 *
 * Renovação silenciosa de sessão (`POST /api/auth/refresh`): ao restaurar
 * uma sessão persistida no boot do app, trocamos o token salvo por um novo
 * (TTL renovado de 7 dias) — assim um usuário que abre o app esporadicamente
 * não é deslogado só por o token antigo estar perto de expirar. Regras:
 *   - 401 no refresh (token já expirado/inválido) -> `onUnauthorized` global
 *     dispara `clearSession` (mesmo fluxo de "sessão expirada" de qualquer
 *     outra chamada) -> relogin normal.
 *   - Erro de rede no refresh -> falha SILENCIOSA; segue com o token atual
 *     (já persistido) e tenta de novo na próxima abertura do app.
 */

import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { login as loginRequest, refresh as refreshRequest } from '../api/auth';
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
          // Renovação silenciosa: troca o token salvo por um novo (TTL de
          // mais 7 dias) sempre que o app é reaberto com sessão válida.
          try {
            const newToken = await refreshRequest();
            setAuthToken(newToken);
            await SecureStore.setItemAsync(TOKEN_KEY, newToken);
          } catch {
            // 401: já tratado pelo handler global de `onUnauthorized`
            // (registrado no efeito abaixo) -> `clearSession` roda por lá.
            // Erro de rede/timeout ou qualquer outra falha: silencioso —
            // segue normalmente com o token atual já persistido.
          }
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
