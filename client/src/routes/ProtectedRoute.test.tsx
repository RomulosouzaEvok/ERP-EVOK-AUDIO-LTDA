import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { ProtectedRoute, RoleRoute, ModuleRoute, AnyModuleRoute } from './ProtectedRoute';
import { AuthProvider } from '@/context/AuthContext';
import { clearStoredToken } from '@/api/httpClient';
import * as authApi from '@/api/auth';
import * as accessProfilesApi from '@/api/accessProfiles';

vi.mock('@/api/auth');
vi.mock('@/api/accessProfiles');

const mockedAuthApi = vi.mocked(authApi);
const mockedAccessProfilesApi = vi.mocked(accessProfilesApi);

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
            <Route element={<ModuleRoute module="manutencao" />}>
              <Route path="/maintenance" element={<p>ordens de manutencao</p>} />
            </Route>
            <Route element={<AnyModuleRoute modules={['relatorios.producao', 'relatorios.compras']} />}>
              <Route path="/reports" element={<p>relatorios</p>} />
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

  /**
   * `ModuleRoute` (Bloco E, `docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md`)
   * bloqueia a rota `/maintenance` (nova, ligada a `MaintenanceOrdersTab`)
   * para um usuario `operator` sem o modulo `manutencao` no perfil de
   * acesso — mostra a tela de acesso negado, nao a tela do modulo.
   */
  it('bloqueia /maintenance para operator sem o modulo manutencao no perfil', async () => {
    localStorage.setItem('evok_erp_token', 'token-valido');
    mockedAuthApi.getMe.mockResolvedValue({ id: 2, name: 'Operador', email: 'operador@evok.local', role: 'operator' });
    mockedAccessProfilesApi.getMyPermissions.mockResolvedValue({ modules: { estoque: 'operate' }, profile: { id: 1, nome: 'Logistica' } });

    renderWithRoute('/maintenance');

    await waitFor(() => expect(screen.queryByText('ordens de manutencao')).not.toBeInTheDocument());
  });

  /**
   * Usuario com o modulo `manutencao` atribuido acessa `/maintenance`
   * normalmente.
   */
  it('permite acesso a /maintenance para usuario com o modulo manutencao no perfil', async () => {
    localStorage.setItem('evok_erp_token', 'token-valido');
    mockedAuthApi.getMe.mockResolvedValue({ id: 3, name: 'Tecnico', email: 'tecnico@evok.local', role: 'operator' });
    mockedAccessProfilesApi.getMyPermissions.mockResolvedValue({ modules: { manutencao: 'operate' }, profile: { id: 2, nome: 'Manutencao' } });

    renderWithRoute('/maintenance');

    await waitFor(() => expect(screen.getByText('ordens de manutencao')).toBeInTheDocument());
  });

  /**
   * `AnyModuleRoute` (Bloco E) libera `/reports` se o usuario tiver
   * QUALQUER um dos modulos de relatorio informados (OR, nao AND) — aqui
   * so tem `relatorios.compras`, nao `relatorios.producao`, e ainda assim
   * acessa (a pagina se auto-filtra por aba dentro dela).
   */
  it('permite acesso a /reports (AnyModuleRoute) com apenas um dos modulos de relatorio', async () => {
    localStorage.setItem('evok_erp_token', 'token-valido');
    mockedAuthApi.getMe.mockResolvedValue({ id: 4, name: 'Comprador', email: 'comprador@evok.local', role: 'operator' });
    mockedAccessProfilesApi.getMyPermissions.mockResolvedValue({
      modules: { 'relatorios.compras': 'operate' },
      profile: { id: 3, nome: 'Compras' },
    });

    renderWithRoute('/reports');

    await waitFor(() => expect(screen.getByText('relatorios')).toBeInTheDocument());
  });
});
