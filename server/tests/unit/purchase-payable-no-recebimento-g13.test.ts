/**
 * Gap G13 (parte A) — a CONTA A PAGAR sai da APROVACAO do pedido e passa
 * para o RECEBIMENTO.
 *
 * Base normativa (decisao D-A do dono,
 * `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4; pesquisa em
 * `docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`,
 * Decisao 6-B):
 *
 *  - **CPC 00 (R2) item 4.56** — pedido aprovado e nao entregue e *contrato
 *    executorio*: nenhuma das partes cumpriu.
 *  - **CPC 00 (R2) item 4.58** — o passivo surge quando a OUTRA PARTE
 *    cumpre primeiro, isto e, quando o fornecedor entrega.
 *
 * O caso que da nome ao gap e o **recebimento parcial**: recebeu metade,
 * deve a metade. Antes do G13 o pedido inteiro virava passivo na aprovacao,
 * independentemente do que chegou (ou de nunca ter chegado).
 *
 * O que este arquivo NAO cobre (risco residual declarado no handoff): o
 * comportamento transacional real e o indice unico
 * `(purchase_id, invoice_number)` de `purchase_receipts`, que so caem em
 * teste de integracao contra o Postgres.
 *
 * @group unit
 * @ticket G13-Onda3
 */

// F3 (2026-08-12): o recebimento cria ativo patrimonial via servico proprio;
// aqui vira duble para o teste nao tocar PostgreSQL. Comportamento real em
// tests/integration/item-product-mirror.test.ts.
jest.mock('../../src/services/fixedAssetReceiptService', () => ({
  createAssetsForReceivedLines: jest.fn(async () => []),
}));

jest.mock('../../src/services/warehouseStockService', () => ({
  getWarehouseByCode: jest.fn(async (code: string) => ({ id: code === 'LABORATORIO' ? 2 : 1, code })),
  addToWarehouse: jest.fn(async () => ({})),
  removeFromWarehouse: jest.fn(async () => ({})),
}));

jest.mock('../../src/services/materialReceiptService', () => ({
  receiveMaterialIntoQuarantine: jest.fn(async () => ({})),
  buildGeneratedLotNumber: jest.fn(() => 'LOTE-TESTE-001'),
}));

import ReceivePurchaseItemsUseCase = require('../../src/modules/purchases/application/use-cases/ReceivePurchaseItemsUseCase');
import ChangePurchaseStatusUseCase = require('../../src/modules/purchases/application/use-cases/ChangePurchaseStatusUseCase');

const {
  calculateReceiptAmount,
  resolvePayableDueDate,
} = require('../../src/modules/purchases/domain/services/purchasePayableRules');

const transaction: any = { LOCK: { UPDATE: 'UPDATE' } };

/**
 * Duble do repositorio de compras com um pedido de 10 unidades a R$ 25,00
 * (total R$ 250,00) e uma lista em memoria de contas a pagar.
 */
function buildRepository({ legacyPayable = null as any, itemQuantity = 10, unitPrice = 25 } = {}) {
  const payables: any[] = [];
  const item = {
    id: 1,
    product_id: 77,
    quantity: itemQuantity,
    received_quantity: 0,
    unit_price: unitPrice,
    status: 'pending',
  };
  const purchase: any = {
    id: 42,
    order_number: 'PO-42',
    status: 'sent',
    supplier_id: 3,
    requisition_id: null,
    total_amount: itemQuantity * unitPrice,
    expected_date: '2026-09-30',
    items: [item],
    save: jest.fn(async () => purchase),
  };

  return {
    __payables: payables,
    __item: item,
    __purchase: purchase,
    findPurchaseWithItemsForUpdate: jest.fn(async () => purchase),
    createPurchaseReceipt: jest.fn(async () => ({ id: 1 })),
    updatePurchaseItem: jest.fn(async (_id: number, data: any) => {
      Object.assign(item, data);
    }),
    findPurchaseItemsForUpdate: jest.fn(async () => [item]),
    findRequisitionOriginById: jest.fn(async () => null),
    findLotForReceipt: jest.fn(async () => null),
    createLot: jest.fn(async () => ({ id: 1 })),
    findLegacyPayableByPurchaseId: jest.fn(async () => legacyPayable),
    findAccountPayableByPurchaseAndInvoice: jest.fn(async (purchaseId: number, invoiceNumber: string) =>
      payables.find((row) => row.purchase_id === purchaseId && row.invoice_number === invoiceNumber) || null),
    createAccountPayable: jest.fn(async (data: any) => {
      const row = { id: payables.length + 1, ...data };
      payables.push(row);
      return row;
    }),
  };
}

describe('G13-A — regras puras do valor e do vencimento da conta a pagar', () => {
  it('soma a entrega em centavos (preco com centavo nao acumula erro de ponto flutuante)', () => {
    expect(calculateReceiptAmount([{ quantity: 3, unitPrice: 10.1 }])).toBe(30.3);
    expect(calculateReceiptAmount([
      { quantity: 5, unitPrice: 25 },
      { quantity: 2, unitPrice: 0.07 },
    ])).toBe(125.14);
  });

  it('ignora linha sem quantidade, com quantidade negativa ou com valor nao numerico', () => {
    expect(calculateReceiptAmount([
      { quantity: 0, unitPrice: 10 },
      { quantity: -5, unitPrice: 10 },
      { quantity: 'abc' as any, unitPrice: 10 },
      { quantity: 2, unitPrice: 10 },
    ])).toBe(20);
  });

  it('vencimento informado no recebimento prevalece sobre qualquer calculo', () => {
    expect(resolvePayableDueDate({
      dueDate: '2026-10-15',
      invoiceDate: '2026-08-01',
      receivedAt: new Date('2026-08-10T12:00:00Z'),
    })).toBe('2026-10-15');
  });

  it('sem vencimento, conta 30 dias da NF do fornecedor; sem NF, do recebimento', () => {
    expect(resolvePayableDueDate({
      invoiceDate: '2026-08-01',
      receivedAt: new Date('2026-08-10T12:00:00Z'),
    })).toBe('2026-08-31');

    expect(resolvePayableDueDate({
      receivedAt: new Date('2026-08-10T12:00:00Z'),
    })).toBe('2026-09-09');
  });
});

describe('G13-A — a aprovacao do pedido nao cria mais passivo', () => {
  it('transicao pending -> approved nao chama createAccountPayable (CPC 00 4.56: contrato executorio)', async () => {
    const save = jest.fn(async () => ({}));
    const record: any = {
      id: 5, status: 'pending', supplier_id: 3, origin: 'national',
      total_amount: 500, freight_value: 0, order_number: 'PO-500',
      expected_date: '2026-08-30', save,
    };
    const repository: any = {
      findPurchaseByIdRawForUpdate: jest.fn(async () => record),
      findSupplierByIdRaw: jest.fn(async () => ({ id: 3, is_foreign: false })),
      listPurchaseApprovals: jest.fn(async () => []),
      createAccountPayable: jest.fn(async () => ({})),
    };

    const useCase = new ChangePurchaseStatusUseCase(repository);
    const { purchase } = await useCase.execute({ id: 5, status: 'approved', userId: 9, transaction });

    expect(purchase.status).toBe('approved');
    expect(repository.createAccountPayable).not.toHaveBeenCalled();
  });
});

describe('G13-A — o recebimento cria a conta a pagar do que chegou', () => {
  it('recebimento PARCIAL (5 de 10) deve METADE do pedido, nao o pedido inteiro', async () => {
    const repository = buildRepository();
    const useCase = new ReceivePurchaseItemsUseCase(repository);

    const result = await useCase.execute({
      id: 42,
      items: [{ item_id: 1, quantity: 5 }],
      invoiceNumber: 'NF-1001',
      userId: 9,
      transaction,
    });

    // Pedido: 10 x R$ 25,00 = R$ 250,00. Chegaram 5 -> passivo de R$ 125,00.
    expect(repository.createAccountPayable).toHaveBeenCalledTimes(1);
    expect(repository.__payables).toHaveLength(1);
    expect(repository.__payables[0]).toMatchObject({
      amount: 125,
      status: 'pending',
      supplier_id: 3,
      purchase_id: 42,
      invoice_number: 'NF-1001',
      payment_date: null,
    });
    expect(result.purchase.status).toBe('partial');
    expect(result.payable).not.toBeNull();
    expect(result.payableSkipReason).toBeNull();
  });

  it('duas entregas parciais geram DUAS contas a pagar, cada uma com a sua NF, somando o pedido', async () => {
    const repository = buildRepository();
    const useCase = new ReceivePurchaseItemsUseCase(repository);

    await useCase.execute({ id: 42, items: [{ item_id: 1, quantity: 4 }], invoiceNumber: 'NF-1', userId: 9, transaction });
    repository.__purchase.status = 'partial';
    await useCase.execute({ id: 42, items: [{ item_id: 1, quantity: 6 }], invoiceNumber: 'NF-2', userId: 9, transaction });

    expect(repository.__payables.map((row: any) => row.amount)).toEqual([100, 150]);
    expect(repository.__payables.map((row: any) => row.invoice_number)).toEqual(['NF-1', 'NF-2']);
    // Soma das duas = valor do pedido inteiro (10 x 25).
    expect(repository.__payables.reduce((sum: number, row: any) => sum + row.amount, 0)).toBe(250);
  });

  it('a conta a pagar nasce sem aprovador: quem recebe nao aprova pagamento (segregacao de funcoes)', async () => {
    const repository = buildRepository();
    const useCase = new ReceivePurchaseItemsUseCase(repository);

    await useCase.execute({ id: 42, items: [{ item_id: 1, quantity: 10 }], invoiceNumber: 'NF-9', userId: 9, transaction });

    expect(repository.__payables[0]).toMatchObject({ approved_by: null, approval_date: null });
    expect(repository.__payables[0].notes).toContain('usuario #9');
  });

  it('vencimento informado no recebimento chega intacto na conta a pagar', async () => {
    const repository = buildRepository();
    const useCase = new ReceivePurchaseItemsUseCase(repository);

    await useCase.execute({
      id: 42,
      items: [{ item_id: 1, quantity: 10 }],
      invoiceNumber: 'NF-7',
      invoiceDate: '2026-08-01',
      dueDate: '2026-11-30',
      userId: 9,
      transaction,
    });

    expect(repository.__payables[0].due_date).toBe('2026-11-30');
  });

  it('nao duplica passivo de pedido legado: AP criada na aprovacao (sem NF) bloqueia a criacao', async () => {
    const repository = buildRepository({ legacyPayable: { id: 900, purchase_id: 42, invoice_number: null, amount: 250 } });
    const useCase = new ReceivePurchaseItemsUseCase(repository);

    const result = await useCase.execute({
      id: 42, items: [{ item_id: 1, quantity: 10 }], invoiceNumber: 'NF-legado', userId: 9, transaction,
    });

    expect(repository.createAccountPayable).not.toHaveBeenCalled();
    expect(result.payable).toBeNull();
    expect(result.payableSkipReason).toBe('legacy_created_on_approval');
    // A linha financeira legada do dono nao e alterada nem cancelada aqui
    // (destino e a pergunta C9 ao contador).
    expect(repository.__payables).toHaveLength(0);
  });

  it('pedido sem fornecedor nao gera passivo automatico (lancamento fica manual)', async () => {
    const repository = buildRepository();
    repository.__purchase.supplier_id = null;
    const useCase = new ReceivePurchaseItemsUseCase(repository);

    const result = await useCase.execute({
      id: 42, items: [{ item_id: 1, quantity: 10 }], invoiceNumber: 'NF-5', userId: 9, transaction,
    });

    expect(repository.createAccountPayable).not.toHaveBeenCalled();
    expect(result.payableSkipReason).toBe('no_supplier');
  });
});
