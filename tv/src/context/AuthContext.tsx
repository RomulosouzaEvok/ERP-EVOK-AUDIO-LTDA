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
 *
 * Renovação PROATIVA de sessão (`POST /api/auth/refresh`): como o painel
 * fica "sempre ligado" (sem interação humana que gere novas chamadas de
 * login), o token precisa ser trocado por um novo periodicamente para nunca
 * chegar aos 7 dias de expiração do JWT. Estratégia:
 *   - Refresh imediato ao restaurar a sessão salva (boot/reboot do aparelho).
 *   - Refresh recorrente a cada `REFRESH_INTERVAL_MS` (12h) enquanto a
 *     sessão estiver ativa — bem abaixo do TTL de 7 dias, com folga generosa
 *     para tolerar longos períodos sem rede (fica ~14 ciclos de folga antes
 *     de realmente expirar).
 *   - 401 no refresh (token já expirado/inválido) -> `onUnauthorized`
 *     global dispara `clearSession` (fluxo de logout já existente).
 *   - Erro de rede no refresh -> falha SILENCIOSA; mantém o token atual e
 *     tenta de novo no próximo ciclo (NUNCA desloga por erro de rede).
 */

import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { login as loginRequest, refresh as refreshRequest } from '../api/auth';
import { setAuthToken, setUnauthorizedHandler } from '../api/client';
import type { AuthUser } from '../api/types';

const TOKEN_KEY = 'evok_erp_tv_jwt_token';
const USER_KEY = 'evok_erp_tv_jwt_user';

/** Intervalo entre renovações proativas do token enquanto o painel está ligado. */
const REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 horas

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
  // Ref (não state) para o interval de refresh conseguir checar "está
  // logado agora?" sem precisar recriar o `setInterval` a cada mudança de
  // usuário.
  const isAuthenticatedRef = useRef(false);

  const clearSession = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    isAuthenticatedRef.current = false;
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
    await SecureStore.deleteItemAsync(USER_KEY).catch(() => undefined);
  }, []);

  /**
   * Executa um ciclo de renovação silenciosa: pede um token novo e
   * substitui o salvo. 401 é tratado pelo handler global de
   * `onUnauthorized` (dispara `clearSession`); qualquer outro erro
   * (rede/timeout) é silencioso — mantém o token atual e tenta de novo no
   * próximo ciclo.
   */
  const silentRefresh = useCallback(async () => {
    if (!isAuthenticatedRef.current) return;
    try {
      const newToken = await refreshRequest();
      setAuthToken(newToken);
      await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    } catch {
      // 401 -> já tratado por onUnauthorized (registrado abaixo).
      // Erro de rede/timeout -> silencioso, mantém sessão atual.
    }
  }, []);

  // Restaura sessão salva ao ligar a TV/abrir o app — é o comportamento
  // esperado: login uma vez, painel sempre ligado depois disso. Em seguida
  // já dispara um refresh imediato (renovação proativa pós-boot).
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
          isAuthenticatedRef.current = true;
        }
      } catch {
        // SecureStore indisponível/corrompido: trata como deslogado.
        await clearSession();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [clearSession]);

  // Renovação proativa periódica: dispara um refresh assim que a sessão fica
  // ativa e depois a cada `REFRESH_INTERVAL_MS`, enquanto o app estiver
  // aberto. Roda sempre (o próprio `silentRefresh` é no-op se deslogado).
  useEffect(() => {
    if (!user) return;
    silentRefresh();
    const intervalId = setInterval(silentRefresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [user, silentRefresh]);

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
    isAuthenticatedRef.current = true;
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
