import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

import { extractApiErrorMessage, getStoredToken, setStoredToken, clearStoredToken } from './httpClient';

describe('httpClient: persistencia de token', () => {
  afterEach(() => {
    clearStoredToken();
  });

  it('persiste, le e limpa o token', () => {
    expect(getStoredToken()).toBeNull();
    setStoredToken('meu-token-jwt');
    expect(getStoredToken()).toBe('meu-token-jwt');
    clearStoredToken();
    expect(getStoredToken()).toBeNull();
  });
});

describe('extractApiErrorMessage', () => {
  beforeEach(() => {
    clearStoredToken();
  });

  /**
   * A API do ERP retorna erro tanto como `{ error: "string" }` (controllers
   * legados) quanto `{ error: { message: "..." } }` (validacao Zod
   * estruturada) - o frontend precisa extrair uma mensagem legivel dos dois
   * formatos sem quebrar.
   */
  it('extrai mensagem de erro no formato string', () => {
    const error = buildAxiosError({ success: false, error: 'Email ou senha incorretos' });
    expect(extractApiErrorMessage(error)).toBe('Email ou senha incorretos');
  });

  it('extrai mensagem de erro no formato objeto estruturado', () => {
    const error = buildAxiosError({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Payload invalido.' } });
    expect(extractApiErrorMessage(error)).toBe('Payload invalido.');
  });

  it('usa a mensagem de fallback quando o erro nao e um AxiosError (mesmo sendo um Error comum)', () => {
    expect(extractApiErrorMessage(new Error('erro generico'), 'Fallback customizado')).toBe('Fallback customizado');
    expect(extractApiErrorMessage('nao e um Error', 'Fallback customizado')).toBe('Fallback customizado');
  });
});

function buildAxiosError(data: unknown): AxiosError {
  const error = new AxiosError('Request failed', undefined, undefined, undefined, {
    data,
    status: 400,
    statusText: 'Bad Request',
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() } as never,
  });
  // Garante que axios.isAxiosError reconheca o objeto (mesmo mecanismo usado internamente pelo axios).
  Object.defineProperty(error, 'isAxiosError', { value: true });
  return error;
}
