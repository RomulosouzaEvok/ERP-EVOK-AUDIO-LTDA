/**
 * Controller HTTP do modulo auth.
 *
 * @module modules/auth/presentation/controllers/authController
 */

import type { Request, Response, NextFunction } from 'express';
const { logAction }: any = require('../../../../services/auditLogService');
import SequelizeAuthRepository = require('../../infrastructure/sequelize/SequelizeAuthRepository');
import TokenService = require('../../infrastructure/jwt/TokenService');
import LoginUseCase = require('../../application/use-cases/LoginUseCase');
import RegisterUserUseCase = require('../../application/use-cases/RegisterUserUseCase');
import GetMeUseCase = require('../../application/use-cases/GetMeUseCase');

const authRepository = new SequelizeAuthRepository();
const tokenService = new TokenService();

/**
 * `POST /api/auth/login` — autentica por email/senha e retorna um token JWT.
 *
 * @param req - Request.
 * @param res - Response.
 * @param next - Next.
 * @returns Promise<void>.
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    const useCase = new LoginUseCase(authRepository, tokenService);
    const { token, user, audit } = await useCase.execute({ email, password });

    logAction(req, audit);

    res.json({ success: true, data: { token, user } });
  } catch (error: any) {
    if (error.audit) {
      logAction(req, error.audit);
    }
    next(error);
  }
}

/**
 * `POST /api/auth/register` — cria um novo usuario (rota protegida).
 *
 * @param req - Request.
 * @param res - Response.
 * @param next - Next.
 * @returns Promise<void>.
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password, role } = req.body;
    const useCase = new RegisterUserUseCase(authRepository);
    const user = await useCase.execute({ name, email, password, role });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

/**
 * `GET /api/auth/me` — retorna o usuario autenticado (sem `password`).
 *
 * @param req - Request.
 * @param res - Response.
 * @param next - Next.
 * @returns Promise<void>.
 */
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const useCase = new GetMeUseCase(authRepository);
    const user = await useCase.execute({ userId: (req as any).user.id });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}
