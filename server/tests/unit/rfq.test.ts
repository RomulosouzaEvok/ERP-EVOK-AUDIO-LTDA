/**
 * Testes do modulo `rfq` (Cotacao/RFQ multi-fornecedor): criacao (avulsa e a
 * partir de requisicao), convite de fornecedores, registro de cotacao (com
 * upsert), mapa comparativo e adjudicacao (award), com repositorios
 * mockados (sem dependencia de banco).
 */

import CreateRfqUseCase = require('../../src/modules/rfq/application/use-cases/CreateRfqUseCase');
import InviteRfqSuppliersUseCase = require('../../src/modules/rfq/application/use-cases/InviteRfqSuppliersUseCase');
import RegisterRfqQuoteUseCase = require('../../src/modules/rfq/application/use-cases/RegisterRfqQuoteUseCase');
import GetRfqComparisonUseCase = require('../../src/modules/rfq/application/use-cases/GetRfqComparisonUseCase');
import AwardRfqUseCase = require('../../src/modules/rfq/application/use-cases/AwardRfqUseCase');
import { BusinessRuleError, NotFoundError } from '../../src/errors';

const baseTransaction = { id: 'tx-1' };

function makeRfqRepository(overrides: Partial<Record<string, any>> = {}) {
  return {
    findRequisitionWithItems: jest.fn(async () => null),
    countRfqsInYear: jest.fn(async () => 0),
    createRfq: jest.fn(async (data: any) => ({ id: 1, ...data })),
    createRfqItem: jest.fn(async (data: any) => ({ id: Math.floor(Math.random() * 1000), ...data })),
    findRfqById: jest.fn(async () => ({ id: 1 })),
    findRfqByIdForUpdate: jest.fn(async () => null),
    findRfqSupplier: jest.fn(async () => null),
    createRfqSupplier: jest.fn(async (data: any) => ({ id: 1, ...data })),
    updateRfq: jest.fn(async () => undefined),
    findRfqItems: jest.fn(async () => []),
    updateRfqItem: jest.fn(async () => undefined),
    findRfqQuote: jest.fn(async () => null),
    createRfqQuote: jest.fn(async (data: any) => ({ id: 1, ...data })),
    updateRfqQuote: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    updateRfqSupplier: jest.fn(async () => undefined),
    ...overrides,
  };
}

function makeItemRepository(overrides: Partial<Record<string, any>> = {}) {
  return {
    findById: jest.fn(async (id: string) => ({ id })),
    ...overrides,
  };
}

function makeItemSupplierRepository(overrides: Partial<Record<string, any>> = {}) {
  return {
    findSupplierById: jest.fn(async (id: number) => ({ id, company_name: `Fornecedor ${id}` })),
    findByItemAndSupplier: jest.fn(async () => null),
    create: jest.fn(async (data: any) => ({ id: 1, ...data })),
    update: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    ...overrides,
  };
}

function makePurchaseRepository(overrides: Partial<Record<string, any>> = {}) {
  let purchaseSeq = 0;
  let itemSeq = 0;
  return {
    findProductByCode: jest.fn(async (code: string) => ({ id: 900, code })),
    createPurchase: jest.fn(async (data: any) => {
      purchaseSeq += 1;
      return { id: purchaseSeq, ...data, toJSON() { return { id: this.id, ...data }; } };
    }),
    createPurchaseItem: jest.fn(async (data: any) => {
      itemSeq += 1;
      return { id: itemSeq, ...data, toJSON() { return { id: this.id, ...data }; } };
    }),
    ...overrides,
  };
}

describe('CreateRfqUseCase', () => {
  it('cria RFQ avulsa com items informados diretamente, gerando o numero RFQ-<ano>-XXXX', async () => {
    const rfqRepository = makeRfqRepository({ countRfqsInYear: jest.fn(async () => 0) });
    const itemRepository = makeItemRepository();
    const useCase = new CreateRfqUseCase(rfqRepository as any, itemRepository as any);

    await useCase.execute({
      items: [{ item_id: 'item-1', quantity: 5, unit: 'UN' }],
      notes: 'nota livre',
      created_by: 1,
      transaction: baseTransaction,
    });

    const [createPayload] = rfqRepository.createRfq.mock.calls[0];
    expect(createPayload.requisition_id).toBeNull();
    expect(createPayload.status).toBe('draft');
    expect(createPayload.created_by).toBe(1);
    expect(createPayload.notes).toBe('nota livre');
    expect(createPayload.rfq_number).toMatch(new RegExp(`^RFQ-${new Date().getFullYear()}-0001$`));

    expect(rfqRepository.createRfqItem).toHaveBeenCalledWith(
      expect.objectContaining({ item_id: 'item-1', quantity: 5, unit: 'UN' }),
      baseTransaction,
    );
  });

  it('cria RFQ a partir de requisition_id, puxando os itens automaticamente', async () => {
    const rfqRepository = makeRfqRepository({
      findRequisitionWithItems: jest.fn(async () => ({
        id: 5,
        items: [{ item_id: 'item-2', quantity: '3.000000', unit: 'UN' }],
      })),
    });
    const itemRepository = makeItemRepository();
    const useCase = new CreateRfqUseCase(rfqRepository as any, itemRepository as any);

    await useCase.execute({ requisition_id: 5, created_by: 2, transaction: baseTransaction });

    const [createPayload] = rfqRepository.createRfq.mock.calls[0];
    expect(createPayload.requisition_id).toBe(5);
    expect(rfqRepository.createRfqItem).toHaveBeenCalledWith(
      expect.objectContaining({ item_id: 'item-2', quantity: 3, unit: 'UN' }),
      baseTransaction,
    );
  });

  it('lanca NotFoundError se a requisicao informada nao existir', async () => {
    const rfqRepository = makeRfqRepository({ findRequisitionWithItems: jest.fn(async () => null) });
    const useCase = new CreateRfqUseCase(rfqRepository as any, makeItemRepository() as any);

    await expect(
      useCase.execute({ requisition_id: 999, created_by: 1, transaction: baseTransaction }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lanca BusinessRuleError se a requisicao nao tiver itens', async () => {
    const rfqRepository = makeRfqRepository({
      findRequisitionWithItems: jest.fn(async () => ({ id: 5, items: [] })),
    });
    const useCase = new CreateRfqUseCase(rfqRepository as any, makeItemRepository() as any);

    await expect(
      useCase.execute({ requisition_id: 5, created_by: 1, transaction: baseTransaction }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('lanca NotFoundError se algum item_id nao existir', async () => {
    const rfqRepository = makeRfqRepository();
    const itemRepository = makeItemRepository({ findById: jest.fn(async () => null) });
    const useCase = new CreateRfqUseCase(rfqRepository as any, itemRepository as any);

    await expect(
      useCase.execute({
        items: [{ item_id: 'item-inexistente', quantity: 1 }],
        created_by: 1,
        transaction: baseTransaction,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('InviteRfqSuppliersUseCase', () => {
  it('convida fornecedores e transiciona draft -> sent no primeiro convite', async () => {
    const rfqRepository = makeRfqRepository({
      findRfqByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'draft' })),
    });
    const itemSupplierRepository = makeItemSupplierRepository();
    const useCase = new InviteRfqSuppliersUseCase(rfqRepository as any, itemSupplierRepository as any);

    await useCase.execute({ id: 1, supplier_ids: [7, 9], transaction: baseTransaction });

    expect(rfqRepository.createRfqSupplier).toHaveBeenCalledTimes(2);
    expect(rfqRepository.updateRfq).toHaveBeenCalledWith(1, { status: 'sent' }, baseTransaction);
  });

  it('rejeita convite em RFQ awarded/cancelled (422 BusinessRuleError)', async () => {
    const rfqRepository = makeRfqRepository({
      findRfqByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'awarded' })),
    });
    const useCase = new InviteRfqSuppliersUseCase(rfqRepository as any, makeItemSupplierRepository() as any);

    await expect(
      useCase.execute({ id: 1, supplier_ids: [7], transaction: baseTransaction }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(rfqRepository.createRfqSupplier).not.toHaveBeenCalled();
  });

  it('e idempotente: nao duplica convite de fornecedor ja convidado, nem re-transiciona status', async () => {
    const rfqRepository = makeRfqRepository({
      findRfqByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'sent' })),
      findRfqSupplier: jest.fn(async (_rfqId: number, supplierId: number) => (supplierId === 7 ? { id: 50 } : null)),
    });
    const useCase = new InviteRfqSuppliersUseCase(rfqRepository as any, makeItemSupplierRepository() as any);

    await useCase.execute({ id: 1, supplier_ids: [7, 9], transaction: baseTransaction });

    expect(rfqRepository.createRfqSupplier).toHaveBeenCalledTimes(1);
    expect(rfqRepository.createRfqSupplier).toHaveBeenCalledWith(
      expect.objectContaining({ supplier_id: 9 }),
      baseTransaction,
    );
    expect(rfqRepository.updateRfq).not.toHaveBeenCalled();
  });
});

describe('RegisterRfqQuoteUseCase', () => {
  it('registra cotacoes e transiciona sent -> quoted na primeira resposta', async () => {
    const rfqRepository = makeRfqRepository({
      findRfqByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'sent' })),
      findRfqSupplier: jest.fn(async () => ({ id: 77 })),
      findRfqItems: jest.fn(async () => [{ id: 100 }, { id: 101 }]),
    });
    const useCase = new RegisterRfqQuoteUseCase(rfqRepository as any);

    await useCase.execute({
      id: 1,
      supplier_id: 7,
      items: [{ rfq_item_id: 100, unit_price: 10, lead_time_days: 5 }],
      transaction: baseTransaction,
    });

    expect(rfqRepository.createRfqQuote).toHaveBeenCalledWith(
      expect.objectContaining({ rfq_item_id: 100, supplier_id: 7, unit_price: 10, lead_time_days: 5 }),
      baseTransaction,
    );
    expect(rfqRepository.updateRfqSupplier).toHaveBeenCalledWith(77, expect.objectContaining({ status: 'responded' }), baseTransaction);
    expect(rfqRepository.updateRfq).toHaveBeenCalledWith(1, { status: 'quoted' }, baseTransaction);
  });

  it('rejeita cotacao de fornecedor nao convidado (422 BusinessRuleError)', async () => {
    const rfqRepository = makeRfqRepository({
      findRfqByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'sent' })),
      findRfqSupplier: jest.fn(async () => null),
    });
    const useCase = new RegisterRfqQuoteUseCase(rfqRepository as any);

    await expect(
      useCase.execute({ id: 1, supplier_id: 99, items: [{ rfq_item_id: 100, unit_price: 10 }], transaction: baseTransaction }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('rejeita rfq_item_id que nao pertence a esta RFQ (422, details.invalid_rfq_item_ids)', async () => {
    const rfqRepository = makeRfqRepository({
      findRfqByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'sent' })),
      findRfqSupplier: jest.fn(async () => ({ id: 77 })),
      findRfqItems: jest.fn(async () => [{ id: 100 }]),
    });
    const useCase = new RegisterRfqQuoteUseCase(rfqRepository as any);

    await expect(
      useCase.execute({ id: 1, supplier_id: 7, items: [{ rfq_item_id: 999, unit_price: 10 }], transaction: baseTransaction }),
    ).rejects.toMatchObject({ constructor: BusinessRuleError, details: { invalid_rfq_item_ids: [999] } });
  });

  it('faz upsert: se ja existe cotacao para o par item/fornecedor, atualiza em vez de criar', async () => {
    const rfqRepository = makeRfqRepository({
      findRfqByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'quoted' })),
      findRfqSupplier: jest.fn(async () => ({ id: 77 })),
      findRfqItems: jest.fn(async () => [{ id: 100 }]),
      findRfqQuote: jest.fn(async () => ({ id: 55 })),
    });
    const useCase = new RegisterRfqQuoteUseCase(rfqRepository as any);

    await useCase.execute({ id: 1, supplier_id: 7, items: [{ rfq_item_id: 100, unit_price: 20 }], transaction: baseTransaction });

    expect(rfqRepository.updateRfqQuote).toHaveBeenCalledWith(55, expect.objectContaining({ unit_price: 20 }), baseTransaction);
    expect(rfqRepository.createRfqQuote).not.toHaveBeenCalled();
    // status ja era 'quoted': nao deve re-disparar a transicao.
    expect(rfqRepository.updateRfq).not.toHaveBeenCalled();
  });
});

describe('GetRfqComparisonUseCase', () => {
  it('monta o mapa comparativo com destaque de menor preco/prazo e total por fornecedor', async () => {
    const rfqRepository = makeRfqRepository({
      findRfqById: jest.fn(async () => ({
        id: 1,
        rfq_number: 'RFQ-2026-0001',
        status: 'quoted',
        requisition_id: null,
        items: [
          {
            id: 100,
            item_id: 'item-1',
            item: { id: 'item-1', codigo: 'ITEM-A', descricao: 'Item A' },
            quantity: '2.000000',
            unit: 'UN',
            awarded_supplier_id: null,
            awarded_unit_price: null,
            quotes: [
              { id: 1, supplier_id: 7, supplier: { company_name: 'Fornecedor A' }, unit_price: '10.000000', lead_time_days: 5, moq: null, validity_date: null, notes: null },
              { id: 2, supplier_id: 9, supplier: { company_name: 'Fornecedor B' }, unit_price: '8.000000', lead_time_days: 10, moq: null, validity_date: null, notes: null },
            ],
          },
        ],
      })),
    });
    const useCase = new GetRfqComparisonUseCase(rfqRepository as any);

    const result = await useCase.execute({ id: 1 });

    const [item] = result.items;
    const quoteA = item.quotes.find((q: any) => q.supplier_id === 7);
    const quoteB = item.quotes.find((q: any) => q.supplier_id === 9);

    expect(quoteB.is_best_price).toBe(true); // 8 < 10
    expect(quoteA.is_best_price).toBe(false);
    expect(quoteA.is_best_lead_time).toBe(true); // 5 < 10
    expect(quoteB.is_best_lead_time).toBe(false);
    expect(quoteA.line_total).toBe(20); // 2 * 10
    expect(quoteB.line_total).toBe(16); // 2 * 8

    expect(result.supplier_totals).toEqual([
      expect.objectContaining({ supplier_id: 9, total_amount: 16 }),
      expect.objectContaining({ supplier_id: 7, total_amount: 20 }),
    ]);
  });

  it('lanca NotFoundError se a RFQ nao existir', async () => {
    const rfqRepository = makeRfqRepository({ findRfqById: jest.fn(async () => null) });
    const useCase = new GetRfqComparisonUseCase(rfqRepository as any);

    await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('AwardRfqUseCase', () => {
  function makeQuotedRfqDetail(overrides: Partial<Record<string, any>> = {}) {
    return {
      id: 1,
      rfq_number: 'RFQ-2026-0001',
      status: 'quoted',
      requisition_id: null,
      items: [
        {
          id: 200,
          item_id: 'item-1',
          item: { id: 'item-1', codigo: 'ITEM-A' },
          quantity: '5.000000',
          quotes: [
            { supplier_id: 7, unit_price: '12.500000', lead_time_days: 10, moq: '50.000000' },
          ],
        },
      ],
      ...overrides,
    };
  }

  it('adjudica, gera pedido de compra e realimenta o catalogo item_suppliers (link novo)', async () => {
    const rfqRepository = makeRfqRepository({
      findRfqByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'quoted' })),
      findRfqById: jest.fn(async () => makeQuotedRfqDetail()),
    });
    const purchaseRepository = makePurchaseRepository();
    const itemSupplierRepository = makeItemSupplierRepository({
      findByItemAndSupplier: jest.fn(async () => null),
    });
    const useCase = new AwardRfqUseCase(rfqRepository as any, purchaseRepository as any, itemSupplierRepository as any);

    const result = await useCase.execute({
      id: 1,
      awards: [{ rfq_item_id: 200, supplier_id: 7 }],
      userId: 5,
      transaction: baseTransaction,
    });

    expect(purchaseRepository.createPurchase).toHaveBeenCalledTimes(1);
    const [purchasePayload] = purchaseRepository.createPurchase.mock.calls[0];
    expect(purchasePayload).toMatchObject({ supplier_id: 7, requester_id: 5, status: 'pending' });

    const [itemPayload] = purchaseRepository.createPurchaseItem.mock.calls[0];
    expect(itemPayload).toMatchObject({ product_id: 900, item_id: 'item-1', quantity: 5, unit_price: 12.5, total_price: 62.5 });

    expect(rfqRepository.updateRfqItem).toHaveBeenCalledWith(200, { awarded_supplier_id: 7, awarded_unit_price: 12.5 }, baseTransaction);
    expect(itemSupplierRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ item_id: 'item-1', supplier_id: 7, unit_price: 12.5, lead_time_days: 10, moq: 50 }),
      baseTransaction,
    );
    expect(itemSupplierRepository.update).not.toHaveBeenCalled();
    expect(rfqRepository.updateRfq).toHaveBeenCalledWith(1, { status: 'awarded' }, baseTransaction);
    expect(result).toMatchObject({ rfq_id: 1, rfq_status: 'awarded' });
  });

  it('atualiza (upsert) o vinculo item_suppliers existente em vez de criar um novo', async () => {
    const rfqRepository = makeRfqRepository({
      findRfqByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'quoted' })),
      findRfqById: jest.fn(async () => makeQuotedRfqDetail()),
    });
    const purchaseRepository = makePurchaseRepository();
    const itemSupplierRepository = makeItemSupplierRepository({
      findByItemAndSupplier: jest.fn(async () => ({ id: 33 })),
    });
    const useCase = new AwardRfqUseCase(rfqRepository as any, purchaseRepository as any, itemSupplierRepository as any);

    await useCase.execute({ id: 1, awards: [{ rfq_item_id: 200, supplier_id: 7 }], userId: 5, transaction: baseTransaction });

    expect(itemSupplierRepository.update).toHaveBeenCalledWith(33, expect.objectContaining({ unit_price: 12.5, lead_time_days: 10, moq: 50 }), baseTransaction);
    expect(itemSupplierRepository.create).not.toHaveBeenCalled();
  });

  it('rejeita adjudicacao se a RFQ nao estiver "quoted" (422 BusinessRuleError)', async () => {
    const rfqRepository = makeRfqRepository({
      findRfqByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'sent' })),
    });
    const useCase = new AwardRfqUseCase(rfqRepository as any, makePurchaseRepository() as any, makeItemSupplierRepository() as any);

    await expect(
      useCase.execute({ id: 1, awards: [{ rfq_item_id: 200, supplier_id: 7 }], userId: 5, transaction: baseTransaction }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('rejeita adjudicacao sem cotacao registrada para o par item/fornecedor (422, details.items_without_quote)', async () => {
    const rfqRepository = makeRfqRepository({
      findRfqByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'quoted' })),
      findRfqById: jest.fn(async () => makeQuotedRfqDetail()),
    });
    const useCase = new AwardRfqUseCase(rfqRepository as any, makePurchaseRepository() as any, makeItemSupplierRepository() as any);

    await expect(
      useCase.execute({ id: 1, awards: [{ rfq_item_id: 200, supplier_id: 999 }], userId: 5, transaction: baseTransaction }),
    ).rejects.toMatchObject({
      constructor: BusinessRuleError,
      details: { items_without_quote: [{ rfq_item_id: 200, supplier_id: 999 }] },
    });
  });

  it('rejeita adjudicacao com item duplicado na lista de premiacoes (422 BusinessRuleError)', async () => {
    const rfqRepository = makeRfqRepository({
      findRfqByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'quoted' })),
    });
    const useCase = new AwardRfqUseCase(rfqRepository as any, makePurchaseRepository() as any, makeItemSupplierRepository() as any);

    await expect(
      useCase.execute({
        id: 1,
        awards: [{ rfq_item_id: 200, supplier_id: 7 }, { rfq_item_id: 200, supplier_id: 9 }],
        userId: 5,
        transaction: baseTransaction,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('rejeita adjudicacao quando o codigo do item nao tem produto legado correspondente (422 BusinessRuleError)', async () => {
    const rfqRepository = makeRfqRepository({
      findRfqByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'quoted' })),
      findRfqById: jest.fn(async () => makeQuotedRfqDetail()),
    });
    const purchaseRepository = makePurchaseRepository({ findProductByCode: jest.fn(async () => null) });
    const useCase = new AwardRfqUseCase(rfqRepository as any, purchaseRepository as any, makeItemSupplierRepository() as any);

    await expect(
      useCase.execute({ id: 1, awards: [{ rfq_item_id: 200, supplier_id: 7 }], userId: 5, transaction: baseTransaction }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(purchaseRepository.createPurchase).not.toHaveBeenCalled();
  });
});
