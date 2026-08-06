/**
 * Testes dos use cases da Conciliação Bancária v1 (importação OFX):
 * import com dedup por fitid, sugestões de match (exato, ±7 dias, sem
 * candidato), match com baixa transacional (payable/receivable), match
 * duplo bloqueado e unmatch bloqueado pós-baixa — repositório mockado
 * (sem dependência de banco).
 */
import ImportStatementUseCase = require('../../src/modules/financial/application/use-cases/ImportStatementUseCase');
import GetMatchSuggestionsUseCase = require('../../src/modules/financial/application/use-cases/GetMatchSuggestionsUseCase');
import MatchEntryUseCase = require('../../src/modules/financial/application/use-cases/MatchEntryUseCase');
import IgnoreEntryUseCase = require('../../src/modules/financial/application/use-cases/IgnoreEntryUseCase');
import UnmatchEntryUseCase = require('../../src/modules/financial/application/use-cases/UnmatchEntryUseCase');
import { BusinessRuleError, NotFoundError, ValidationError } from '../../src/errors';

const OFX1_HEADER = [
  'OFXHEADER:100', 'DATA:OFXSGML', 'VERSION:102', 'SECURITY:NONE',
  'ENCODING:USASCII', 'CHARSET:1252', 'COMPRESSION:NONE',
  'OLDFILEUID:NONE', 'NEWFILEUID:NONE', '',
].join('\r\n');

function buildOfxBuffer(fitids: string[]): Buffer {
  const transactions = fitids.map((fitid, index) => `<STMTTRN>
<DTPOSTED>2026070${index + 1}
<TRNAMT>-100.00
<FITID>${fitid}
<MEMO>Lancamento ${fitid}
</STMTTRN>`).join('\n');

  const ofx = `${OFX1_HEADER}<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKACCTFROM>
<BANKID>341
<ACCTID>1-2
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260701
<DTEND>20260731
${transactions}
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;
  return Buffer.from(ofx, 'latin1');
}

const baseTransaction = { id: 'tx-1' };

function makeReconciliationRepository(overrides: Partial<Record<string, any>> = {}) {
  return {
    createStatement: jest.fn(async (data: any) => ({ id: 1, ...data })),
    findStatementById: jest.fn(async (id: number) => ({ id })),
    listStatements: jest.fn(async () => ({ rows: [], count: 0 })),
    findExistingFitids: jest.fn(async () => new Set<string>()),
    bulkCreateEntries: jest.fn(async (entries: any[]) => entries.map((e, i) => ({ id: i + 1, ...e }))),
    listEntriesByStatement: jest.fn(async () => []),
    listPendingEntriesByStatement: jest.fn(async () => []),
    findEntryById: jest.fn(async () => null),
    findEntryByIdForUpdate: jest.fn(async () => null),
    updateEntry: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    findPayableByIdForUpdate: jest.fn(async () => null),
    findReceivableByIdForUpdate: jest.fn(async () => null),
    updatePayablePayment: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    updateReceivablePayment: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    listOpenPayablesByDueDateRange: jest.fn(async () => []),
    listOpenReceivablesByDueDateRange: jest.fn(async () => []),
    ...overrides,
  };
}

describe('ImportStatementUseCase', () => {
  it('cria o statement e todos os lancamentos na primeira importacao', async () => {
    const repo = makeReconciliationRepository();
    const useCase = new ImportStatementUseCase(repo as any);

    const result = await useCase.execute({
      filename: 'extrato-julho.ofx',
      buffer: buildOfxBuffer(['fit-1', 'fit-2']),
      importedBy: 7,
      transaction: baseTransaction,
    });

    expect(repo.createStatement).toHaveBeenCalledWith(
      expect.objectContaining({ filename: 'extrato-julho.ofx', imported_by: 7, bank_name: 'Itaú Unibanco' }),
      baseTransaction,
    );
    expect(result.entries_created).toBe(2);
    expect(result.duplicates_skipped).toBe(0);
    expect(result.total_in_file).toBe(2);
  });

  it('dedup por fitid: reimportar o mesmo arquivo nao duplica lancamentos ja existentes', async () => {
    const repo = makeReconciliationRepository({
      findExistingFitids: jest.fn(async () => new Set(['fit-1'])),
    });
    const useCase = new ImportStatementUseCase(repo as any);

    const result = await useCase.execute({
      filename: 'extrato-julho.ofx',
      buffer: buildOfxBuffer(['fit-1', 'fit-2']),
      importedBy: 7,
      transaction: baseTransaction,
    });

    expect(result.entries_created).toBe(1);
    expect(result.duplicates_skipped).toBe(1);
    const [[createdEntries]] = repo.bulkCreateEntries.mock.calls;
    expect(createdEntries).toHaveLength(1);
    expect(createdEntries[0].fitid).toBe('fit-2');
  });
});

describe('GetMatchSuggestionsUseCase', () => {
  it('lanca NotFoundError se o extrato nao existir', async () => {
    const repo = makeReconciliationRepository({ findStatementById: jest.fn(async () => null) });
    const useCase = new GetMatchSuggestionsUseCase(repo as any);

    await expect(useCase.execute({ statementId: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('sugere candidato com match exato de valor e data (payable, lancamento negativo)', async () => {
    const repo = makeReconciliationRepository({
      listPendingEntriesByStatement: jest.fn(async () => [
        { id: 1, entry_date: '2026-07-10', amount: '-150.00', description: 'Fornecedor X' },
      ]),
      listOpenPayablesByDueDateRange: jest.fn(async () => [
        { id: 50, description: 'Conta X', amount: '150.00', amount_paid: '0.00', due_date: '2026-07-10', status: 'pending' },
      ]),
    });
    const useCase = new GetMatchSuggestionsUseCase(repo as any);

    const [result] = await useCase.execute({ statementId: 1 });

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toMatchObject({ type: 'payable', id: 50, date_diff_days: 0 });
  });

  it('sugere candidato dentro da janela de +-7 dias, ranqueado pelo mais proximo primeiro', async () => {
    const repo = makeReconciliationRepository({
      listPendingEntriesByStatement: jest.fn(async () => [
        { id: 1, entry_date: '2026-07-10', amount: '200.00', description: 'Cliente Y' },
      ]),
      listOpenReceivablesByDueDateRange: jest.fn(async () => [
        { id: 60, amount: '200.00', amount_paid: '0.00', due_date: '2026-07-15', status: 'pending', customer_id: 9, installment: 1 },
        { id: 61, amount: '200.00', amount_paid: '0.00', due_date: '2026-07-12', status: 'pending', customer_id: 9, installment: 2 },
      ]),
    });
    const useCase = new GetMatchSuggestionsUseCase(repo as any);

    const [result] = await useCase.execute({ statementId: 1 });

    expect(result.suggestions.map((s: any) => s.id)).toEqual([61, 60]);
  });

  it('retorna suggestions vazio quando nao ha candidato dentro da tolerancia de valor', async () => {
    const repo = makeReconciliationRepository({
      listPendingEntriesByStatement: jest.fn(async () => [
        { id: 1, entry_date: '2026-07-10', amount: '-150.00', description: 'Fornecedor X' },
      ]),
      listOpenPayablesByDueDateRange: jest.fn(async () => [
        { id: 50, description: 'Conta X', amount: '175.00', amount_paid: '0.00', due_date: '2026-07-10', status: 'pending' },
      ]),
    });
    const useCase = new GetMatchSuggestionsUseCase(repo as any);

    const [result] = await useCase.execute({ statementId: 1 });

    expect(result.suggestions).toHaveLength(0);
  });
});

describe('MatchEntryUseCase', () => {
  it('lanca ValidationError se payable_id e receivable_id forem informados juntos (violacao do XOR)', async () => {
    const repo = makeReconciliationRepository();
    const useCase = new MatchEntryUseCase(repo as any);

    await expect(useCase.execute({
      entryId: 1, payableId: 10, receivableId: 20, userId: 1, transaction: baseTransaction,
    })).rejects.toBeInstanceOf(ValidationError);
  });

  it('concilia e da baixa integral em conta a pagar dentro da tolerancia de centavos', async () => {
    const repo = makeReconciliationRepository({
      findEntryByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'pending', amount: '-150.00', entry_date: '2026-07-10' })),
      findPayableByIdForUpdate: jest.fn(async () => ({ id: 50, status: 'pending', amount: '150.00', amount_paid: '0.00', payment_method: null })),
    });
    const useCase = new MatchEntryUseCase(repo as any);

    const result = await useCase.execute({ entryId: 1, payableId: 50, userId: 3, transaction: baseTransaction });

    expect(repo.updatePayablePayment).toHaveBeenCalledWith(50, expect.objectContaining({
      amount_paid: 150, status: 'paid', payment_date: '2026-07-10',
    }), baseTransaction);
    expect(repo.updateEntry).toHaveBeenCalledWith(1, expect.objectContaining({
      status: 'matched', matched_payable_id: 50, matched_by: 3,
    }), baseTransaction);
    expect(result.accountType).toBe('payable');
  });

  it('concilia e da baixa integral em conta a receber dentro da tolerancia de centavos', async () => {
    const repo = makeReconciliationRepository({
      findEntryByIdForUpdate: jest.fn(async () => ({ id: 2, status: 'pending', amount: '980.50', entry_date: '2026-07-11' })),
      findReceivableByIdForUpdate: jest.fn(async () => ({ id: 60, status: 'partial', amount: '1000.00', amount_paid: '19.50', payment_method: null })),
    });
    const useCase = new MatchEntryUseCase(repo as any);

    const result = await useCase.execute({ entryId: 2, receivableId: 60, userId: 3, transaction: baseTransaction });

    expect(repo.updateReceivablePayment).toHaveBeenCalledWith(60, expect.objectContaining({ amount_paid: 1000, status: 'paid' }), baseTransaction);
    expect(result.accountType).toBe('receivable');
  });

  it('lanca BusinessRuleError quando o valor do lancamento nao confere com o saldo (fora da tolerancia)', async () => {
    const repo = makeReconciliationRepository({
      findEntryByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'pending', amount: '-150.00', entry_date: '2026-07-10' })),
      findPayableByIdForUpdate: jest.fn(async () => ({ id: 50, status: 'pending', amount: '175.00', amount_paid: '0.00' })),
    });
    const useCase = new MatchEntryUseCase(repo as any);

    await expect(useCase.execute({ entryId: 1, payableId: 50, userId: 3, transaction: baseTransaction }))
      .rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('bloqueia match duplo: lancamento ja conciliado nao pode ser conciliado novamente', async () => {
    const repo = makeReconciliationRepository({
      findEntryByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'matched', amount: '-150.00', entry_date: '2026-07-10' })),
    });
    const useCase = new MatchEntryUseCase(repo as any);

    await expect(useCase.execute({ entryId: 1, payableId: 50, userId: 3, transaction: baseTransaction }))
      .rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('lanca BusinessRuleError se a conta a pagar candidata ja estiver paga', async () => {
    const repo = makeReconciliationRepository({
      findEntryByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'pending', amount: '-150.00', entry_date: '2026-07-10' })),
      findPayableByIdForUpdate: jest.fn(async () => ({ id: 50, status: 'paid', amount: '150.00', amount_paid: '150.00' })),
    });
    const useCase = new MatchEntryUseCase(repo as any);

    await expect(useCase.execute({ entryId: 1, payableId: 50, userId: 3, transaction: baseTransaction }))
      .rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('lanca BusinessRuleError ao tentar conciliar lancamento de credito com conta a pagar', async () => {
    const repo = makeReconciliationRepository({
      findEntryByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'pending', amount: '150.00', entry_date: '2026-07-10' })),
    });
    const useCase = new MatchEntryUseCase(repo as any);

    await expect(useCase.execute({ entryId: 1, payableId: 50, userId: 3, transaction: baseTransaction }))
      .rejects.toBeInstanceOf(BusinessRuleError);
  });
});

describe('IgnoreEntryUseCase', () => {
  it('marca o lancamento pendente como ignored', async () => {
    const repo = makeReconciliationRepository({
      findEntryByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'pending' })),
    });
    const useCase = new IgnoreEntryUseCase(repo as any);

    await useCase.execute({ entryId: 1, transaction: baseTransaction });

    expect(repo.updateEntry).toHaveBeenCalledWith(1, { status: 'ignored' }, baseTransaction);
  });

  it('lanca BusinessRuleError se o lancamento ja estiver conciliado', async () => {
    const repo = makeReconciliationRepository({
      findEntryByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'matched' })),
    });
    const useCase = new IgnoreEntryUseCase(repo as any);

    await expect(useCase.execute({ entryId: 1, transaction: baseTransaction })).rejects.toBeInstanceOf(BusinessRuleError);
  });
});

describe('UnmatchEntryUseCase', () => {
  it('bloqueia o unmatch (422) se a conta a pagar vinculada ja foi baixada (paga)', async () => {
    const repo = makeReconciliationRepository({
      findEntryByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'matched', matched_payable_id: 50, matched_receivable_id: null })),
      findPayableByIdForUpdate: jest.fn(async () => ({ id: 50, status: 'paid' })),
    });
    const useCase = new UnmatchEntryUseCase(repo as any);

    await expect(useCase.execute({ entryId: 1, transaction: baseTransaction })).rejects.toBeInstanceOf(BusinessRuleError);
    expect(repo.updateEntry).not.toHaveBeenCalled();
  });

  it('desfaz o vinculo quando a conta associada nao esta mais paga', async () => {
    const repo = makeReconciliationRepository({
      findEntryByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'matched', matched_payable_id: 50, matched_receivable_id: null })),
      findPayableByIdForUpdate: jest.fn(async () => ({ id: 50, status: 'canceled' })),
    });
    const useCase = new UnmatchEntryUseCase(repo as any);

    await useCase.execute({ entryId: 1, transaction: baseTransaction });

    expect(repo.updateEntry).toHaveBeenCalledWith(1, expect.objectContaining({ status: 'pending', matched_payable_id: null }), baseTransaction);
  });

  it('lanca BusinessRuleError se o lancamento nao estiver conciliado', async () => {
    const repo = makeReconciliationRepository({
      findEntryByIdForUpdate: jest.fn(async () => ({ id: 1, status: 'pending' })),
    });
    const useCase = new UnmatchEntryUseCase(repo as any);

    await expect(useCase.execute({ entryId: 1, transaction: baseTransaction })).rejects.toBeInstanceOf(BusinessRuleError);
  });
});
