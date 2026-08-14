/**
 * PASSO 30 — TESTE DE CARACTERIZAÇÃO (ERP-LEGACY-001)
 *
 * Cluster: comercial-financeiro. Alvo B do lote de caracterização.
 *
 * Comportamento congelado: o desconto concedido em `POST /api/sales` é
 * gravado em `Sale.total_amount` (LÍQUIDO — bruto menos desconto,
 * `CreateSaleUseCase.ts:143-160`), mas a emissão de NF-e
 * (`IssueSaleNfeUseCase.ts:202-214`) soma `quantidade × unit_price` item a
 * item SEM NENHUMA referência a `sale.discount`, e a conta a receber nasce
 * (`saleReceivableService.ts` → `createInvoiceReceivables`) no MESMO valor
 * bruto da NF-e (`reserved.totalAmount`, também sem desconto). O resultado
 * são 3 valores para o mesmo negócio: a venda registra o líquido, a nota
 * fiscal e a cobrança registram o bruto — o cliente é cobrado (e o ICMS/PIS/
 * COFINS é calculado) sobre o valor CHEIO, ignorando o desconto concedido.
 *
 * Este teste encadeia os dois use cases reais (`CreateSaleUseCase` →
 * `IssueSaleNfeUseCase`) com repositórios fake em memória — não lê/escreve
 * PostgreSQL — reproduzindo o exemplo numérico exato do achado
 * (BUSINESS_RULE_CANDIDATES_comercial-financeiro.md, BR-COM-010): venda de
 * R$ 1.000 com R$ 200 de desconto → `total_amount` grava 800, a NF-e emite
 * 1.000, a conta a receber cobra 1.000.
 *
 * A suíte existente NÃO cobre este cenário: `tests/unit/create-sale-quote.test.ts`
 * nunca usa `discount`; `tests/unit/sale-receivable-na-nfe-g13.test.ts` e
 * `tests/unit/issue-sale-nfe-partial.test.ts` sempre fixam
 * `sale.total_amount` igual ao total dos itens (nenhum desconto); e a
 * própria matriz de rastreabilidade registra
 * (`g13-payable-receivable.test.ts:87` evita desconto de propósito) que
 * nenhum teste de integração de AR combina desconto com emissão de NF-e.
 *
 * Âncoras:
 *   - BR-COM-010 (CRITICAL/CONFIRMED = F-41/C-1) — desconto não chega à NF-e nem ao AR
 *   - server/src/modules/sales/application/use-cases/CreateSaleUseCase.ts:143-160 (total_amount líquido)
 *   - server/src/modules/fiscal/application/use-cases/IssueSaleNfeUseCase.ts:202-214 (totalAmount bruto, sem discount)
 *   - server/src/services/saleReceivableService.ts:200,215 (createInvoiceReceivables recebe o bruto)
 *
 * Este teste NÃO valida que o comportamento está correto; ele registra o
 * comportamento vigente na baseline. Alterá-lo exige decisão de negócio
 * registrada.
 *
 * @group unit
 * @ticket ERP-LEGACY-001-passo30
 */

const fakeTransaction = { id: 'tx-char-desconto', LOCK: { UPDATE: 'UPDATE' } };

jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async (callback: any) => callback(fakeTransaction)),
  },
}));

jest.mock('../../src/services/saleStockService', () => ({
  commitInvoicedStock: jest.fn(async () => []),
}));

jest.mock('../../src/services/saleLotService', () => ({
  assertLotsReleasedForInvoice: jest.fn(async () => undefined),
  shipLotsForInvoice: jest.fn(async () => []),
  returnLotShipments: jest.fn(async () => []),
}));

jest.mock('../../src/services/inventoryService', () => ({
  reserve: jest.fn(async () => ({ quantityAffected: 10, product: { id: 10, quantity: 100 } })),
  receive: jest.fn(async () => ({})),
  releaseAllReservationsForSale: jest.fn(async () => []),
}));

jest.mock('../../src/services/warehouseStockService', () => ({
  getWarehouseByCode: jest.fn(async () => ({ id: 2, code: 'ACABADOS' })),
  addToWarehouse: jest.fn(async () => ({})),
  removeFromWarehouse: jest.fn(async () => ({})),
}));

jest.mock('../../src/modules/fiscal/infrastructure/providers/NfeProviderFactory', () =>
  jest.fn(() => ({
    issue: jest.fn(async ({ ref }: any) => ({
      status: 'authorized',
      key: '3'.repeat(44),
      number: '1',
      series: 1,
      protocol: 'PROTO-DESCONTO',
      xml_url: null,
      danfe_url: null,
      provider_ref: ref,
      error_message: null,
    })),
  }))
);

import CreateSaleUseCase = require('../../src/modules/sales/application/use-cases/CreateSaleUseCase');
import IssueSaleNfeUseCase = require('../../src/modules/fiscal/application/use-cases/IssueSaleNfeUseCase');

describe('PASSO 30 — desconto do pedido não chega à NF-e nem ao recebível (BR-COM-010)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('venda de R$ 1.000 com R$ 200 de desconto: Sale.total_amount=800, NF-e=1000, AccountReceivable=1000', async () => {
    // 1) CreateSaleUseCase real — 10 unidades a R$ 100 (bruto R$ 1.000),
    //    desconto de R$ 200 informado pelo vendedor.
    const saleRepository = {
      findProductById: jest.fn(async () => ({ id: 10, name: 'Alto-falante 8518', status: 'active', quantity: 100 })),
      createSale: jest.fn(async (data: any) => ({ id: 500, ...data })),
      createSaleItem: jest.fn(async (data: any) => ({ id: 1, sale_id: 500, ...data })),
    };
    const createUseCase = new CreateSaleUseCase(saleRepository);

    const { sale: createdSale, totalNet } = await createUseCase.execute({
      customer_id: 1,
      items: [{ product_id: 10, quantity: 10, unit_price: 100 }],
      discount: 200,
      installments: 1,
      userId: 7,
      transaction: fakeTransaction as any,
    });

    // Congela o lado da VENDA: total_amount é gravado LÍQUIDO.
    expect(totalNet).toBe(800);
    expect(createdSale.total_amount).toBe(800);
    expect(createdSale.discount).toBe(200);

    // 2) IssueSaleNfeUseCase real — venda "confirmed" resultante do passo
    //    acima, faturada por inteiro (sem payload parcial). O item de venda
    //    guarda o BRUTO (`total_price: 1000`, `unit_price: 100`) — igual ao
    //    que `CreateSaleUseCase.ts:135-140` de fato persiste; é o
    //    `Sale.total_amount` (não o item) que carrega o líquido.
    const saleItem: any = {
      id: 1, sale_id: 500, product_id: 10, quantity: 10, unit_price: '100.00',
      total_price: '1000.00', invoiced_quantity: 0,
      save: jest.fn(async function (this: any) { return this; }),
    };
    const fiscalSale: any = {
      id: 500, status: 'confirmed', customer_id: 1, user_id: 7,
      installments: 1, payment_method: 'boleto', nfe_status: 'pending',
      total_amount: createdSale.total_amount, // 800 — o líquido gravado na venda
      discount: createdSale.discount, // 200
      save: jest.fn(async function (this: any) { return this; }),
    };
    const saleInvoices: any[] = [];
    const receivables: any[] = [];
    const fiscalRepository = {
      findSaleById: jest.fn(async () => fiscalSale),
      findSaleItemsBySaleId: jest.fn(async () => [saleItem]),
      findClientById: jest.fn(async () => ({ id: 1, name: 'Cliente A', state: 'SP', tax_regime: 'simples', ind_ie: '9' })),
      findCompanyFiscalConfig: jest.fn(async () => ({
        id: 1, cnpj: '12345678000199', city_ibge_code: '3550308', state: 'SP', crt: '1',
        nfe_series: 1, nfe_next_number: 1, nfe_environment: 'homologacao', nfe_provider: 'mock',
        save: jest.fn(async function (this: any) { return this; }),
      })),
      findProductsByIds: jest.fn(async (ids: number[]) => ids.map((id) => ({
        id, code: `P${id}`, name: 'Alto-falante 8518', unit: 'UN', product_type: 'finished', ncm: '85182100',
      }))),
      createSaleInvoice: jest.fn(async (data: any) => {
        const invoice = { ...data, id: saleInvoices.length + 1, save: jest.fn(async function (this: any) { return this; }) };
        saleInvoices.push(invoice);
        return invoice;
      }),
      findSaleInvoiceByProviderRef: jest.fn(async (ref: string) => saleInvoices.find((inv) => inv.nfe_provider_ref === ref) || null),
      findSaleInvoicesBySaleId: jest.fn(async () => saleInvoices),
      createAccountReceivable: jest.fn(async (data: any) => {
        const row = { id: receivables.length + 1, ...data };
        receivables.push(row);
        return row;
      }),
      findReceivablesBySaleId: jest.fn(async () => receivables),
    };

    const issueUseCase = new IssueSaleNfeUseCase(fiscalRepository as any);
    const issuedSale = await issueUseCase.execute({ saleId: 500, userId: 9 });

    expect(issuedSale.nfe_status).toBe('authorized');

    // COMPORTAMENTO CONGELADO 1: a NF-e é emitida pelo valor BRUTO dos
    // itens (10 × R$ 100 = R$ 1.000) — o desconto de R$ 200 da venda nunca
    // é lido por `IssueSaleNfeUseCase`.
    expect(saleInvoices).toHaveLength(1);
    expect(saleInvoices[0].total_amount).toBe(1000);

    // COMPORTAMENTO CONGELADO 2: a conta a receber nasce no MESMO valor
    // bruto da NF-e (R$ 1.000), não no líquido da venda (R$ 800) — o
    // cliente é cobrado o valor cheio.
    expect(receivables).toHaveLength(1);
    expect(receivables[0].amount).toBe(1000);

    // COMPORTAMENTO CONGELADO 3: `Sale.total_amount` continua gravado em
    // 800 (líquido) — o faturamento não sobrescreve nem realinha esse
    // campo. Três valores para o mesmo negócio, nenhum dos três em sincronia
    // com os outros dois: venda=800, nota=1000, cobrança=1000.
    expect(fiscalSale.total_amount).toBe(800);
  });
});
