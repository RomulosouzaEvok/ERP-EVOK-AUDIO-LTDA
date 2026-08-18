import logger from './logger';

let registered = false;

interface RegisterProcessSafetyHandlersOptions {
  fatalShutdown?: () => Promise<void> | void;
  fatalShutdownTimeoutMs?: number;
}

function describeReason(reason: unknown): string {
  if (reason instanceof Error) {
    return `${reason.message}\n${reason.stack ?? ''}`;
  }

  return String(reason);
}

export function registerProcessSafetyHandlers(options: RegisterProcessSafetyHandlersOptions = {}): void {
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

    if (!options.fatalShutdown) {
      process.exit(1);
      return;
    }

    const fatalShutdownTimeoutMs = options.fatalShutdownTimeoutMs ?? 5000;
    let finished = false;

    const forcedExit = setTimeout(() => {
      if (!finished) {
        logger.error(`Fatal shutdown timed out after ${fatalShutdownTimeoutMs}ms. Forcing process exit.`);
        process.exit(1);
      }
    }, fatalShutdownTimeoutMs);

    try {
      Promise.resolve(options.fatalShutdown())
        .then(() => {
          finished = true;
          clearTimeout(forcedExit);
          process.exit(1);
        })
        .catch((shutdownError) => {
          finished = true;
          clearTimeout(forcedExit);
          logger.error(`Fatal shutdown failed: ${describeReason(shutdownError)}`);
          process.exit(1);
        });
    } catch (shutdownError) {
      finished = true;
      clearTimeout(forcedExit);
      logger.error(`Fatal shutdown threw synchronously: ${describeReason(shutdownError)}`);
      process.exit(1);
    }
  });
}

module.exports = { registerProcessSafetyHandlers };
