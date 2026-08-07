/**
 * Controller de Ações Corretivas (recurso único polimórfico multi-origem).
 *
 * @module modules/sst/presentation/controllers/correctiveActionController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeCorrectiveActionRepository = require('../../infrastructure/sequelize/SequelizeCorrectiveActionRepository');

const ListCorrectiveActionsUseCase = require('../../application/use-cases/correctiveAction/ListCorrectiveActionsUseCase');
const CreateCorrectiveActionUseCase = require('../../application/use-cases/correctiveAction/CreateCorrectiveActionUseCase');
const UpdateCorrectiveActionUseCase = require('../../application/use-cases/correctiveAction/UpdateCorrectiveActionUseCase');

const repository = new SequelizeCorrectiveActionRepository();

/** `GET /api/sst/corrective-actions` */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows, total, page, limit, totalPages } = await new ListCorrectiveActionsUseCase(repository).execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) { next(error); }
};

/** `POST /api/sst/corrective-actions` */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new CreateCorrectiveActionUseCase(repository).execute({ body: req.body, createdBy: (req as any).user.id });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

/** `PUT /api/sst/corrective-actions/:id` */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new UpdateCorrectiveActionUseCase(repository).execute({ id: req.params.id, body: req.body });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};
