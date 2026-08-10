/**
 * Test: CreateSaleUseCase — fluxo de orcamento (F22) + reserva do G9
 *
 * Garante que `status: 'quote'` cria a venda/itens sem comprometer estoque
 * nem gerar parcelas em `AccountReceivable`, e que o comportamento padrao
 * (`status` omitido/`'confirmed'`) gera parcelas normalmente.
 *
 * ATUALIZADO PELO G9 (2026-08-10): venda confirmada deixou de chamar
 * `InventoryService.consume` (baixa) e passou a chamar
 * `InventoryService.reserve` com a venda como dona. A baixa migrou para a
 * autorizacao da NF-e (Ajuste SINIEF 07/05, clausula 9a §1o).
 *
 * @group unit
 * @ticket F22
 * @ticket G9-Onda3
 */

jest.mock('../../src/services/inventoryService', () => ({
  consume: jest.fn(async () => ({ product: { id: 10, quantity: 8 } })),
  receive: jest.fn(async () => ({ product: { id: 10, quantity: 10 } })),
  reserve: jest.fn(async () => ({ quantityAffected: 2, product: { id: 10, quantity: 10 } })),
  releaseReservation: jest.fn(async () => ({ quantityAffected: 2 })),
}));

jest.mock('../../src/services/warehouseStockService', () => ({
  getWarehouseByCode: jest.fn(async (code) => ({ id: code === 'ACABADOS' ? 2 : 1, code })),
  addToWarehouse: jest.fn(async () => ({})),
  removeFromWarehouse: jest.fn(async () => ({})),
}));

import CreateSaleUseCase = require('../../src/modules/sales/application/use-cases/CreateSaleUseCase');

const InventoryService = require('../../src/services/inventoryService');

describe('CreateSaleUseCase - orcamento (F22)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function buildRepository(productQuantity = 10) {
    const createdItems: any[] = [];
    const createdReceivables: any[] = [];

    return {
      findProductById: jest.fn(async () => ({
        id: 10,
        name: 'Produto Teste',
        status: 'active',
        quantity: productQuantity,
      })),
      createSale: jest.fn(async (data: any) => ({ id: 500, ...data })),
      createSaleItem: jest.fn(async (data: any) => {
        createdItems.push(data);
        return { id: createdItems.length, ...data };
      }),
      createAccountReceivable: jest.fn(async (data: any) => {
        createdReceivables.push(data);
        return { id: createdReceivables.length, ...data };
      }),
      __createdItems: createdItems,
      __createdReceivables: createdReceivables,
    };
  }

  const baseInput = {
    customer_id: 1,
    items: [{ product_id: 10, quantity: 2, unit_price: 50 }],
    installments: 1,
    userId: 7,
    transaction: { id: 'tx-quote' },
  };

  it('cria venda como quote sem comprometer estoque nem gerar parcelas', async () => {
    const saleRepository = buildRepository(1); // estoque insuficiente proposital
    const useCase = new CreateSaleUseCase(saleRepository);

    const { sale, totalNet } = await useCase.execute({ ...baseInput, status: 'quote' });

    expect(sale.status).toBe('quote');
    expect(totalNet).toBe(100);
    expect(saleRepository.createSaleItem).toHaveBeenCalledTimes(1);
    expect(InventoryService.consume).not.toHaveBeenCalled();
    expect(InventoryService.reserve).not.toHaveBeenCalled();
    expect(saleRepository.createAccountReceivable).not.toHaveBeenCalled();
  });

  it('G9/G13: venda criada confirmed RESERVA (nao baixa) e NAO gera parcela', async () => {
    const saleRepository = buildRepository(10);
    const useCase = new CreateSaleUseCase(saleRepository);

    const { sale } = await useCase.execute({ ...baseInput });

    expect(sale.status).toBe('confirmed');
    expect(InventoryService.consume).not.toHaveBeenCalled();
    expect(InventoryService.reserve).toHaveBeenCalledTimes(1);
    expect(InventoryService.reserve).toHaveBeenCalledWith(
      10,
      2,
      7,
      expect.anything(),
      expect.objectContaining({ saleId: 500 })
    );
    // G13 (2026-08-10, CPC 47 itens 38/108): confirmar pedido NAO cria
    // recebivel — o direito ainda e condicional ao faturamento. A parcela
    // nasce na autorizacao da NF-e (`sale-receivable-na-nfe-g13.test.ts`).
    expect(saleRepository.createAccountReceivable).not.toHaveBeenCalled();
  });

  it('bloqueia confirmed com estoque insuficiente mas permite quote', async () => {
    const insufficientRepository = buildRepository(1);
    const useCase = new CreateSaleUseCase(insufficientRepository);

    await expect(useCase.execute({ ...baseInput, status: 'confirmed' })).rejects.toThrow(
      /Estoque insuficiente/
    );

    const quoteRepository = buildRepository(1);
    const quoteUseCase = new CreateSaleUseCase(quoteRepository);
    const { sale } = await quoteUseCase.execute({ ...baseInput, status: 'quote' });
    expect(sale.status).toBe('quote');
  });
});
