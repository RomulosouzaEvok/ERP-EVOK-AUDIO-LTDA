/**
 * Testes do modulo `comex` (Importacao/COMEX, UC-19): calculadora de
 * tributos, criacao de processo, acompanhamento (embarque/chegada/
 * desembaraco), cancelamento e recebimento (entrada em estoque com custo
 * nacionalizado), com repositorios/servicos mockados (sem dependencia de
 * banco).
 */

import { calculateImportProcessTaxes } from '../../src/modules/comex/application/use-cases/importTaxCalculator';
import CreateImportProcessUseCase = require('../../src/modules/comex/application/use-cases/CreateImportProcessUseCase');
import RegisterImportTrackingUseCase = require('../../src/modules/comex/application/use-cases/RegisterImportTrackingUseCase');
import CancelImportProcessUseCase = require('../../src/modules/comex/application/use-cases/CancelImportProcessUseCase');
import ReceiveImportProcessUseCase = require('../../src/modules/comex/application/use-cases/ReceiveImportProcessUseCase');
import { BusinessRuleError, NotFoundError } from '../../src/errors';

const InventoryService = require('../../src/services/inventoryService');
const CostingService = require('../../src/services/costingService');
const WarehouseStockService = require('../../src/services/warehouseStockService');

jest.mock('../../src/services/inventoryService', () => ({
  receive: jest.fn(),
}));
jest.mock('../../src/services/costingService', () => ({
  registerWeightedAverageCost: jest.fn(),
}));
// Gap G14: a entrada de material importado passou a fazer dual-write de
// deposito (`materialReceiptService`), entao o servico de deposito precisa
// estar mockado aqui — sem isso o teste tentaria abrir conexao real com o
// Postgres para resolver o deposito 'INSUMOS'.
jest.mock('../../src/services/warehouseStockService', () => ({
  getWarehouseByCode: jest.fn(),
  addToWarehouse: jest.fn(),
}));

const baseTransaction = { id: 'tx-1' };

function makeComexRepository(overrides: Partial<Record<string, any>> = {}) {
  return {
    countImportProcessesInYear: jest.fn(async () => 0),
    createImportProcess: jest.fn(async (data: any) => ({ id: 1, ...data })),
    createImportProcessItem: jest.fn(async (data: any) => ({ id: Math.floor(Math.random() * 1000), ...data })),
    findImportProcessById: jest.fn(async () => ({ id: 1 })),
    findImportProcessByIdForUpdate: jest.fn(async () => null),
    findImportProcessItems: jest.fn(async () => []),
    updateImportProcessItem: jest.fn(async () => undefined),
    updateImportProcess: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    findSupplierById: jest.fn(async (id: number) => ({ id, company_name: `Fornecedor ${id}` })),
    // Gateway de lote (gap G14) — mesma forma exigida de `PurchaseRepository`
    // por `materialReceiptService.receiveMaterialIntoQuarantine`.
    findLotForReceipt: jest.fn(async () => null),
    createLot: jest.fn(async (data: any) => ({ id: 77, ...data })),
    // G11-COMEX: o default e "sem aprovacao da diretoria" — o estado real de
    // um processo recem-criado. Testes que precisam embarcar informam
    // `listImportProcessApprovals` explicitamente (ver `approvedBy`).
    listImportProcessApprovals: jest.fn(async () => []),
    findImportProcessApprovalByRole: jest.fn(async () => null),
    createImportProcessApproval: jest.fn(async (data: any) => ({ id: 501, ...data })),
    ...overrides,
  };
}

/**
 * Aprovacao de diretoria ja registrada, no formato devolvido pelo
 * repositorio (G11-COMEX).
 *
 * @param role - Papel aprovador (default `diretor`).
 */
function approvedBy(role: string = 'diretor') {
  return jest.fn(async () => [{ id: 501, approver_role: role, approver_user_id: 4, approved_at: new Date() }]);
}

function makeItemRepository(overrides: Partial<Record<string, any>> = {}) {
  return {
    findById: jest.fn(async (id: string) => ({ id })),
    findLegacyProductByItemId: jest.fn(async (id: string) => ({ id: 900, code: id, quantity: 0, cost_price: 0 })),
    ...overrides,
  };
}

describe('importTaxCalculator', () => {
  it('calcula o valor aduaneiro, os tributos e o custo nacionalizado de um unico item', () => {
    const [result] = calculateImportProcessTaxes(
      { exchange_rate: 5, freight_value: 100, insurance_value: 20, other_expenses_value: 0 },
      [{ id: 1, quantity: 10, fob_unit_price: 20, ii_rate: 10, ipi_rate: 5, pis_rate: 2, cofins_rate: 3, icms_rate: 0 }],
    );

    // FOB em BRL = 10 * 20 * 5 = 1000; valor aduaneiro = 1000 + 100 (frete) + 20 (seguro) = 1120 (rateio 100% pois so ha 1 item)
    expect(result.customs_value).toBe(1120);
    expect(result.ii_value).toBe(112); // 1120 * 10%
    expect(result.ipi_value).toBeCloseTo((1120 + 112) * 0.05, 6);
    expect(result.pis_value).toBeCloseTo(1120 * 0.02, 6);
    expect(result.cofins_value).toBeCloseTo(1120 * 0.03, 6);
    expect(result.icms_value).toBe(0); // aliquota 0
    expect(result.nationalized_unit_cost).toBeCloseTo(result.total_landed_cost / 10, 6);
  });

  it('rateia frete/seguro/despesas entre multiplos itens proporcionalmente ao FOB', () => {
    const results = calculateImportProcessTaxes(
      { exchange_rate: 1, freight_value: 100, insurance_value: 0, other_expenses_value: 0 },
      [
        { id: 'a', quantity: 1, fob_unit_price: 300, ii_rate: 0, ipi_rate: 0, pis_rate: 0, cofins_rate: 0, icms_rate: 0 },
        { id: 'b', quantity: 1, fob_unit_price: 100, ii_rate: 0, ipi_rate: 0, pis_rate: 0, cofins_rate: 0, icms_rate: 0 },
      ],
    );

    // FOB total = 400; item a = 75% do FOB -> recebe 75 do frete; item b = 25% -> recebe 25
    const itemA = results.find((r) => r.id === 'a')!;
    const itemB = results.find((r) => r.id === 'b')!;
    expect(itemA.customs_value).toBe(375); // 300 + 75
    expect(itemB.customs_value).toBe(125); // 100 + 25
  });

  it('aplica o calculo "por dentro" (gross-up) do ICMS', () => {
    const [result] = calculateImportProcessTaxes(
      { exchange_rate: 1, freight_value: 0, insurance_value: 0, other_expenses_value: 0 },
      [{ id: 1, quantity: 1, fob_unit_price: 100, ii_rate: 0, ipi_rate: 0, pis_rate: 0, cofins_rate: 0, icms_rate: 20 }],
    );

    // base pre-gross-up = 100; ICMS = (100 / (1 - 0.2)) * 0.2 = 25
    expect(result.icms_value).toBeCloseTo(25, 6);
  });
});

describe('CreateImportProcessUseCase', () => {
  it('cria o processo com numero IMP-<ano>-XXXX e persiste os tributos calculados por item', async () => {
    const comexRepository = makeComexRepository({ countImportProcessesInYear: jest.fn(async () => 0) });
    const itemRepository = makeItemRepository();
    const useCase = new CreateImportProcessUseCase(comexRepository as any, itemRepository as any);

    await useCase.execute({
      supplier_id: 1,
      fob_currency: 'USD',
      exchange_rate: 5,
      freight_value: 0,
      insurance_value: 0,
      other_expenses_value: 0,
      items: [{ item_id: 'item-1', quantity: 10, fob_unit_price: 20, ii_rate: 10, ipi_rate: 0, pis_rate: 0, cofins_rate: 0, icms_rate: 0 }],
      created_by: 1,
      transaction: baseTransaction,
    });

    const [createPayload] = comexRepository.createImportProcess.mock.calls[0];
    expect(createPayload.status).toBe('draft');
    expect(createPayload.process_number).toMatch(new RegExp(`^IMP-${new Date().getFullYear()}-0001$`));

    const [itemPayload] = comexRepository.createImportProcessItem.mock.calls[0];
    expect(itemPayload).toMatchObject({ item_id: 'item-1', quantity: 10, fob_unit_price: 20 });
    expect(itemPayload.customs_value).toBe(1000); // 10 * 20 * 5
    expect(itemPayload.ii_value).toBe(100); // 1000 * 10%
  });

  it('lanca NotFoundError se o fornecedor nao existir', async () => {
    const comexRepository = makeComexRepository({ findSupplierById: jest.fn(async () => null) });
    const useCase = new CreateImportProcessUseCase(comexRepository as any, makeItemRepository() as any);

    await expect(
      useCase.execute({
        supplier_id: 999,
        fob_currency: 'USD',
        exchange_rate: 1,
        freight_value: 0,
        insurance_value: 0,
        other_expenses_value: 0,
        items: [{ item_id: 'item-1', quantity: 1, fob_unit_price: 1, ii_rate: 0, ipi_rate: 0, pis_rate: 0, cofins_rate: 0, icms_rate: 0 }],
        created_by: 1,
        transaction: baseTransaction,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lanca NotFoundError se algum item_id nao existir', async () => {
    const comexRepository = makeComexRepository();
    const itemRepository = makeItemRepository({ findById: jest.fn(async () => null) });
    const useCase = new CreateImportProcessUseCase(comexRepository as any, itemRepository as any);

    await expect(
      useCase.execute({
        supplier_id: 1,
        fob_currency: 'USD',
        exchange_rate: 1,
        freight_value: 0,
        insurance_value: 0,
        other_expenses_value: 0,
        items: [{ item_id: 'item-inexistente', quantity: 1, fob_unit_price: 1, ii_rate: 0, ipi_rate: 0, pis_rate: 0, cofins_rate: 0, icms_rate: 0 }],
        created_by: 1,
        transaction: baseTransaction,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lanca BusinessRuleError se nao houver itens', async () => {
    const useCase = new CreateImportProcessUseCase(makeComexRepository() as any, makeItemRepository() as any);

    await expect(
      useCase.execute({
        supplier_id: 1,
        fob_currency: 'USD',
        exchange_rate: 1,
        freight_value: 0,
        insurance_value: 0,
        other_expenses_value: 0,
        items: [],
        created_by: 1,
        transaction: baseTransaction,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });
});

describe('RegisterImportTrackingUseCase', () => {
  it('registra o proximo evento sequencial e grava a data correspondente', async () => {
    const comexRepository = makeComexRepository({
      findImportProcessByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'draft' })),
      // G11-COMEX: o embarque so passa com a diretoria ja tendo aprovado.
      listImportProcessApprovals: approvedBy(),
    });
    const useCase = new RegisterImportTrackingUseCase(comexRepository as any);

    await useCase.execute({ id: 1, event: 'shipped', transaction: baseTransaction });

    const [id, updatePayload] = comexRepository.updateImportProcess.mock.calls[0];
    expect(id).toBe(1);
    expect(updatePayload.status).toBe('shipped');
    expect(updatePayload.shipped_at).toBeTruthy();
  });

  it('rejeita evento fora de sequencia (422 BusinessRuleError)', async () => {
    const comexRepository = makeComexRepository({
      findImportProcessByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'draft' })),
    });
    const useCase = new RegisterImportTrackingUseCase(comexRepository as any);

    await expect(
      useCase.execute({ id: 1, event: 'arrived', transaction: baseTransaction }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('recalcula os tributos quando dados monetarios sao informados', async () => {
    const comexRepository = makeComexRepository({
      findImportProcessByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'shipped' })),
      updateImportProcess: jest.fn(async (id: number, data: any) => ({ id, exchange_rate: 6, freight_value: 0, insurance_value: 0, other_expenses_value: 0, ...data })),
      findImportProcessItems: jest.fn(async () => [
        { id: 10, item_id: 'item-1', quantity: '2.000000', fob_unit_price: '10.000000', ii_rate: '0.0000', ipi_rate: '0.0000', pis_rate: '0.0000', cofins_rate: '0.0000', icms_rate: '0.0000' },
      ]),
    });
    const useCase = new RegisterImportTrackingUseCase(comexRepository as any);

    await useCase.execute({ id: 1, event: 'arrived', exchange_rate: 6, transaction: baseTransaction });

    expect(comexRepository.updateImportProcessItem).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ customs_value: 120 }), // 2 * 10 * 6
      baseTransaction,
    );
  });

  it('lanca NotFoundError se o processo nao existir', async () => {
    const comexRepository = makeComexRepository({ findImportProcessByIdForUpdate: jest.fn(async () => null) });
    const useCase = new RegisterImportTrackingUseCase(comexRepository as any);

    await expect(
      useCase.execute({ id: 999, event: 'shipped', transaction: baseTransaction }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('CancelImportProcessUseCase', () => {
  it('cancela um processo em andamento', async () => {
    const comexRepository = makeComexRepository({
      findImportProcessByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'shipped', notes: null })),
    });
    const useCase = new CancelImportProcessUseCase(comexRepository as any);

    await useCase.execute({ id: 1, reason: 'Fornecedor cancelou o embarque', transaction: baseTransaction });

    const [id, payload] = comexRepository.updateImportProcess.mock.calls[0];
    expect(id).toBe(1);
    expect(payload.status).toBe('cancelled');
    expect(payload.notes).toContain('Fornecedor cancelou o embarque');
  });

  it('rejeita cancelamento de processo ja recebido (422 BusinessRuleError)', async () => {
    const comexRepository = makeComexRepository({
      findImportProcessByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'received' })),
    });
    const useCase = new CancelImportProcessUseCase(comexRepository as any);

    await expect(
      useCase.execute({ id: 1, reason: 'tarde demais', transaction: baseTransaction }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });
});

describe('ReceiveImportProcessUseCase', () => {
  const rawItem = {
    id: 10,
    item_id: 'item-1',
    quantity: '10.000000',
    fob_unit_price: '20.000000',
    ii_rate: '10.0000',
    ipi_rate: '0.0000',
    pis_rate: '0.0000',
    cofins_rate: '0.0000',
    icms_rate: '0.0000',
    nationalized_unit_cost: null,
  };

  /** Processo desembaracado padrao usado pelos testes de recebimento. */
  function clearedProcess(overrides: Record<string, any> = {}) {
    return {
      id: 1, status: 'customs_cleared', process_number: 'IMP-2026-0001', supplier_id: 42,
      customs_cleared_at: '2026-08-01',
      exchange_rate: 5, freight_value: 0, insurance_value: 0, other_expenses_value: 0,
      ...overrides,
    };
  }

  /** Arma os mocks de servico compartilhados pelo caminho de recebimento. */
  function armReceiptServices() {
    const mockProduct = { id: 900, quantity: 0, cost_price: 0 };
    (InventoryService.receive as jest.Mock).mockResolvedValue({ product: mockProduct });
    (CostingService.registerWeightedAverageCost as jest.Mock).mockResolvedValue({ ledger: {}, previousCost: 0, newCost: 100, totalCost: 1000 });
    (WarehouseStockService.getWarehouseByCode as jest.Mock).mockResolvedValue({ id: 1, code: 'INSUMOS' });
    (WarehouseStockService.addToWarehouse as jest.Mock).mockResolvedValue({});
    return mockProduct;
  }

  it('recalcula, da entrada em estoque via InventoryService/CostingService e marca received', async () => {
    const comexRepository = makeComexRepository({
      findImportProcessByIdForUpdate: jest.fn(async () => clearedProcess()),
      findImportProcessItems: jest.fn(async () => [rawItem]),
    });
    const itemRepository = makeItemRepository();
    const mockProduct = armReceiptServices();

    const useCase = new ReceiveImportProcessUseCase(comexRepository as any, itemRepository as any);
    await useCase.execute({ id: 1, userId: 5, transaction: baseTransaction });

    expect(InventoryService.receive).toHaveBeenCalledWith(
      900, 10, 5, baseTransaction,
      // Gap G14: a origem deixou de ser gravada como 'purchase' (que fazia
      // reference_id apontar para import_processes.id sob um rotulo que
      // significa purchase_orders.id) — ver migration 20260809-000027.
      expect.objectContaining({ referenceId: 1, referenceType: 'import' }),
    );
    expect(CostingService.registerWeightedAverageCost).toHaveBeenCalledWith(
      expect.objectContaining({ product: mockProduct, quantity: 10, sourceType: 'import', sourceId: 1 }),
      baseTransaction,
    );
    expect(comexRepository.updateImportProcess).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: 'received' }),
      baseTransaction,
    );
  });

  // --- Gap G14: importacao entrava fora do padrao de rastreabilidade -------

  it('G14: cria LOTE do material importado, nascendo em QUARENTENA (nao entrava lote nenhum antes)', async () => {
    const comexRepository = makeComexRepository({
      findImportProcessByIdForUpdate: jest.fn(async () => clearedProcess()),
      findImportProcessItems: jest.fn(async () => [rawItem]),
    });
    armReceiptServices();

    const useCase = new ReceiveImportProcessUseCase(comexRepository as any, makeItemRepository() as any);
    await useCase.execute({ id: 1, userId: 5, transaction: baseTransaction });

    expect(comexRepository.createLot).toHaveBeenCalledTimes(1);
    const [lotPayload, lotTransaction] = comexRepository.createLot.mock.calls[0];
    expect(lotTransaction).toBe(baseTransaction);
    expect(lotPayload).toMatchObject({
      product_id: 900,
      supplier_id: 42,
      purchase_id: null,
      // Gate de qualidade: o FEFO da producao so consome lote 'available',
      // entao o material importado fica retido ate a inspecao liberar.
      status: 'quarantine',
      warehouse_id: 1,
      quantity_initial: 10,
      quantity_available: 10,
      created_by: 5,
    });
    // Numero deterministico <processo>-ITEM<id do item>-R001.
    expect(lotPayload.lot_number).toBe('IMP-2026-0001-ITEM10-R001');
    // Data de entrada = desembaraco (fato que libera a mercadoria).
    expect(lotPayload.received_at).toBe('2026-08-01');
  });

  it('G14: faz o dual-write de deposito (INSUMOS) junto com o saldo global', async () => {
    const comexRepository = makeComexRepository({
      findImportProcessByIdForUpdate: jest.fn(async () => clearedProcess()),
      findImportProcessItems: jest.fn(async () => [rawItem]),
    });
    armReceiptServices();

    const useCase = new ReceiveImportProcessUseCase(comexRepository as any, makeItemRepository() as any);
    await useCase.execute({ id: 1, userId: 5, transaction: baseTransaction });

    expect(WarehouseStockService.getWarehouseByCode).toHaveBeenCalledWith('INSUMOS', baseTransaction);
    // Invariante BUSINESS_RULES.md §12 item 3: products.quantity = SOMA dos
    // saldos por deposito. Antes do G14 a importacao so mexia no primeiro.
    expect(WarehouseStockService.addToWarehouse).toHaveBeenCalledWith(900, 1, 10, baseTransaction);
    expect(InventoryService.receive).toHaveBeenCalledWith(
      900, 10, 5, baseTransaction,
      expect.objectContaining({ warehouseId: 1 }),
    );
  });

  it('G14: consolida no lote ja existente (mesmo produto x numero de lote) em vez de duplicar', async () => {
    const existingLot = {
      id: 77,
      quantity_initial: '4.0000',
      quantity_available: '4.0000',
      manufactured_at: null,
      expires_at: null,
      notes: 'Lote pre-existente',
      update: jest.fn(async () => undefined),
    };
    const comexRepository = makeComexRepository({
      findImportProcessByIdForUpdate: jest.fn(async () => clearedProcess()),
      findImportProcessItems: jest.fn(async () => [rawItem]),
      findLotForReceipt: jest.fn(async () => existingLot),
    });
    armReceiptServices();

    const useCase = new ReceiveImportProcessUseCase(comexRepository as any, makeItemRepository() as any);
    await useCase.execute({ id: 1, userId: 5, transaction: baseTransaction });

    expect(comexRepository.createLot).not.toHaveBeenCalled();
    expect(comexRepository.findLotForReceipt).toHaveBeenCalledWith(
      { product_id: 900, lot_number: 'IMP-2026-0001-ITEM10-R001' },
      baseTransaction,
    );
    const [updatePayload] = existingLot.update.mock.calls[0];
    expect(updatePayload).toMatchObject({
      status: 'quarantine',
      quantity_initial: 14, // 4 pre-existente + 10 recebidos
      quantity_available: 14,
    });
  });

  it('G14: nao cria lote nem toca deposito quando o processo nao esta desembaracado', async () => {
    const comexRepository = makeComexRepository({
      findImportProcessByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'arrived' })),
    });
    const useCase = new ReceiveImportProcessUseCase(comexRepository as any, makeItemRepository() as any);

    await expect(
      useCase.execute({ id: 1, userId: 5, transaction: baseTransaction }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(comexRepository.createLot).not.toHaveBeenCalled();
    expect(WarehouseStockService.addToWarehouse).not.toHaveBeenCalled();
  });

  it('rejeita recebimento se o processo nao estiver desembaracado (422 BusinessRuleError)', async () => {
    const comexRepository = makeComexRepository({
      findImportProcessByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'shipped' })),
    });
    const useCase = new ReceiveImportProcessUseCase(comexRepository as any, makeItemRepository() as any);

    await expect(
      useCase.execute({ id: 1, userId: 5, transaction: baseTransaction }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(InventoryService.receive).not.toHaveBeenCalled();
  });

  it('rejeita recebimento quando o item nao tem produto legado correspondente (422 BusinessRuleError)', async () => {
    const comexRepository = makeComexRepository({
      findImportProcessByIdForUpdate: jest.fn(async () => ({
        id: 1, status: 'customs_cleared', process_number: 'IMP-2026-0001',
        exchange_rate: 5, freight_value: 0, insurance_value: 0, other_expenses_value: 0,
      })),
      findImportProcessItems: jest.fn(async () => [rawItem]),
    });
    const itemRepository = makeItemRepository({ findLegacyProductByItemId: jest.fn(async () => null) });
    const useCase = new ReceiveImportProcessUseCase(comexRepository as any, itemRepository as any);

    await expect(
      useCase.execute({ id: 1, userId: 5, transaction: baseTransaction }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(InventoryService.receive).not.toHaveBeenCalled();
  });

  it('lanca NotFoundError se o processo nao existir', async () => {
    const comexRepository = makeComexRepository({ findImportProcessByIdForUpdate: jest.fn(async () => null) });
    const useCase = new ReceiveImportProcessUseCase(comexRepository as any, makeItemRepository() as any);

    await expect(
      useCase.execute({ id: 999, userId: 5, transaction: baseTransaction }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
