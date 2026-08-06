/**
 * Client de autenticação — `POST /api/auth/login`.
 *
 * Contrato exato (ver `server/src/modules/auth/presentation/controllers/authController.ts`):
 *   Request:  `{ email: string, password: string }`
 *   Response: `{ success: true, data: { token, user: { id, name, email, role } } }`
 */

import { apiRequest } from './client';
import type { LoginResponseData } from './types';

export interface LoginApiResponse {
  success: true;
  data: LoginResponseData;
}

export async function login(email: string, password: string): Promise<LoginResponseData> {
  const response = await apiRequest<LoginApiResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
    // A própria tela de login trata o 401 (credenciais inválidas) localmente —
    // não deve disparar o handler global de "sessão expirada".
    skipAuthRedirect: true,
  });
  return response.data;
}

/**
 * Client de renovação silenciosa de sessão — `POST /api/auth/refresh`.
 *
 * Contrato exato (programado contra a especificação combinada com o time de
 * backend, endpoint implementado em paralelo — não confundir com o
 * `/auth/login` acima):
 *   Request:  `POST /api/auth/refresh`, header `Authorization: Bearer <token ainda válido>`, sem body.
 *   Response: `{ success: true, data: { token: string } }` (novo JWT, TTL renovado de 7 dias).
 *   Token expirado/inválido -> 401 (tratar como sessão expirada / relogin).
 *
 * Usado pelo `AuthContext` para trocar o token ao abrir o app com sessão
 * persistida, evitando que o usuário seja deslogado só por o app ter ficado
 * fechado por vários dias.
 */
export interface RefreshApiResponse {
  success: true;
  data: { token: string };
}

export async function refresh(): Promise<string> {
  const response = await apiRequest<RefreshApiResponse>('/auth/refresh', {
    method: 'POST',
    // Se o token já estiver expirado/inválido, o 401 deve disparar o
    // handler global de sessão expirada (fluxo de logout normal) — por isso
    // aqui NÃO usamos skipAuthRedirect, ao contrário do login.
  });
  return response.data.token;
}
