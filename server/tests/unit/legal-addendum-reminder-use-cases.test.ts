/**
 * Testes: casos de uso de Aditivo Contratual e Lembrete de Prazo Contratual
 * (módulo Jurídico).
 *
 * @group unit
 */

const CreateAddendumUseCase = require('../../src/modules/legal/application/use-cases/addendum/CreateAddendumUseCase');
const UpdateAddendumUseCase = require('../../src/modules/legal/application/use-cases/addendum/UpdateAddendumUseCase');
const ListAddendumsUseCase = require('../../src/modules/legal/application/use-cases/addendum/ListAddendumsUseCase');
const CreateReminderUseCase = require('../../src/modules/legal/application/use-cases/reminder/CreateReminderUseCase');
const UpdateReminderUseCase = require('../../src/modules/legal/application/use-cases/reminder/UpdateReminderUseCase');
const ListRemindersUseCase = require('../../src/modules/legal/application/use-cases/reminder/ListRemindersUseCase');
const { NotFoundError } = require('../../src/errors');

function makeAddendumRepository(overrides: Partial<any> = {}) {
  return {
    findAddendumById: jest.fn(async () => null),
    createAddendum: jest.fn(async (data: any) => ({ id: 1, ...data })),
    updateAddendum: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    listAddendums: jest.fn(async () => ({ rows: [], count: 0 })),
    ...overrides,
  };
}

function makeReminderRepository(overrides: Partial<any> = {}) {
  return {
    findReminderById: jest.fn(async () => null),
    createReminder: jest.fn(async (data: any) => ({ id: 1, ...data })),
    updateReminder: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    listReminders: jest.fn(async () => ({ rows: [], count: 0 })),
    ...overrides,
  };
}

function makeContractRepository(overrides: Partial<any> = {}) {
  return {
    findContractById: jest.fn(async () => ({ id: 1, contract_number: 'CTR-001' })),
    ...overrides,
  };
}

describe('CreateAddendumUseCase', () => {
  it('FLUXO PRINCIPAL: cria aditivo quando o contrato existe', async () => {
    const addendumRepo = makeAddendumRepository();
    const contractRepo = makeContractRepository();

    const result = await new CreateAddendumUseCase(addendumRepo, contractRepo).execute({ contract_id: 1, addendum_number: 1, change_type: 'term' });

    expect(contractRepo.findContractById).toHaveBeenCalledWith(1);
    expect(addendumRepo.createAddendum).toHaveBeenCalled();
    expect(result.contract_id).toBe(1);
  });

  it('FLUXO DE EXCECAO: lança NotFoundError quando contract_id não existe', async () => {
    const addendumRepo = makeAddendumRepository();
    const contractRepo = makeContractRepository({ findContractById: jest.fn(async () => null) });

    await expect(new CreateAddendumUseCase(addendumRepo, contractRepo).execute({ contract_id: 999, addendum_number: 1, change_type: 'term' }))
      .rejects.toBeInstanceOf(NotFoundError);
    expect(addendumRepo.createAddendum).not.toHaveBeenCalled();
  });
});

describe('UpdateAddendumUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando o aditivo não existe', async () => {
    const repo = makeAddendumRepository();
    await expect(new UpdateAddendumUseCase(repo).execute({ id: 999, description: 'x' })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ListAddendumsUseCase', () => {
  it('lista aditivos paginados repassando filtro de contract_id', async () => {
    const repo = makeAddendumRepository({ listAddendums: jest.fn(async () => ({ rows: [{ id: 1 }], count: 1 })) });

    const result = await new ListAddendumsUseCase(repo).execute({ contract_id: 1, page: 1, limit: 20, offset: 0 });

    expect(repo.listAddendums).toHaveBeenCalledWith({ contract_id: 1 }, { limit: 20, offset: 0 });
    expect(result.count).toBe(1);
  });
});

describe('CreateReminderUseCase', () => {
  it('FLUXO PRINCIPAL: cria lembrete quando o contrato existe', async () => {
    const reminderRepo = makeReminderRepository();
    const contractRepo = makeContractRepository();

    const result = await new CreateReminderUseCase(reminderRepo, contractRepo).execute({ contract_id: 1, reminder_type: 'renewal', reminder_date: '2026-09-01' });

    expect(contractRepo.findContractById).toHaveBeenCalledWith(1);
    expect(reminderRepo.createReminder).toHaveBeenCalled();
    expect(result.contract_id).toBe(1);
  });

  it('FLUXO DE EXCECAO: lança NotFoundError quando contract_id não existe', async () => {
    const reminderRepo = makeReminderRepository();
    const contractRepo = makeContractRepository({ findContractById: jest.fn(async () => null) });

    await expect(new CreateReminderUseCase(reminderRepo, contractRepo).execute({ contract_id: 999, reminder_type: 'renewal', reminder_date: '2026-09-01' }))
      .rejects.toBeInstanceOf(NotFoundError);
    expect(reminderRepo.createReminder).not.toHaveBeenCalled();
  });
});

describe('UpdateReminderUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando o lembrete não existe', async () => {
    const repo = makeReminderRepository();
    await expect(new UpdateReminderUseCase(repo).execute({ id: 999, notified: true })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO PRINCIPAL: marca notified via update', async () => {
    const repo = makeReminderRepository({ findReminderById: jest.fn(async () => ({ id: 1, notified: false })) });

    const result = await new UpdateReminderUseCase(repo).execute({ id: 1, notified: true });

    expect(repo.updateReminder).toHaveBeenCalledWith(1, { notified: true });
    expect(result.notified).toBe(true);
  });
});

describe('ListRemindersUseCase', () => {
  it('lista lembretes paginados repassando filtro de contract_id', async () => {
    const repo = makeReminderRepository({ listReminders: jest.fn(async () => ({ rows: [{ id: 1 }], count: 1 })) });

    const result = await new ListRemindersUseCase(repo).execute({ contract_id: 1, page: 1, limit: 20, offset: 0 });

    expect(repo.listReminders).toHaveBeenCalledWith({ contract_id: 1 }, { limit: 20, offset: 0 });
    expect(result.count).toBe(1);
  });
});
