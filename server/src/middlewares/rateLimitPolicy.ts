import type { NextFunction, Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

import logger from '../config/logger';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;

  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const RATE_LIMIT_IP_MAX_PER_MINUTE = readPositiveIntegerEnv('RATE_LIMIT_IP_MAX_PER_MINUTE', 1600);
export const RATE_LIMIT_AUTHENTICATED_USER_MAX_PER_15_MINUTES = readPositiveIntegerEnv(
  'RATE_LIMIT_AUTHENTICATED_USER_MAX_PER_15_MINUTES',
  300,
);
export const RATE_LIMIT_REFRESH_USER_MAX_PER_15_MINUTES = readPositiveIntegerEnv(
  'RATE_LIMIT_REFRESH_USER_MAX_PER_15_MINUTES',
  30,
);

interface RateLimitContext {
  limiter: string;
  key: string;
  keySource: 'ip' | 'ip_email' | 'authenticated_user';
}

function setRateLimitContext(req: Request, context: RateLimitContext): string {
  (req as any).rateLimitContext = context;
  return context.key;
}

export function rateLimitIpKey(req: Request): string {
  const ip = ipKeyGenerator(req.ip ?? '');
  return setRateLimitContext(req, {
    limiter: 'api_ip',
    key: `ip:${ip}`,
    keySource: 'ip',
  });
}

export function loginAttemptAccountKey(req: Request): string {
  const ip = ipKeyGenerator(req.ip ?? '');
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return setRateLimitContext(req, {
    limiter: 'login_account',
    key: email ? `ip-email:${ip}:${email}` : `ip:${ip}`,
    keySource: email ? 'ip_email' : 'ip',
  });
}

export function authenticatedUserKey(req: Request): string {
  const user = (req as any).user;
  const userId = user?.id;

  if (userId === undefined || userId === null) {
    const ip = ipKeyGenerator(req.ip ?? '');
    return setRateLimitContext(req, {
      limiter: 'authenticated_user',
      key: `ip:${ip}`,
      keySource: 'ip',
    });
  }

  return setRateLimitContext(req, {
    limiter: 'authenticated_user',
    key: `user:${userId}`,
    keySource: 'authenticated_user',
  });
}

function logRateLimitExceeded(req: Request, limiter: string, limit: number, windowMs: number): void {
  const context = (req as any).rateLimitContext as RateLimitContext | undefined;

  logger.warn('rate_limit_exceeded', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    limiter,
    key: context?.key,
    keySource: context?.keySource,
    ip: req.ip,
    limit,
    windowMs,
  });
}

function rateLimitHandler(limiter: string, limit: number, windowMs: number, message: string) {
  return (req: Request, res: Response) => {
    logRateLimitExceeded(req, limiter, limit, windowMs);
    res.status(429).json({ success: false, error: message });
  };
}

export const loginAttemptLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: 10,
  keyGenerator: loginAttemptAccountKey,
  handler: rateLimitHandler('login_account', 10, FIFTEEN_MINUTES_MS, 'Muitas tentativas. Tente novamente em 15 minutos.'),
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  handler: rateLimitHandler('register_ip', 5, 60 * 60 * 1000, 'Muitas tentativas de registro. Tente novamente em 1 hora.'),
});

export const apiIpLimiter = rateLimit({
  windowMs: ONE_MINUTE_MS,
  max: RATE_LIMIT_IP_MAX_PER_MINUTE,
  keyGenerator: rateLimitIpKey,
  handler: rateLimitHandler('api_ip', RATE_LIMIT_IP_MAX_PER_MINUTE, ONE_MINUTE_MS, 'Muitas requisicoes. Tente novamente em 1 minuto.'),
});

export const passwordRecoveryLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: 10,
  keyGenerator: loginAttemptAccountKey,
  handler: rateLimitHandler('password_recovery_account', 10, FIFTEEN_MINUTES_MS, 'Muitas tentativas. Tente novamente em 15 minutos.'),
});

export const authenticatedUserLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: RATE_LIMIT_AUTHENTICATED_USER_MAX_PER_15_MINUTES,
  keyGenerator: authenticatedUserKey,
  handler: rateLimitHandler(
    'authenticated_user',
    RATE_LIMIT_AUTHENTICATED_USER_MAX_PER_15_MINUTES,
    FIFTEEN_MINUTES_MS,
    'Muitas requisicoes autenticadas. Tente novamente em 15 minutos.',
  ),
});

export const refreshAuthenticatedUserLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: RATE_LIMIT_REFRESH_USER_MAX_PER_15_MINUTES,
  keyGenerator: authenticatedUserKey,
  handler: rateLimitHandler(
    'refresh_authenticated_user',
    RATE_LIMIT_REFRESH_USER_MAX_PER_15_MINUTES,
    FIFTEEN_MINUTES_MS,
    'Muitas renovacoes de sessao. Tente novamente em 15 minutos.',
  ),
});

type LimiterResult = 'blocked' | 'errored' | 'passed';

function runLimiter(req: Request, res: Response, next: NextFunction, limiter: typeof authenticatedUserLimiter): Promise<LimiterResult> {
  return new Promise((resolve) => {
    let settled = false;
    const originalJson = res.json;

    const settle = (result: LimiterResult): void => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };

    res.json = ((body?: unknown) => {
      settle('blocked');
      return originalJson.call(res, body);
    }) as Response['json'];

    limiter(req, res, (error?: unknown) => {
      res.json = originalJson;

      if (error) {
        next(error);
        settle('errored');
        return;
      }

      settle('passed');
    });
  });
}

export async function applyAuthenticatedRateLimits(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authenticatedUserResult = await runLimiter(req, res, next, authenticatedUserLimiter);

  if (authenticatedUserResult !== 'passed') {
    return;
  }

  if (req.originalUrl.startsWith('/api/auth/refresh')) {
    const refreshResult = await runLimiter(req, res, next, refreshAuthenticatedUserLimiter);
    if (refreshResult !== 'passed') {
      return;
    }
  }

  next();
}

module.exports = {
  RATE_LIMIT_IP_MAX_PER_MINUTE,
  RATE_LIMIT_AUTHENTICATED_USER_MAX_PER_15_MINUTES,
  RATE_LIMIT_REFRESH_USER_MAX_PER_15_MINUTES,
  rateLimitIpKey,
  loginAttemptAccountKey,
  authenticatedUserKey,
  loginAttemptLimiter,
  registerLimiter,
  apiIpLimiter,
  passwordRecoveryLimiter,
  authenticatedUserLimiter,
  refreshAuthenticatedUserLimiter,
  applyAuthenticatedRateLimits,
};
