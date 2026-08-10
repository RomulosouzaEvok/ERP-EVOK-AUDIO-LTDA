/**
 * Test: GetSaleNfeStatusUseCase — reconciliação assíncrona de provedores
 * reais (2026-08-06, `docs/governance/TODO.md`).
 *
 * Cobre: quando o provedor confirma autorização de forma assíncrona (fora
 * do caminho síncrono de `IssueSaleNfeUseCase`), este use case agora
 * incrementa `invoiced_quantity` dos itens da emissão (a partir do
 * snapshot em `sale_invoices.items`) e aplica a mesma transição de status
 * (`confirmed`/`partially_invoiced` -> `partially_invoiced`/`invoiced`),
 * reaproveitando `SaleInvoiceAccumulator`.
 *
 * @group unit
 */

const fakeTransaction = { LOCK: { UPDATE: 'UPDATE' } };

jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async (callback: any) => callback(fakeTransaction)),
  },
}));

// G9 (2026-08-10): a autorização (também a assíncrona) baixa estoque.
// Dublado aqui para isolar o use case fiscal da stack de estoque.
jest.mock('../../src/services/saleStockService', () => ({
  commitInvoicedStock: jest.fn(async () => []),
}));

jest.mock('../../src/modules/fiscal/infrastructure/providers/NfeProviderFactory', () =>
  jest.fn(() => ({
    queryStatus: jest.fn(async () => queryStatusResult),
  }))
);

import GetSaleNfeStatusUseCase = require('../../src/modules/fiscal/application/use-cases/GetSaleNfeStatusUseCase');

const SaleStockService = require('../../src/services/saleStockService');

let queryStatusResult: any;

function buildSaleItem(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 1,
    sale_id: 900,
    product_id: 10,
    quantity: 10,
    unit_price: 20,
    invoiced_quantity: 0,
    save: jest.fn(async function (this: any) { return this; }),
    ...overrides,
  };
}

function buildSaleInvoice(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 1,
    sale_id: 900,
    nfe_status: 'processing',
    nfe_provider_ref: 'sale-900-1-1',
    items: [{ sale_item_id: 1, quantity: 6, product_id: 10 }],
    save: jest.fn(async function (this: any) { return this; }),
    ...overrides,
  };
}

function buildRepository({
  saleStatus = 'confirmed',
  saleNfeStatus = 'processing',
  items = [buildSaleItem()],
  saleInvoice = buildSaleInvoice(),
}: {
  saleStatus?: string;
  saleNfeStatus?: string;
  items?: any[];
  saleInvoice?: any;
} = {}) {
  const sale: any = {
    id: 900,
    status: saleStatus,
    // Vendedor da venda — no caminho assíncrono (webhook) não há usuário
    // autenticado, então é ele quem assina o InventoryMovement do G9.
    user_id: 7,
    nfe_status: saleNfeStatus,
    nfe_provider_ref: 'sale-900-1-1',
    nfe_issued_at: null,
    save: jest.fn(async function (this: any) { return this; }),
  };

  return {
    __sale: sale,
    __items: items,
    findSaleById: jest.fn(async () => sale),
    findSaleItemsBySaleId: jest.fn(async () => items),
    findCompanyFiscalConfig: jest.fn(async () => ({ id: 1, nfe_provider: 'focus_nfe' })),
    findSaleInvoiceByProviderRef: jest.fn(async () => saleInvoice),
  };
}

describe('GetSaleNfeStatusUseCase - reconciliação assíncrona (provedor real)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('autorização assíncrona incrementa invoiced_quantity a partir do snapshot da emissão e marca partially_invoiced', async () => {
    const item = buildSaleItem({ quantity: 10, invoiced_quantity: 0 });
    const saleInvoice = buildSaleInvoice({ items: [{ sale_item_id: 1, quantity: 6, product_id: 10 }] });
    const repo = buildRepository({ items: [item], saleInvoice });
    queryStatusResult = { status: 'authorized', key: '1'.repeat(44), protocol: 'PROTO-ASYNC', xml_url: null, danfe_url: null, error_message: null };

    const useCase = new GetSaleNfeStatusUseCase(repo);
    const sale = await useCase.execute({ saleId: 900 });

    expect(item.invoiced_quantity).toBe(6);
    expect(sale.status).toBe('partially_invoiced');
    expect(saleInvoice.nfe_status).toBe('authorized');
    // G9: o caminho assincrono tambem baixa estoque, na quantidade da emissao.
    expect(SaleStockService.commitInvoicedStock).toHaveBeenCalledWith(
      900,
      [{ productId: 10, quantity: 6 }],
      7, // sem usuário autenticado (webhook), assina o vendedor da venda
      expect.anything(),
      expect.any(Object)
    );
  });

  it('autorização assíncrona de emissão total marca invoiced (sem saldo restante)', async () => {
    const item = buildSaleItem({ quantity: 10, invoiced_quantity: 0 });
    const saleInvoice = buildSaleInvoice({ items: [{ sale_item_id: 1, quantity: 10, product_id: 10 }] });
    const repo = buildRepository({ items: [item], saleInvoice });
    queryStatusResult = { status: 'authorized', key: '1'.repeat(44), protocol: 'PROTO-ASYNC', xml_url: null, danfe_url: null, error_message: null };

    const useCase = new GetSaleNfeStatusUseCase(repo);
    const sale = await useCase.execute({ saleId: 900 });

    expect(item.invoiced_quantity).toBe(10);
    expect(sale.status).toBe('invoiced');
  });

  it('segunda emissão parcial acumula sobre invoiced_quantity ja existente', async () => {
    const item = buildSaleItem({ quantity: 10, invoiced_quantity: 4 });
    const saleInvoice = buildSaleInvoice({ items: [{ sale_item_id: 1, quantity: 6, product_id: 10 }] });
    const repo = buildRepository({ saleStatus: 'partially_invoiced', items: [item], saleInvoice });
    queryStatusResult = { status: 'authorized', key: '1'.repeat(44), protocol: 'PROTO-ASYNC-2', xml_url: null, danfe_url: null, error_message: null };

    const useCase = new GetSaleNfeStatusUseCase(repo);
    const sale = await useCase.execute({ saleId: 900 });

    expect(item.invoiced_quantity).toBe(10);
    expect(sale.status).toBe('invoiced');
  });

  it('resultado denied nao toca invoiced_quantity, so atualiza o status da emissao', async () => {
    const item = buildSaleItem({ quantity: 10, invoiced_quantity: 0 });
    const saleInvoice = buildSaleInvoice({ items: [{ sale_item_id: 1, quantity: 10, product_id: 10 }] });
    const repo = buildRepository({ items: [item], saleInvoice });
    queryStatusResult = { status: 'denied', key: null, protocol: null, xml_url: null, danfe_url: null, error_message: 'Rejeitado pela SEFAZ' };

    const useCase = new GetSaleNfeStatusUseCase(repo);
    const sale = await useCase.execute({ saleId: 900 });

    expect(item.invoiced_quantity).toBe(0);
    expect(sale.status).toBe('confirmed');
    expect(saleInvoice.nfe_status).toBe('denied');
    // G9: NF-e negada nao baixa estoque nenhum.
    expect(SaleStockService.commitInvoicedStock).not.toHaveBeenCalled();
  });

  it('idempotencia: emissao ja reconciliada (nfe_status != processing) nao reaplica o acumulo', async () => {
    const item = buildSaleItem({ quantity: 10, invoiced_quantity: 6 });
    const saleInvoice = buildSaleInvoice({ nfe_status: 'authorized', items: [{ sale_item_id: 1, quantity: 6, product_id: 10 }] });
    const repo = buildRepository({ saleStatus: 'partially_invoiced', saleNfeStatus: 'processing', items: [item], saleInvoice });
    queryStatusResult = { status: 'authorized', key: '1'.repeat(44), protocol: 'PROTO-ASYNC', xml_url: null, danfe_url: null, error_message: null };

    const useCase = new GetSaleNfeStatusUseCase(repo);
    const sale = await useCase.execute({ saleId: 900 });

    // invoiced_quantity nao muda de novo (ja tinha sido aplicado antes).
    expect(item.invoiced_quantity).toBe(6);
    // status da venda tambem nao e recalculado por este caminho ja reconciliado.
    expect(sale.status).toBe('partially_invoiced');
    // G9: e, principalmente, o estoque NAO e baixado duas vezes.
    expect(SaleStockService.commitInvoicedStock).not.toHaveBeenCalled();
  });

  it('sem provider_ref, retorna a venda sem consultar o provedor', async () => {
    const repo = buildRepository();
    repo.__sale.nfe_provider_ref = null;

    const useCase = new GetSaleNfeStatusUseCase(repo);
    const sale = await useCase.execute({ saleId: 900 });

    expect(sale).toBe(repo.__sale);
    expect(repo.findCompanyFiscalConfig).not.toHaveBeenCalled();
  });
});
