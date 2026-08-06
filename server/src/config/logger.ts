/**
 * Logger estruturado central do backend (Winston).
 *
 * Escopo desta entrega (P1 "Monitoramento Pós-Go-Live" do CLAUDE.md):
 * substitui apenas o TRANSPORTE de log dos pontos centrais já existentes —
 * `requestContext` (log de requests com `requestId`), `errorHandler` (erros
 * inesperados) e o boot/shutdown em `index.ts`. NÃO é uma refatoração geral
 * de `console.log` do projeto: módulos de negócio continuam como estavam.
 *
 * Formato:
 * - `NODE_ENV=production` → JSON estruturado (uma linha por evento, pronto
 *   para agregação em ferramentas de log — ex. CloudWatch, Loki, ELK).
 * - Caso contrário (`development`/`test`) → formato legível colorido no
 *   console, mais fácil de ler durante desenvolvimento.
 *
 * Arquivo opcional: se a env `LOG_FILE` estiver definida, adiciona um
 * transporte de arquivo (`winston.transports.File`) sem rotação — para
 * rotação por tamanho/data em produção, usar um gerenciador externo (ex.
 * `logrotate` no host, ou driver de log do orquestrador de containers) ou
 * trocar por `winston-daily-rotate-file` no futuro. Sem `LOG_FILE`, o
 * comportamento padrão é console apenas (idêntico ao anterior a esta
 * entrega, só que agora via Winston).
 *
 * @module config/logger
 */

import path from 'path';
import winston from 'winston';

import { loadRuntimeEnv } from './runtimeEnv';

const runtimeEnv = loadRuntimeEnv();
const isProduction = runtimeEnv.nodeEnv === 'production';

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const extra = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${stack ?? message}${extra}`;
  }),
);

const transports: winston.transport[] = [
  new winston.transports.Console(),
];

if (runtimeEnv.logFile) {
  transports.push(
    new winston.transports.File({
      filename: path.resolve(runtimeEnv.logFile),
      // Sem rotação embutida (ver nota no cabeçalho do módulo) — arquivo
      // cresce indefinidamente até rotação externa.
    }),
  );
}

/**
 * Instância única do Winston usada em toda a aplicação.
 *
 * Níveis padrão do Winston (do mais para o menos severo): `error`, `warn`,
 * `info`, `http`, `verbose`, `debug`, `silly`. Este projeto usa
 * predominantemente `error`, `warn` e `info`.
 */
const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: isProduction ? jsonFormat : devFormat,
  transports,
  // Nunca derruba o processo por um erro de logging (ex.: disco cheio no
  // transporte de arquivo) — loga o problema e segue.
  exitOnError: false,
});

export default logger;
module.exports = logger;
module.exports.default = logger;
