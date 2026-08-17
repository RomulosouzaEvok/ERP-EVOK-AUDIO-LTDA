import logger from './logger';

let registered = false;

function describeReason(reason: unknown): string {
  if (reason instanceof Error) {
    return `${reason.message}\n${reason.stack ?? ''}`;
  }

  return String(reason);
}

export function registerProcessSafetyHandlers(): void {
  if (registered) {
    return;
  }

  registered = true;

  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled promise rejection: ${describeReason(reason)}`);
  });

  process.on('uncaughtException', (error) => {
    logger.error(`Uncaught exception: ${describeReason(error)}`);
    process.exitCode = 1;
  });
}

module.exports = { registerProcessSafetyHandlers };
