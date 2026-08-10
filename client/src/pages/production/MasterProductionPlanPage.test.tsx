import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';

import MasterProductionPlanPage from './MasterProductionPlanPage';
import * as masterProductionApi from '@/api/masterProduction';

/**
 * Cobertura do que só quebra em tempo de execução nesta tela — typecheck não
 * pega nenhum dos quatro:
 *
 * 1. **Sugerido e planejado são colunas distintas.** Fundi-las apagaria a
 *    divergência entre o cálculo do sistema e a decisão da pessoa, que é
 *    exatamente o que uma auditoria de PCP procura.
 * 2. **A quantidade enviada é a digitada**, não a sugerida — se a tela
 *    ignorasse o campo, o planejador acharia que decidiu e teria só
 *    confirmado a máquina (decisão D-F).
 * 3. **Firmar fica bloqueado enquanto ninguém decidiu nada**, espelhando o
 *    422 do backend em vez de deixar o usuário descobrir pelo erro.
 * 4. **Produto com demanda que o MPS não planeja aparece na tela.** Omissão
 *    silenciosa aqui é demanda perdida.
 */

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    hasRole: (...roles: string[]) => roles.includes('admin'),
    permissions: { mrp: 'operate' },
  }),
}));

vi.mock('@/api/masterProduction');

const mockedApi = vi.mocked(masterProductionApi);

const PLAN_HEADER: masterProductionApi.MasterPlan = {
  id: 1,
  plan_number: 'MPS-2026-0001',
  horizon_start: '2026-08-10',
  horizon_end: '2026-09-10',
  status: 'draft',
  planner_id: 1,
  consolidated_at: '2026-08-10T12:00:00.000Z',
  firmed_by: null,
  firmed_at: null,
  released_by: null,
  released_at: null,
  canceled_by: null,
  canceled_at: null,
  cancel_reason: null,
  notes: null,
};

/**
 * Monta uma linha do plano.
 *
 * @param overrides - Campos a sobrescrever.
 * @returns Linha pronta para o dublê da API.
 */
function buildLine(overrides: Partial<masterProductionApi.MasterPlanLine> = {}): masterProductionApi.MasterPlanLine {
  return {
    id: 10,
    plan_id: 1,
    product_id: 77,
    product: { id: 77, code: 'ALT-12', name: 'Alto-falante 12"' },
    demand_sales_orders: '8.000000',
    demand_safety_stock: '4.000000',
    demand_forecast: '0.000000',
    gross_requirement: '12.000000',
    supply_on_hand: '2.000000',
    supply_withheld: '3.000000',
    supply_reserved: '0.000000',
    supply_in_production: '0.000000',
    net_requirement: '10.000000',
    suggested_quantity: '10.000000',
    planned_quantity: '0.000000',
    due_date: '2026-09-10',
    status: 'pending',
    production_order_id: null,
    decided_by: null,
    decided_at: null,
    notes: null,
    ...overrides,
  };
}

/**
 * Renderiza a página com os provedores que ela espera.
 *
 * @returns Utilitários do Testing Library.
 */
function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MasterProductionPlanPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MasterProductionPlanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.listMasterPlans.mockResolvedValue({
      success: true,
      data: [PLAN_HEADER],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });
    mockedApi.getMasterPlan.mockResolvedValue({
      ...PLAN_HEADER,
      lines: [buildLine()],
      summary: {
        total_lines: 1,
        pending_lines: 1,
        planned_lines: 0,
        dismissed_lines: 0,
        released_lines: 0,
        total_suggested_quantity: '10.000000',
        total_planned_quantity: '0.000000',
      },
    });
    mockedApi.decideMasterPlanLine.mockResolvedValue(buildLine({ status: 'planned', planned_quantity: '6.000000' }));
  });

  it('mostra sugerido e planejado como colunas separadas, com o retido pela qualidade visivel', async () => {
    renderPage();

    await screen.findByText('MPS-2026-0001');

    const row = (await screen.findByText('ALT-12')).closest('tr') as HTMLElement;
    expect(row).not.toBeNull();
    // Sugestão do sistema: 10. Decisão da pessoa: ainda nenhuma.
    expect(within(row).getByText('10')).toBeInTheDocument();
    const quantityField = within(row).getByLabelText('Quantidade planejada de ALT-12') as HTMLInputElement;
    expect(quantityField.value).toBe('0.000000');
    // O material retido pela Qualidade não some: ele explica por que o
    // disponível é menor que o saldo físico.
    expect(within(row).getByText('3 retido')).toBeInTheDocument();
  });

  it('envia a quantidade DIGITADA pelo planejador, nao a sugerida pelo sistema', async () => {
    const user = userEvent.setup();
    renderPage();

    const row = (await screen.findByText('ALT-12')).closest('tr') as HTMLElement;
    const quantityField = within(row).getByLabelText('Quantidade planejada de ALT-12');

    await user.clear(quantityField);
    await user.type(quantityField, '6');
    await user.click(within(row).getByRole('button', { name: 'Planejar' }));

    await waitFor(() => {
      expect(mockedApi.decideMasterPlanLine).toHaveBeenCalledWith(1, 10, { planned_quantity: '6' });
    });
  });

  it('descartar a linha manda `dismiss`, sem quantidade nenhuma', async () => {
    const user = userEvent.setup();
    renderPage();

    const row = (await screen.findByText('ALT-12')).closest('tr') as HTMLElement;
    await user.click(within(row).getByRole('button', { name: 'Descartar' }));

    await waitFor(() => {
      expect(mockedApi.decideMasterPlanLine).toHaveBeenCalledWith(1, 10, { dismiss: true });
    });
  });

  it('bloqueia "Firmar decisao" enquanto nenhuma linha foi decidida', async () => {
    renderPage();

    const firmButton = await screen.findByRole('button', { name: /Firmar decisão/i });
    expect(firmButton).toBeDisabled();
  });

  it('libera "Firmar decisao" quando ha ao menos uma linha decidida', async () => {
    mockedApi.getMasterPlan.mockResolvedValue({
      ...PLAN_HEADER,
      lines: [buildLine({ status: 'planned', planned_quantity: '6.000000' })],
      summary: {
        total_lines: 1,
        pending_lines: 0,
        planned_lines: 1,
        dismissed_lines: 0,
        released_lines: 0,
        total_suggested_quantity: '10.000000',
        total_planned_quantity: '6.000000',
      },
    });

    renderPage();

    const firmButton = await screen.findByRole('button', { name: /Firmar decisão/i });
    await waitFor(() => expect(firmButton).toBeEnabled());
  });

  it('avisa quando um produto com demanda ficou de fora do plano', async () => {
    const user = userEvent.setup();
    mockedApi.createMasterPlan.mockResolvedValue({
      plan: PLAN_HEADER,
      lines: [buildLine()],
      skipped: [{ product_id: 99, code: 'PARAF-M6', name: 'Parafuso M6', reason: 'produto de compra' }],
    });

    renderPage();

    await user.click(await screen.findByRole('button', { name: /Novo plano/i }));
    await user.type(screen.getByLabelText('Início do horizonte'), '2026-08-10');
    await user.type(screen.getByLabelText('Fim do horizonte'), '2026-09-10');
    await user.click(screen.getByRole('button', { name: /Consolidar demanda/i }));

    expect(await screen.findByText(/ficaram de fora do plano/i)).toBeInTheDocument();
    expect(screen.getByText(/PARAF-M6/)).toBeInTheDocument();
  });
});
