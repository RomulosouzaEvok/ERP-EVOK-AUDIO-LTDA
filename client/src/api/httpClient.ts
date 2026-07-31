import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const TOKEN_STORAGE_KEY = 'evok_erp_token';

/** Lê o token JWT persistido (se houver). */
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/** Persiste o token JWT após login/redefinição de senha. */
export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

/** Remove o token JWT (logout, sessão invalidada). */
export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/** Callback global chamado quando a API retorna 401 (token ausente/expirado/invalidado). */
let onUnauthorized: (() => void) | null = null;

/** Registra o handler de 401, chamado uma vez no bootstrap do `AuthProvider`. */
export function registerUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
});

httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearStoredToken();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

/** Formato de erro padrão retornado pela API do ERP (ver `server/src/middlewares/errorHandler.ts`). */
export interface ApiErrorPayload {
  success: false;
  error: string | { code?: string; message: string; details?: unknown[] };
}

/**
 * Extrai uma mensagem de erro legível de qualquer resposta de erro da API,
 * cobrindo tanto `{ error: string }` quanto `{ error: { message } }`.
 */
export function extractApiErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorPayload | undefined;
    if (data?.error) {
      return typeof data.error === 'string' ? data.error : data.error.message || fallback;
    }
    if (error.message) return error.message;
  }
  return fallback;
}
