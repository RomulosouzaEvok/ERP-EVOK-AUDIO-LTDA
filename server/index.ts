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

registerProcessSafetyHandlers();

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  setShuttingDown(true);
  logger.info(`Sinal ${signal} recebido. Iniciando shutdown gracioso.`);

  const forcedExit = setTimeout(() => {
    logger.error('Shutdown excedeu 15s. Encerrando processo forcadamente.');
    process.exit(1);
  }, 15000);

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

    const drainResult = await waitForPendingAuditLogs(10000);
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
