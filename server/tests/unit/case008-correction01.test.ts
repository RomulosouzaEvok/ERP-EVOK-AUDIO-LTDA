import { spawnSync } from 'child_process';
import path from 'path';

jest.mock('../../src/models/AuditLog', () => ({
  register: jest.fn(),
}));

describe('CASE-008 correction 01 hardening', () => {
  const originalWebhookUrl = process.env.AUDIT_ALERT_WEBHOOK_URL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.AUDIT_ALERT_WEBHOOK_URL;
    global.fetch = jest.fn() as any;
  });

  afterAll(() => {
    if (originalWebhookUrl === undefined) {
      delete process.env.AUDIT_ALERT_WEBHOOK_URL;
    } else {
      process.env.AUDIT_ALERT_WEBHOOK_URL = originalWebhookUrl;
    }
    global.fetch = originalFetch;
  });

  it('forces exit if uncaughtException shutdown hangs', () => {
    const tsxRegister = require.resolve('tsx/cjs');
    const childScript = `
      const listeners = new Map();
      process.on = (eventName, listener) => {
        listeners.set(eventName, listener);
        return process;
      };
      const { registerProcessSafetyHandlers } = require('./server/src/config/processSafety');
      registerProcessSafetyHandlers({
        fatalShutdown: () => new Promise(() => undefined),
        fatalShutdownTimeoutMs: 10,
      });
      const uncaughtExceptionHandler = listeners.get('uncaughtException');
      if (!uncaughtExceptionHandler) {
        throw new Error('missing uncaughtException handler');
      }
      uncaughtExceptionHandler(new Error('boom'));
      setTimeout(() => undefined, 25);
    `;

    const result = spawnSync(process.execPath, ['-r', tsxRegister, '-e', childScript], {
      cwd: path.resolve(__dirname, '../../..'),
      encoding: 'utf8',
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain('Fatal shutdown timed out after 10ms. Forcing process exit.');
  });

  it('times out webhook fetch so the audit drain can complete', async () => {
    process.env.AUDIT_ALERT_WEBHOOK_URL = 'https://hooks.example.com/slow';
    const abortSignalTimeoutSpy = jest.spyOn(AbortSignal, 'timeout').mockImplementation(((ms: number) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new Error(`timeout:${ms}`)), 5);
      return controller.signal;
    }) as any);

    const fetchMock = jest.fn((_url: string, init?: RequestInit) => new Promise<never>((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) {
        reject(new Error('missing abort signal'));
        return;
      }

      if (signal.aborted) {
        reject(new Error('webhook already aborted'));
        return;
      }

      signal.addEventListener('abort', () => {
        reject(new Error('webhook timed out'));
      }, { once: true });
    }));
    global.fetch = fetchMock as any;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AuditLog = require('../../src/models/AuditLog');
    AuditLog.register.mockRejectedValue(new Error('database unavailable'));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const service = require('../../src/services/auditLogService');
    service.__resetAuditLogRuntimeStateForTests();

    try {
      const logPromise = service.logAction({} as any, {
        action: 'create',
        entityType: 'AuditProbe',
        entityId: 7,
      });

      expect(service.getAuditFailureStats().pendingActions).toBe(1);
      expect(fetchMock).toHaveBeenCalledTimes(0);

      const drainPromise = service.waitForPendingAuditLogs(1000);

      await new Promise((resolve) => setTimeout(resolve, 20));

      await expect(logPromise).resolves.toBeUndefined();
      await expect(drainPromise).resolves.toEqual({
        drained: true,
        pendingActions: 0,
        timedOut: false,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(service.getAuditFailureStats()).toEqual(expect.objectContaining({
        totalFailures: 1,
        persistedFailures: 1,
        webhookFailures: 1,
        pendingActions: 0,
      }));
    } finally {
      abortSignalTimeoutSpy.mockRestore();
    }
  });
});
