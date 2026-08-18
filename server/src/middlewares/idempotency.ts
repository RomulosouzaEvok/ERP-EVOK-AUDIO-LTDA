import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const { IdempotencyKey } = require('../models/IdempotencyKeyModel');

function computeRequestHash(req: Request): string {
  const payload = JSON.stringify({
    method: req.method,
    path: req.path,
    body: req.body,
  });

  return crypto.createHash('sha256').update(payload).digest('hex');
}

export default function idempotencyMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = req.header('Idempotency-Key');
    if (!key) {
      return next();
    }

    const requestHash = computeRequestHash(req);
    const existing = await IdempotencyKey.findByPk(key);

    if (existing && existing.status === 'completed') {
      res.setHeader('X-Idempotency-Cache', 'HIT');
      res.status(existing.statusCode ?? 200).json(existing.responseBody);
      return;
    }

    if (!existing) {
      await IdempotencyKey.create({
        key,
        requestHash,
        status: 'in_progress',
        createdAt: new Date(),
      });
    }

    const origJson = res.json.bind(res);
    const origSend = res.send.bind(res);
    let responseCaptured = false;

    const persistResponse = async (body: any) => {
      if (responseCaptured) {
        return;
      }

      responseCaptured = true;
      try {
        const statusCode = res.statusCode ?? 200;
        await IdempotencyKey.upsert({
          key,
          requestHash,
          status: 'completed',
          statusCode,
          responseBody: body,
          completedAt: new Date(),
        });
      } catch {
        // Não interrompe a resposta se a persistência falhar.
      }
    };

    res.json = ((body: any) => {
      void persistResponse(body);
      return origJson(body);
    }) as typeof res.json;

    res.send = ((body: any) => {
      if (!responseCaptured) {
        void persistResponse(body);
      }
      return origSend(body);
    }) as typeof res.send;

    next();
  };
}

module.exports = idempotencyMiddleware;
module.exports.default = idempotencyMiddleware;
