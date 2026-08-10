import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';

import App from './App';
import * as masterProductionApi from '@/api/masterProduction';
import * as dashboardApi from '@/api/dashboard';

/**
 * Fiação de rota — o que nenhum teste de página pega.
 *
 * Um teste de componente renderiza a página direto e prova que ela funciona;
 * ele **não** prova que alguém consegue chegar nela. Entre o usuário e o
 * componente existem a tabela de rotas do `App`, o guard `ModuleRoute`, o
 * `lazy()` do code-splitting e a entrada de menu — e errar qualquer um deles
 * produz exatamente o mesmo sintoma que "a tela não existe", sem nenhum teste
 * vermelho.
 *
 * Esta suite monta o roteador REAL num caminho, com a API dublada, e confere
 * as três coisas que o navegador confirmaria: a rota resolve, o guard barra
 * quem não tem o módulo, e o link aparece no menu.
 *
 * @module App.routes.test
 */

const permissionsMock = { current: { mrp: 'operate' } as Record<string, string> };

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { id: 1, name: 'Planejador PCP', email: 'pcp@evokaudio.com.br', role: 'operator' },
    hasRole: (...roles: string[]) => roles.includes('operator'),
    hasModuleAccess: (module: string) => Boolean(permissionsMock.current[module]),
    permissions: permissionsMock.current,
    logout: vi.fn(),
  }),
}));

vi.mock('@/api/masterProduction');
vi.mock('@/api/dashboard');

const mockedMasterProduction = vi.mocked(masterProductionApi);
const mockedDashboard = vi.mocked(dashboardApi);

/**
 * Monta o `App` (tabela de rotas real) num caminho.
 *
 * @param path - Rota inicial.
 * @returns Utilitários do Testing Library.
 */
function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Fiacao de rotas — Plano Mestre de Producao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissionsMock.current = { mrp: 'operate' };
    mockedDashboard.getDashboardHandoffs.mockResolvedValue({} as never);
    mockedMasterProduction.listMasterPlans.mockResolvedValue({
      success: true,
      data: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });
  });

  it('/production/master-plans resolve na tela do Plano Mestre', async () => {
    renderAt('/production/master-plans');

    // O `lazy()` precisa resolver: se o import apontasse para o arquivo errado,
    // o Suspense nunca sairia do fallback.
    expect(await screen.findByRole('heading', { name: /Plano Mestre de Produção/i })).toBeInTheDocument();
    // E a tela chamou a API — ou seja, chegou viva do outro lado do guard.
    expect(mockedMasterProduction.listMasterPlans).toHaveBeenCalled();
  });

  it('o link do Plano Mestre aparece no menu de quem tem o modulo mrp', async () => {
    renderAt('/production/master-plans');

    // O layout publica o mesmo item em mais de um lugar (barra lateral e
    // navegação compacta), então o que importa é que TODOS apontem para a
    // mesma rota — um link divergente levaria parte dos usuários a lugar
    // nenhum.
    const links = await screen.findAllByRole('link', { name: /Plano Mestre \(MPS\)/i });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/production/master-plans');
    }
  });

  it('quem NAO tem o modulo mrp e barrado pelo guard, e a tela nem chama a API', async () => {
    permissionsMock.current = { producao: 'operate' };

    renderAt('/production/master-plans');

    expect(await screen.findByRole('heading', { name: /Acesso negado/i })).toBeInTheDocument();
    // O guard tem de barrar ANTES de montar a página: consultar o plano e só
    // depois esconder a tela vazaria dado para quem não pode vê-lo.
    expect(mockedMasterProduction.listMasterPlans).not.toHaveBeenCalled();
  });
});
