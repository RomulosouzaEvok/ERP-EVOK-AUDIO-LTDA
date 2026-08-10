/**
 * Test: IssueSaleNfeUseCase — faturamento parcial (gap 3/3 do módulo `sales`)
 *
 * Cobre: emissão parcial acumulando `invoiced_quantity`, transição
 * `confirmed -> partially_invoiced -> invoiced`, rejeição de quantidade
 * acima do saldo pendente, e preservação do comportamento padrão (sem
 * payload = fatura o saldo pendente inteiro).
 *
 * @group unit
 */

const fakeTransaction = { LOCK: { UPDATE: 'UPDATE' } };

jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async (callback: any) => callback(fakeTransaction)),
  },
}));

jest.mock('../../src/modules/fiscal/domain/services/TaxCalculationService', () => ({
  calculateItem: jest.fn(() => ({
    cfop: '5102', icms_cst: '00', icms_aliquot: 18, icms_base: 0, icms_value: 0,
    ipi_cst: '99', ipi_aliquot: 0, ipi_value: 0,
    pis_cst: '01', pis_aliquot: 1.65, pis_value: 0,
    cofins_cst: '01', cofins_aliquot: 7.6, cofins_value: 0,
  })),
}));

// G9 (2026-08-10): a autorização da NF-e passou a baixar estoque. Aqui o
// serviço é dublado só para isolar o use case fiscal da stack de estoque
// (models/Sequelize) — a regra de baixa proporcional tem teste próprio em
// `sale-stock-baixa-na-nfe-g9.test.ts`.
jest.mock('../../src/services/saleStockService', () => ({
  commitInvoicedStock: jest.fn(async () => []),
}));

jest.mock('../../src/modules/fiscal/infrastructure/providers/NfeProviderFactory', () =>
  jest.fn(() => ({
    issue: jest.fn(async () => ({
      status: 'authorized',
      key: '1'.repeat(44),
      number: '1',
      series: 1,
      protocol: 'PROTO-1',
      xml_url: null,
      danfe_url: null,
      provider_ref: 'ref-1',
      error_message: null,
    })),
  }))
);

import IssueSaleNfeUseCase = require('../../src/modules/fiscal/application/use-cases/IssueSaleNfeUseCase');

const SaleStockService = require('../../src/services/saleStockService');

function buildSaleItem(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 1,
    sale_id: 500,
    product_id: 10,
    quantity: 10,
    unit_price: 20,
    total_price: 200,
    invoiced_quantity: 0,
    save: jest.fn(async function (this: any) { return this; }),
    ...overrides,
  };
}

function buildRepository({ saleStatus = 'confirmed', items = [buildSaleItem()] }: { saleStatus?: string; items?: any[] } = {}) {
  const sale: any = {
    id: 500,
    status: saleStatus,
    // Vendedor da venda — fallback do autor do InventoryMovement do G9
    // quando o use case é chamado sem `userId` do JWT.
    user_id: 7,
    nfe_status: 'pending',
    customer_id: 1,
    total_amount: '200.00',
    save: jest.fn(async function (this: any) { return this; }),
  };

  // Histórico multi-NF-e (2026-08-06): `sale_invoices` fake em memória —
  // `createSaleInvoice` grava, `findSaleInvoiceByProviderRef` devolve o
  // registro (com `.save()` stub), reproduzindo o comportamento real o
  // suficiente para o fluxo de IssueSaleNfeUseCase.
  const saleInvoices: any[] = [];
  const receivables: any[] = [];

  return {
    __sale: sale,
    __items: items,
    __saleInvoices: saleInvoices,
    findSaleById: jest.fn(async () => sale),
    findSaleItemsBySaleId: jest.fn(async () => items),
    findClientById: jest.fn(async () => ({ id: 1, name: 'Cliente A', state: 'SP', tax_regime: 'simples', ind_ie: '9' })),
    findCompanyFiscalConfig: jest.fn(async () => ({
      id: 1, cnpj: '12345678000199', city_ibge_code: '3550308', state: 'SP', crt: '1',
      nfe_series: 1, nfe_next_number: 1, nfe_environment: 'homologacao', nfe_provider: 'mock',
      save: jest.fn(async function (this: any) { return this; }),
    })),
    findProductsByIds: jest.fn(async (ids: number[]) => ids.map((id) => ({ id, code: `P${id}`, name: `Produto ${id}`, unit: 'UN', product_type: 'finished', ncm: '85182100' }))),
    createSaleInvoice: jest.fn(async (data: any) => {
      const invoice = { ...data, id: saleInvoices.length + 1, save: jest.fn(async function (this: any) { return this; }) };
      saleInvoices.push(invoice);
      return invoice;
    }),
    findSaleInvoiceByProviderRef: jest.fn(async (ref: string) => saleInvoices.find((invoice) => invoice.nfe_provider_ref === ref) || null),
    findSaleInvoicesBySaleId: jest.fn(async () => saleInvoices),
    // G13 (2026-08-10): a conta a receber nasce na autorização da NF-e.
    // `accounts_receivable` fake em memória, mesmo padrão de `saleInvoices`
    // — a regra em si tem `sale-receivable-na-nfe-g13.test.ts` dedicado.
    __receivables: receivables,
    createAccountReceivable: jest.fn(async (data: any) => {
      const receivable = { ...data, id: receivables.length + 1 };
      receivables.push(receivable);
      return receivable;
    }),
    findReceivablesBySaleId: jest.fn(async () => receivables),
  };
}

describe('IssueSaleNfeUseCase - faturamento parcial (gap 3/3)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sem payload, fatura o saldo pendente inteiro (comportamento anterior preservado)', async () => {
    const item = buildSaleItem({ quantity: 10, invoiced_quantity: 0 });
    const repo = buildRepository({ items: [item] });
    const useCase = new IssueSaleNfeUseCase(repo);

    const sale = await useCase.execute({ saleId: 500 });

    expect(item.invoiced_quantity).toBe(10);
    expect(sale.status).toBe('invoiced');
    // G9: baixa de estoque acompanha o que foi faturado.
    expect(SaleStockService.commitInvoicedStock).toHaveBeenCalledWith(
      500,
      [{ productId: 10, quantity: 10 }],
      expect.anything(),
      expect.anything(),
      expect.any(Object)
    );
  });

  it('com payload parcial, fatura so a quantidade pedida e marca partially_invoiced', async () => {
    const item = buildSaleItem({ quantity: 10, invoiced_quantity: 0 });
    const repo = buildRepository({ items: [item] });
    const useCase = new IssueSaleNfeUseCase(repo);

    const sale = await useCase.execute({ saleId: 500, items: [{ sale_item_id: 1, quantity: 4 }] });

    expect(item.invoiced_quantity).toBe(4);
    expect(sale.status).toBe('partially_invoiced');
    // G9: baixa PROPORCIONAL — 4, nunca as 10 do pedido.
    expect(SaleStockService.commitInvoicedStock).toHaveBeenCalledWith(
      500,
      [{ productId: 10, quantity: 4 }],
      expect.anything(),
      expect.anything(),
      expect.any(Object)
    );
  });

  it('acumula invoiced_quantity entre duas emissoes parciais ate completar o saldo', async () => {
    const item = buildSaleItem({ quantity: 10, invoiced_quantity: 4 });
    const repo = buildRepository({ saleStatus: 'partially_invoiced', items: [item] });
    const useCase = new IssueSaleNfeUseCase(repo);

    const sale = await useCase.execute({ saleId: 500, items: [{ sale_item_id: 1, quantity: 6 }] });

    expect(item.invoiced_quantity).toBe(10);
    expect(sale.status).toBe('invoiced');
    // G9: a segunda emissao baixa SO o restante (6), nao o pedido inteiro.
    expect(SaleStockService.commitInvoicedStock).toHaveBeenCalledWith(
      500,
      [{ productId: 10, quantity: 6 }],
      expect.anything(),
      expect.anything(),
      expect.any(Object)
    );
  });

  it('rejeita quantidade acima do saldo pendente do item', async () => {
    const item = buildSaleItem({ quantity: 10, invoiced_quantity: 4 });
    const repo = buildRepository({ saleStatus: 'partially_invoiced', items: [item] });
    const useCase = new IssueSaleNfeUseCase(repo);

    await expect(
      useCase.execute({ saleId: 500, items: [{ sale_item_id: 1, quantity: 7 }] })
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('rejeita faturar venda ja totalmente invoiced', async () => {
    const item = buildSaleItem({ quantity: 10, invoiced_quantity: 10 });
    const repo = buildRepository({ saleStatus: 'invoiced', items: [item] });
    const useCase = new IssueSaleNfeUseCase(repo);

    await expect(useCase.execute({ saleId: 500, items: [{ sale_item_id: 1, quantity: 1 }] })).rejects.toMatchObject({
      statusCode: 422,
    });
  });

  it('rejeita sale_item_id que nao pertence a venda', async () => {
    const item = buildSaleItem({ quantity: 10, invoiced_quantity: 0 });
    const repo = buildRepository({ items: [item] });
    const useCase = new IssueSaleNfeUseCase(repo);

    await expect(useCase.execute({ saleId: 500, items: [{ sale_item_id: 999, quantity: 1 }] })).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
