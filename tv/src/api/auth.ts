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
