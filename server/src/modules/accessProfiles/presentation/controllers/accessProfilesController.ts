/**
 * Controller HTTP do módulo de Perfis de Acesso Configuráveis (UC-30 a
 * UC-33). Interpreta `req`, delega toda regra de negócio aos use cases da
 * camada de aplicação e devolve sempre o envelope padrão `{ success: true,
 * data }`.
 *
 * @module modules/accessProfiles/presentation/controllers/accessProfilesController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeAccessProfilesRepository = require('../../infrastructure/sequelize/SequelizeAccessProfilesRepository');
const ListAccessProfilesUseCase = require('../../application/use-cases/ListAccessProfilesUseCase');
const GetAccessProfileByIdUseCase = require('../../application/use-cases/GetAccessProfileByIdUseCase');
const CreateAccessProfileUseCase = require('../../application/use-cases/CreateAccessProfileUseCase');
const UpdateAccessProfileUseCase = require('../../application/use-cases/UpdateAccessProfileUseCase');
const DeactivateAccessProfileUseCase = require('../../application/use-cases/DeactivateAccessProfileUseCase');
const { ACCESS_MODULES } = require('../../../../shared/domain/accessModules');

const accessProfilesRepository = new SequelizeAccessProfilesRepository();

/**
 * `GET /api/access-profiles` — lista todos os perfis de acesso, com a
 * matriz de permissões e a contagem de usuários ativos vinculados.
 */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const useCase = new ListAccessProfilesUseCase(accessProfilesRepository);
    const profiles = await useCase.execute();
    res.json({ success: true, data: profiles });
  } catch (error) {
    next(error);
  }
}

/**
 * `GET /api/access-profiles/modules` — lista os 26 module keys válidos
 * (com rótulo pt-BR), fonte única compartilhada com o middleware
 * `authorizeModule`. IMPORTANTE: esta rota deve ser registrada ANTES de
 * `GET /api/access-profiles/:id` para não ser capturada pelo parâmetro
 * dinâmico.
 */
export async function listModules(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: ACCESS_MODULES });
  } catch (error) {
    next(error);
  }
}

/** `GET /api/access-profiles/:id` — busca um perfil de acesso por id. */
export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const useCase = new GetAccessProfileByIdUseCase(accessProfilesRepository);
    const profile = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

/** `POST /api/access-profiles` — cria um novo perfil de acesso (UC-30). */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { nome, descricao, allowed_warehouses, permissions } = req.body;
    const useCase = new CreateAccessProfileUseCase(accessProfilesRepository);
    const profile = await useCase.execute({
      nome,
      descricao,
      allowedWarehouses: allowed_warehouses,
      permissions,
      req,
    });
    res.status(201).json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

/** `PUT /api/access-profiles/:id` — edita um perfil de acesso existente (UC-31). */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { nome, descricao, allowed_warehouses, permissions } = req.body;
    const useCase = new UpdateAccessProfileUseCase(accessProfilesRepository);
    const profile = await useCase.execute({
      id: Number(req.params.id),
      nome,
      descricao,
      allowedWarehouses: allowed_warehouses,
      permissions,
      req,
    });
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

/** `DELETE /api/access-profiles/:id` — desativa (soft delete) um perfil de acesso (UC-32). */
export async function deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const useCase = new DeactivateAccessProfileUseCase(accessProfilesRepository);
    const result = await useCase.execute({ id: Number(req.params.id), req });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
