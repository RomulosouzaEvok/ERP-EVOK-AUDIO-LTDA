/**
 * Client de autenticação — `POST /api/auth/login`. Mesmo endpoint e contrato
 * usados pelo app mobile (`mobile/src/api/auth.ts`).
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
 * Client de renovação silenciosa de sessão — `POST /api/auth/refresh`. Mesmo
 * endpoint/contrato usado pelo app mobile (`mobile/src/api/auth.ts`),
 * duplicado aqui por instrução explícita (padrão já aceito no projeto).
 *
 * Contrato exato (programado contra a especificação combinada com o time de
 * backend, endpoint implementado em paralelo):
 *   Request:  `POST /api/auth/refresh`, header `Authorization: Bearer <token ainda válido>`, sem body.
 *   Response: `{ success: true, data: { token: string } }` (novo JWT, TTL renovado de 7 dias).
 *   Token expirado/inválido -> 401 (tratar como sessão expirada / relogin).
 *
 * Usado pelo `AuthContext` da TV para renovação PROATIVA (ao carregar a
 * sessão e depois em ciclo periódico), já que o painel fica "sempre ligado"
 * e não pode nunca alcançar os 7 dias de expiração do JWT enquanto tiver
 * rede.
 */
export interface RefreshApiResponse {
  success: true;
  data: { token: string };
}

export async function refresh(): Promise<string> {
  const response = await apiRequest<RefreshApiResponse>('/auth/refresh', {
    method: 'POST',
    // 401 (token já expirado/inválido) deve disparar o handler global de
    // sessão expirada (mesmo fluxo de logout já existente) — por isso NÃO
    // usamos skipAuthRedirect aqui, ao contrário do login.
  });
  return response.data.token;
}
