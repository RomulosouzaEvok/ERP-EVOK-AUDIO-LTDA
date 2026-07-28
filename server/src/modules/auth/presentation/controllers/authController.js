const { logAction } = require('../../../../services/auditLogService');
const SequelizeAuthRepository = require('../../infrastructure/sequelize/SequelizeAuthRepository');
const TokenService = require('../../infrastructure/jwt/TokenService');
const LoginUseCase = require('../../application/use-cases/LoginUseCase');
const RegisterUserUseCase = require('../../application/use-cases/RegisterUserUseCase');
const GetMeUseCase = require('../../application/use-cases/GetMeUseCase');

/**
 * Controller enxuto do módulo `auth`. Interpreta `req`, delega toda a regra
 * de negócio aos use cases da camada de aplicação e devolve sempre o
 * envelope padrão `{ success: true, data }`, mantendo exatamente o mesmo
 * formato JSON e os mesmos 3 endpoints do controller legado
 * (`server/src/controllers/authController.js`), que permanece no
 * repositório apenas como referência histórica e não está mais registrado
 * em nenhuma rota ativa (ver `server/src/modules/auth/README.md`).
 */
const authRepository = new SequelizeAuthRepository();
const tokenService = new TokenService();

/**
 * `POST /api/auth/login` — autentica por email/senha e retorna um token JWT.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const useCase = new LoginUseCase(authRepository, tokenService);
    const { token, user, audit } = await useCase.execute({ email, password });

    logAction(req, audit);

    res.json({ success: true, data: { token, user } });
  } catch (error) {
    // Tentativas de login falhas (email não encontrado/senha incorreta/usuário
    // inativo) carregam `error.audit` — auditadas mesmo em caso de falha,
    // preservando o comportamento do controller legado.
    if (error.audit) {
      logAction(req, error.audit);
    }
    next(error);
  }
};

/**
 * `POST /api/auth/register` — cria um novo usuário (rota protegida:
 * `authenticate` + `authorize('admin')`).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const useCase = new RegisterUserUseCase(authRepository);
    const user = await useCase.execute({ name, email, password, role });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * `GET /api/auth/me` — retorna o usuário autenticado (sem `password`).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getMe = async (req, res, next) => {
  try {
    const useCase = new GetMeUseCase(authRepository);
    const user = await useCase.execute({ userId: req.user.id });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
