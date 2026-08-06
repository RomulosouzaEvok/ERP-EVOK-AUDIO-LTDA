import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

import logger from '../config/logger';

/**
 * Middleware de contexto de requisição: gera/propaga `x-request-id` e loga
 * um evento estruturado por request ao terminar a resposta (`res.on('finish')`).
 *
 * O shape dos campos do log ({@link requestId}, `method`, `path`,
 * `statusCode`, `durationMs`) é o mesmo de antes desta entrega — só o
 * transporte mudou de `console.log(JSON.stringify(...))` para o logger
 * Winston central (`src/config/logger.ts`), que adiciona automaticamente
 * `level`/`timestamp`/`message` ao registro.
 *
 * @param req - Request.
 * @param res - Response.
 * @param next - Next.
 */
function requestContext(req: Request, res: Response, next: NextFunction): void {
  const requestId = String(req.header('x-request-id') || randomUUID());
  const startedAt = Date.now();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const level = res.statusCode >= 500 ? 'error' : 'info';

    logger.log(level, 'http_request', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
    });
  });

  next();
}

module.exports = requestContext;
module.exports.requestContext = requestContext;
export default requestContext;
