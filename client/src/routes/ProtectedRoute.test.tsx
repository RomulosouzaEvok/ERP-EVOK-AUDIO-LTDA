import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { ProtectedRoute, RoleRoute } from './ProtectedRoute';
import { AuthProvider } from '@/context/AuthContext';
import { clearStoredToken } from '@/api/httpClient';
import * as authApi from '@/api/auth';

vi.mock('@/api/auth');

const mockedAuthApi = vi.mocked(authApi);

function renderWithRoute(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<p>tela de login</p>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<p>area protegida</p>} />
            <Route element={<RoleRoute roles={['admin']} />}>
              <Route path="/admin-only" element={<p>somente admin</p>} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute / RoleRoute', () => {
  beforeEach(() => {
    clearStoredToken();
    vi.clearAllMocks();
  });

  /**
   * Sem sessao autenticada, qualquer rota protegida redireciona para /login.
   *
   * @returns Promise resolvida apos o redirecionamento.
   */
  it('redireciona para /login quando nao autenticado', async () => {
    renderWithRoute('/');
    await waitFor(() => expect(screen.getByText('tela de login')).toBeInTheDocument());
  });

  /**
   * `RoleRoute` bloqueia acesso quando o usuario autenticado nao tem o
   * role exigido - importante lembrar que isso e so UX (esconder tela),
   * a autorizacao de verdade e sempre da API.
   *
   * @returns Promise resolvida apos validar o bloqueio por role.
   */
  it('bloqueia rota admin-only para usuario operator', async () => {
    localStorage.setItem('evok_erp_token', 'token-valido');
    mockedAuthApi.getMe.mockResolvedValue({ id: 2, name: 'Operador', email: 'operador@evok.local', role: 'operator' });

    renderWithRoute('/admin-only');

    await waitFor(() => expect(screen.getByText('area protegida')).toBeInTheDocument());
    expect(screen.queryByText('somente admin')).not.toBeInTheDocument();
  });

  /**
   * Usuario `admin` autenticado consegue acessar rota protegida por role.
   *
   * @returns Promise resolvida apos validar o acesso permitido.
   */
  it('permite acesso a rota admin-only para usuario admin', async () => {
    localStorage.setItem('evok_erp_token', 'token-valido');
    mockedAuthApi.getMe.mockResolvedValue({ id: 1, name: 'Administrador', email: 'admin@evokaudio.com.br', role: 'admin' });

    renderWithRoute('/admin-only');

    await waitFor(() => expect(screen.getByText('somente admin')).toBeInTheDocument());
  });
});
