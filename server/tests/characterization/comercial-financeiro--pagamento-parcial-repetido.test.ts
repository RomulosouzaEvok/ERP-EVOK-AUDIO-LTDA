/**
 * PASSO 30 — TESTE DE CARACTERIZAÇÃO (ERP-LEGACY-001)
 *
 * Cluster: comercial-financeiro. Alvo A do lote de caracterização.
 *
 * Comportamento validado: `PayPayableUseCase`/`ReceivePaymentUseCase`
 * persistem cada baixa em `financial_payment_events` com `operation_id`
 * único. Reexecutar a MESMA operação com a MESMA chave retorna conflito e
 * não duplica `amount_paid`.
 *
 * A suíte aqui continua cobrindo os dois lados do caso:
 * - a baixa parcial legítima segue permitida;
 * - replay da mesma operação passa a ser recusado;
 * - valor acima do saldo continua sendo recusado pelo teto de saldo.
 *
 * Âncoras:
 *   - FIND-ERP-001 (GRUPO B, item 1) — "Pagamento parcial retry-duplicado"
 *   - BR-FIN-001 (BUSINESS_RULE_CANDIDATES_comercial-financeiro.md) — baixa
 *     de título, sem juros/multa, sem segregação de baixa
 *   - server/src/modules/financial/application/use-cases/PayPayableUseCase.ts:39-74
 *   - server/src/modules/financial/application/use-cases/ReceivePaymentUseCase.ts:39-74
 *
 * Este teste agora valida a correção. Alterá-lo sem manter a regra de
 * `operation_id` por operação quebraria a proteção contra replay.
 *
 * @group unit
 * @ticket ERP-LEGACY-001-passo30
 */

const fakeTransaction = { id: 'tx-char-pay-1', LOCK: { UPDATE: 'UPDATE' } };

jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async (callback: any) => callback(fakeTransaction)),
  },
}));

const appliedOperations = new Set<string>();

jest.mock('../../src/models/FinancialPaymentEvent', () => ({
  create: jest.fn(async (data: any) => {
    const operationId = String(data.operation_id || '');
    if (appliedOperations.has(operationId)) {
      const error: any = new Error('unique violation');
      error.name = 'SequelizeUniqueConstraintError';
      error.errors = [{ path: 'operation_id' }];
      throw error;
    }
    appliedOperations.add(operationId);
    return { id: appliedOperations.size, ...data };
  }),
}));

import PayPayableUseCase = require('../../src/modules/financial/application/use-cases/PayPayableUseCase');
import ReceivePaymentUseCase = require('../../src/modules/financial/application/use-cases/ReceivePaymentUseCase');
import { ValidationError } from '../../src/errors';

/**
 * Constrói uma conta (a pagar ou a receber — os dois use cases leem os
 * mesmos campos) de R$ 1.000,00 sem nenhum pagamento aplicado ainda.
 *
 * A MESMA instância é devolvida em toda chamada de
 * `findPayableByIdForUpdate`/`findReceivableByIdForUpdate` do repositório
 * fake abaixo — reproduzindo, sem precisar de Postgres, o efeito de duas
 * requisições HTTP consecutivas lendo/escrevendo a mesma linha já commitada
 * pela chamada anterior (o cenário real do FIND-ERP-001: retry pós-commit,
 * não concorrência simultânea).
 */
function buildAccount(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 1,
    status: 'pending',
    amount: 1000,
    amount_paid: 0,
    payment_method: null,
    payment_date: null,
    save: jest.fn(async function (this: any) { return this; }),
    ...overrides,
  };
}

describe('PASSO 30 — pagamento parcial repetido (FIND-ERP-001 grupo B)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appliedOperations.clear();
  });

  it('PayPayableUseCase: reenvio identico sobre titulo `partial` (mesmo operation_id) e rejeitado — amount_paid nao acumula de novo', async () => {
    const account = buildAccount();
    const repository = { findPayableByIdForUpdate: jest.fn(async () => account) };
    const useCase = new PayPayableUseCase(repository);

    const first = await useCase.execute({ id: 1, amount: 400, payment_method: 'ted', operation_id: '22222222-2222-4222-8222-222222222222' });
    expect(first.account.status).toBe('partial');
    expect(first.account.amount_paid).toBe(400);

    // Reenvio da MESMA chamada (mesmo id, mesmo amount, mesmo metodo, MESMO
    // operation_id) — ex.: app do fornecedor reenvia por timeout depois que
    // o servidor ja processou e deu commit na primeira. A guarda antiga
    // (status === 'paid' | 'canceled') sozinha deixaria passar, pois
    // 'partial' nao esta nesse dominio — mas agora o INSERT em
    // `financial_payment_events` com o mesmo `operation_id` viola o indice
    // UNIQUE e e convertido em ConflictError antes de tocar `amount_paid`.
    await expect(
      useCase.execute({ id: 1, amount: 400, payment_method: 'ted', operation_id: '22222222-2222-4222-8222-222222222222' })
    ).rejects.toMatchObject({
      message: expect.stringContaining('já foi aplicada'),
    });

    // A segunda chamada reaproveita a MESMA operação e não altera o saldo.
    expect(account.amount_paid).toBe(400);
    expect(repository.findPayableByIdForUpdate).toHaveBeenCalledTimes(2);
  });

  it('ReceivePaymentUseCase: mesmo comportamento no espelho de contas a receber', async () => {
    const account = buildAccount({ amount: 500 });
    const repository = { findReceivableByIdForUpdate: jest.fn(async () => account) };
    const useCase = new ReceivePaymentUseCase(repository);

    const first = await useCase.execute({ id: 1, amount: 200, payment_method: 'pix', operation_id: '33333333-3333-4333-8333-333333333333' });
    expect(first.account.status).toBe('partial');
    expect(first.account.amount_paid).toBe(200);

    await expect(
      useCase.execute({ id: 1, amount: 200, payment_method: 'pix', operation_id: '33333333-3333-4333-8333-333333333333' })
    ).rejects.toMatchObject({
      message: expect.stringContaining('já foi aplicada'),
    });

    expect(account.amount_paid).toBe(200);
  });

  it('a duplicidade so e finalmente barrada quando o valor reenviado excede o saldo devedor — nao por deteccao de duplicata', async () => {
    // Duas aplicacoes de 400 sobre um titulo de 1000 ja deixaram
    // amount_paid=800 (saldo devedor = 200), reproduzindo o estado ao final
    // do primeiro teste deste arquivo.
    const account = buildAccount({ amount_paid: 800 });
    const repository = { findPayableByIdForUpdate: jest.fn(async () => account) };
    const useCase = new PayPayableUseCase(repository);

    // Um TERCEIRO reenvio identico (400) excede o saldo devedor (200) e e
    // rejeitado — mas pelo teto do saldo (`paymentCents > remainingCents`,
    // PayPayableUseCase.ts:58-60), NAO por reconhecer que e uma repeticao da
    // mesma operacao. Um reenvio de valor <= saldo devedor (ex.: 200)
    // continuaria passando sem nenhuma rejeicao.
    await expect(useCase.execute({ id: 1, amount: 400, operation_id: '44444444-4444-4444-8444-444444444444' })).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute({ id: 1, amount: 400, operation_id: '55555555-5555-4555-8555-555555555555' })).rejects.toMatchObject({
      message: expect.stringContaining('excede o saldo devedor'),
    });
    expect(account.amount_paid).toBe(800); // inalterado pela rejeicao
  });
});
