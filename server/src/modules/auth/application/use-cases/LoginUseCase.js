const UseCase = require('../../../../shared/application/UseCase');
const { LoginCredentialsEntity } = require('../../domain/entities/AuthCredentialsEntity');
const { UnauthorizedError } = require('../../../../errors');

/**
 * Autentica um usuário por email/senha e gera um token JWT, cobrindo o
 * fluxo do endpoint `POST /api/auth/login`.
 *
 * Migrado 1:1 do controller legado
 * `server/src/controllers/authController.js#login`, preservando
 * propositalmente a MESMA mensagem genérica `'Email ou senha incorretos'`
 * para os dois casos de falha distintos (email não encontrado e senha
 * incorreta) — por segurança, para não revelar a um atacante se um email
 * está cadastrado. **Não altere essa mensagem.**
 *
 * Cada falha (e o sucesso) retorna também `audit`, um objeto pronto para o
 * controller repassar a `logAction` (mesmos campos usados pelo controller
 * legado), preservando a auditoria de tentativas de login mesmo em caso de
 * falha.
 */
class LoginUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/AuthRepository')} authRepository
   * @param {import('../../infrastructure/jwt/TokenService')} tokenService
   */
  constructor(authRepository, tokenService) {
    super();
    this.authRepository = authRepository;
    this.tokenService = tokenService;
  }

  /**
   * @param {Object} input
   * @param {string} input.email
   * @param {string} input.password
   * @returns {Promise<{ token: string, user: { id:number, name:string, email:string, role:string }, audit: Object }>}
   * @throws {import('../../../../errors').ValidationError} Se `email`/`password` ausentes (forma).
   * @throws {UnauthorizedError} Com mensagem `'Email ou senha incorretos'` se o email não existir ou a senha não conferir; com `'Usuário inativo. Contate o administrador.'` se o usuário estiver inativo. Ambos os casos carregam `error.audit` com os dados para `logAction`.
   */
  async execute({ email, password }) {
    const credentials = new LoginCredentialsEntity({ email, password });

    const user = await this.authRepository.findUserByEmail(credentials.email);
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

    const token = this.tokenService.generateToken(user.id);

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
   * tentativa falha em `error.audit`, para o controller repassar a
   * `logAction` antes de propagar o erro ao `errorHandler`.
   *
   * @param {string} message
   * @param {Object} auditPayload - Mesma forma aceita por `logAction(req, params)`.
   * @returns {UnauthorizedError}
   * @private
   */
  _authFailure(message, auditPayload) {
    const error = new UnauthorizedError(message);
    error.audit = auditPayload;
    return error;
  }
}

module.exports = LoginUseCase;
