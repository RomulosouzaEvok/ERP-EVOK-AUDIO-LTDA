/**
 * Wrapper fino sobre `jsonwebtoken`.
 *
 * @module modules/auth/infrastructure/jwt/TokenService
 */

import jwt from 'jsonwebtoken';

class TokenService {
  /**
   * Gera um token JWT assinado contendo o id do usuario.
   *
   * @param userId - Id do usuario autenticado (payload `{ id: userId }`).
   * @returns Token JWT assinado.
   * @throws {Error} Propagado por `jsonwebtoken` se `process.env.JWT_SECRET` estiver ausente/invalido.
   */
  public generateToken(userId: number): string {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET as string, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    } as jwt.SignOptions);
  }
}

export = TokenService;
