import type { Request, Response, NextFunction } from 'express';

const SequelizeNonConformitiesRepository = require('../../infrastructure/sequelize/SequelizeNonConformitiesRepository');
const ListNonConformitiesUseCase = require('../../application/use-cases/ListNonConformitiesUseCase');
const GetNonConformityByIdUseCase = require('../../application/use-cases/GetNonConformityByIdUseCase');
const CreateNonConformityUseCase = require('../../application/use-cases/CreateNonConformityUseCase');
const UpdateNonConformityUseCase = require('../../application/use-cases/UpdateNonConformityUseCase');
const CloseNonConformityUseCase = require('../../application/use-cases/CloseNonConformityUseCase');

/**
 * Controller enxuto do módulo `nonConformities`. Delega toda a regra de
 * negócio aos use cases da camada de aplicação, mantendo o mesmo contrato
 * JSON e os mesmos 5 endpoints do controller anterior
 * (`server/src/controllers/nonConformityController.ts`).
 */
const nonConformitiesRepository = new SequelizeNonConformitiesRepository();

/** `GET /api/quality/non-conformities` — lista não conformidades (filtros e paginação). */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new ListNonConformitiesUseCase(nonConformitiesRepository);
    const { rows, total, page, limit, totalPages } = await useCase.execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) {
    next(error);
  }
};

/** `GET /api/quality/non-conformities/:id` — busca uma não conformidade pelo id. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetNonConformityByIdUseCase(nonConformitiesRepository);
    const nonConformity = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: nonConformity });
  } catch (error) {
    next(error);
  }
};

/** `POST /api/quality/non-conformities` — registra uma nova não conformidade. */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new CreateNonConformityUseCase(nonConformitiesRepository);
    const nonConformity = await useCase.execute({ ...req.body, reportedBy: (req as any).user.id });
    res.status(201).json({ success: true, data: nonConformity });
  } catch (error) {
    next(error);
  }
};

/** `PUT /api/quality/non-conformities/:id` — atualiza uma não conformidade existente. */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new UpdateNonConformityUseCase(nonConformitiesRepository);
    const nonConformity = await useCase.execute({ id: req.params.id, body: req.body, closedBy: (req as any).user.id });
    res.json({ success: true, data: nonConformity });
  } catch (error) {
    next(error);
  }
};

/** `DELETE /api/quality/non-conformities/:id` — fecha (soft delete) uma não conformidade. */
exports.remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new CloseNonConformityUseCase(nonConformitiesRepository);
    const result = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
