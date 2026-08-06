/**
 * Use case: renovar (renovação deslizante) o token JWT de uma sessão já
 * autenticada — usado pelo painel de TV (Android TV, sessão "sempre
 * ligada") para evitar redigitar credenciais quando o token de 7 dias
 * (`JWT_EXPIRE`) está perto de expirar.
 *
 * Não existe refresh-token separado nesta v1: o cliente deve chamar este
 * endpoint com um token AINDA válido (via middleware `authenticate` normal)
 * antes de expirar. Token já expirado sempre recebe 401 — o cliente deve
 * refazer login normalmente (sem endpoint de refresh para essa situação).
 *
 * @module modules/auth/application/use-cases/RefreshTokenUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import TokenService from '../../infrastructure/jwt/TokenService';

interface RefreshTokenInput {
  /** Id do usuário autenticado (`req.user.id`, resolvido por `authenticate`). */
  userId: number;
  /**
   * `passwordVersion` já validado por `authenticate` nesta mesma requisição
   * (SEC-10) — o token renovado deve embutir EXATAMENTE este valor, nunca
   * uma leitura própria e potencialmente divergente do banco.
   */
  passwordVersion: number;
}

interface RefreshTokenOutput {
  /** Novo token JWT, com TTL renovado e as mesmas claims (`id`, `passwordVersion`, `iss`, `aud`). */
  token: string;
}

class RefreshTokenUseCase extends UseCase<RefreshTokenInput, RefreshTokenOutput> {
  private readonly tokenService: TokenService;

  /** @param tokenService - Servico de geracao de token JWT (mesma implementacao usada no login). */
  public constructor(tokenService: TokenService) {
    super();
    this.tokenService = tokenService;
  }

  /**
   * @param input - Id do usuário e `passwordVersion` corrente, já validados pelo middleware `authenticate`.
   * @returns Novo token JWT com TTL deslizante renovado.
   */
  public async execute({ userId, passwordVersion }: RefreshTokenInput): Promise<RefreshTokenOutput> {
    const token = this.tokenService.generateToken(userId, passwordVersion);
    return { token };
  }
}

export = RefreshTokenUseCase;
