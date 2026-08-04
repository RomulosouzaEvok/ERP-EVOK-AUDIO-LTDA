import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AuthProvider, useAuth } from './AuthContext';
import { clearStoredToken } from '@/api/httpClient';
import * as authApi from '@/api/auth';
import * as accessProfilesApi from '@/api/accessProfiles';

vi.mock('@/api/auth');
vi.mock('@/api/accessProfiles');

const mockedAuthApi = vi.mocked(authApi);
const mockedAccessProfilesApi = vi.mocked(accessProfilesApi);

/**
 * Consumidor de teste que expõe `hasModuleAccess`/`permissionsFetchFailed`
 * para validar a lógica do menu dinâmico (UC-34/UC-35) sem depender do
 * `AppLayout` completo (evita acoplar o teste a ícones/rotas).
 */
function TestConsumer() {
  const { isLoading, isPermissionsLoading, hasModuleAccess, permissionsFetchFailed, login } = useAuth();

  if (isLoading) return <p>carregando</p>;

  return (
    <div>
      <p data-testid="permissions-loading">{isPermissionsLoading ? 'carregando-permissoes' : 'permissoes-prontas'}</p>
      <p data-testid="fetch-failed">{permissionsFetchFailed ? 'falhou' : 'ok'}</p>
      <p data-testid="estoque">{hasModuleAccess('estoque') ? 'tem-acesso' : 'sem-acesso'}</p>
      <p data-testid="financeiro">{hasModuleAccess('financeiro') ? 'tem-acesso' : 'sem-acesso'}</p>
      <button onClick={() => login('operador@evokaudio.com.br', 'senha123')}>Entrar</button>
    </div>
  );
}

describe('AuthContext — permissões por perfil de acesso (UC-34/UC-35)', () => {
  beforeEach(() => {
    clearStoredToken();
    vi.clearAllMocks();
  });

  /**
   * Usuário com perfil "Almoxarife" ({ estoque: operate }) tem acesso ao
   * módulo estoque, mas não ao financeiro (bloqueio total fora da área).
   *
   * @returns Promise resolvida após o mapa de permissões ser resolvido.
   */
  it('hasModuleAccess reflete o mapa module->nivel resolvido do backend', async () => {
    mockedAuthApi.login.mockResolvedValue({
      token: 'token-de-teste',
      user: { id: 2, name: 'Operador Almoxarife', email: 'operador@evokaudio.com.br', role: 'operator' },
    });
    mockedAccessProfilesApi.getMyPermissions.mockResolvedValue({
      modules: { estoque: 'operate' },
      profile: { id: 10, nome: 'Almoxarife' },
    });

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('Entrar')).toBeInTheDocument());
    await user.click(screen.getByText('Entrar'));

    await waitFor(() => expect(screen.getByTestId('estoque')).toHaveTextContent('tem-acesso'));
    expect(screen.getByTestId('financeiro')).toHaveTextContent('sem-acesso');
    expect(screen.getByTestId('fetch-failed')).toHaveTextContent('ok');
  });

  /**
   * Fallback de segurança: se `GET /api/auth/me/permissions` falhar (erro
   * de rede/500), `permissionsFetchFailed` fica `true` e `hasModuleAccess`
   * não trava o usuário (o `AppLayout` deve então usar a regra antiga de
   * role, não este mapa) — nunca deve lançar/travar a aplicação.
   *
   * @returns Promise resolvida após o fallback ser aplicado.
   */
  it('fallback de seguranca: falha de rede em me/permissions nao trava a sessao', async () => {
    mockedAuthApi.login.mockResolvedValue({
      token: 'token-de-teste',
      user: { id: 3, name: 'Operador Sem Rede', email: 'semrede@evokaudio.com.br', role: 'operator' },
    });
    mockedAccessProfilesApi.getMyPermissions.mockRejectedValue(new Error('Network Error'));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('Entrar')).toBeInTheDocument());
    await user.click(screen.getByText('Entrar'));

    await waitFor(() => expect(screen.getByTestId('fetch-failed')).toHaveTextContent('falhou'));
    expect(screen.getByTestId('estoque')).toHaveTextContent('sem-acesso');
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  /**
   * Usuário sem nenhum módulo no perfil (ou sem perfil): `modules: {}` —
   * nenhum acesso é concedido (UC-35-Exceção, bloqueio total).
   *
   * @returns Promise resolvida após validar o mapa vazio.
   */
  it('usuario sem perfil atribuido recebe mapa de modulos vazio (bloqueio total)', async () => {
    mockedAuthApi.login.mockResolvedValue({
      token: 'token-de-teste',
      user: { id: 4, name: 'Novo Usuario', email: 'novo@evokaudio.com.br', role: 'operator' },
    });
    mockedAccessProfilesApi.getMyPermissions.mockResolvedValue({
      modules: {},
      profile: null,
    });

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('Entrar')).toBeInTheDocument());
    await user.click(screen.getByText('Entrar'));

    await waitFor(() => expect(screen.getByTestId('permissions-loading')).toHaveTextContent('permissoes-prontas'));
    expect(screen.getByTestId('estoque')).toHaveTextContent('sem-acesso');
    expect(screen.getByTestId('financeiro')).toHaveTextContent('sem-acesso');
    expect(screen.getByTestId('fetch-failed')).toHaveTextContent('ok');
  });
});
