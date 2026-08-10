/**
 * Test: Requisicao de amostra da Engenharia (Bloco 2, UC-39, BUSINESS_RULES.md
 * §9) — `origin='engenharia_amostra'`.
 *
 * Cobre:
 * 1. `CreatePurchaseRequisitionUseCase` rejeita (422 `BusinessRuleError`)
 *    requisicao de amostra sem justificativa (carregada em `notes`, ver
 *    decisao documentada no proprio use case — nao ha coluna dedicada
 *    `justificativa`).
 * 2. `CreatePurchaseRequisitionUseCase` persiste `engineering_project_id`
 *    quando o projeto existe, e rejeita (404 `NotFoundError`) quando nao
 *    existe.
 * 3. Cadeia completa (unit-level, sem infra real): requisicao de amostra
 *    aprovada -> `ConvertRequisitionToPurchaseOrdersUseCase` -> pedido de
 *    compra com `requisition_id` preservado -> `ReceivePurchaseItemsUseCase`
 *    resolve o deposito padrao para LABORATORIO (sem `warehouse_code`
 *    explicito) por causa do vinculo de origem `purchase.requisition_id ->
 *    purchase_requisitions.origin`.
 *
 * @group unit
 * @ticket Bloco-2-UC-39
 */

import { BusinessRuleError, NotFoundError } from '../../src/errors';

const ENGINEERING_SAMPLE_ORIGIN = 'engenharia_amostra';

const engineeringProjectFindByPkMock = jest.fn();
const employeeFindOneMock = jest.fn(async () => null);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const CreatePurchaseRequisitionUseCase = require('../../src/modules/purchaseRequisitions/application/use-cases/CreatePurchaseRequisitionUseCase');

describe('CreatePurchaseRequisitionUseCase — amostra de engenharia', () => {
  beforeEach(() => {
    engineeringProjectFindByPkMock.mockReset();
    employeeFindOneMock.mockReset();
    employeeFindOneMock.mockResolvedValue(null);
  });

  function makeUseCase(engineeringProjectFindByPk: jest.Mock) {
    engineeringProjectFindByPkMock.mockImplementation(engineeringProjectFindByPk);

    const requisitionRepository = {
      createRequisition: jest.fn(async (data: any) => ({ id: 42, requisition_number: data.requisition_number, status: data.status, origin: data.origin })),
      createRequisitionItem: jest.fn(async (data: any) => data),
      findRequisitionById: jest.fn(async (id: number) => ({ id, requisition_number: 'RQ-AMOSTRA', items: [{ item_id: 'item-1' }] })),
      findEngineeringProjectById: jest.fn(async (...args: any[]) => engineeringProjectFindByPkMock(...args)),
      findEmployeeByUserId: jest.fn(async (...args: any[]) => employeeFindOneMock(...args)),
    };
    const itemRepository = {
      findById: jest.fn(async (id: string) => (id === 'item-1' ? { id } : null)),
    };

    return { useCase: new CreatePurchaseRequisitionUseCase(requisitionRepository, itemRepository), requisitionRepository, itemRepository };
  }

  it('rejeita requisicao engenharia_amostra sem justificativa (422 BusinessRuleError)', async () => {
    const { useCase, requisitionRepository } = makeUseCase(jest.fn());

    await expect(
      useCase.execute({
        requester_id: 1,
        origin: ENGINEERING_SAMPLE_ORIGIN,
        // notes ausente -> sem justificativa
        items: [{ item_id: 'item-1', quantity: 3 }],
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    expect(requisitionRepository.createRequisition).not.toHaveBeenCalled();
  });

  it('rejeita requisicao engenharia_amostra com justificativa em branco (422 BusinessRuleError)', async () => {
    const { useCase, requisitionRepository } = makeUseCase(jest.fn());

    await expect(
      useCase.execute({
        requester_id: 1,
        origin: ENGINEERING_SAMPLE_ORIGIN,
        notes: '   ',
        items: [{ item_id: 'item-1', quantity: 3 }],
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    expect(requisitionRepository.createRequisition).not.toHaveBeenCalled();
  });

  it('cria requisicao engenharia_amostra com justificativa e persiste o vinculo com engineering_project_id valido', async () => {
    const engineeringProjectFindByPk = jest.fn(async (id: number) => (id === 7 ? { id: 7 } : null));
    const { useCase, requisitionRepository } = makeUseCase(engineeringProjectFindByPk);

    const result = await useCase.execute({
      requester_id: 1,
      origin: ENGINEERING_SAMPLE_ORIGIN,
      notes: 'Amostra para validacao acustica do novo woofer 12".',
      engineering_project_id: 7,
      items: [{ item_id: 'item-1', quantity: 3 }],
    });

    expect(engineeringProjectFindByPk).toHaveBeenCalledWith(7, undefined);
    expect(requisitionRepository.createRequisition).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: ENGINEERING_SAMPLE_ORIGIN,
        engineering_project_id: 7,
        notes: 'Amostra para validacao acustica do novo woofer 12".',
      }),
      undefined,
    );
    expect(result).toMatchObject({ id: 42, requisition_number: 'RQ-AMOSTRA' });
  });

  it('rejeita (404 NotFoundError) quando engineering_project_id informado nao existe', async () => {
    const engineeringProjectFindByPk = jest.fn(async () => null);
    const { useCase, requisitionRepository } = makeUseCase(engineeringProjectFindByPk);

    await expect(
      useCase.execute({
        requester_id: 1,
        origin: ENGINEERING_SAMPLE_ORIGIN,
        notes: 'Justificativa valida.',
        engineering_project_id: 999,
        items: [{ item_id: 'item-1', quantity: 3 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(requisitionRepository.createRequisition).not.toHaveBeenCalled();
  });
});

describe('Cadeia completa: amostra aprovada -> convertida em pedido -> recebida no Deposito do Laboratorio', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('o vinculo de origem (requisition_id -> origin=engenharia_amostra) sobrevive a conversao e direciona o recebimento para LABORATORIO sem warehouse_code explicito', async () => {
    // --- Passo 1: converte a requisicao de amostra (ja aprovada) em pedido de compra. ---
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ConvertRequisitionToPurchaseOrdersUseCase = require('../../src/modules/purchaseRequisitions/application/use-cases/ConvertRequisitionToPurchaseOrdersUseCase');

    const requisitionRepository = {
      findRequisitionByIdForUpdate: jest.fn(async () => ({
        id: 55,
        status: 'approved',
        requisition_number: 'RQ-AMOSTRA-55',
        origin: ENGINEERING_SAMPLE_ORIGIN,
        items: [
          {
            id: 550,
            item_id: 'item-amostra',
            item: { id: 'item-amostra', codigo: 'ITEM-AMOSTRA' },
            status: 'pending', // saldo a comprar (default da coluna); exigido desde a correcao do gap G12
            quantity: '1.000000',
            unit_price_estimated: 100,
            suggested_supplier_id: 3,
          },
        ],
      })),
      updateRequisition: jest.fn(async () => undefined),
      updateRequisitionItem: jest.fn(async () => undefined),
    };

    let createdPurchaseRecord: any = null;
    const purchaseRepository = {
      findProductByCode: jest.fn(async (code: string) => ({ id: 501, code, toJSON() { return this; } })),
      createPurchase: jest.fn(async (data: any) => {
        createdPurchaseRecord = { id: 900, ...data };
        return { ...createdPurchaseRecord, toJSON() { return createdPurchaseRecord; } };
      }),
      createPurchaseItem: jest.fn(async (data: any) => ({ id: 9001, ...data, toJSON() { return { id: 9001, ...data }; } })),
    };

    const itemSupplierRepository = {
      findPreferredByItem: jest.fn(async () => null),
      findByItemAndSupplier: jest.fn(async () => null),
    };

    const convertUseCase = new ConvertRequisitionToPurchaseOrdersUseCase(
      requisitionRepository,
      purchaseRepository,
      itemSupplierRepository,
    );

    const conversionResult = await convertUseCase.execute({ id: 55, userId: 8, transaction: { id: 'tx-chain' } });

    // Vinculo de origem preservado no pedido de compra criado.
    expect(createdPurchaseRecord.requisition_id).toBe(55);
    expect(createdPurchaseRecord.notes).toContain('AMOSTRA ENGENHARIA');
    expect(conversionResult.purchase_orders).toHaveLength(1);

    // --- Passo 2: recebe o pedido gerado, sem informar warehouse_code. ---
    jest.doMock('../../src/services/inventoryService', () => ({
      receive: jest.fn(async () => ({ product: { id: 501, quantity: 1 } })),
    }));
    const WarehouseStockService = {
      getWarehouseByCode: jest.fn(async (code: string) => ({ id: code === 'LABORATORIO' ? 3 : 1, code })),
      addToWarehouse: jest.fn(async () => ({})),
      removeFromWarehouse: jest.fn(async () => ({})),
    };
    jest.doMock('../../src/services/warehouseStockService', () => WarehouseStockService);
    jest.doMock('../../src/services/costingService', () => ({ registerWeightedAverageCost: jest.fn(async () => ({})) }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ReceivePurchaseItemsUseCase = require('../../src/modules/purchases/application/use-cases/ReceivePurchaseItemsUseCase');

    const transaction: any = { LOCK: { UPDATE: 'UPDATE' } };
    const purchaseAggregate = {
      id: 900,
      status: 'sent',
      order_number: createdPurchaseRecord.order_number,
      supplier_id: 3,
      requisition_id: 55, // vinculo de origem preservado desde a conversao
      items: [{ id: 9001, product_id: 501, quantity: 1, received_quantity: 0, unit_price: 100 }],
      save: jest.fn(async () => ({})),
    };
    const findRequisitionOriginById = jest.fn(async (id: number) => (
      id === 55 ? { id: 55, origin: ENGINEERING_SAMPLE_ORIGIN } : null
    ));
    // O passo 1 acima deixou a requisicao 55 em `ordered` e seu unico item em
    // `ordered` — e esse o estado que o recebimento le para fechar o ciclo
    // (gap G15).
    const updateRequisitionStatus = jest.fn(async () => undefined);
    const receivePurchaseRepository = {
      findPurchaseWithItemsForUpdate: jest.fn(async () => purchaseAggregate),
      updatePurchaseItem: jest.fn(async () => ({})),
      findPurchaseItemsForUpdate: jest.fn(async () => ([{ id: 9001, status: 'received' }])),
      createPurchaseReceipt: jest.fn(async () => ({ id: 1 })),
      findRequisitionOriginById,
      findLotForReceipt: jest.fn(async () => null),
      createLot: jest.fn(async () => ({ id: 1 })),
      findRequisitionByIdForUpdate: jest.fn(async () => ({ id: 55, status: 'ordered', requisition_number: 'RQ-AMOSTRA-55' })),
      findPurchaseStatusesByRequisitionId: jest.fn(async () => ([{ id: 900, status: 'received' }])),
      findRequisitionItemStatuses: jest.fn(async () => ([{ id: 550, status: 'ordered' }])),
      updateRequisitionStatus,
    };

    const receiveUseCase = new ReceivePurchaseItemsUseCase(receivePurchaseRepository);
    const receiveResult = await receiveUseCase.execute({
      id: 900,
      items: [{ item_id: 9001, quantity: 1 }],
      invoiceNumber: 'NF-AMOSTRA-1',
      // warehouseCode NAO informado — deve resolver LABORATORIO automaticamente
      // via requisition_id -> origin=engenharia_amostra.
      userId: 8,
      transaction,
    });

    expect(findRequisitionOriginById).toHaveBeenCalledWith(55, transaction);
    expect(WarehouseStockService.getWarehouseByCode).toHaveBeenCalledWith('LABORATORIO', transaction);
    expect(WarehouseStockService.addToWarehouse).toHaveBeenCalledWith(501, 3, 1, transaction);

    // Gap G15: a corrente fecha de verdade — a requisicao de origem sai de
    // `ordered` e passa a `received` (antes morria em `ordered` e ninguem
    // conseguia responder "esta requisicao foi atendida?").
    expect(updateRequisitionStatus).toHaveBeenCalledWith(55, 'received', transaction);
    expect(receiveResult.requisitionStatus).toBe('received');
  });
});
