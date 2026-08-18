import { v4 as uuidv4 } from 'uuid';
import type { Request, Response, NextFunction } from 'express';

export default function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = (req.headers['x-request-id'] as string) || (req.headers['x-correlation-id'] as string);
  const id = incoming || uuidv4();

  // @ts-ignore requestId é adicionado dinamicamente ao Request.
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
