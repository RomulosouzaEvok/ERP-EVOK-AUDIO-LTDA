import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

function requestContext(req: Request, res: Response, next: NextFunction): void {
  const requestId = String(req.header('x-request-id') || randomUUID());
  const startedAt = Date.now();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const logLine = {
      level: res.statusCode >= 500 ? 'error' : 'info',
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      timestamp: new Date().toISOString(),
    };

    console.log(JSON.stringify(logLine));
  });

  next();
}

module.exports = requestContext;
module.exports.requestContext = requestContext;
export default requestContext;
