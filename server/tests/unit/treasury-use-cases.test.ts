/**
 * Testes: casos de uso do módulo Tesouraria (Contas Bancárias + Operações
 * Financeiras + Posição de Caixa).
 *
 * @group unit
 */

const CreateBankAccountUseCase = require('../../src/modules/treasury/application/use-cases/bank-account/CreateBankAccountUseCase');
const UpdateBankAccountUseCase = require('../../src/modules/treasury/application/use-cases/bank-account/UpdateBankAccountUseCase');
const CreateOperationUseCase = require('../../src/modules/treasury/application/use-cases/operation/CreateOperationUseCase');
const UpdateOperationUseCase = require('../../src/modules/treasury/application/use-cases/operation/UpdateOperationUseCase');
const SettleOperationUseCase = require('../../src/modules/treasury/application/use-cases/operation/SettleOperationUseCase');
const CancelOperationUseCase = require('../../src/modules/treasury/application/use-cases/operation/CancelOperationUseCase');
const GetCashPositionUseCase = require('../../src/modules/treasury/application/use-cases/report/GetCashPositionUseCase');
const { ConflictError, NotFoundError, BusinessRuleError } = require('../../src/errors');

const FAKE_TRANSACTION = {} as any;

function makeTreasuryRepository(overrides: Partial<any> = {}) {
  return {
    listBankAccounts: jest.fn(async () => ({ rows: [], count: 0 })),
    findBankAccountById: jest.fn(async () => null),
    findBankAccountByAgencyAndNumber: jest.fn(async () => null),
    createBankAccount: jest.fn(async (data: any) => ({ id: 1, ...data })),
    updateBankAccount: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    listActiveBankAccountsForCashPosition: jest.fn(async () => []),
    listOperations: jest.fn(async () => ({ rows: [], count: 0 })),
    findOperationById: jest.fn(async () => null),
    findOperationByIdForUpdate: jest.fn(async () => null),
    findOperationByContractNumber: jest.fn(async () => null),
    createOperation: jest.fn(async (data: any) => ({ id: 1, ...data })),
    updateOperation: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    getOpenPayablesAndReceivablesSummary: jest.fn(async () => ({
      totalReceivable: 0, totalPayable: 0, overdueReceivable: 0, overduePayable: 0,
    })),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Contas Bancárias
// ---------------------------------------------------------------------------

describe('CreateBankAccountUseCase', () => {
  it('FLUXO PRINCIPAL: cria conta bancária quando agência+número não colidem', async () => {
    const repo = makeTreasuryRepository();

    const result = await new CreateBankAccountUseCase(repo).execute({
      bank_name: 'Banco do Brasil', agency: '1234-5', account_number: '10.000-1', account_type: 'corrente',
    });

    expect(repo.createBankAccount).toHaveBeenCalledWith(expect.objectContaining({
      bank_name: 'Banco do Brasil', agency: '1234-5', account_number: '10.000-1', account_type: 'corrente', current_balance: 0, active: true,
    }));
    expect(result.bank_name).toBe('Banco do Brasil');
  });

  it('FLUXO DE EXCECAO: rejeita agência+número duplicados com ConflictError', async () => {
    const repo = makeTreasuryRepository({
      findBankAccountByAgencyAndNumber: jest.fn(async () => ({ id: 5, agency: '1234-5', account_number: '10.000-1' })),
    });

    await expect(
      new CreateBankAccountUseCase(repo).execute({ bank_name: 'Itaú', agency: '1234-5', account_number: '10.000-1', account_type: 'corrente' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe('UpdateBankAccountUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando a conta não existe', async () => {
    const repo = makeTreasuryRepository();
    await expect(new UpdateBankAccountUseCase(repo).execute({ id: 999, current_balance: 100 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO DE EXCECAO: rejeita nova agência+número já usados por outra conta', async () => {
    const repo = makeTreasuryRepository({
      findBankAccountById: jest.fn(async () => ({ id: 1, agency: '1111', account_number: '2222' })),
      findBankAccountByAgencyAndNumber: jest.fn(async () => ({ id: 2, agency: '3333', account_number: '4444' })),
    });

    await expect(new UpdateBankAccountUseCase(repo).execute({ id: 1, agency: '3333', account_number: '4444' })).rejects.toBeInstanceOf(ConflictError);
  });

  it('FLUXO PRINCIPAL: atualiza saldo sem colisão de agência+número', async () => {
    const repo = makeTreasuryRepository({
      findBankAccountById: jest.fn(async () => ({ id: 1, agency: '1111', account_number: '2222' })),
    });

    const result = await new UpdateBankAccountUseCase(repo).execute({ id: 1, current_balance: 5000 });

    expect(repo.updateBankAccount).toHaveBeenCalledWith(1, { current_balance: 5000 });
    expect(result.current_balance).toBe(5000);
  });
});

// ---------------------------------------------------------------------------
// Operações Financeiras — Criação/Edição
// ---------------------------------------------------------------------------

describe('CreateOperationUseCase', () => {
  it('FLUXO PRINCIPAL: cria operação financeira sempre como active', async () => {
    const repo = makeTreasuryRepository();

    const result = await new CreateOperationUseCase(repo).execute({
      operation_type: 'loan', institution: 'BNDES', contract_number: 'BNDES-001', amount: 200000, start_date: '2026-08-01', createdBy: 7,
    });

    expect(repo.createOperation).toHaveBeenCalledWith(expect.objectContaining({ contract_number: 'BNDES-001', status: 'active', guarantee_type: 'none', created_by: 7 }));
    expect(result.status).toBe('active');
    expect(result.created_by).toBe(7);
  });

  it('FLUXO DE EXCECAO: rejeita contract_number duplicado com ConflictError', async () => {
    const repo = makeTreasuryRepository({
      findOperationByContractNumber: jest.fn(async () => ({ id: 1, contract_number: 'BNDES-001' })),
    });

    await expect(
      new CreateOperationUseCase(repo).execute({ operation_type: 'loan', institution: 'BNDES', contract_number: 'BNDES-001', amount: 1000, start_date: '2026-08-01' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('FLUXO DE EXCECAO: rejeita end_date anterior a start_date', async () => {
    const repo = makeTreasuryRepository();

    await expect(
      new CreateOperationUseCase(repo).execute({
        operation_type: 'financing', institution: 'Itaú', contract_number: 'IT-002', amount: 5000, start_date: '2026-08-10', end_date: '2026-08-01',
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });
});

describe('UpdateOperationUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando a operação não existe', async () => {
    const repo = makeTreasuryRepository();
    await expect(new UpdateOperationUseCase(repo).execute({ id: 999, amount: 100 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO DE EXCECAO: rejeita edição de operação já settled/canceled', async () => {
    const repo = makeTreasuryRepository({
      findOperationById: jest.fn(async () => ({ id: 1, contract_number: 'BNDES-001', status: 'settled', start_date: '2026-01-01', end_date: null })),
    });

    await expect(new UpdateOperationUseCase(repo).execute({ id: 1, amount: 999 })).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('FLUXO PRINCIPAL: atualiza operação active', async () => {
    const repo = makeTreasuryRepository({
      findOperationById: jest.fn(async () => ({ id: 1, contract_number: 'BNDES-001', status: 'active', start_date: '2026-01-01', end_date: null })),
    });

    await new UpdateOperationUseCase(repo).execute({ id: 1, amount: 999 });

    expect(repo.updateOperation).toHaveBeenCalledWith(1, { amount: 999 });
  });
});

// ---------------------------------------------------------------------------
// Operações Financeiras — Liquidação/Cancelamento
// ---------------------------------------------------------------------------

describe('SettleOperationUseCase', () => {
  it('FLUXO PRINCIPAL: liquida operação active (active -> settled) preenchendo settled_at', async () => {
    const repo = makeTreasuryRepository({
      findOperationByIdForUpdate: jest.fn(async () => ({ id: 1, contract_number: 'BNDES-001', status: 'active' })),
    });

    await new SettleOperationUseCase(repo).execute({ id: 1, settled_at: '2026-08-07', userId: 11, transaction: FAKE_TRANSACTION });

    expect(repo.updateOperation).toHaveBeenCalledWith(1, { status: 'settled', settled_at: '2026-08-07', settled_by: 11 }, FAKE_TRANSACTION);
  });

  it('FLUXO DE EXCECAO: rejeita liquidar operação que não está active', async () => {
    const repo = makeTreasuryRepository({
      findOperationByIdForUpdate: jest.fn(async () => ({ id: 1, contract_number: 'BNDES-001', status: 'canceled' })),
    });

    await expect(new SettleOperationUseCase(repo).execute({ id: 1, transaction: FAKE_TRANSACTION })).rejects.toBeInstanceOf(BusinessRuleError);
    expect(repo.updateOperation).not.toHaveBeenCalled();
  });

  it('FLUXO DE EXCECAO: lança NotFoundError quando a operação não existe', async () => {
    const repo = makeTreasuryRepository();
    await expect(new SettleOperationUseCase(repo).execute({ id: 999, transaction: FAKE_TRANSACTION })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('CancelOperationUseCase', () => {
  it('FLUXO PRINCIPAL: cancela operação active (active -> canceled)', async () => {
    const repo = makeTreasuryRepository({
      findOperationByIdForUpdate: jest.fn(async () => ({ id: 1, contract_number: 'BNDES-001', status: 'active' })),
    });

    await new CancelOperationUseCase(repo).execute({ id: 1, userId: 12, transaction: FAKE_TRANSACTION });

    expect(repo.updateOperation).toHaveBeenCalledWith(1, { status: 'canceled', canceled_by: 12 }, FAKE_TRANSACTION);
  });

  it('FLUXO DE EXCECAO: rejeita cancelar operação já settled', async () => {
    const repo = makeTreasuryRepository({
      findOperationByIdForUpdate: jest.fn(async () => ({ id: 1, contract_number: 'BNDES-001', status: 'settled' })),
    });

    await expect(new CancelOperationUseCase(repo).execute({ id: 1, transaction: FAKE_TRANSACTION })).rejects.toBeInstanceOf(BusinessRuleError);
  });
});

// ---------------------------------------------------------------------------
// Posição de Caixa
// ---------------------------------------------------------------------------

describe('GetCashPositionUseCase', () => {
  it('FLUXO PRINCIPAL: agrega saldo por tipo de conta e soma títulos em aberto no saldo projetado', async () => {
    const repo = makeTreasuryRepository({
      listActiveBankAccountsForCashPosition: jest.fn(async () => [
        { id: 1, bank_name: 'BB', agency: '1234', account_number: '10.000-1', account_type: 'corrente', current_balance: '45000.00' },
        { id: 2, bank_name: 'Itaú', agency: '5678', account_number: '25.000-7', account_type: 'aplicacao', current_balance: '150000.00' },
      ]),
      getOpenPayablesAndReceivablesSummary: jest.fn(async () => ({
        totalReceivable: 30000, totalPayable: 12000, overdueReceivable: 2000, overduePayable: 500,
      })),
    });

    const result = await new GetCashPositionUseCase(repo).execute();

    expect(result.bank_accounts.total_balance).toBe(195000);
    expect(result.bank_accounts.balance_by_type.corrente).toBe(45000);
    expect(result.bank_accounts.balance_by_type.aplicacao).toBe(150000);
    expect(result.open_titles.total_receivable).toBe(30000);
    expect(result.projected_balance).toBe(195000 + 30000 - 12000);
  });

  it('FLUXO DE BORDA: retorna zeros quando não há contas bancárias ativas', async () => {
    const repo = makeTreasuryRepository();

    const result = await new GetCashPositionUseCase(repo).execute();

    expect(result.bank_accounts.count).toBe(0);
    expect(result.bank_accounts.total_balance).toBe(0);
    expect(result.projected_balance).toBe(0);
  });
});
