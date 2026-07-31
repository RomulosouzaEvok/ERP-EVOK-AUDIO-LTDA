/**
 * TypeScript entrypoint for ERP EVOK Audio API.
 */

import type { Server } from 'http';

import app from './app';
import connectDB from './config/db';
import { sequelize } from './src/config/database';
import { loadRuntimeEnv } from './src/config/runtimeEnv';
import { setShuttingDown } from './src/config/runtimeState';

let server: Server | null = null;
let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  setShuttingDown(true);
  console.log(`Sinal ${signal} recebido. Iniciando shutdown gracioso.`);

  const forcedExit = setTimeout(() => {
    console.error('Shutdown excedeu 15s. Encerrando processo forcadamente.');
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

    await sequelize.close();
    clearTimeout(forcedExit);
    console.log('Shutdown concluido com sucesso.');
    process.exit(0);
  } catch (error: unknown) {
    clearTimeout(forcedExit);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`Falha no shutdown: ${message}`);
    process.exit(1);
  }
}

const start = async () => {
  const runtimeEnv = loadRuntimeEnv();

  try {
    await connectDB();

    server = app.listen(runtimeEnv.port, () => {
      console.log(`Servidor rodando na porta ${runtimeEnv.port}`);
      console.log(`Ambiente: ${runtimeEnv.nodeEnv}`);
      console.log('Banco: PostgreSQL via Sequelize');
    });

    process.on('SIGTERM', () => {
      void shutdown('SIGTERM');
    });

    process.on('SIGINT', () => {
      void shutdown('SIGINT');
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`Falha ao iniciar o servidor: ${message}`);
    process.exit(1);
  }
};

void start();
