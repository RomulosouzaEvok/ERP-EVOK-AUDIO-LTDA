/**
 * Test: Conversao de Requisicao de Compra aprovada em Pedido(s) de Compra.
 *
 * Valida ConvertRequisitionToPurchaseOrdersUseCase: agrupamento por
 * fornecedor resolvido (suggested_supplier_id -> preferencial ativo ->
 * fallback_supplier_id), preco vindo do catalogo item_suppliers, erro 422
 * quando nenhum fornecedor e resolvivel, e erro 422 quando a requisicao nao
 * esta aprovada.
 */

import ConvertRequisitionToPurchaseOrdersUseCase = require('../../src/modules/purchaseRequisitions/application/use-cases/ConvertRequisitionToPurchaseOrdersUseCase');
import { BusinessRuleError, NotFoundError } from '../../src/errors';

function makeRequisitionRepository(overrides: Partial<Record<string, any>> = {}) {
  return {
    findRequisitionByIdForUpdate: jest.fn(),
    updateRequisition: jest.fn(async () => undefined),
    updateRequisitionItem: jest.fn(async () => undefined),
    ...overrides,
  };
}

function makePurchaseRepository(overrides: Partial<Record<string, any>> = {}) {
  let purchaseSeq = 0;
  let purchaseItemSeq = 0;
  return {
    findProductByCode: jest.fn(async (code: string) => ({ id: code === 'ITEM-A' ? 101 : 102, code, toJSON() { return this; } })),
    createPurchase: jest.fn(async (data: any) => {
      purchaseSeq += 1;
      return { id: purchaseSeq, ...data, toJSON() { return { id: this.id, ...data }; } };
    }),
    createPurchaseItem: jest.fn(async (data: any) => {
      purchaseItemSeq += 1;
      return { id: purchaseItemSeq, ...data, toJSON() { return { id: this.id, ...data }; } };
    }),
    ...overrides,
  };
}

function makeItemSupplierRepository(overrides: Partial<Record<string, any>> = {}) {
  return {
    findPreferredByItem: jest.fn(async () => null),
    findByItemAndSupplier: jest.fn(async () => null),
    ...overrides,
  };
}

const baseTransaction = { id: 'tx-1' };

describe('ConvertRequisitionToPurchaseOrdersUseCase', () => {
  it('lanca NotFoundError (404) se a requisicao nao existir', async () => {
    const requisitionRepository = makeRequisitionRepository({
      findRequisitionByIdForUpdate: jest.fn(async () => null),
    });
    const useCase = new ConvertRequisitionToPurchaseOrdersUseCase(
      requisitionRepository as any,
      makePurchaseRepository() as any,
      makeItemSupplierRepository() as any,
    );

    await expect(
      useCase.execute({ id: 999, userId: 1, transaction: baseTransaction }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejeita conversao se a requisicao nao estiver aprovada (422 BusinessRuleError)', async () => {
    const requisitionRepository = makeRequisitionRepository({
      findRequisitionByIdForUpdate: jest.fn(async () => ({
        id: 1,
        status: 'pending',
        requisition_number: 'RQ-1',
        items: [],
      })),
    });
    const useCase = new ConvertRequisitionToPurchaseOrdersUseCase(
      requisitionRepository as any,
      makePurchaseRepository() as any,
      makeItemSupplierRepository() as any,
    );

    await expect(
      useCase.execute({ id: 1, userId: 1, transaction: baseTransaction }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    expect(requisitionRepository.updateRequisition).not.toHaveBeenCalled();
  });

  it('rejeita conversao quando nenhum fornecedor e resolvivel para um item (422 BusinessRuleError)', async () => {
    const requisitionRepository = makeRequisitionRepository({
      findRequisitionByIdForUpdate: jest.fn(async () => ({
        id: 1,
        status: 'approved',
        requisition_number: 'RQ-1',
        items: [
          {
            id: 10,
            item_id: 'item-1',
            item: { id: 'item-1', codigo: 'ITEM-A' },
            status: 'pending', // saldo a comprar (default da coluna); exigido desde a correcao do gap G12
            quantity: '5.000000',
            unit_price_estimated: null,
            suggested_supplier_id: null,
          },
        ],
      })),
    });
    const itemSupplierRepository = makeItemSupplierRepository({
      findPreferredByItem: jest.fn(async () => null),
    });
    const useCase = new ConvertRequisitionToPurchaseOrdersUseCase(
      requisitionRepository as any,
      makePurchaseRepository() as any,
      itemSupplierRepository as any,
    );

    await expect(
      useCase.execute({ id: 1, userId: 1, transaction: baseTransaction }),
    ).rejects.toMatchObject({
      constructor: BusinessRuleError,
      details: { item_ids_without_supplier: [10] },
    });

    expect(requisitionRepository.updateRequisition).not.toHaveBeenCalled();
  });

  it('rejeita conversao quando um codigo de item nao tem produto legado correspondente (422 BusinessRuleError)', async () => {
    const requisitionRepository = makeRequisitionRepository({
      findRequisitionByIdForUpdate: jest.fn(async () => ({
        id: 1,
        status: 'approved',
        requisition_number: 'RQ-1',
        items: [
          {
            id: 10,
            item_id: 'item-1',
            item: { id: 'item-1', codigo: 'ITEM-SEM-PRODUTO' },
            status: 'pending', // saldo a comprar (default da coluna); exigido desde a correcao do gap G12
            quantity: '5.000000',
            unit_price_estimated: 10,
            suggested_supplier_id: 7,
          },
        ],
      })),
    });
    const purchaseRepository = makePurchaseRepository({
      findProductByCode: jest.fn(async () => null),
    });
    const useCase = new ConvertRequisitionToPurchaseOrdersUseCase(
      requisitionRepository as any,
      purchaseRepository as any,
      makeItemSupplierRepository() as any,
    );

    await expect(
      useCase.execute({ id: 1, userId: 1, transaction: baseTransaction }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    expect(purchaseRepository.createPurchase).not.toHaveBeenCalled();
  });

  it('agrupa itens por fornecedor resolvido em 2 pedidos, com preco do catalogo item_suppliers', async () => {
    const requisitionRepository = makeRequisitionRepository({
      findRequisitionByIdForUpdate: jest.fn(async () => ({
        id: 1,
        status: 'approved',
        requisition_number: 'RQ-1',
        items: [
          {
            id: 10,
            item_id: 'item-1',
            item: { id: 'item-1', codigo: 'ITEM-A' },
            status: 'pending', // saldo a comprar (default da coluna); exigido desde a correcao do gap G12
            quantity: '5.000000',
            unit_price_estimated: 8,
            suggested_supplier_id: 7, // fornecedor sugerido explicitamente
          },
          {
            id: 11,
            item_id: 'item-2',
            item: { id: 'item-2', codigo: 'ITEM-B' },
            status: 'pending', // saldo a comprar (default da coluna); exigido desde a correcao do gap G12
            quantity: '2.000000',
            unit_price_estimated: 20,
            suggested_supplier_id: null, // resolvido via preferencial
          },
        ],
      })),
    });

    const purchaseRepository = makePurchaseRepository();

    const itemSupplierRepository = makeItemSupplierRepository({
      findPreferredByItem: jest.fn(async (itemId: string) => {
        if (itemId === 'item-2') {
          return { supplier_id: 9, unit_price: '15.000000' };
        }
        return null;
      }),
      findByItemAndSupplier: jest.fn(async (itemId: string, supplierId: number) => {
        if (itemId === 'item-1' && supplierId === 7) {
          return { unit_price: '12.500000' };
        }
        return null;
      }),
    });

    const useCase = new ConvertRequisitionToPurchaseOrdersUseCase(
      requisitionRepository as any,
      purchaseRepository as any,
      itemSupplierRepository as any,
    );

    const result = await useCase.execute({ id: 1, userId: 5, transaction: baseTransaction });

    // 2 fornecedores distintos -> 2 pedidos de compra.
    expect(purchaseRepository.createPurchase).toHaveBeenCalledTimes(2);
    expect(purchaseRepository.createPurchaseItem).toHaveBeenCalledTimes(2);

    const [firstPurchasePayload] = purchaseRepository.createPurchase.mock.calls[0];
    expect(firstPurchasePayload).toMatchObject({ supplier_id: 7, requester_id: 5, requisition_id: 1, status: 'pending' });

    const [secondPurchasePayload] = purchaseRepository.createPurchase.mock.calls[1];
    expect(secondPurchasePayload).toMatchObject({ supplier_id: 9, requester_id: 5, requisition_id: 1, status: 'pending' });

    const [firstItemPayload] = purchaseRepository.createPurchaseItem.mock.calls[0];
    expect(firstItemPayload).toMatchObject({
      product_id: 101,
      item_id: 'item-1',
      quantity: 5,
      unit_price: 12.5, // preco do catalogo item_suppliers (fornecedor 7), nao unit_price_estimated
      total_price: 62.5,
    });

    const [secondItemPayload] = purchaseRepository.createPurchaseItem.mock.calls[1];
    expect(secondItemPayload).toMatchObject({
      product_id: 102,
      item_id: 'item-2',
      quantity: 2,
      unit_price: 15, // preco do catalogo do preferencial (fornecedor 9)
      total_price: 30,
    });

    // Requisicao e itens marcados como 'ordered'.
    expect(requisitionRepository.updateRequisitionItem).toHaveBeenCalledWith(10, { status: 'ordered' }, baseTransaction);
    expect(requisitionRepository.updateRequisitionItem).toHaveBeenCalledWith(11, { status: 'ordered' }, baseTransaction);
    expect(requisitionRepository.updateRequisition).toHaveBeenCalledWith(1, { status: 'ordered' }, baseTransaction);

    expect(result).toMatchObject({ requisition_id: 1, requisition_status: 'ordered' });
    expect(result.purchase_orders).toHaveLength(2);
  });

  it('usa fallback_supplier_id quando nao ha sugestao nem preferencial', async () => {
    const requisitionRepository = makeRequisitionRepository({
      findRequisitionByIdForUpdate: jest.fn(async () => ({
        id: 1,
        status: 'approved',
        requisition_number: 'RQ-1',
        items: [
          {
            id: 10,
            item_id: 'item-1',
            item: { id: 'item-1', codigo: 'ITEM-A' },
            status: 'pending', // saldo a comprar (default da coluna); exigido desde a correcao do gap G12
            quantity: '3.000000',
            unit_price_estimated: 4,
            suggested_supplier_id: null,
          },
        ],
      })),
    });
    const purchaseRepository = makePurchaseRepository();
    const itemSupplierRepository = makeItemSupplierRepository();

    const useCase = new ConvertRequisitionToPurchaseOrdersUseCase(
      requisitionRepository as any,
      purchaseRepository as any,
      itemSupplierRepository as any,
    );

    const result = await useCase.execute({
      id: 1,
      userId: 5,
      fallback_supplier_id: 55,
      transaction: baseTransaction,
    });

    expect(purchaseRepository.createPurchase).toHaveBeenCalledTimes(1);
    const [purchasePayload] = purchaseRepository.createPurchase.mock.calls[0];
    expect(purchasePayload.supplier_id).toBe(55);

    const [itemPayload] = purchaseRepository.createPurchaseItem.mock.calls[0];
    // sem preco de catalogo -> usa unit_price_estimated do item da requisicao.
    expect(itemPayload.unit_price).toBe(4);

    expect(result.purchase_orders).toHaveLength(1);
  });

  /**
   * Gap G12: a conversao processava TODOS os itens da requisicao,
   * independentemente do status de cada um. Desde 2026-08-09 a adjudicacao de
   * uma cotacao (`AwardRfqUseCase`) tambem consome itens desta requisicao —
   * sem filtrar por saldo, converter depois de uma adjudicacao parcial
   * geraria um segundo pedido dos itens ja comprados.
   */
  describe('saldo por item (G12)', () => {
    it('converte apenas os itens com saldo, ignorando os ja pedidos pela cotacao', async () => {
      const requisitionRepository = makeRequisitionRepository({
        findRequisitionByIdForUpdate: jest.fn(async () => ({
          id: 1,
          status: 'approved',
          requisition_number: 'RQ-1',
          items: [
            {
              id: 10,
              item_id: 'item-1',
              item: { id: 'item-1', codigo: 'ITEM-A' },
              status: 'ordered', // ja comprado via adjudicacao de cotacao
              quantity: '5.000000',
              unit_price_estimated: 8,
              suggested_supplier_id: 7,
            },
            {
              id: 11,
              item_id: 'item-2',
              item: { id: 'item-2', codigo: 'ITEM-B' },
              status: 'pending', // saldo
              quantity: '2.000000',
              unit_price_estimated: 20,
              suggested_supplier_id: 9,
            },
          ],
        })),
      });
      const purchaseRepository = makePurchaseRepository();
      const useCase = new ConvertRequisitionToPurchaseOrdersUseCase(
        requisitionRepository as any,
        purchaseRepository as any,
        makeItemSupplierRepository() as any,
      );

      await useCase.execute({ id: 1, userId: 5, transaction: baseTransaction });

      expect(purchaseRepository.createPurchaseItem).toHaveBeenCalledTimes(1);
      expect(purchaseRepository.createPurchaseItem).toHaveBeenCalledWith(
        expect.objectContaining({ item_id: 'item-2' }),
        baseTransaction,
      );
      expect(requisitionRepository.updateRequisitionItem).toHaveBeenCalledTimes(1);
      expect(requisitionRepository.updateRequisitionItem).toHaveBeenCalledWith(11, { status: 'ordered' }, baseTransaction);
    });

    it('recusa converter quando nenhum item tem saldo (tudo ja pedido/cancelado)', async () => {
      const requisitionRepository = makeRequisitionRepository({
        findRequisitionByIdForUpdate: jest.fn(async () => ({
          id: 1,
          status: 'approved',
          requisition_number: 'RQ-1',
          items: [
            {
              id: 10,
              item_id: 'item-1',
              item: { id: 'item-1', codigo: 'ITEM-A' },
              status: 'ordered',
              quantity: '5.000000',
              unit_price_estimated: 8,
              suggested_supplier_id: 7, // fornecedor OK: o erro tem de vir do saldo
            },
          ],
        })),
      });
      const purchaseRepository = makePurchaseRepository();
      const useCase = new ConvertRequisitionToPurchaseOrdersUseCase(
        requisitionRepository as any,
        purchaseRepository as any,
        makeItemSupplierRepository() as any,
      );

      await expect(
        useCase.execute({ id: 1, userId: 5, transaction: baseTransaction }),
      ).rejects.toThrow(/nao ha saldo a converter/i);

      expect(purchaseRepository.createPurchase).not.toHaveBeenCalled();
      expect(requisitionRepository.updateRequisition).not.toHaveBeenCalled();
    });
  });
});
