/**
 * Use case: solicitacao de recuperacao de senha (SEC-12).
 *
 * Gera um token de uso unico, armazena apenas o hash SHA-256 dele (nunca o
 * token em texto plano) com expiracao de 1 hora, e envia por e-mail. Nunca
 * revela se o e-mail existe no sistema, para impedir enumeracao de contas.
 *
 * @module modules/auth/application/use-cases/ForgotPasswordUseCase
 */

import crypto from 'crypto';

import UseCase from '../../../../shared/application/UseCase';
import AuthRepository from '../../domain/repositories/AuthRepository';
import { sendMail } from '../../../../services/emailService';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

interface ForgotPasswordInput {
  email: string;
}

class ForgotPasswordUseCase extends UseCase<ForgotPasswordInput, void> {
  private readonly authRepository: AuthRepository;

  /**
   * @param authRepository - Repositorio de autenticacao.
   */
  public constructor(authRepository: AuthRepository) {
    super();
    this.authRepository = authRepository;
  }

  /**
   * @param input - E-mail do usuario que solicitou a recuperacao.
   * @returns Promise resolvida sempre (mesmo se o e-mail nao existir).
   */
  public async execute({ email }: ForgotPasswordInput): Promise<void> {
    const user: any = await this.authRepository.findUserByEmail(email);

    if (!user || !user.active) {
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const baseUrl = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',')[0].trim();
    const resetLink = `${baseUrl}/reset-password?token=${rawToken}`;

    await sendMail(
      user.email,
      'Recuperação de senha - ERP EVOK ÁUDIO',
      `Olá ${user.name},\n\nUse o link abaixo para redefinir sua senha. Ele expira em 1 hora e só pode ser usado uma vez:\n\n${resetLink}\n\nSe você não solicitou isso, ignore este e-mail.`,
    );
  }
}

export = ForgotPasswordUseCase;
