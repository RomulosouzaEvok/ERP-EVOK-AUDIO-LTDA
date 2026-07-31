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
import ChangePasswordUseCase = require('../../application/use-cases/ChangePasswordUseCase');
import ForgotPasswordUseCase = require('../../application/use-cases/ForgotPasswordUseCase');
import ResetPasswordUseCase = require('../../application/use-cases/ResetPasswordUseCase');
const { changePasswordSchema, forgotPasswordSchema, resetPasswordSchema, handleZodError }: any = require('../validators/authValidators');

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

/**
 * `PUT /api/auth/change-password` — troca a senha do usuario autenticado e
 * invalida sessoes/tokens JWT emitidos antes da troca (SEC-09 + SEC-10).
 *
 * @param req - Request.
 * @param res - Response.
 * @param next - Next.
 * @returns Promise<void>.
 */
export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let body: { currentPassword: string; newPassword: string };
    try {
      body = changePasswordSchema.parse(req.body);
    } catch (error: any) {
      return handleZodError(error);
    }

    const useCase = new ChangePasswordUseCase(authRepository);
    const result = await useCase.execute({
      userId: (req as any).user.id,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });

    logAction(req, {
      action: 'update',
      entityType: 'User',
      entityId: result.id,
      entityDescription: (req as any).user.email,
      description: 'Senha alterada pelo proprio usuario. Sessoes anteriores invalidadas.',
    });

    res.json({ success: true, data: { message: 'Senha alterada com sucesso. Faça login novamente.' } });
  } catch (error: any) {
    next(error);
  }
}

/**
 * `POST /api/auth/forgot-password` — solicita a recuperacao de senha
 * (SEC-12). Sempre responde com a mesma mensagem generica, exista ou nao o
 * e-mail, para impedir enumeracao de contas.
 *
 * @param req - Request.
 * @param res - Response.
 * @param next - Next.
 * @returns Promise<void>.
 */
export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let body: { email: string };
    try {
      body = forgotPasswordSchema.parse(req.body);
    } catch (error: any) {
      return handleZodError(error);
    }

    const useCase = new ForgotPasswordUseCase(authRepository);
    await useCase.execute({ email: body.email });

    res.json({
      success: true,
      data: { message: 'Se o e-mail informado existir, enviaremos instruções de recuperação em instantes.' },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * `POST /api/auth/reset-password` — conclui a recuperacao de senha com o
 * token recebido por e-mail (SEC-12), invalidando sessoes antigas (SEC-10).
 *
 * @param req - Request.
 * @param res - Response.
 * @param next - Next.
 * @returns Promise<void>.
 */
export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let body: { token: string; newPassword: string };
    try {
      body = resetPasswordSchema.parse(req.body);
    } catch (error: any) {
      return handleZodError(error);
    }

    const useCase = new ResetPasswordUseCase(authRepository);
    const result = await useCase.execute({ token: body.token, newPassword: body.newPassword });

    logAction(req, {
      action: 'update',
      entityType: 'User',
      entityId: result.id,
      description: 'Senha redefinida via fluxo de recuperação (token de uso único). Sessões anteriores invalidadas.',
    });

    res.json({ success: true, data: { message: 'Senha redefinida com sucesso. Faça login novamente.' } });
  } catch (error) {
    next(error);
  }
}
