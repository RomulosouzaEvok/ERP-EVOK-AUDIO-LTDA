import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';

import LoginPage from './LoginPage';
import { AuthProvider } from '@/context/AuthContext';
import { clearStoredToken } from '@/api/httpClient';
import * as authApi from '@/api/auth';

vi.mock('@/api/auth');

const mockedAuthApi = vi.mocked(authApi);

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>pagina inicial</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    clearStoredToken();
    vi.clearAllMocks();
  });

  /**
   * Nao deve chamar a API se os campos obrigatorios estiverem vazios -
   * a validacao Zod client-side deve barrar antes.
   *
   * @returns Promise resolvida apos validar que a API nao foi chamada.
   */
  it('mostra erro de validacao e nao chama a API com o formulario vazio', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText(/informe um e-mail válido/i)).toBeInTheDocument();
    expect(mockedAuthApi.login).not.toHaveBeenCalled();
  });

  /**
   * Credenciais invalidas: a API rejeita e a mensagem de erro deve aparecer
   * na tela, sem navegar para a pagina inicial.
   *
   * @returns Promise resolvida apos validar a mensagem de erro exibida.
   */
  it('exibe a mensagem de erro da API quando o login falha', async () => {
    mockedAuthApi.login.mockRejectedValue({
      isAxiosError: true,
      response: { data: { success: false, error: 'Email ou senha incorretos' } },
    });

    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/e-mail/i), 'admin@evokaudio.com.br');
    await user.type(screen.getByLabelText(/senha/i), 'senha-errada');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText('Email ou senha incorretos')).toBeInTheDocument();
    expect(screen.queryByText('pagina inicial')).not.toBeInTheDocument();
  });

  /**
   * Login bem-sucedido navega para a rota inicial ("/").
   *
   * @returns Promise resolvida apos a navegacao pos-login.
   */
  it('navega para a pagina inicial apos login bem-sucedido', async () => {
    mockedAuthApi.login.mockResolvedValue({
      token: 'token-valido',
      user: { id: 1, name: 'Administrador', email: 'admin@evokaudio.com.br', role: 'admin' },
    });

    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/e-mail/i), 'admin@evokaudio.com.br');
    await user.type(screen.getByLabelText(/senha/i), 'senha-correta');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(screen.getByText('pagina inicial')).toBeInTheDocument());
  });
});
