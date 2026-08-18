type ShutdownModule = typeof import('../../index');

interface HarnessOptions {
  databaseCloseError?: Error;
}

interface Harness {
  module: ShutdownModule;
  serverClose: jest.Mock;
  waitForPendingAuditLogs: jest.Mock;
  sequelizeClose: jest.Mock;
  registerProcessSafetyHandlers: jest.Mock;
}

function loadHarness(options: HarnessOptions = {}): Harness {
  jest.resetModules();

  const serverClose = jest.fn((callback: (error?: Error) => void) => callback());
  const fakeServer = { close: serverClose };
  const listen = jest.fn((_port: number, callback: () => void) => {
    callback();
    return fakeServer;
  });
  const waitForPendingAuditLogs = jest.fn(async () => ({
    drained: true,
    pendingActions: 0,
    timedOut: false,
  }));
  const sequelizeClose = options.databaseCloseError
    ? jest.fn(async () => { throw options.databaseCloseError; })
    : jest.fn(async () => undefined);
  const registerProcessSafetyHandlers = jest.fn();

  jest.doMock('../../app', () => ({ __esModule: true, default: { listen } }));
  jest.doMock('../../config/db', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
  jest.doMock('../../src/config/logger', () => ({
    __esModule: true,
    default: { info: jest.fn(), error: jest.fn() },
  }));
  jest.doMock('../../src/config/database', () => ({
    sequelize: { close: sequelizeClose },
  }));
  jest.doMock('../../src/config/processSafety', () => ({
    registerProcessSafetyHandlers,
  }));
  jest.doMock('../../src/config/runtimeEnv', () => ({
    loadRuntimeEnv: jest.fn(() => ({ port: 5000, nodeEnv: 'test' })),
  }));
  jest.doMock('../../src/config/runtimeState', () => ({
    setShuttingDown: jest.fn(),
  }));
  jest.doMock('../../src/services/auditLogService', () => ({
    waitForPendingAuditLogs,
  }));

  return {
    module: require('../../index') as ShutdownModule,
    serverClose,
    waitForPendingAuditLogs,
    sequelizeClose,
    registerProcessSafetyHandlers,
  };
}

describe('CASE-008 correction 02 - exit code preserves shutdown origin', () => {
  let exitSpy: jest.SpyInstance;
  let processOnSpy: jest.SpyInstance;

  beforeEach(() => {
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    processOnSpy = jest.spyOn(process, 'on').mockImplementation((() => process) as typeof process.on);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    processOnSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('exits non-zero after a successful uncaughtException shutdown', async () => {
    const harness = loadHarness();
    await harness.module.start();
    const fatalShutdown = harness.registerProcessSafetyHandlers.mock.calls[0][0].fatalShutdown;

    await fatalShutdown();

    expect(harness.serverClose).toHaveBeenCalledTimes(1);
    expect(harness.waitForPendingAuditLogs).toHaveBeenCalledWith(3000);
    expect(harness.sequelizeClose).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(exitSpy).not.toHaveBeenCalledWith(0);
  });

  it('keeps exit code zero after a successful SIGTERM shutdown', async () => {
    const harness = loadHarness();
    await harness.module.start();

    await harness.module.shutdown('SIGTERM');

    expect(harness.serverClose).toHaveBeenCalledTimes(1);
    expect(harness.waitForPendingAuditLogs).toHaveBeenCalledWith(10000);
    expect(harness.sequelizeClose).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('continues to exit one when database close fails', async () => {
    const harness = loadHarness({ databaseCloseError: new Error('database close failed') });
    await harness.module.start();

    await harness.module.shutdown('SIGTERM');

    expect(harness.serverClose).toHaveBeenCalledTimes(1);
    expect(harness.waitForPendingAuditLogs).toHaveBeenCalledWith(10000);
    expect(harness.sequelizeClose).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
