/**
 * Contexto de autenticação do app de TV — cópia adaptada de
 * `mobile/src/context/AuthContext.tsx` (mesmo padrão, reaproveitado por
 * instrução explícita).
 *
 * O JWT é persistido com `expo-secure-store` (Keystore no Android), nunca em
 * `AsyncStorage` puro. Diferente do mobile, o objetivo aqui é logar UMA VEZ
 * no aparelho e nunca mais pedir login — não há fluxo de logout na UI (fora
 * de escopo desta entrega); a sessão só é limpa automaticamente se o backend
 * responder 401 (token expirado/inválido) em alguma chamada.
 */

import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { login as loginRequest } from '../api/auth';
import { setAuthToken, setUnauthorizedHandler } from '../api/client';
import type { AuthUser } from '../api/types';

const TOKEN_KEY = 'evok_erp_tv_jwt_token';
const USER_KEY = 'evok_erp_tv_jwt_user';

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

  // Restaura sessão salva ao ligar a TV/abrir o app — é o comportamento
  // esperado: login uma vez, painel sempre ligado depois disso.
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
