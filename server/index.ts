/**
 * TypeScript entrypoint for ERP EVOK Audio API.
 */

import type { Server } from 'http';

import app from './app';
import connectDB from './config/db';
import logger from './src/config/logger';
import { sequelize } from './src/config/database';
import { registerProcessSafetyHandlers } from './src/config/processSafety';
import { loadRuntimeEnv } from './src/config/runtimeEnv';
import { setShuttingDown } from './src/config/runtimeState';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { waitForPendingAuditLogs } = require('./src/services/auditLogService');

let server: Server | null = null;
let shuttingDown = false;

const NORMAL_SHUTDOWN_FORCED_EXIT_MS = 25000;
const NORMAL_AUDIT_DRAIN_TIMEOUT_MS = 10000;
const FATAL_SHUTDOWN_FORCED_EXIT_MS = 5000;
const FATAL_AUDIT_DRAIN_TIMEOUT_MS = 3000;

registerProcessSafetyHandlers({
  fatalShutdown: () => shutdown('uncaughtException', {
    forcedExitMs: FATAL_SHUTDOWN_FORCED_EXIT_MS,
    drainTimeoutMs: FATAL_AUDIT_DRAIN_TIMEOUT_MS,
  }),
  fatalShutdownTimeoutMs: FATAL_SHUTDOWN_FORCED_EXIT_MS + 1000,
});

interface ShutdownOptions {
  forcedExitMs?: number;
  drainTimeoutMs?: number;
}

async function shutdown(signal: string, options: ShutdownOptions = {}): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  setShuttingDown(true);
  logger.info(`Sinal ${signal} recebido. Iniciando shutdown gracioso.`);

  const forcedExitMs = options.forcedExitMs ?? NORMAL_SHUTDOWN_FORCED_EXIT_MS;
  const drainTimeoutMs = options.drainTimeoutMs ?? NORMAL_AUDIT_DRAIN_TIMEOUT_MS;
  const forcedExit = setTimeout(() => {
    logger.error(`Shutdown excedeu ${forcedExitMs}ms. Encerrando processo forcadamente.`);
    process.exit(1);
  }, forcedExitMs);

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error?: Error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }

    const drainResult = await waitForPendingAuditLogs(drainTimeoutMs);
    if (!drainResult.drained) {
      logger.error(
        `Shutdown prosseguindo com ${drainResult.pendingActions} audit logs pendentes `
        + `(timedOut=${drainResult.timedOut}).`,
      );
    }

    await sequelize.close();
    clearTimeout(forcedExit);
    logger.info('Shutdown concluido com sucesso.');
    process.exit(0);
  } catch (error: unknown) {
    clearTimeout(forcedExit);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Falha no shutdown: ${message}`);
    process.exit(1);
  }
}

const start = async () => {
  const runtimeEnv = loadRuntimeEnv();

  try {
    await connectDB();

    server = app.listen(runtimeEnv.port, () => {
      logger.info(`Servidor rodando na porta ${runtimeEnv.port}`);
      logger.info(`Ambiente: ${runtimeEnv.nodeEnv}`);
      logger.info('Banco: PostgreSQL via Sequelize');
    });

    process.on('SIGTERM', () => {
      void shutdown('SIGTERM');
    });

    process.on('SIGINT', () => {
      void shutdown('SIGINT');
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Falha ao iniciar o servidor: ${message}`);
    process.exit(1);
  }
};

void start();
