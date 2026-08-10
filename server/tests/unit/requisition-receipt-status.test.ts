/**
 * Gap G15 — estados mortos do ENUM `purchase_requisitions.status`.
 *
 * Ate 2026-08-09 `partial` e `received` existiam no ENUM e **nenhuma rotina
 * do sistema jamais os atingia**: a requisicao morria em `ordered` e ninguem
 * conseguia responder "esta requisicao foi atendida?" — o elo final do rastro
 * requisicao -> pedido -> recebimento -> estoque ficava aberto.
 *
 * Cobre:
 * 1. a regra pura `resolveRequisitionStatusAfterReceipt` (todos os desfechos,
 *    incluindo os casos em que ela deve deliberadamente NAO mexer);
 * 2. a integracao em `ReceivePurchaseItemsUseCase`, que e o unico gatilho —
 *    e o unico ponto do sistema que sabe o que de fato chegou.
 *
 * @group unit
 * @ticket G15
 */

import { resolveRequisitionStatusAfterReceipt } from '../../src/modules/purchases/application/services/syncRequisitionReceiptStatus';

describe('G15 — resolveRequisitionStatusAfterReceipt (regra pura)', () => {
  it('marca `received` quando todos os pedidos chegaram e nao sobrou saldo requisitado', () => {
    expect(resolveRequisitionStatusAfterReceipt({
      currentStatus: 'ordered',
      purchaseStatuses: ['received', 'received'],
      requisitionItemStatuses: ['ordered', 'ordered'],
    })).toBe('received');
  });

  it('marca `partial` quando um dos pedidos gerados ainda nao chegou', () => {
    expect(resolveRequisitionStatusAfterReceipt({
      currentStatus: 'ordered',
      purchaseStatuses: ['received', 'sent'],
      requisitionItemStatuses: ['ordered', 'ordered'],
    })).toBe('partial');
  });

  it('marca `partial` quando o unico pedido chegou pela metade', () => {
    expect(resolveRequisitionStatusAfterReceipt({
      currentStatus: 'ordered',
      purchaseStatuses: ['partial'],
      requisitionItemStatuses: ['ordered'],
    })).toBe('partial');
  });

  it('NAO fecha em `received` se ainda ha item requisitado que nunca virou pedido', () => {
    // Conversao/adjudicacao parcial (G12): o item `pending` e saldo de compra
    // que nunca foi pedido — a requisicao nao esta atendida, por mais que
    // todos os pedidos emitidos tenham chegado.
    expect(resolveRequisitionStatusAfterReceipt({
      currentStatus: 'ordered',
      purchaseStatuses: ['received'],
      requisitionItemStatuses: ['ordered', 'pending'],
    })).toBe('partial');
  });

  it('avanca de `partial` para `received` quando o ultimo pedido chega', () => {
    expect(resolveRequisitionStatusAfterReceipt({
      currentStatus: 'partial',
      purchaseStatuses: ['received', 'received'],
      requisitionItemStatuses: ['ordered', 'ordered'],
    })).toBe('received');
  });

  it('nao regrava o mesmo status (retorna null quando nada muda)', () => {
    expect(resolveRequisitionStatusAfterReceipt({
      currentStatus: 'partial',
      purchaseStatuses: ['received', 'sent'],
      requisitionItemStatuses: ['ordered', 'ordered'],
    })).toBeNull();
  });

  it('NAO toca requisicao `approved` com saldo a comprar (senao travaria a compra do restante)', () => {
    // `approved` e o estado que autoriza cotar/converter o saldo restante;
    // `CreateRfqUseCase`/`AwardRfqUseCase` bloqueiam `partial`/`received`.
    // Empurra-la para `partial` num recebimento parcial deixaria o saldo
    // remanescente impossivel de comprar.
    expect(resolveRequisitionStatusAfterReceipt({
      currentStatus: 'approved',
      purchaseStatuses: ['received'],
      requisitionItemStatuses: ['ordered', 'pending'],
    })).toBeNull();
  });

  it('nao mexe em requisicao cancelada', () => {
    expect(resolveRequisitionStatusAfterReceipt({
      currentStatus: 'canceled',
      purchaseStatuses: ['received'],
      requisitionItemStatuses: ['canceled'],
    })).toBeNull();
  });

  it('ignora pedidos cancelados no calculo (senao a requisicao nunca fecharia)', () => {
    expect(resolveRequisitionStatusAfterReceipt({
      currentStatus: 'ordered',
      purchaseStatuses: ['received', 'canceled'],
      requisitionItemStatuses: ['ordered', 'canceled'],
    })).toBe('received');
  });

  it('nao muda nada se nenhum pedido ativo recebeu ainda', () => {
    expect(resolveRequisitionStatusAfterReceipt({
      currentStatus: 'ordered',
      purchaseStatuses: ['sent', 'approved'],
      requisitionItemStatuses: ['ordered'],
    })).toBeNull();
  });

  it('nao muda nada se a requisicao nao gerou nenhum pedido ativo', () => {
    expect(resolveRequisitionStatusAfterReceipt({
      currentStatus: 'ordered',
      purchaseStatuses: ['canceled'],
      requisitionItemStatuses: ['canceled'],
    })).toBeNull();
  });
});

describe('G15 — ReceivePurchaseItemsUseCase reflete o recebimento na requisicao de origem', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  /**
   * Monta o cenario minimo de recebimento total de um pedido de compra,
   * com todos os servicos de estoque/custo mockados.
   *
   * @param requisitionOverrides - Ajustes do lado da requisicao de origem.
   * @returns `{ useCase, repository, transaction, execute }`.
   */
  function buildScenario(requisitionOverrides: Record<string, any> = {}) {
    jest.doMock('../../src/services/inventoryService', () => ({
      receive: jest.fn(async () => ({ product: { id: 10, quantity: 20 } })),
    }));
    jest.doMock('../../src/services/warehouseStockService', () => ({
      getWarehouseByCode: jest.fn(async (code: string) => ({ id: 1, code: code || 'INSUMOS' })),
      addToWarehouse: jest.fn(async () => ({})),
      removeFromWarehouse: jest.fn(async () => ({})),
    }));
    jest.doMock('../../src/services/costingService', () => ({ registerWeightedAverageCost: jest.fn(async () => ({})) }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ReceivePurchaseItemsUseCase = require('../../src/modules/purchases/application/use-cases/ReceivePurchaseItemsUseCase');

    const transaction: any = { LOCK: { UPDATE: 'UPDATE' } };
    const purchase = {
      id: 8, status: 'sent', order_number: 'PO-008', supplier_id: 2, requisition_id: 55,
      items: [{ id: 81, product_id: 10, quantity: 5, received_quantity: 0, unit_price: 12.5 }],
      save: jest.fn(async () => ({})),
    };

    const repository = {
      findPurchaseWithItemsForUpdate: jest.fn(async () => purchase),
      updatePurchaseItem: jest.fn(async () => ({})),
      findPurchaseItemsForUpdate: jest.fn(async () => ([{ id: 81, status: 'received' }])),
      createPurchaseReceipt: jest.fn(async () => ({ id: 1 })),
      findRequisitionOriginById: jest.fn(async () => ({ id: 55, origin: 'manual' })),
      findLotForReceipt: jest.fn(async () => null),
      createLot: jest.fn(async () => ({ id: 1 })),
      findRequisitionByIdForUpdate: jest.fn(async () => ({ id: 55, status: 'ordered', requisition_number: 'RQ-55' })),
      findPurchaseStatusesByRequisitionId: jest.fn(async () => ([{ id: 8, status: 'received' }])),
      findRequisitionItemStatuses: jest.fn(async () => ([{ id: 550, status: 'ordered' }])),
      updateRequisitionStatus: jest.fn(async () => undefined),
      ...requisitionOverrides,
    };

    const useCase = new ReceivePurchaseItemsUseCase(repository);
    const execute = () => useCase.execute({
      id: 8, items: [{ item_id: 81, quantity: 5 }], invoiceNumber: 'NF-G15', userId: 4, transaction,
    });

    return { repository, transaction, execute };
  }

  it('fecha a requisicao em `received` quando o recebimento completa a corrente', async () => {
    const { repository, transaction, execute } = buildScenario();

    const result = await execute();

    expect(repository.findRequisitionByIdForUpdate).toHaveBeenCalledWith(55, transaction);
    expect(repository.updateRequisitionStatus).toHaveBeenCalledWith(55, 'received', transaction);
    expect(result.requisitionStatus).toBe('received');
  });

  it('marca `partial` quando outro pedido da mesma requisicao ainda nao chegou', async () => {
    const { repository, execute } = buildScenario({
      findPurchaseStatusesByRequisitionId: jest.fn(async () => ([
        { id: 8, status: 'received' },
        { id: 9, status: 'sent' },
      ])),
    });

    const result = await execute();

    expect(repository.updateRequisitionStatus).toHaveBeenCalledWith(55, 'partial', expect.anything());
    expect(result.requisitionStatus).toBe('partial');
  });

  it('nao toca em requisicao nenhuma quando o pedido e avulso (sem requisition_id)', async () => {
    const purchaseSemRequisicao = {
      id: 8, status: 'sent', order_number: 'PO-008', supplier_id: 2, requisition_id: null,
      items: [{ id: 81, product_id: 10, quantity: 5, received_quantity: 0, unit_price: 12.5 }],
      save: jest.fn(async () => ({})),
    };
    const { repository, execute } = buildScenario({
      findPurchaseWithItemsForUpdate: jest.fn(async () => purchaseSemRequisicao),
    });

    const result = await execute();

    expect(repository.findRequisitionByIdForUpdate).not.toHaveBeenCalled();
    expect(repository.updateRequisitionStatus).not.toHaveBeenCalled();
    expect(result.requisitionStatus).toBeNull();
  });

  it('nao grava nada quando o status calculado e igual ao atual (evita UPDATE inutil)', async () => {
    const { repository, execute } = buildScenario({
      findRequisitionByIdForUpdate: jest.fn(async () => ({ id: 55, status: 'partial', requisition_number: 'RQ-55' })),
      findPurchaseStatusesByRequisitionId: jest.fn(async () => ([
        { id: 8, status: 'received' },
        { id: 9, status: 'sent' },
      ])),
    });

    const result = await execute();

    expect(repository.updateRequisitionStatus).not.toHaveBeenCalled();
    expect(result.requisitionStatus).toBeNull();
  });
});
