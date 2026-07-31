import fs from 'fs';
import path from 'path';

const FAILURE_LOG_PATH = path.join(process.cwd(), 'logs', 'audit-failures.log');

jest.mock('../../src/models/AuditLog', () => ({
  register: jest.fn(),
}));

describe('auditLogService: retry e alerta de falha (nao-silencioso)', () => {
  const originalWebhookUrl = process.env.AUDIT_ALERT_WEBHOOK_URL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    if (fs.existsSync(FAILURE_LOG_PATH)) {
      fs.unlinkSync(FAILURE_LOG_PATH);
    }
  });

  afterAll(() => {
    if (originalWebhookUrl === undefined) {
      delete process.env.AUDIT_ALERT_WEBHOOK_URL;
    } else {
      process.env.AUDIT_ALERT_WEBHOOK_URL = originalWebhookUrl;
    }
    global.fetch = originalFetch;
    if (fs.existsSync(FAILURE_LOG_PATH)) {
      fs.unlinkSync(FAILURE_LOG_PATH);
    }
  });

  /**
   * Quando a primeira gravacao falha mas a segunda (retry) funciona, nao
   * deve haver persistencia de falha nem alerta.
   *
   * @returns Promise resolvida apos validar retry bem-sucedido.
   */
  it('recupera no retry sem persistir falha nem alertar', async () => {
    delete process.env.AUDIT_ALERT_WEBHOOK_URL;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AuditLog = require('../../src/models/AuditLog');
    AuditLog.register
      .mockRejectedValueOnce(new Error('timeout transitorio'))
      .mockResolvedValueOnce(undefined);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { logAction } = require('../../src/services/auditLogService');

    await logAction({} as any, { action: 'create', entityType: 'Sale', entityId: 1 });

    expect(AuditLog.register).toHaveBeenCalledTimes(2);
    expect(fs.existsSync(FAILURE_LOG_PATH)).toBe(false);
  });

  /**
   * Quando ambas as tentativas falham, o evento deve ser persistido em
   * `logs/audit-failures.log` e um alerta deve ser disparado via webhook,
   * se configurado - a falha nunca fica so no console.
   *
   * @returns Promise resolvida apos validar persistencia e alerta.
   */
  it('persiste em arquivo e dispara webhook quando as duas tentativas falham', async () => {
    process.env.AUDIT_ALERT_WEBHOOK_URL = 'https://hooks.example.com/alert';
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as any;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AuditLog = require('../../src/models/AuditLog');
    AuditLog.register.mockRejectedValue(new Error('banco indisponivel'));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { logAction } = require('../../src/services/auditLogService');

    await logAction({} as any, { action: 'status_change', entityType: 'Sale', entityId: 42 });

    expect(AuditLog.register).toHaveBeenCalledTimes(2);
    expect(fs.existsSync(FAILURE_LOG_PATH)).toBe(true);

    const persisted = fs.readFileSync(FAILURE_LOG_PATH, 'utf8');
    expect(persisted).toContain('Sale');
    expect(persisted).toContain('banco indisponivel');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://hooks.example.com/alert');
  });

  /**
   * Sem `AUDIT_ALERT_WEBHOOK_URL` configurado, a falha ainda deve ser
   * persistida em arquivo, mas nenhum webhook deve ser chamado.
   *
   * @returns Promise resolvida apos validar persistencia sem webhook.
   */
  it('persiste em arquivo mesmo sem webhook configurado', async () => {
    delete process.env.AUDIT_ALERT_WEBHOOK_URL;
    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AuditLog = require('../../src/models/AuditLog');
    AuditLog.register.mockRejectedValue(new Error('coluna inexistente'));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { logAction } = require('../../src/services/auditLogService');

    await logAction({} as any, { action: 'create', entityType: 'Product', entityId: 7 });

    expect(fs.existsSync(FAILURE_LOG_PATH)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
