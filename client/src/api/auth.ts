import { httpClient } from './httpClient';

export type UserRole = 'admin' | 'operator' | 'financial';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

interface LoginResponse {
  success: true;
  data: { token: string; user: AuthUser };
}

interface MeResponse {
  success: true;
  data: AuthUser;
}

interface MessageResponse {
  success: true;
  data: { message: string };
}

/** `POST /api/auth/login`. */
export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const { data } = await httpClient.post<LoginResponse>('/api/auth/login', { email, password });
  return data.data;
}

/** `GET /api/auth/me`. */
export async function getMe(): Promise<AuthUser> {
  const { data } = await httpClient.get<MeResponse>('/api/auth/me');
  return data.data;
}

/** `PUT /api/auth/change-password` — SEC-09/SEC-10: invalida a sessão atual após trocar. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<string> {
  const { data } = await httpClient.put<MessageResponse>('/api/auth/change-password', {
    currentPassword,
    newPassword,
  });
  return data.data.message;
}

/** `POST /api/auth/forgot-password` — SEC-12: sempre responde com mensagem genérica. */
export async function forgotPassword(email: string): Promise<string> {
  const { data } = await httpClient.post<MessageResponse>('/api/auth/forgot-password', { email });
  return data.data.message;
}

/** `POST /api/auth/reset-password` — SEC-12: conclui a recuperação com o token recebido por e-mail. */
export async function resetPassword(token: string, newPassword: string): Promise<string> {
  const { data } = await httpClient.post<MessageResponse>('/api/auth/reset-password', { token, newPassword });
  return data.data.message;
}
