/**
 * Gap G13 (parte B) — a CONTA A RECEBER sai da CONFIRMACAO do pedido e
 * passa para a AUTORIZACAO DA NF-e; e nenhuma parcela nasce paga.
 *
 * Base normativa (decisao D-A do dono,
 * `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4; pesquisa em
 * `docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`,
 * Decisao 6-C):
 *
 *  - **CPC 47 item 31** — receita quando o cliente obtem o CONTROLE do bem.
 *  - **CPC 47 item 38** — na confirmacao do pedido nao ha posse fisica, nem
 *    titularidade, nem aceite, nem direito presente a pagamento.
 *  - **CPC 47 item 108** — recebivel exige direito INCONDICIONAL; antes da
 *    nota o direito e condicional ao faturamento.
 *
 * A outra metade desta entrega e a **decisao D-J** do dono: cobranca sem
 * venda (reembolso, aluguel, venda de sucata) e caso legitimo e o caminho
 * permanece aberto. Por isso ha, aqui, tanto o teste de que recebivel de
 * VENDA passou a exigir a nota quanto o de que recebivel AVULSO continua
 * funcionando.
 *
 * O que este arquivo NAO cobre (risco residual declarado no handoff): o
 * comportamento transacional real contra o Postgres.
 *
 * @group unit
 * @ticket G13-Onda3
 */

jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async (callback?: any) => {
      const transaction = { id: 'tx-g13', LOCK: { UPDATE: 'UPDATE' }, commit: jest.fn(), rollback: jest.fn() };
      return callback ? callback(transaction) : transaction;
    }),
  },
}));

// A baixa de estoque do G9 tem arquivo dedicado
// (`sale-stock-baixa-na-nfe-g9.test.ts`); aqui ela e dublada para o teste
// falhar pela regra do RECEBIVEL, nao pela pilha de estoque/deposito.
jest.mock('../../src/services/saleStockService', () => ({
  commitInvoicedStock: jest.fn(async () => []),
}));

// D-L (2026-08-10): o gate de lote da emissao tem arquivo dedicado. Dublado
// aqui pela MESMA razao declarada logo abaixo para estoque/deposito: sem isto
// o servico carrega os models reais contra o `config/database` dublado.
jest.mock('../../src/services/saleLotService', () => ({
  assertLotsReleasedForInvoice: jest.fn(async () => undefined),
  shipLotsForInvoice: jest.fn(async () => []),
  returnLotShipments: jest.fn(async () => []),
}));

// Idem para a reserva/estoque da confirmacao do pedido: dublados para que o
// `jest.mock` de `config/database` acima nao arraste a definicao real dos
// models (que precisa de uma instancia Sequelize de verdade).
jest.mock('../../src/services/inventoryService', () => ({
  reserve: jest.fn(async () => ({})),
  releaseAllReservationsForSale: jest.fn(async () => ({})),
  receive: jest.fn(async () => ({})),
}));

jest.mock('../../src/services/warehouseStockService', () => ({
  getWarehouseByCode: jest.fn(async () => ({ id: 1, code: 'ACABADOS' })),
  addToWarehouse: jest.fn(async () => ({})),
  removeFromWarehouse: jest.fn(async () => ({})),
}));

jest.mock('../../src/modules/fiscal/infrastructure/providers/NfeProviderFactory', () => {
  return jest.fn(() => ({
    issue: jest.fn(async ({ ref }: any) => ({
      status: 'authorized',
      key: '35260800000000000000550010000000011000000017',
      number: '1', series: 1, protocol: '135260000000001',
      xml_url: null, danfe_url: null, provider_ref: ref, error_message: null,
    })),
  }));
});

import IssueSaleNfeUseCase = require('../../src/modules/fiscal/application/use-cases/IssueSaleNfeUseCase');
import ChangeSaleStatusUseCase = require('../../src/modules/sales/application/use-cases/ChangeSaleStatusUseCase');
import CreateReceivableUseCase = require('../../src/modules/financial/application/use-cases/CreateReceivableUseCase');
import { BusinessRuleError } from '../../src/errors';

const { buildInstallmentPlan } = require('../../src/services/saleReceivableService');

/**
 * Duble do repositorio fiscal: 1 venda `confirmed` de 10 unidades a
 * R$ 20,00 (R$ 200,00), com `accounts_receivable` e `sale_invoices` em
 * memoria.
 */
function buildFiscalRepository({ installments = 1, existingReceivables = [] as any[] } = {}) {
  const item: any = { id: 1, product_id: 77, quantity: 10, invoiced_quantity: 0, unit_price: '20.00', save: jest.fn(async () => item) };
  const sale: any = {
    id: 500, status: 'confirmed', customer_id: 1, user_id: 7,
    installments, payment_method: 'boleto', nfe_status: 'pending',
    total_amount: '200.00',
    save: jest.fn(async function (this: any) { return this; }),
  };
  const saleInvoices: any[] = [];
  const receivables: any[] = [...existingReceivables];

  return {
    __sale: sale,
    __item: item,
    __receivables: receivables,
    findSaleById: jest.fn(async () => sale),
    findSaleItemsBySaleId: jest.fn(async () => [item]),
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
    createAccountReceivable: jest.fn(async (data: any) => {
      const row = { id: receivables.length + 1, ...data };
      receivables.push(row);
      return row;
    }),
    findReceivablesBySaleId: jest.fn(async () => receivables),
  };
}

describe('G13-B — plano de parcelas de uma emissao (funcao pura)', () => {
  it('parcela unica vence na data da emissao e nao nasce paga', () => {
    const plan = buildInstallmentPlan(200, 1, new Date(2026, 7, 10));
    expect(plan).toHaveLength(1);
    expect(plan[0].amount).toBe(200);
    expect(plan[0].due_date.getDate()).toBe(10);
  });

  it('a ultima parcela absorve o resto da divisao inteira em centavos (regra F24 preservada)', () => {
    const plan = buildInstallmentPlan(100, 3, new Date(2026, 7, 10));
    expect(plan.map((p: any) => p.amount)).toEqual([33.33, 33.33, 33.34]);
    expect(plan.reduce((sum: number, p: any) => sum + p.amount, 0)).toBeCloseTo(100, 2);
  });

  it('numeracao continua de onde a emissao anterior parou (faturamento parcial)', () => {
    const plan = buildInstallmentPlan(60, 2, new Date(2026, 7, 10), 3);
    expect(plan.map((p: any) => p.installment)).toEqual([3, 4]);
  });

  it('vencimento mensal nao estoura o mes (31/jan + 1 mes nunca vira 03/mar)', () => {
    const plan = buildInstallmentPlan(300, 3, new Date(2026, 0, 31));
    expect(plan.map((p: any) => p.due_date.getMonth())).toEqual([1, 2, 3]);
    expect(plan[0].due_date.getDate()).toBe(28); // fevereiro de 2026
  });
});

describe('G13-B — confirmar pedido NAO cria recebivel', () => {
  it('quote -> confirmed reserva estoque mas nao chama createAccountReceivable (CPC 47 item 108)', async () => {
    const InventoryService = require('../../src/services/inventoryService');
    InventoryService.reserve.mockClear();

    const sale: any = {
      id: 500, status: 'quote', customer_id: 1, installments: 1,
      payment_method: 'dinheiro', total_amount: '200.00', nfe_status: 'pending',
      items: [{ id: 1, product_id: 77, quantity: 10, invoiced_quantity: 0 }],
      save: jest.fn(async function (this: any) { return this; }),
    };
    const saleRepository: any = {
      findSaleWithItemsForUpdate: jest.fn(async () => sale),
      createAccountReceivable: jest.fn(async () => ({})),
      cancelPendingReceivables: jest.fn(async () => {}),
    };

    const useCase = new ChangeSaleStatusUseCase(saleRepository);
    const { sale: updated } = await useCase.execute({ id: 500, status: 'confirmed', userId: 7, transaction: {} as any });

    expect(updated.status).toBe('confirmed');
    expect(InventoryService.reserve).toHaveBeenCalledTimes(1);
    expect(saleRepository.createAccountReceivable).not.toHaveBeenCalled();
  });
});

describe('G13-B — a autorizacao da NF-e cria o recebivel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('emissao total gera a parcela no valor faturado, sempre pendente e nunca paga', async () => {
    const repository = buildFiscalRepository();
    const useCase = new IssueSaleNfeUseCase(repository);

    const sale = await useCase.execute({ saleId: 500, userId: 9 });

    expect(sale.nfe_status).toBe('authorized');
    expect(repository.__receivables).toHaveLength(1);
    expect(repository.__receivables[0]).toMatchObject({
      sale_id: 500,
      customer_id: 1,
      installment: 1,
      amount: 200,
      status: 'pending',
      payment_date: null,
    });
  });

  it('venda a vista tambem nasce pendente: quitacao e evento proprio da Tesouraria', async () => {
    const repository = buildFiscalRepository({ installments: 1 });
    repository.__sale.payment_method = 'dinheiro';
    const useCase = new IssueSaleNfeUseCase(repository);

    await useCase.execute({ saleId: 500, userId: 9 });

    expect(repository.__receivables[0].status).toBe('pending');
    expect(repository.__receivables[0].payment_date).toBeNull();
  });

  it('faturamento PARCIAL cobra so o que foi faturado, e a segunda nota continua a numeracao', async () => {
    const repository = buildFiscalRepository();
    const useCase = new IssueSaleNfeUseCase(repository);

    await useCase.execute({ saleId: 500, items: [{ sale_item_id: 1, quantity: 4 }], userId: 9 });
    expect(repository.__receivables).toHaveLength(1);
    expect(repository.__receivables[0]).toMatchObject({ installment: 1, amount: 80 });

    repository.__sale.nfe_status = 'pending';
    await useCase.execute({ saleId: 500, items: [{ sale_item_id: 1, quantity: 6 }], userId: 9 });

    expect(repository.__receivables).toHaveLength(2);
    expect(repository.__receivables[1]).toMatchObject({ installment: 2, amount: 120 });
    // As duas notas somam o pedido, sem antecipar nada.
    expect(repository.__receivables.reduce((sum: number, row: any) => sum + row.amount, 0)).toBe(200);
  });

  it('venda parcelada gera N parcelas do valor DESTA emissao', async () => {
    const repository = buildFiscalRepository({ installments: 4 });
    const useCase = new IssueSaleNfeUseCase(repository);

    await useCase.execute({ saleId: 500, userId: 9 });

    expect(repository.__receivables).toHaveLength(4);
    expect(repository.__receivables.map((row: any) => row.amount)).toEqual([50, 50, 50, 50]);
    expect(repository.__receivables.every((row: any) => row.status === 'pending')).toBe(true);
  });

  it('nao duplica recebivel de venda legada: parcela criada na confirmacao (sem NF) bloqueia a criacao', async () => {
    const repository = buildFiscalRepository({
      existingReceivables: [{ id: 90, sale_id: 500, installment: 1, amount: 200, invoice_number: null, status: 'pending' }],
    });
    const useCase = new IssueSaleNfeUseCase(repository);

    await useCase.execute({ saleId: 500, userId: 9 });

    expect(repository.createAccountReceivable).not.toHaveBeenCalled();
    // A linha financeira legada do dono permanece intacta.
    expect(repository.__receivables).toHaveLength(1);
    expect(repository.__receivables[0].id).toBe(90);
  });
});

describe('G13-B / D-J — cobranca AVULSA continua aberta', () => {
  function buildFinancialRepository() {
    const rows: any[] = [];
    return {
      __rows: rows,
      createReceivable: jest.fn(async (data: any) => {
        const row = { id: rows.length + 1, ...data };
        rows.push(row);
        return row;
      }),
    } as any;
  }

  it('cria cobranca sem venda vinculada (reembolso/aluguel/sucata) — sale_id NULL, status pendente', async () => {
    const repository = buildFinancialRepository();
    const useCase = new CreateReceivableUseCase(repository);

    const account = await useCase.execute({
      customer_id: 1,
      amount: 350.5,
      due_date: '2026-09-15',
      notes: 'Venda de sucata de aluminio',
    });

    expect(account).toMatchObject({
      sale_id: null,
      customer_id: 1,
      installment: 1,
      amount: 350.5,
      status: 'pending',
      payment_date: null,
      notes: 'Venda de sucata de aluminio',
    });
  });

  it('recusa cobranca com sale_id: recebivel de venda nasce na NF-e (details.rule G13-AR)', async () => {
    const repository = buildFinancialRepository();
    const useCase = new CreateReceivableUseCase(repository);

    const error: any = await useCase
      .execute({ customer_id: 1, amount: 100, due_date: '2026-09-15', sale_id: 500 })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({ rule: 'G13-AR', sale_id: 500, field: 'sale_id' });
    expect(repository.createReceivable).not.toHaveBeenCalled();
  });

  it('recusa parcela que ja nasce baixada (details.rule G13-AR-PAID)', async () => {
    const repository = buildFinancialRepository();
    const useCase = new CreateReceivableUseCase(repository);

    const error: any = await useCase
      .execute({ customer_id: 1, amount: 100, due_date: '2026-09-15', status: 'paid' })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({ rule: 'G13-AR-PAID', status: 'paid', field: 'status' });
    expect(repository.createReceivable).not.toHaveBeenCalled();
  });
});
