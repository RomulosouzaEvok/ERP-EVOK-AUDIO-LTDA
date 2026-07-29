/**
 * 🛂 Auth Controller — Autenticação e Registro de Usuários
 *
 * Responsável por:
 * - Login (autenticação JWT)
 * - Registro de novos usuários
 * - Retornar dados do usuário autenticado
 *
 * @module controllers/authController
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/index';
import { logAction } from '../services/auditLogService';

// ======================================================================
// HELPERS
// ======================================================================

/**
 * Gera um token JWT para o usuário.
 * @param id - ID do usuário
 * @returns Token JWT assinado
 */
const generateToken = (id: number): string => {
  const secret = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
  const expiresIn = process.env.JWT_EXPIRE || '7d';
  return jwt.sign({ id }, secret, { expiresIn } as jwt.SignOptions);
};

// ======================================================================
// CONTROLLERS
// ======================================================================

/**
 * POST /api/auth/login
 * Autentica o usuário e retorna token JWT.
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email e senha são obrigatórios' });
      return;
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      logAction(req, {
        action: 'login',
        entityType: 'User',
        entityDescription: email,
        description: `Tentativa de login falhou: email não encontrado (${email})`,
        success: false,
        errorMessage: 'Email não encontrado'
      });
      res.status(401).json({ success: false, error: 'Email ou senha incorretos' });
      return;
    }

    const isMatch = await (user as any).comparePassword(password);

    if (!isMatch) {
      logAction(req, {
        action: 'login',
        entityType: 'User',
        entityId: (user as any).id,
        entityDescription: (user as any).email,
        description: 'Tentativa de login falhou: senha incorreta',
        success: false,
        errorMessage: 'Senha incorreta'
      });
      res.status(401).json({ success: false, error: 'Email ou senha incorretos' });
      return;
    }

    if (!(user as any).active) {
      logAction(req, {
        action: 'login',
        entityType: 'User',
        entityId: (user as any).id,
        entityDescription: (user as any).email,
        description: 'Tentativa de login falhou: usuário inativo',
        success: false,
        errorMessage: 'Usuário inativo'
      });
      res.status(401).json({ success: false, error: 'Usuário inativo. Contate o administrador.' });
      return;
    }

    const token = generateToken((user as any).id);

    logAction(req, {
      action: 'login',
      entityType: 'User',
      entityId: (user as any).id,
      entityDescription: (user as any).email,
      description: 'Login realizado com sucesso'
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: (user as any).id,
          name: (user as any).name,
          email: (user as any).email,
          role: (user as any).role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/register
 * Registra um novo usuário (apenas admin).
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password, role } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
    };

    if (!name || !email || !password) {
      res.status(400).json({ success: false, error: 'Nome, email e senha são obrigatórios' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ success: false, error: 'Formato de email inválido' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, error: 'Senha deve ter no mínimo 6 caracteres' });
      return;
    }

    const user = await (User as any).create({
      name,
      email,
      password,
      role: role || 'operator'
    });

    res.status(201).json({
      success: true,
      data: {
        id: (user as any).id,
        name: (user as any).name,
        email: (user as any).email,
        role: (user as any).role
      }
    });
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(409).json({ success: false, error: 'Email já cadastrado' });
      return;
    }
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Retorna dados do usuário autenticado.
 */
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findByPk((req as any).user.id, {
      attributes: { exclude: ['password'] }
    });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

