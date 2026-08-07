/**
 * Testes: cluster Backup e Continuidade (P5).
 *
 * Cobre o fluxo principal (backup bem-sucedido, sem ticket) e o efeito
 * automático de RF-TI-040/BR-TI-017: `success=false` cria um `ItTicket`
 * `urgent` com `requester_id: null` + `system_generated: true`.
 *
 * @group unit
 */

const RegisterBackupLogUseCase = require('../../src/modules/ti/application/use-cases/backup/RegisterBackupLogUseCase');
const CheckBackupHealthUseCase = require('../../src/modules/ti/application/use-cases/backup/CheckBackupHealthUseCase');
const { ValidationError } = require('../../src/errors');

function makeBackupLogRepository(overrides: Partial<any> = {}) {
  return {
    create: jest.fn(async (data: any) => ({ id: 1, ...data })),
    findLastSuccessByType: jest.fn(async () => null),
    ...overrides,
  };
}

function makeTicketRepository(overrides: Partial<any> = {}) {
  return {
    findCategoryByName: jest.fn(async () => null),
    createCategory: jest.fn(async (data: any) => ({ id: 20, ...data })),
    countByYear: jest.fn(async () => 0),
    create: jest.fn(async (data: any) => ({ id: 950, ...data })),
    ...overrides,
  };
}

function makeSettingsRepository() {
  return {
    get: jest.fn(async () => ({
      sla_response_minutes_low: 1440, sla_response_minutes_medium: 240, sla_response_minutes_high: 120, sla_response_minutes_urgent: 30,
      sla_resolution_minutes_low: 7200, sla_resolution_minutes_medium: 2880, sla_resolution_minutes_high: 480, sla_resolution_minutes_urgent: 240,
      backup_daily_alert_hours: 26, restore_test_max_interval_days: 31,
    })),
  };
}

describe('RegisterBackupLogUseCase', () => {
  it('FLUXO PRINCIPAL: registra backup bem-sucedido sem gerar chamado', async () => {
    const backupRepo = makeBackupLogRepository();
    const ticketRepo = makeTicketRepository();
    const result = await new RegisterBackupLogUseCase(backupRepo, ticketRepo, makeSettingsRepository()).execute({
      executed_at: '2026-08-07T02:00:00Z', backup_type: 'daily', target: 'database', success: true,
    });
    expect(ticketRepo.create).not.toHaveBeenCalled();
    expect(result.generated_ticket_id).toBeNull();
  });

  it('FLUXO DE EXCECAO (RF-TI-040/BR-TI-017): success=false cria ItTicket urgent com requester_id null e system_generated true', async () => {
    const backupRepo = makeBackupLogRepository();
    const ticketRepo = makeTicketRepository();
    const result = await new RegisterBackupLogUseCase(backupRepo, ticketRepo, makeSettingsRepository()).execute({
      executed_at: '2026-08-07T02:00:00Z', backup_type: 'daily', target: 'database', success: false, error_message: 'disco cheio',
    });

    expect(ticketRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      requester_id: null, system_generated: true, priority: 'urgent',
    }));
    expect(result.generated_ticket_id).toBe(950);
    expect(backupRepo.create).toHaveBeenCalledWith(expect.objectContaining({ generated_ticket_id: 950, success: false }));
  });

  it('reaproveita categoria "Sistema ERP" existente em vez de recria-la', async () => {
    const backupRepo = makeBackupLogRepository();
    const ticketRepo = makeTicketRepository({ findCategoryByName: jest.fn(async () => ({ id: 4, name: 'Sistema ERP' })) });
    await new RegisterBackupLogUseCase(backupRepo, ticketRepo, makeSettingsRepository()).execute({
      executed_at: '2026-08-07T02:00:00Z', backup_type: 'daily', target: 'database', success: false,
    });
    expect(ticketRepo.createCategory).not.toHaveBeenCalled();
    expect(ticketRepo.create).toHaveBeenCalledWith(expect.objectContaining({ category_id: 4 }));
  });

  it('rejeita campos obrigatorios ausentes', async () => {
    const backupRepo = makeBackupLogRepository();
    const ticketRepo = makeTicketRepository();
    await expect(
      new RegisterBackupLogUseCase(backupRepo, ticketRepo, makeSettingsRepository()).execute({ backup_type: 'daily' } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('CheckBackupHealthUseCase (RNF-TI-04)', () => {
  it('sinaliza daily_alert=true quando nao ha nenhum backup diario bem-sucedido', async () => {
    const backupRepo = makeBackupLogRepository();
    const result = await new CheckBackupHealthUseCase(backupRepo, makeSettingsRepository()).execute();
    expect(result.daily_alert).toBe(true);
  });

  it('sinaliza daily_alert=false quando o ultimo backup diario foi ha poucas horas', async () => {
    const recentDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const backupRepo = makeBackupLogRepository({
      findLastSuccessByType: jest.fn(async (type: string) => (type === 'daily' ? { executed_at: recentDate } : null)),
    });
    const result = await new CheckBackupHealthUseCase(backupRepo, makeSettingsRepository()).execute();
    expect(result.daily_alert).toBe(false);
    expect(result.hours_since_last_daily).toBeLessThan(26);
  });
});
