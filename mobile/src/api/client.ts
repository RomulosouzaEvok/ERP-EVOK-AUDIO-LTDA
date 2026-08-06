/**
 * Client HTTP genérico do app mobile, espelhando o padrão de tratamento de
 * erro usado em `client/src/api/` (frontend web): centraliza parsing do
 * envelope JSON do backend (`{ success, data }` / `{ success: false, error }`)
 * e traduz erros HTTP em mensagens didáticas para o usuário final.
 *
 * Formatos de erro observados em `server/src/middlewares/errorHandler.ts`:
 *   - AppError (400/401/403/404/409/422...): `{ success: false, error: { code, message, details? } }`
 *   - Erros legados/Sequelize/rate-limit:     `{ success: false, error: "mensagem" }`
 *
 * Este client aceita as duas formas.
 */

import { API_URL } from '../config/env';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let authToken: string | null = null;

/** Define (ou limpa, passando `null`) o token JWT usado em todas as requisições subsequentes. */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

/** Callback opcional disparado quando a API responde 401 (sessão expirada/token inválido). */
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Não dispara `onUnauthorized` em 401 (usado pela própria tela de login). */
  skipAuthRedirect?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return base;

  const params = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

  return params.length > 0 ? `${base}?${params.join('&')}` : base;
}

/** Extrai uma mensagem legível do envelope de erro do backend (string ou `{code, message}`). */
function extractErrorMessage(payload: unknown, fallback: string): { message: string; code?: string; details?: unknown } {
  if (payload && typeof payload === 'object' && 'error' in (payload as Record<string, unknown>)) {
    const errorField = (payload as Record<string, unknown>).error;
    if (typeof errorField === 'string') {
      return { message: errorField };
    }
    if (errorField && typeof errorField === 'object') {
      const errObj = errorField as { message?: string; code?: string; details?: unknown };
      return { message: errObj.message ?? fallback, code: errObj.code, details: errObj.details };
    }
  }
  return { message: fallback };
}

const FRIENDLY_MESSAGES: Record<number, string> = {
  401: 'Sessão expirada ou credenciais inválidas. Faça login novamente.',
  403: 'Você não tem permissão para realizar esta ação. Fale com o administrador do sistema.',
  404: 'Registro não encontrado.',
  429: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.',
  500: 'Erro interno do servidor. Tente novamente em instantes.',
};

/**
 * Tempo máximo de espera por uma resposta antes de abortar a requisição.
 * Necessário em rede industrial instável (Wi-Fi de chão de fábrica, VPN,
 * túnel reverso) para evitar spinner infinito quando o servidor não
 * responde nem falha explicitamente.
 */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Executa uma requisição autenticada contra a API do ERP.
 *
 * @throws {ApiError} Erro tratado com `status`, `code` opcional e `message` amigável.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, skipAuthRedirect } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (networkError) {
    if (networkError instanceof Error && networkError.name === 'AbortError') {
      throw new ApiError('Tempo de conexão esgotado — verifique a rede.', 0);
    }
    throw new ApiError(
      'Não foi possível conectar ao servidor. Verifique sua conexão de rede e se o endereço da API (EXPO_PUBLIC_API_URL) está correto.',
      0
    );
  } finally {
    clearTimeout(timeoutId);
  }

  let payload: unknown = null;
  const rawText = await response.text();
  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const fallback = FRIENDLY_MESSAGES[response.status] ?? `Erro inesperado (HTTP ${response.status}).`;
    const { message, code, details } = extractErrorMessage(payload, fallback);

    if (response.status === 401 && !skipAuthRedirect) {
      onUnauthorized?.();
    }

    throw new ApiError(message, response.status, code, details);
  }

  return payload as T;
}
