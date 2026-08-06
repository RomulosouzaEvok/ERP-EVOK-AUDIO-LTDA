import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import InventoryCountsPage from './InventoryCountsPage';
import * as inventoryApi from '@/api/inventory';
import * as productsApi from '@/api/products';
import * as warehousesApi from '@/api/warehouses';
import * as usersApi from '@/api/users';

/**
 * Regressão do bug P0 da auditoria: `assigned_to: z.coerce.number().int().positive().optional()`
 * convertia `''` (opção "pool" do select, o caso mais comum) em `0`, que
 * falhava em `.positive()` ANTES do `.optional()` — criar uma contagem sem
 * atribuir ninguém falhava silenciosamente (sem mensagem de erro na tela).
 * Este arquivo cobre os dois caminhos: "pool" (campo vazio) e atribuição
 * explícita a um funcionário.
 */

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    hasRole: (...roles: string[]) => roles.includes('admin'),
  }),
}));

vi.mock('@/api/inventory');
vi.mock('@/api/products');
vi.mock('@/api/warehouses');
vi.mock('@/api/users');

const mockedInventoryApi = vi.mocked(inventoryApi);
const mockedProductsApi = vi.mocked(productsApi);
const mockedWarehousesApi = vi.mocked(warehousesApi);
const mockedUsersApi = vi.mocked(usersApi);

const WAREHOUSE = { id: 1, code: 'INSUMOS', name: 'Insumos', active: true };
const PRODUCT = {
  id: 10,
  code: 'PRD-001',
  name: 'Driver 8 polegadas',
  price: '100.00',
  cost_price: '50.00',
  quantity: '20.000000',
  min_quantity: '5.000000',
  status: 'active' as const,
  unit: 'UN',
};
const USER = { id: 7, name: 'Ana Almoxarife', email: 'ana@evokaudio.com', role: 'operator' as const, active: true, createdAt: '2026-01-01' };

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <InventoryCountsPage />
    </QueryClientProvider>,
  );
}

async function openCreateDialogAndSelectWarehouseAndProduct(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /nova contagem/i }));

  const dialog = await screen.findByRole('dialog');
  await user.selectOptions(within(dialog).getByLabelText(/depósito \*/i), '1');
  await user.click(within(dialog).getByText(/PRD-001/));
  return dialog;
}

describe('InventoryCountsPage — criação de contagem', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedInventoryApi.listInventoryCounts.mockResolvedValue({
      success: true,
      data: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
    });
    mockedInventoryApi.createInventoryCount.mockResolvedValue({
      count: { id: 1 } as unknown as inventoryApi.InventoryCount,
      items: [],
    });
    mockedProductsApi.listProducts.mockResolvedValue({
      success: true,
      data: [PRODUCT],
      pagination: { total: 1, page: 1, limit: 200, totalPages: 1 },
    });
    mockedWarehousesApi.listWarehouses.mockResolvedValue([WAREHOUSE]);
    mockedUsersApi.listUsers.mockResolvedValue({
      success: true,
      data: [USER],
      pagination: { total: 1, page: 1, limit: 200, totalPages: 1 },
    });
  });

  it('cria a contagem com "Atribuir a" vazio (pool) sem travar o botão nem falhar mudo', async () => {
    const user = userEvent.setup();
    renderPage();

    const dialog = await openCreateDialogAndSelectWarehouseAndProduct(user);

    // Deixa "Atribuir a" no valor default (pool) — não seleciona nada.
    await user.click(within(dialog).getByRole('button', { name: /criar contagem/i }));

    await waitFor(() => expect(mockedInventoryApi.createInventoryCount).toHaveBeenCalledTimes(1));
    expect(mockedInventoryApi.createInventoryCount).toHaveBeenCalledWith(
      expect.objectContaining({
        warehouse_id: 1,
        product_ids: [10],
        assigned_to: undefined,
      }),
    );

    // O diálogo fecha após sucesso — nenhum erro de validação ficou preso na tela.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('cria a contagem atribuída a um funcionário selecionado no dropdown', async () => {
    const user = userEvent.setup();
    renderPage();

    const dialog = await openCreateDialogAndSelectWarehouseAndProduct(user);

    await user.selectOptions(within(dialog).getByLabelText(/atribuir a/i), String(USER.id));
    await user.click(within(dialog).getByRole('button', { name: /criar contagem/i }));

    await waitFor(() => expect(mockedInventoryApi.createInventoryCount).toHaveBeenCalledTimes(1));
    expect(mockedInventoryApi.createInventoryCount).toHaveBeenCalledWith(
      expect.objectContaining({
        warehouse_id: 1,
        product_ids: [10],
        assigned_to: USER.id,
      }),
    );
  });
});

describe('InventoryCountsPage — reatribuição de contagem', () => {
  const DRAFT_COUNT = {
    id: 5,
    count_number: 'CNT-005',
    status: 'draft' as const,
    count_type: 'cycle' as const,
    warehouse_id: 1,
    location: null,
    assigned_to: null,
    assignedTo: null,
    createdAt: '2026-08-06T10:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockedInventoryApi.listInventoryCounts.mockResolvedValue({
      success: true,
      data: [DRAFT_COUNT],
      pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    mockedInventoryApi.reassignInventoryCount.mockResolvedValue({ ...DRAFT_COUNT, assigned_to: USER.id });
    mockedProductsApi.listProducts.mockResolvedValue({
      success: true,
      data: [PRODUCT],
      pagination: { total: 1, page: 1, limit: 200, totalPages: 1 },
    });
    mockedWarehousesApi.listWarehouses.mockResolvedValue([WAREHOUSE]);
    mockedUsersApi.listUsers.mockResolvedValue({
      success: true,
      data: [USER],
      pagination: { total: 1, page: 1, limit: 200, totalPages: 1 },
    });
  });

  it('reatribui a contagem a um funcionário selecionado no dialog', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /reatribuir/i }));

    const dialog = await screen.findByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText(/novo responsável/i), String(USER.id));
    await user.click(within(dialog).getByRole('button', { name: /confirmar/i }));

    await waitFor(() =>
      expect(mockedInventoryApi.reassignInventoryCount).toHaveBeenCalledWith(DRAFT_COUNT.id, USER.id),
    );
  });

  it('devolve a contagem ao pool (assigned_to: null)', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /reatribuir/i }));

    const dialog = await screen.findByRole('dialog');
    // Deixa a opção "Devolver ao pool" (valor default) selecionada.
    await user.click(within(dialog).getByRole('button', { name: /confirmar/i }));

    await waitFor(() =>
      expect(mockedInventoryApi.reassignInventoryCount).toHaveBeenCalledWith(DRAFT_COUNT.id, null),
    );
  });
});
