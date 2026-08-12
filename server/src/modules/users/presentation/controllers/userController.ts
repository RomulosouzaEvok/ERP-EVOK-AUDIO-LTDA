import type { Request, Response, NextFunction } from 'express';

const SequelizeUsersRepository = require('../../infrastructure/sequelize/SequelizeUsersRepository');
const ListUsersUseCase = require('../../application/use-cases/ListUsersUseCase');
const GetUserByIdUseCase = require('../../application/use-cases/GetUserByIdUseCase');
const CreateUserUseCase = require('../../application/use-cases/CreateUserUseCase');
const UpdateUserUseCase = require('../../application/use-cases/UpdateUserUseCase');
const DeactivateUserUseCase = require('../../application/use-cases/DeactivateUserUseCase');
const RevokeUserSessionsUseCase = require('../../application/use-cases/RevokeUserSessionsUseCase');
const AssignAccessProfileUseCase = require('../../application/use-cases/AssignAccessProfileUseCase');

/**
 * Controller enxuto do módulo `users`. Interpreta `req`, delega toda a
 * regra de negócio aos use cases da camada de aplicação e devolve sempre o
 * envelope padrão `{ success: true, data }`, mantendo exatamente o mesmo
 * formato JSON e os mesmos 5 endpoints do controller anterior
 * (`userController.ts`, hoje removido do
 * repositório — histórico no git).
 */
const usersRepository = new SequelizeUsersRepository();

/**
 * `GET /api/users` — lista usuários com busca/filtro e paginação.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, search, role, active } = req.query;
    const useCase = new ListUsersUseCase(usersRepository);
    const { rows, count, page: parsedPage, limit: parsedLimit } = await useCase.execute({ page, limit, search, role, active });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(count / parsedLimit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * `GET /api/users/:id` — busca um usuário pelo id.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetUserByIdUseCase(usersRepository);
    const user = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * `POST /api/users` — cria um novo usuário.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role } = req.body;
    const useCase = new CreateUserUseCase(usersRepository);
    const user = await useCase.execute({ name, email, password, role, req });
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * `PUT /api/users/:id` — atualiza um usuário existente (não permite trocar senha).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, role, active, password } = req.body;
    const useCase = new UpdateUserUseCase(usersRepository);
    const user = await useCase.execute({ id: req.params.id, name, email, role, active, password, req });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * `DELETE /api/users/:id` — inativa (soft delete) um usuário.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new DeactivateUserUseCase(usersRepository);
    const result = await useCase.execute({ id: parseInt(req.params.id as string), currentUserId: (req as any).user.id, req });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * `POST /api/users/:id/revoke-sessions` — revogação emergencial (SEC-12):
 * invalida imediatamente todos os tokens JWT já emitidos para este usuário,
 * sem exigir/alterar a senha atual dele.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.revokeSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new RevokeUserSessionsUseCase(usersRepository);
    const result = await useCase.execute({ id: parseInt(req.params.id as string), req });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * `PUT /api/users/:id/access-profile` — atribui (ou remove, com `null`) o
 * perfil de acesso de área do usuário (UC-33).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.assignAccessProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new AssignAccessProfileUseCase(usersRepository);
    const result = await useCase.execute({
      id: parseInt(req.params.id as string),
      accessProfileId: req.body.access_profile_id ?? null,
      req
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};


