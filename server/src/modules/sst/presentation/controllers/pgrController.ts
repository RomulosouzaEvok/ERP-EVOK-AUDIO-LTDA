/**
 * Controller do cluster PGR/GRO + GES (NR-1).
 *
 * @module modules/sst/presentation/controllers/pgrController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizePgrRepository = require('../../infrastructure/sequelize/SequelizePgrRepository');
const SequelizeEsocialEventRepository = require('../../infrastructure/sequelize/SequelizeEsocialEventRepository');

const ListRisksUseCase = require('../../application/use-cases/pgr/ListRisksUseCase');
const CreateRiskUseCase = require('../../application/use-cases/pgr/CreateRiskUseCase');
const UpdateRiskUseCase = require('../../application/use-cases/pgr/UpdateRiskUseCase');
const ListGesUseCase = require('../../application/use-cases/pgr/ListGesUseCase');
const CreateGesUseCase = require('../../application/use-cases/pgr/CreateGesUseCase');
const AddGesMemberUseCase = require('../../application/use-cases/pgr/AddGesMemberUseCase');

const pgrRepository = new SequelizePgrRepository();
const esocialEventRepository = new SequelizeEsocialEventRepository();

/** `GET /api/sst/risks` */
exports.listRisks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows, total, page, limit, totalPages } = await new ListRisksUseCase(pgrRepository).execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) { next(error); }
};

/** `POST /api/sst/risks` */
exports.createRisk = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new CreateRiskUseCase(pgrRepository).execute({ body: req.body, createdBy: (req as any).user.id });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

/** `PUT /api/sst/risks/:id` */
exports.updateRisk = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new UpdateRiskUseCase(pgrRepository).execute({ id: req.params.id, body: req.body });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `GET /api/sst/ges` */
exports.listGes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows, total, page, limit, totalPages } = await new ListGesUseCase(pgrRepository).execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) { next(error); }
};

/** `POST /api/sst/ges` */
exports.createGes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new CreateGesUseCase(pgrRepository).execute({ body: req.body });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/sst/ges/:id/members` */
exports.addGesMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new AddGesMemberUseCase(pgrRepository, esocialEventRepository).execute({ gesId: req.params.id, body: req.body });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};
