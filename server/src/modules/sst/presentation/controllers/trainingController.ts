/**
 * Controller do cluster Treinamentos de Segurança (NRs).
 *
 * @module modules/sst/presentation/controllers/trainingController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeTrainingRepository = require('../../infrastructure/sequelize/SequelizeTrainingRepository');
const { Employee }: any = require('../../../../models/index');

const ListTrainingMatrixUseCase = require('../../application/use-cases/training/ListTrainingMatrixUseCase');
const CreateTrainingMatrixUseCase = require('../../application/use-cases/training/CreateTrainingMatrixUseCase');
const UpdateTrainingMatrixUseCase = require('../../application/use-cases/training/UpdateTrainingMatrixUseCase');
const ListTrainingsUseCase = require('../../application/use-cases/training/ListTrainingsUseCase');
const CreateTrainingUseCase = require('../../application/use-cases/training/CreateTrainingUseCase');
const GetTrainingBlocklistUseCase = require('../../application/use-cases/training/GetTrainingBlocklistUseCase');

const trainingRepository = new SequelizeTrainingRepository();

/** `GET /api/sst/training-matrix` */
exports.listMatrix = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows, total, page, limit, totalPages } = await new ListTrainingMatrixUseCase(trainingRepository).execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) { next(error); }
};

/** `POST /api/sst/training-matrix` */
exports.createMatrix = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new CreateTrainingMatrixUseCase(trainingRepository).execute({ body: req.body });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

/** `PUT /api/sst/training-matrix/:id` */
exports.updateMatrix = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new UpdateTrainingMatrixUseCase(trainingRepository).execute({ id: req.params.id, body: req.body });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `GET /api/sst/trainings` */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows, total, page, limit, totalPages } = await new ListTrainingsUseCase(trainingRepository).execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) { next(error); }
};

/** `POST /api/sst/trainings` — resolve `position` do funcionário para calcular `validade` pela matriz. */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let employeePosition: string | null = null;
    if (req.body.employee_id) {
      const employee = await Employee.findByPk(req.body.employee_id);
      employeePosition = employee?.position ?? null;
    }
    const data = await new CreateTrainingUseCase(trainingRepository).execute({ body: req.body, createdBy: (req as any).user.id, employeePosition });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

/** `GET /api/sst/trainings/blocklist` */
exports.blocklist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetTrainingBlocklistUseCase(trainingRepository).execute();
    res.json({ success: true, data });
  } catch (error) { next(error); }
};
