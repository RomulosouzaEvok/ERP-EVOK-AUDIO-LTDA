/**
 * Testes: casos de uso do módulo Contabilidade (Plano de Contas +
 * Lançamentos Contábeis em partida dobrada).
 *
 * @group unit
 */

const CreateAccountUseCase = require('../../src/modules/accounting/application/use-cases/account/CreateAccountUseCase');
const UpdateAccountUseCase = require('../../src/modules/accounting/application/use-cases/account/UpdateAccountUseCase');
const CreateEntryUseCase = require('../../src/modules/accounting/application/use-cases/entry/CreateEntryUseCase');
const UpdateEntryUseCase = require('../../src/modules/accounting/application/use-cases/entry/UpdateEntryUseCase');
const PostEntryUseCase = require('../../src/modules/accounting/application/use-cases/entry/PostEntryUseCase');
const ReverseEntryUseCase = require('../../src/modules/accounting/application/use-cases/entry/ReverseEntryUseCase');
const { ConflictError, NotFoundError, BusinessRuleError } = require('../../src/errors');

const FAKE_TRANSACTION = {} as any;

function makeAccountingRepository(overrides: Partial<any> = {}) {
  return {
    listAccounts: jest.fn(async () => ({ rows: [], count: 0 })),
    findAccountById: jest.fn(async () => null),
    findAccountByCode: jest.fn(async () => null),
    createAccount: jest.fn(async (data: any) => ({ id: 1, ...data })),
    updateAccount: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    countEntries: jest.fn(async () => 0),
    listEntries: jest.fn(async () => ({ rows: [], count: 0 })),
    findEntryById: jest.fn(async (id: number) => ({ id, entry_number: `LC-${String(id).padStart(6, '0')}`, status: 'draft' })),
    findEntryByIdForUpdate: jest.fn(async () => null),
    createEntry: jest.fn(async (data: any) => ({ id: 10, ...data })),
    updateEntry: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    createEntryItem: jest.fn(async (data: any) => ({ id: 100, ...data })),
    findEntryItems: jest.fn(async () => []),
    deleteEntryItems: jest.fn(async () => undefined),
    getTrialBalanceRows: jest.fn(async () => []),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Plano de Contas
// ---------------------------------------------------------------------------

describe('CreateAccountUseCase', () => {
  it('FLUXO PRINCIPAL: cria conta raiz (nível 1, sem pai) quando o código não colide', async () => {
    const repo = makeAccountingRepository();
    const result = await new CreateAccountUseCase(repo).execute({ code: '5', name: 'CONTAS DE COMPENSAÇÃO', account_type: 'asset' });

    expect(repo.createAccount).toHaveBeenCalledWith(expect.objectContaining({ code: '5', account_level: 1, parent_id: null }));
    expect(result.code).toBe('5');
  });

  it('FLUXO PRINCIPAL: resolve parent_id automaticamente a partir do código', async () => {
    const repo = makeAccountingRepository({
      findAccountByCode: jest.fn(async (code: string) => (code === '1.1' ? { id: 7, code: '1.1', accept_entries: false } : null)),
    });

    await new CreateAccountUseCase(repo).execute({ code: '1.1.9', name: 'Nova conta folha', account_type: 'asset' });

    expect(repo.createAccount).toHaveBeenCalledWith(expect.objectContaining({ code: '1.1.9', account_level: 3, parent_id: 7 }));
  });

  it('FLUXO DE EXCECAO: rejeita code duplicado com ConflictError', async () => {
    const repo = makeAccountingRepository({ findAccountByCode: jest.fn(async () => ({ id: 1, code: '1.1.1' })) });

    await expect(new CreateAccountUseCase(repo).execute({ code: '1.1.1', name: 'Duplicada', account_type: 'asset' })).rejects.toBeInstanceOf(ConflictError);
  });

  it('FLUXO DE EXCECAO: rejeita quando a conta pai (derivada do código) não existe', async () => {
    const repo = makeAccountingRepository();

    await expect(new CreateAccountUseCase(repo).execute({ code: '9.9.9', name: 'Órfã', account_type: 'asset' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO DE EXCECAO: rejeita quando o pai já aceita lançamento direto (é conta folha)', async () => {
    const repo = makeAccountingRepository({
      findAccountByCode: jest.fn(async (code: string) => (code === '1.1' ? { id: 3, code: '1.1', accept_entries: true } : null)),
    });

    await expect(new CreateAccountUseCase(repo).execute({ code: '1.1.9', name: 'Filha inválida', account_type: 'asset' })).rejects.toBeInstanceOf(BusinessRuleError);
  });
});

describe('UpdateAccountUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando a conta não existe', async () => {
    const repo = makeAccountingRepository();
    await expect(new UpdateAccountUseCase(repo).execute({ id: 999, active: false })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO DE EXCECAO: rejeita accept_entries=true em conta com filhas (continua sintética)', async () => {
    const repo = makeAccountingRepository({
      findAccountById: jest.fn(async () => ({ id: 1, code: '1.1', accept_entries: false })),
      listAccounts: jest.fn(async () => ({ rows: [{ id: 2, code: '1.1.1' }], count: 1 })),
    });

    await expect(new UpdateAccountUseCase(repo).execute({ id: 1, accept_entries: true })).rejects.toBeInstanceOf(BusinessRuleError);
  });
});

// ---------------------------------------------------------------------------
// Lançamentos Contábeis — Criação
// ---------------------------------------------------------------------------

describe('CreateEntryUseCase', () => {
  const twoBalancedItems = [
    { account_id: 1, debit: 100 },
    { account_id: 2, credit: 100 },
  ];

  it('FLUXO PRINCIPAL: cria lançamento sempre como draft, com número sequencial LC-XXXXXX', async () => {
    const repo = makeAccountingRepository({
      findAccountById: jest.fn(async (id: number) => ({ id, code: String(id), name: `Conta ${id}`, accept_entries: true })),
      countEntries: jest.fn(async () => 4),
    });

    await new CreateEntryUseCase(repo).execute({
      entry_date: '2026-08-07', description: 'Teste', entry_type: 'adjustment', items: twoBalancedItems, userId: 1, transaction: FAKE_TRANSACTION,
    });

    expect(repo.createEntry).toHaveBeenCalledWith(expect.objectContaining({ entry_number: 'LC-000005', status: 'draft' }), FAKE_TRANSACTION);
    expect(repo.createEntryItem).toHaveBeenCalledTimes(2);
  });

  it('FLUXO DE EXCECAO: rejeita conta sintética (accept_entries=false) com BusinessRuleError', async () => {
    const repo = makeAccountingRepository({
      findAccountById: jest.fn(async (id: number) => ({ id, code: '1.1', name: 'Ativo Circulante', accept_entries: false })),
    });

    await expect(
      new CreateEntryUseCase(repo).execute({ entry_date: '2026-08-07', description: 'Teste', entry_type: 'adjustment', items: twoBalancedItems, userId: 1, transaction: FAKE_TRANSACTION }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('FLUXO DE EXCECAO: rejeita item com débito e crédito ao mesmo tempo', async () => {
    const repo = makeAccountingRepository({
      findAccountById: jest.fn(async (id: number) => ({ id, code: String(id), accept_entries: true })),
    });

    await expect(
      new CreateEntryUseCase(repo).execute({
        entry_date: '2026-08-07', description: 'Teste', entry_type: 'adjustment',
        items: [{ account_id: 1, debit: 50, credit: 50 }], userId: 1, transaction: FAKE_TRANSACTION,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('FLUXO DE EXCECAO: rejeita lançamento sem itens', async () => {
    const repo = makeAccountingRepository();

    await expect(
      new CreateEntryUseCase(repo).execute({ entry_date: '2026-08-07', description: 'Teste', entry_type: 'adjustment', items: [], userId: 1, transaction: FAKE_TRANSACTION }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });
});

// ---------------------------------------------------------------------------
// Lançamentos Contábeis — Edição (só em draft)
// ---------------------------------------------------------------------------

describe('UpdateEntryUseCase', () => {
  it('FLUXO DE EXCECAO: rejeita edição de itens de lançamento já postado (imutabilidade)', async () => {
    const repo = makeAccountingRepository({
      findEntryByIdForUpdate: jest.fn(async () => ({ id: 1, entry_number: 'LC-000001', status: 'posted' })),
    });

    await expect(
      new UpdateEntryUseCase(repo).execute({ id: 1, items: [{ account_id: 1, debit: 10 }, { account_id: 2, credit: 10 }], transaction: FAKE_TRANSACTION }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    expect(repo.deleteEntryItems).not.toHaveBeenCalled();
  });

  it('FLUXO PRINCIPAL: substitui integralmente os itens de um lançamento em draft', async () => {
    const repo = makeAccountingRepository({
      findEntryByIdForUpdate: jest.fn(async () => ({ id: 1, entry_number: 'LC-000001', status: 'draft' })),
      findAccountById: jest.fn(async (id: number) => ({ id, code: String(id), accept_entries: true })),
    });

    await new UpdateEntryUseCase(repo).execute({
      id: 1, items: [{ account_id: 1, debit: 200 }, { account_id: 2, credit: 200 }], transaction: FAKE_TRANSACTION,
    });

    expect(repo.deleteEntryItems).toHaveBeenCalledWith(1, FAKE_TRANSACTION);
    expect(repo.createEntryItem).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Postagem — a validação central de partida dobrada
// ---------------------------------------------------------------------------

describe('PostEntryUseCase', () => {
  it('FLUXO DE EXCECAO: rejeita lançamento com débito ≠ crédito (BusinessRuleError 422)', async () => {
    const repo = makeAccountingRepository({
      findEntryByIdForUpdate: jest.fn(async () => ({ id: 1, entry_number: 'LC-000001', status: 'draft' })),
      findEntryItems: jest.fn(async () => [
        { account_id: 1, debit: 150, credit: 0 },
        { account_id: 2, debit: 0, credit: 100 },
      ]),
    });

    await expect(new PostEntryUseCase(repo).execute({ id: 1, userId: 1, transaction: FAKE_TRANSACTION })).rejects.toBeInstanceOf(BusinessRuleError);
    expect(repo.updateEntry).not.toHaveBeenCalled();
  });

  it('FLUXO PRINCIPAL: aceita e posta lançamento balanceado (débito = crédito)', async () => {
    const repo = makeAccountingRepository({
      findEntryByIdForUpdate: jest.fn(async () => ({ id: 1, entry_number: 'LC-000001', status: 'draft' })),
      findEntryItems: jest.fn(async () => [
        { account_id: 1, debit: 300, credit: 0 },
        { account_id: 2, debit: 0, credit: 300 },
      ]),
    });

    await new PostEntryUseCase(repo).execute({ id: 1, userId: 7, transaction: FAKE_TRANSACTION });

    expect(repo.updateEntry).toHaveBeenCalledWith(1, expect.objectContaining({ status: 'posted', approved_by: 7 }), FAKE_TRANSACTION);
  });

  it('FLUXO DE EXCECAO: rejeita lançamento com menos de 2 itens', async () => {
    const repo = makeAccountingRepository({
      findEntryByIdForUpdate: jest.fn(async () => ({ id: 1, entry_number: 'LC-000001', status: 'draft' })),
      findEntryItems: jest.fn(async () => [{ account_id: 1, debit: 100, credit: 0 }]),
    });

    await expect(new PostEntryUseCase(repo).execute({ id: 1, userId: 1, transaction: FAKE_TRANSACTION })).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('FLUXO DE EXCECAO: rejeita postar lançamento que não está draft', async () => {
    const repo = makeAccountingRepository({
      findEntryByIdForUpdate: jest.fn(async () => ({ id: 1, entry_number: 'LC-000001', status: 'posted' })),
    });

    await expect(new PostEntryUseCase(repo).execute({ id: 1, userId: 1, transaction: FAKE_TRANSACTION })).rejects.toBeInstanceOf(BusinessRuleError);
  });
});

// ---------------------------------------------------------------------------
// Estorno — cria novo lançamento com valores invertidos
// ---------------------------------------------------------------------------

describe('ReverseEntryUseCase', () => {
  it('FLUXO PRINCIPAL: gera novo lançamento com débito/crédito invertidos e marca o original como reversed', async () => {
    const repo = makeAccountingRepository({
      findEntryByIdForUpdate: jest.fn(async () => ({ id: 1, entry_number: 'LC-000001', description: 'Original', status: 'posted' })),
      findEntryItems: jest.fn(async () => [
        { account_id: 1, cost_center_id: null, debit: 500, credit: 0, historical: 'Débito original' },
        { account_id: 2, cost_center_id: null, debit: 0, credit: 500, historical: 'Crédito original' },
      ]),
      countEntries: jest.fn(async () => 9),
      findEntryById: jest.fn(async (id: number) => ({ id, status: id === 1 ? 'reversed' : 'posted' })),
    });

    const result = await new ReverseEntryUseCase(repo).execute({ id: 1, userId: 3, transaction: FAKE_TRANSACTION });

    expect(repo.createEntry).toHaveBeenCalledWith(
      expect.objectContaining({ entry_number: 'LC-000010', status: 'posted', reversal_of_id: 1, entry_type: 'adjustment' }),
      FAKE_TRANSACTION,
    );
    expect(repo.createEntryItem).toHaveBeenNthCalledWith(1, expect.objectContaining({ debit: 0, credit: 500 }), FAKE_TRANSACTION);
    expect(repo.createEntryItem).toHaveBeenNthCalledWith(2, expect.objectContaining({ debit: 500, credit: 0 }), FAKE_TRANSACTION);
    expect(repo.updateEntry).toHaveBeenCalledWith(1, { status: 'reversed' }, FAKE_TRANSACTION);
    expect(result.original.status).toBe('reversed');
  });

  it('FLUXO DE EXCECAO: rejeita estornar lançamento que não está posted', async () => {
    const repo = makeAccountingRepository({
      findEntryByIdForUpdate: jest.fn(async () => ({ id: 1, entry_number: 'LC-000001', status: 'draft' })),
    });

    await expect(new ReverseEntryUseCase(repo).execute({ id: 1, userId: 1, transaction: FAKE_TRANSACTION })).rejects.toBeInstanceOf(BusinessRuleError);
    expect(repo.createEntry).not.toHaveBeenCalled();
  });
});
