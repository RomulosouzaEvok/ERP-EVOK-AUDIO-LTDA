import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { getJwtRuntimeConfig } from '../config/runtimeEnv';

// Models are CommonJS - dynamic require is safest for the current hybrid setup.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { User } = require('../models/index');

interface JwtPayload {
  id: number;
  iat?: number;
  exp?: number;
}

interface RequestUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'operator' | 'financial';
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { secret } = getJwtRuntimeConfig();
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Token nao fornecido' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, secret) as JwtPayload;

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      res.status(401).json({ success: false, error: 'Usuario nao encontrado' });
      return;
    }

    if (!user.active) {
      res.status(401).json({ success: false, error: 'Usuario inativo' });
      return;
    }

    const requestUser: RequestUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    (req as any).user = requestUser;
    next();
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: 'Token expirado' });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, error: 'Token invalido' });
      return;
    }

    if (error instanceof Error && error.message.includes('JWT_SECRET')) {
      console.error('JWT runtime config error:', error.message);
      res.status(500).json({ success: false, error: 'Erro de configuracao do servidor. Contate o administrador.' });
      return;
    }

    next(error);
  }
}

export function authorize(...roles: string[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!(req as any).user) {
      res.status(401).json({ success: false, error: 'Nao autenticado' });
      return;
    }

    if (!roles.includes((req as any).user.role)) {
      res.status(403).json({ success: false, error: 'Sem permissao para esta acao' });
      return;
    }

    next();
  };
}

module.exports = authenticate;
module.exports.authenticate = authenticate;
module.exports.authorize = authorize;
