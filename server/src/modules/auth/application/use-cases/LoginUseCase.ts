/**
 * Use case: autenticar usuario por email/senha e gerar token JWT.
 *
 * @module modules/auth/application/use-cases/LoginUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { LoginCredentialsEntity } from '../../domain/entities/AuthCredentialsEntity';
import { UnauthorizedError } from '../../../../errors';
import AuthRepository from '../../domain/repositories/AuthRepository';
import TokenService from '../../infrastructure/jwt/TokenService';

interface LoginInput {
  email: string;
  password: string;
}

interface LoginOutput {
  token: string;
  user: { id: number; name: string; email: string; role: string };
  audit: Record<string, unknown>;
}

class LoginUseCase extends UseCase<LoginInput, LoginOutput> {
  private readonly authRepository: AuthRepository;
  private readonly tokenService: TokenService;

  /**
   * @param authRepository - Repositorio de autenticacao.
   * @param tokenService - Servico de geracao de token JWT.
   */
  public constructor(authRepository: AuthRepository, tokenService: TokenService) {
    super();
    this.authRepository = authRepository;
    this.tokenService = tokenService;
  }

  /**
   * @param input - Email e senha informados.
   * @returns Token JWT, usuario autenticado e payload de auditoria.
   * @throws {UnauthorizedError} Com mensagem `'Email ou senha incorretos'` ou `'Usuário inativo. Contate o administrador.'`. Ambos os casos carregam `error.audit`.
   */
  public async execute({ email, password }: LoginInput): Promise<LoginOutput> {
    const credentials = new LoginCredentialsEntity({ email, password });

    const user: any = await this.authRepository.findUserByEmail(credentials.email);
    if (!user) {
      throw this._authFailure('Email ou senha incorretos', {
        action: 'login', entityType: 'User', entityDescription: credentials.email,
        description: `Tentativa de login falhou: email não encontrado (${credentials.email})`,
        success: false, errorMessage: 'Email não encontrado'
      });
    }

    const isMatch = await user.comparePassword(credentials.password);
    if (!isMatch) {
      throw this._authFailure('Email ou senha incorretos', {
        action: 'login', entityType: 'User', entityId: user.id, entityDescription: user.email,
        description: 'Tentativa de login falhou: senha incorreta',
        success: false, errorMessage: 'Senha incorreta'
      });
    }

    if (!user.active) {
      throw this._authFailure('Usuário inativo. Contate o administrador.', {
        action: 'login', entityType: 'User', entityId: user.id, entityDescription: user.email,
        description: 'Tentativa de login falhou: usuário inativo',
        success: false, errorMessage: 'Usuário inativo'
      });
    }

    const token = this.tokenService.generateToken(user.id, user.passwordVersion);

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      audit: {
        action: 'login', entityType: 'User', entityId: user.id, entityDescription: user.email,
        description: 'Login realizado com sucesso'
      }
    };
  }

  /**
   * Monta um `UnauthorizedError` (401) carregando os dados de auditoria da
   * tentativa falha em `error.audit`.
   *
   * @param message - Mensagem de erro.
   * @param auditPayload - Payload aceito por `logAction(req, params)`.
   * @returns Erro de autenticacao com `.audit` anexado.
   */
  private _authFailure(message: string, auditPayload: Record<string, unknown>): UnauthorizedError {
    const error: any = new UnauthorizedError(message);
    error.audit = auditPayload;
    return error;
  }
}

export = LoginUseCase;
