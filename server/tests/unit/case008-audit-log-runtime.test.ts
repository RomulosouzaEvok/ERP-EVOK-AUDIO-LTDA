import fs from 'fs';
import path from 'path';

const FAILURE_LOG_PATH = path.join(process.cwd(), 'logs', 'audit-failures.log');

jest.mock('../../src/models/AuditLog', () => ({
  register: jest.fn(),
}));

describe('CASE-008 audit log runtime hardening', () => {
  const originalWebhookUrl = process.env.AUDIT_ALERT_WEBHOOK_URL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.AUDIT_ALERT_WEBHOOK_URL;
    global.fetch = jest.fn() as any;

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

  it('resolves instead of rejecting when fallback serialization receives a circular payload', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AuditLog = require('../../src/models/AuditLog');
    AuditLog.register.mockRejectedValue(new Error('database unavailable'));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const service = require('../../src/services/auditLogService');
    service.__resetAuditLogRuntimeStateForTests();

    const oldValues: Record<string, unknown> = { id: 1 };
    oldValues.self = oldValues;

    await expect(
      service.logAction({} as any, {
        action: 'update',
        entityType: 'AuditProbe',
        entityId: 1,
        oldValues,
      }),
    ).resolves.toBeUndefined();

    expect(service.getAuditFailureStats()).toEqual(expect.objectContaining({
      totalFailures: 1,
      persistedFailures: 1,
      pendingActions: 0,
    }));
  });

  it('drains an in-flight audit log before shutdown closes the database pool', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AuditLog = require('../../src/models/AuditLog');
    let resolveRegister: (() => void) | null = null;
    AuditLog.register.mockReturnValue(new Promise<void>((resolve) => {
      resolveRegister = resolve;
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const service = require('../../src/services/auditLogService');
    service.__resetAuditLogRuntimeStateForTests();

    const actionPromise = service.logAction({} as any, {
      action: 'create',
      entityType: 'AuditProbe',
      entityId: 2,
    });

    expect(service.getAuditFailureStats().pendingActions).toBe(1);

    const drainPromise = service.waitForPendingAuditLogs(1000);
    resolveRegister?.();

    await expect(drainPromise).resolves.toEqual({
      drained: true,
      pendingActions: 0,
      timedOut: false,
    });
    await expect(actionPromise).resolves.toBeUndefined();
  });

  it('exposes audit loss through queryable counters even when the fallback file cannot be written', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AuditLog = require('../../src/models/AuditLog');
    AuditLog.register.mockRejectedValue(new Error('database unavailable'));
    const appendFileSpy = jest.spyOn(fs, 'appendFileSync').mockImplementation(() => {
      throw new Error('disk readonly');
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const service = require('../../src/services/auditLogService');
      service.__resetAuditLogRuntimeStateForTests();

      await service.logAction({} as any, {
        action: 'delete',
        entityType: 'AuditProbe',
        entityId: 3,
      });

      expect(service.getAuditFailureStats()).toEqual(expect.objectContaining({
        totalFailures: 1,
        persistedFailures: 0,
        fileFailures: 1,
        lastErrorMessage: 'database unavailable',
      }));
    } finally {
      appendFileSpy.mockRestore();
    }
  });
});
