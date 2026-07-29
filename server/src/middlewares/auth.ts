/**
 * 🔐 Middleware de autenticação e autorização.
 *
 * Verifica JWT no header `Authorization: Bearer <token>`, carrega o
 * usuário do banco e anexa a `req.user`. O middleware `authorize()`
 * restringe acesso por papel (RBAC).
 *
 * @module middlewares/auth
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Models are CommonJS - dynamic require is safest for hybrid setup
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { User } = require('../models/index');

/**
 * Interface do payload decodificado do JWT.
 */
interface JwtPayload {
  id: number;
  iat?: number;
  exp?: number;
}

/**
 * Interface do usuário anexado ao request.
 */
interface RequestUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'operator' | 'financial';
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Middleware de autenticação obrigatória.
 *
 * Extrai o token JWT do header `Authorization`, verifica a assinatura,
 * carrega o usuário do banco e anexa a `req.user`.
 *
 * @param req - Requisição Express.
 * @param res - Resposta Express.
 * @param next - Próximo middleware.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) {
      console.error('❌ JWT_SECRET não configurado ou muito curto. Configure no .env com no mínimo 32 caracteres.');
      res.status(500).json({ success: false, error: 'Erro de configuração do servidor. Contate o administrador.' });
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Token não fornecido' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      res.status(401).json({ success: false, error: 'Usuário não encontrado' });
      return;
    }

    if (!user.active) {
      res.status(401).json({ success: false, error: 'Usuário inativo' });
      return;
    }

    // Attach typed user to request
    const requestUser: RequestUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    req.user = requestUser;
    next();
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: 'Token expirado' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, error: 'Token inválido' });
      return;
    }
    next(error);
  }
}

/**
 * Middleware de autorização por papel (RBAC).
 *
 * Deve ser usado APÓS o middleware `authenticate`. Verifica se o papel
 * do usuário (`req.user.role`) está entre os papéis permitidos.
 *
 * @param roles - Papéis permitidos (ex.: 'admin', 'financial').
 * @returns Middleware Express.
 */
export function authorize(...roles: string[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Não autenticado' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Sem permissão para esta ação' });
      return;
    }

    next();
  };
}

// Preserve CommonJS compatibility for legacy JS routes
module.exports = authenticate;
module.exports.authenticate = authenticate;
module.exports.authorize = authorize;
