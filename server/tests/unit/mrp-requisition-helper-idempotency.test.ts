/**
 * Test: idempotencia e numeracao do helper
 * `createRequisitionFromPlannedOrders` (defeito CRITICO 2 e achado BAIXO 15
 * da auditoria de 2026-08-11).
 *
 * O helper e o unico ponto por onde ordem planejada vira Requisicao de
 * Compra — pelos dois caminhos (conversao manual do planejador e conversao
 * automatica do MRP). Ate a correcao ele criava cabecalho e itens novos a
 * CADA chamada, sem olhar se a ordem ja tinha virado requisicao, e numerava
 * com `RQ-${Date.now()}` (carimbo de tempo, nao numeracao).
 */

import createRequisitionFromPlannedOrders = require(
  '../../src/modules/mrp/application/use-cases/support/createRequisitionFromPlannedOrders'
);

/**
 * Monta os dublês de repositorio usados pelo helper.
 *
 * @returns Repositorios dublê com espioes.
 */
function buildRepositories() {
  const requisitionRepository = {
    nextRequisitionNumberForYear: jest.fn(async (yearPrefix: string) => `${yearPrefix}-0007`),
    createRequisition: jest.fn(async (data: any) => ({ id: 77, ...data })),
    createRequisitionItem: jest.fn(async (data: any) => ({ id: Math.random(), ...data })),
  };
  const itemSupplierRepository = {
    findPreferredByItem: jest.fn(async () => null),
  };

  return { requisitionRepository, itemSupplierRepository };
}

/**
 * Ordem planejada no formato do repositorio do MRP.
 *
 * @param id - Id da ordem.
 * @param status - Status atual da ordem.
 * @returns Ordem planejada dublê.
 */
function plannedOrder(id: string, status: string) {
  return {
    id,
    item_id: `item-${id}`,
    status,
    quantidade_planejada: '10.000000',
    data_necessidade: '2026-08-20',
  };
}

describe('createRequisitionFromPlannedOrders', () => {
  it('ignora ordens que ja viraram requisicao e converte apenas as pendentes', async () => {
    const repos = buildRepositories();

    const requisition = await createRequisitionFromPlannedOrders({
      plannedOrders: [
        plannedOrder('order-1', 'RASCUNHO'),
        plannedOrder('order-2', 'EM_EXECUCAO'),
        plannedOrder('order-3', 'APROVADA'),
        plannedOrder('order-4', 'CANCELADA'),
      ],
      requesterId: 9,
      origin: 'mrp_auto',
      notes: 'teste',
      requisitionRepository: repos.requisitionRepository as any,
      itemSupplierRepository: repos.itemSupplierRepository as any,
      transaction: { id: 'tx-1' },
    });

    expect(requisition).toMatchObject({
      id: 77,
      requisition_number: `RQ-${new Date().getFullYear()}-0007`,
    });
    expect(repos.requisitionRepository.createRequisitionItem).toHaveBeenCalledTimes(2);
    const convertidos = repos.requisitionRepository.createRequisitionItem.mock.calls.map(
      ([payload]: any[]) => payload.item_id,
    );
    expect(convertidos).toEqual(['item-order-1', 'item-order-3']);
  });

  it('deduplica a mesma ordem repetida no lote (um item de requisicao, nao dois)', async () => {
    const repos = buildRepositories();

    await createRequisitionFromPlannedOrders({
      plannedOrders: [plannedOrder('order-1', 'RASCUNHO'), plannedOrder('order-1', 'RASCUNHO')],
      requesterId: 9,
      origin: 'mrp',
      notes: 'teste',
      requisitionRepository: repos.requisitionRepository as any,
      itemSupplierRepository: repos.itemSupplierRepository as any,
      transaction: { id: 'tx-1' },
    });

    expect(repos.requisitionRepository.createRequisitionItem).toHaveBeenCalledTimes(1);
  });

  it('nao cria cabecalho nenhum quando nada e convertivel (nada de requisicao vazia na fila de Suprimentos)', async () => {
    const repos = buildRepositories();

    const requisition = await createRequisitionFromPlannedOrders({
      plannedOrders: [plannedOrder('order-1', 'EM_EXECUCAO'), plannedOrder('order-2', 'CONCLUIDA')],
      requesterId: 9,
      origin: 'mrp_auto',
      notes: 'teste',
      requisitionRepository: repos.requisitionRepository as any,
      itemSupplierRepository: repos.itemSupplierRepository as any,
      transaction: { id: 'tx-1' },
    });

    expect(requisition).toBeNull();
    expect(repos.requisitionRepository.nextRequisitionNumberForYear).not.toHaveBeenCalled();
    expect(repos.requisitionRepository.createRequisition).not.toHaveBeenCalled();
    expect(repos.requisitionRepository.createRequisitionItem).not.toHaveBeenCalled();
  });

  it('pede o numero ao repositorio no padrao anual do ERP (RQ-YYYY-NNNN)', async () => {
    const repos = buildRepositories();

    await createRequisitionFromPlannedOrders({
      plannedOrders: [plannedOrder('order-1', 'RASCUNHO')],
      requesterId: 9,
      origin: 'mrp',
      notes: 'teste',
      requisitionRepository: repos.requisitionRepository as any,
      itemSupplierRepository: repos.itemSupplierRepository as any,
      transaction: { id: 'tx-1' },
    });

    expect(repos.requisitionRepository.nextRequisitionNumberForYear).toHaveBeenCalledWith(
      `RQ-${new Date().getFullYear()}`,
      { id: 'tx-1' },
    );
    const [payload] = repos.requisitionRepository.createRequisition.mock.calls[0];
    expect(String(payload.requisition_number)).toMatch(/^RQ-\d{4}-\d{4,}$/);
  });
});
