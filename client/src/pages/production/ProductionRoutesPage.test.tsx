import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { AxiosError } from 'axios';

import ProductionRoutesPage from './ProductionRoutesPage';
import * as productionRoutesApi from '@/api/productionRoutes';
import * as productsApi from '@/api/products';
import * as workCentersApi from '@/api/workCenters';

/**
 * Cobertura das duas coisas que só quebram em tempo de execução nesta tela
 * (typecheck não pega nenhuma das duas):
 *
 * 1. **Ordinal derivado da posição.** O backend exige `sequence` 1..N contígua
 *    (`G5-SEQ-GAP`/`G5-SEQ-DUP`) e o chão de fábrica numera de 10 em 10. A tela
 *    só é utilizável se mover/inserir etapa renumerar sozinho — este teste
 *    confere o payload realmente enviado ao `PUT /:id/steps`.
 * 2. **Nenhum código cru de regra na tela.** O backend devolve `G5-WC-INACTIVE`
 *    e afins em `details.rule`; o tradutor genérico despejaria isso na tela.
 */

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    hasRole: (...roles: string[]) => roles.includes('admin'),
    permissions: { producao: 'approve' },
  }),
}));

vi.mock('@/api/productionRoutes', async (importOriginal) => {
  const actual = await importOriginal<typeof productionRoutesApi>();
  return {
    ...actual,
    listProductionRoutes: vi.fn(),
    getProductionRouteById: vi.fn(),
    createProductionRoute: vi.fn(),
    updateProductionRoute: vi.fn(),
    replaceProductionRouteSteps: vi.fn(),
    activateProductionRoute: vi.fn(),
    inactivateProductionRoute: vi.fn(),
    reviseProductionRoute: vi.fn(),
    removeProductionRoute: vi.fn(),
  };
});
vi.mock('@/api/products');
vi.mock('@/api/workCenters');

const mockedRoutesApi = vi.mocked(productionRoutesApi);
const mockedProductsApi = vi.mocked(productsApi);
const mockedWorkCentersApi = vi.mocked(workCentersApi);

const PRODUCT = {
  id: 7,
  code: 'ALT-15',
  name: 'Alto-falante 15"',
  price: '900.00',
  cost_price: '400.00',
  quantity: '10.000000',
  min_quantity: '2.000000',
  status: 'active' as const,
  unit: 'UN',
  product_type: 'finished',
};

const WORK_CENTER = {
  id: 3,
  code: 'BOB-01',
  name: 'Bobinadeira',
  description: null,
  machines_count: 1,
  capacity_hours_per_day: 8,
  efficiency_factor: 1,
  active: true,
};

const ROUTE_HEADER: productionRoutesApi.ProductionRoute = {
  id: 55,
  product_id: 7,
  item_id: null,
  route_code: 'ROT-ALT15',
  revision: '00',
  status: 'draft',
  description: 'Roteiro principal',
  total_standard_time_minutes: '12.50',
  created_by: 1,
  approved_by: null,
  approved_at: null,
  product: { id: 7, code: 'ALT-15', name: 'Alto-falante 15"', product_type: 'finished', status: 'active' },
};

function buildStep(
  id: number,
  sequence: number,
  step_code: string,
  name: string,
): productionRoutesApi.ProductionRouteStep {
  return {
    id,
    production_route_id: 55,
    sequence,
    step_code,
    name,
    work_center: 'BOB-01',
    work_center_id: 3,
    standard_time_minutes: '4.50',
    setup_time_minutes: '20.00',
    instructions: null,
    quality_check_required: false,
    is_active: true,
    workCenter: { id: 3, code: 'BOB-01', name: 'Bobinadeira', active: true },
  };
}

const ROUTE_DETAIL: productionRoutesApi.ProductionRouteDetail = {
  ...ROUTE_HEADER,
  steps: [buildStep(101, 1, '10', 'Injetar cone'), buildStep(102, 2, '20', 'Bobinar voice coil')],
  total_setup_time_minutes: 40,
  steps_count: 2,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProductionRoutesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function selectRoute(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByText('ROT-ALT15'));
  await screen.findByLabelText(/operação 1 para cima/i);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedRoutesApi.listProductionRoutes.mockResolvedValue({
    success: true,
    data: [ROUTE_HEADER],
    pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
  });
  mockedRoutesApi.getProductionRouteById.mockResolvedValue(ROUTE_DETAIL);
  mockedRoutesApi.replaceProductionRouteSteps.mockResolvedValue(ROUTE_DETAIL.steps);
  mockedProductsApi.listProducts.mockResolvedValue({
    success: true,
    data: [PRODUCT],
    pagination: { total: 1, page: 1, limit: 200, totalPages: 1 },
  });
  mockedWorkCentersApi.listWorkCenters.mockResolvedValue({
    success: true,
    data: [WORK_CENTER],
    pagination: { total: 1, page: 1, limit: 100, totalPages: 1 },
  });
});

describe('ProductionRoutesPage — ordem das operações', () => {
  it('renumera sozinho ao mover uma operação para cima', async () => {
    const user = userEvent.setup();
    renderPage();
    await selectRoute(user);

    await user.click(screen.getByLabelText(/mover operação 2 para cima/i));
    await user.click(screen.getByRole('button', { name: /salvar operações/i }));

    await waitFor(() => expect(mockedRoutesApi.replaceProductionRouteSteps).toHaveBeenCalledTimes(1));

    const [routeId, steps] = mockedRoutesApi.replaceProductionRouteSteps.mock.calls[0];
    expect(routeId).toBe(55);
    // Ordinal vem da posição — a operação "20" subiu e virou a primeira, sem o
    // usuário digitar número nenhum; o código de fábrica acompanha a etapa.
    expect(steps.map((step) => [step.sequence, step.step_code])).toEqual([
      [1, '20'],
      [2, '10'],
    ]);
  });

  it('mantém a sequência contígua ao inserir uma operação no meio', async () => {
    const user = userEvent.setup();
    renderPage();
    await selectRoute(user);

    await user.click(screen.getAllByRole('button', { name: /inserir abaixo/i })[0]);

    // A nova etapa nasce em branco na posição 2: preenche código e nome.
    const codeInputs = screen.getAllByLabelText(/código da operação/i);
    expect(codeInputs).toHaveLength(3);
    await user.type(codeInputs[1], '15');
    await user.type(screen.getAllByLabelText(/^operação$/i)[1], 'Prensar surround');

    await user.click(screen.getByRole('button', { name: /salvar operações/i }));

    await waitFor(() => expect(mockedRoutesApi.replaceProductionRouteSteps).toHaveBeenCalledTimes(1));

    const [, steps] = mockedRoutesApi.replaceProductionRouteSteps.mock.calls[0];
    expect(steps.map((step) => step.sequence)).toEqual([1, 2, 3]);
    expect(steps.map((step) => step.step_code)).toEqual(['10', '15', '20']);
  });

  it('bloqueia o salvamento e aponta a linha quando o código da operação se repete', async () => {
    const user = userEvent.setup();
    renderPage();
    await selectRoute(user);

    const codeInputs = screen.getAllByLabelText(/código da operação/i);
    await user.clear(codeInputs[1]);
    await user.type(codeInputs[1], '10');

    await user.click(screen.getByRole('button', { name: /salvar operações/i }));

    expect(await screen.findByText(/código repetido: já usado na etapa 1/i)).toBeInTheDocument();
    expect(mockedRoutesApi.replaceProductionRouteSteps).not.toHaveBeenCalled();
  });
});

describe('ProductionRoutesPage — roteiro liberado é congelado', () => {
  const ACTIVE_DETAIL: productionRoutesApi.ProductionRouteDetail = {
    ...ROUTE_DETAIL,
    status: 'active',
    approved_at: '2026-08-10T12:00:00.000Z',
    approvedBy: { id: 2, name: 'Gerente de Produção', email: 'gerente@evokaudio.com' },
  };

  beforeEach(() => {
    mockedRoutesApi.listProductionRoutes.mockResolvedValue({
      success: true,
      data: [{ ...ROUTE_HEADER, status: 'active' }],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });
    mockedRoutesApi.getProductionRouteById.mockResolvedValue(ACTIVE_DETAIL);
    mockedRoutesApi.reviseProductionRoute.mockResolvedValue({
      ...ROUTE_HEADER,
      id: 56,
      route_code: 'ROT-ALT15-R01',
      revision: '01',
      status: 'draft',
    });
  });

  it('esconde o editor e oferece a nova revisão como caminho de alteração', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText('ROT-ALT15'));

    expect(await screen.findByText(/somente leitura/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /salvar operações/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /criar nova revisão/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /criar revisão em rascunho/i }));

    await waitFor(() => expect(mockedRoutesApi.reviseProductionRoute).toHaveBeenCalledTimes(1));
    // Sem revisão/código informados, o backend sugere ambos — o payload precisa
    // sair vazio, e não com strings em branco (que virariam 400 de validação).
    expect(mockedRoutesApi.reviseProductionRoute.mock.calls[0]).toEqual([55, {}]);

    expect(await screen.findByText(/revisão 01 criada como rascunho/i)).toBeInTheDocument();
  });
});

describe('ProductionRoutesPage — tradução de erro de regra', () => {
  it('explica a recusa por centro de trabalho desativado sem mostrar o código G5', async () => {
    mockedRoutesApi.activateProductionRoute.mockRejectedValue(
      new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: {},
        config: {} as never,
        data: {
          success: false,
          error: {
            code: 'BUSINESS_RULE_ERROR',
            message: 'Centro de trabalho inativo nao pode ser usado em roteiro: BOB-01.',
            details: { rule: 'G5-WC-INACTIVE', work_center_ids: [3] },
          },
        },
      }),
    );

    const user = userEvent.setup();
    renderPage();
    await selectRoute(user);

    await user.click(screen.getByRole('button', { name: /liberar roteiro/i }));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/não foi possível liberar o roteiro/i)).toBeInTheDocument();
    expect(within(alert).getByText(/centro de trabalho que foi desativado/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('G5-');
  });
});
