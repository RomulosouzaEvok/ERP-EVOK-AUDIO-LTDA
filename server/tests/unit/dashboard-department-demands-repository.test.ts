/**
 * Test: `SequelizeDashboardRepository.getDepartmentDemands` — painel de TV
 * de demandas em aberto por departamento (OPs, requisições de compra,
 * contagens de inventário).
 *
 * @group unit
 */

const queryMock = jest.fn();

jest.mock('../../src/models/index', () => ({
  sequelize: { query: queryMock },
}));

import SequelizeDashboardRepository = require('../../src/modules/dashboard/infrastructure/sequelize/SequelizeDashboardRepository');

describe('SequelizeDashboardRepository.getDepartmentDemands', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('agrega OPs, requisições e contagens no departamento correto, mantendo ordem alfabética e "Sem departamento" por último', async () => {
    queryMock
      // departments
      .mockResolvedValueOnce([
        { id: 2, name: 'Engenharia' },
        { id: 1, name: 'Producao' },
      ])
      // production orders
      .mockResolvedValueOnce([
        { id: 10, reference: 'OP-2026-0001', status: 'planned', due_date: '2026-08-10', department_id: 1, label: 'Auto-falante 12"' },
        { id: 11, reference: 'OP-2026-0002', status: 'in_progress', due_date: '2026-08-15', department_id: null, label: 'Auto-falante 6"' },
      ])
      // purchase requisitions
      .mockResolvedValueOnce([
        { id: 20, reference: 'REQ-2026-0001', status: 'pending', due_date: '2026-08-01', department_id: 2, label: 'normal' },
      ])
      // inventory counts
      .mockResolvedValueOnce([
        { id: 30, reference: 'CC-2026-0001', status: 'counting', due_date: null, department_id: 1, label: 'cycle' },
      ]);

    const repository = new SequelizeDashboardRepository();
    const groups = await repository.getDepartmentDemands();

    // Ordem alfabetica dos departamentos ativos, "Sem departamento" por ultimo
    expect(groups.map((g: any) => g.department_name)).toEqual(['Engenharia', 'Producao', 'Sem departamento']);

    const engenharia = groups.find((g: any) => g.department_id === 2);
    expect(engenharia.open_purchase_requisitions.count).toBe(1);
    expect(engenharia.open_purchase_requisitions.items[0]).toMatchObject({ id: 20, reference: 'REQ-2026-0001', status: 'pending' });
    expect(engenharia.open_production_orders.count).toBe(0);
    expect(engenharia.open_inventory_counts.count).toBe(0);

    const producao = groups.find((g: any) => g.department_id === 1);
    expect(producao.open_production_orders.count).toBe(1);
    expect(producao.open_production_orders.items[0]).toMatchObject({ id: 10, reference: 'OP-2026-0001', label: 'Auto-falante 12"' });
    expect(producao.open_inventory_counts.count).toBe(1);
    expect(producao.open_inventory_counts.items[0]).toMatchObject({ id: 30, reference: 'CC-2026-0001' });

    const semDepartamento = groups.find((g: any) => g.department_id === null);
    expect(semDepartamento.department_name).toBe('Sem departamento');
    expect(semDepartamento.open_production_orders.count).toBe(1);
    expect(semDepartamento.open_production_orders.items[0]).toMatchObject({ id: 11, reference: 'OP-2026-0002' });
  });

  it('sempre retorna o grupo "Sem departamento" mesmo sem nenhuma demanda órfã', async () => {
    queryMock
      .mockResolvedValueOnce([{ id: 1, name: 'Producao' }]) // departments
      .mockResolvedValueOnce([]) // production orders
      .mockResolvedValueOnce([]) // purchase requisitions
      .mockResolvedValueOnce([]); // inventory counts

    const repository = new SequelizeDashboardRepository();
    const groups = await repository.getDepartmentDemands();

    expect(groups).toHaveLength(2);
    const semDepartamento = groups[groups.length - 1];
    expect(semDepartamento.department_id).toBeNull();
    expect(semDepartamento.open_production_orders).toEqual({ count: 0, items: [] });
    expect(semDepartamento.open_purchase_requisitions).toEqual({ count: 0, items: [] });
    expect(semDepartamento.open_inventory_counts).toEqual({ count: 0, items: [] });
  });

  it('filtra as queries por status "em aberto" corretos para cada entidade', async () => {
    queryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const repository = new SequelizeDashboardRepository();
    await repository.getDepartmentDemands();

    // 1ª chamada: departamentos ativos
    expect(queryMock.mock.calls[0][0]).toContain('FROM departments');

    // 2ª chamada: OPs em aberto (tudo exceto completed/canceled)
    expect(queryMock.mock.calls[1][0]).toContain('FROM production_orders');
    expect(queryMock.mock.calls[1][1].replacements.statuses).toEqual(['planned', 'released', 'in_progress', 'paused']);

    // 3ª chamada: requisicoes em aberto (ainda nao convertidas em pedido/canceladas)
    expect(queryMock.mock.calls[2][0]).toContain('FROM purchase_requisitions');
    expect(queryMock.mock.calls[2][1].replacements.statuses).toEqual(['draft', 'pending', 'approved']);

    // 4ª chamada: contagens em aberto (ainda nao aprovadas/rejeitadas/ajustadas)
    expect(queryMock.mock.calls[3][0]).toContain('FROM inventory_counts');
    expect(queryMock.mock.calls[3][1].replacements.statuses).toEqual(['draft', 'counting', 'pending_approval']);
  });

  it('descarta demandas vinculadas a um departamento inativo/inexistente (fora da lista de departamentos ativos)', async () => {
    queryMock
      .mockResolvedValueOnce([{ id: 1, name: 'Producao' }]) // departments (id 99 nao esta ativo)
      .mockResolvedValueOnce([
        { id: 10, reference: 'OP-2026-0001', status: 'planned', due_date: '2026-08-10', department_id: 99, label: 'Produto X' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const repository = new SequelizeDashboardRepository();
    const groups = await repository.getDepartmentDemands();

    const totalItems = groups.reduce((acc: number, g: any) => acc + g.open_production_orders.count, 0);
    expect(totalItems).toBe(0);
  });
});
