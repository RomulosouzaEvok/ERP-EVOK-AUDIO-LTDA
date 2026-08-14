/**
 * PASSO 30 — TESTE DE CARACTERIZAÇÃO (ERP-LEGACY-001)
 *
 * Cluster: comercial-financeiro. Alvo A do lote de caracterização.
 *
 * Comportamento congelado: `PayPayableUseCase`/`ReceivePaymentUseCase` só
 * rejeitam reexecução de pagamento quando o título já está `'paid'` ou
 * `'canceled'` (guarda em `PayPayableUseCase.ts:43-44` e
 * `ReceivePaymentUseCase.ts:43-44`). Enquanto o título permanece `'partial'`
 * — que é exatamente o estado criado pela primeira aplicação de um
 * pagamento parcial — uma segunda chamada com os MESMOS parâmetros (retry
 * de rede, timeout de cliente, duplo clique) NÃO é rejeitada:
 * `amount_paid` acumula de novo (`PayPayableUseCase.ts:62`,
 * `ReceivePaymentUseCase.ts:62`), sobrestimando a baixa. Não existe
 * idempotency-key nem hash de operação em nenhum dos dois use cases.
 *
 * Este teste NÃO reabre FIND-ERP-001 — apenas congela, em código executável,
 * o comportamento que o finding já descreveu por leitura estática (GRUPO B,
 * item 1, `ACTUAL_BEHAVIOR`). A suíte existente
 * (`tests/unit/integrity-transaction-guards.test.ts`) cobre APENAS: (a) uma
 * única chamada parcial (`status` vira `'partial'`) e (b) a rejeição quando
 * o título já está `'paid'`. Nenhum teste hoje encadeia DUAS chamadas sobre
 * o MESMO título `'partial'` — esta é a lacuna que este arquivo fecha.
 *
 * Âncoras:
 *   - FIND-ERP-001 (GRUPO B, item 1) — "Pagamento parcial retry-duplicado"
 *   - BR-FIN-001 (BUSINESS_RULE_CANDIDATES_comercial-financeiro.md) — baixa
 *     de título, sem juros/multa, sem segregação de baixa
 *   - server/src/modules/financial/application/use-cases/PayPayableUseCase.ts:39-74
 *   - server/src/modules/financial/application/use-cases/ReceivePaymentUseCase.ts:39-74
 *
 * Este teste NÃO valida que o comportamento está correto; ele registra o
 * comportamento vigente na baseline. Alterá-lo exige decisão de negócio
 * registrada.
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
  beforeEach(() => jest.clearAllMocks());

  it('PayPayableUseCase: reenvio identico sobre titulo `partial` NAO e rejeitado — amount_paid acumula de novo', async () => {
    const account = buildAccount();
    const repository = { findPayableByIdForUpdate: jest.fn(async () => account) };
    const useCase = new PayPayableUseCase(repository);

    const first = await useCase.execute({ id: 1, amount: 400, payment_method: 'ted' });
    expect(first.account.status).toBe('partial');
    expect(first.account.amount_paid).toBe(400);

    // Reenvio da MESMA chamada (mesmo id, mesmo amount, mesmo metodo) — ex.:
    // app do fornecedor reenvia por timeout depois que o servidor ja
    // processou e deu commit na primeira. A guarda (linha 43-44 do use case)
    // so olha `status === 'paid' | 'canceled'`; `'partial'` passa direto.
    const second = await useCase.execute({ id: 1, amount: 400, payment_method: 'ted' });

    // COMPORTAMENTO CONGELADO (bug confirmado, FIND-ERP-001): a segunda
    // chamada NAO e rejeitada e o valor pago DOBRA — 800, nao 400 — sem que
    // o titulo (R$ 1.000) tenha sido de fato pago duas vezes na vida real.
    expect(second.account.status).toBe('partial');
    expect(second.account.amount_paid).toBe(800);
    expect(repository.findPayableByIdForUpdate).toHaveBeenCalledTimes(2);
  });

  it('ReceivePaymentUseCase: mesmo comportamento no espelho de contas a receber', async () => {
    const account = buildAccount({ amount: 500 });
    const repository = { findReceivableByIdForUpdate: jest.fn(async () => account) };
    const useCase = new ReceivePaymentUseCase(repository);

    const first = await useCase.execute({ id: 1, amount: 200, payment_method: 'pix' });
    expect(first.account.status).toBe('partial');
    expect(first.account.amount_paid).toBe(200);

    const second = await useCase.execute({ id: 1, amount: 200, payment_method: 'pix' });

    // COMPORTAMENTO CONGELADO: mesma lacuna, lado do recebimento.
    expect(second.account.status).toBe('partial');
    expect(second.account.amount_paid).toBe(400);
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
    await expect(useCase.execute({ id: 1, amount: 400 })).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute({ id: 1, amount: 400 })).rejects.toMatchObject({
      message: expect.stringContaining('excede o saldo devedor'),
    });
    expect(account.amount_paid).toBe(800); // inalterado pela rejeicao
  });
});
