const jwt = require('jsonwebtoken');

/**
 * Wrapper fino sobre `jsonwebtoken`, extraído de
 * `server/src/controllers/authController.js#generateToken` (migração 1:1,
 * mesma chave secreta `process.env.JWT_SECRET` e mesma expiração
 * `process.env.JWT_EXPIRE || '7d'`).
 */
class TokenService {
  /**
   * Gera um token JWT assinado contendo o id do usuário.
   *
   * @param {number} userId - Id do usuário autenticado (payload `{ id: userId }`).
   * @returns {string} Token JWT assinado.
   * @throws {Error} Propagado por `jsonwebtoken` se `process.env.JWT_SECRET` estiver ausente/inválido.
   */
  generateToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });
  }
}

module.exports = TokenService;
