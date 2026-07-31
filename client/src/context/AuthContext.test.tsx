import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AuthProvider, useAuth } from './AuthContext';
import { clearStoredToken, getStoredToken } from '@/api/httpClient';
import * as authApi from '@/api/auth';

vi.mock('@/api/auth');

const mockedAuthApi = vi.mocked(authApi);

function TestConsumer() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();

  if (isLoading) return <p>carregando</p>;

  return (
    <div>
      <p data-testid="status">{isAuthenticated ? `logado:${user?.name}` : 'deslogado'}</p>
      <button onClick={() => login('admin@evokaudio.com.br', 'senha123')}>Entrar</button>
      <button onClick={logout}>Sair</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    clearStoredToken();
    vi.clearAllMocks();
  });

  /**
   * Sem token persistido, o provider nao deve tentar chamar `getMe` e deve
   * comecar deslogado.
   *
   * @returns Promise resolvida apos a renderizacao inicial estabilizar.
   */
  it('comeca deslogado quando nao ha token persistido', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('deslogado'));
    expect(mockedAuthApi.getMe).not.toHaveBeenCalled();
  });

  /**
   * `login()` deve persistir o token, atualizar o usuario no contexto, e
   * `logout()` deve limpar tudo de volta.
   *
   * @returns Promise resolvida apos o ciclo login -> logout.
   */
  it('login persiste o token e atualiza o usuario; logout limpa a sessao', async () => {
    mockedAuthApi.login.mockResolvedValue({
      token: 'token-de-teste',
      user: { id: 1, name: 'Administrador', email: 'admin@evokaudio.com.br', role: 'admin' },
    });

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('deslogado'));

    await user.click(screen.getByText('Entrar'));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('logado:Administrador'));
    expect(getStoredToken()).toBe('token-de-teste');

    await user.click(screen.getByText('Sair'));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('deslogado'));
    expect(getStoredToken()).toBeNull();
  });

  /**
   * Com um token persistido invalido (rejeitado por `getMe`), o provider
   * deve limpar o token e comecar deslogado, nunca travar em loading.
   *
   * @returns Promise resolvida apos a sessao invalida ser limpa.
   */
  it('limpa o token se a sessao persistida for invalida', async () => {
    setStoredTokenForTest('token-invalido');
    mockedAuthApi.getMe.mockRejectedValue(new Error('401'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('deslogado'));
    expect(getStoredToken()).toBeNull();
  });
});

function setStoredTokenForTest(token: string): void {
  localStorage.setItem('evok_erp_token', token);
}
