/**
 * Controller do cluster ASO/PCMSO (NR-7).
 *
 * Log de leitura (RNF-SST-05): `GET /:id` e `GET /status/:employeeId`
 * disparam `logAction` fire-and-forget (dado clínico sensível).
 *
 * @module modules/sst/presentation/controllers/asoController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeAsoRepository = require('../../infrastructure/sequelize/SequelizeAsoRepository');
const SequelizeEsocialEventRepository = require('../../infrastructure/sequelize/SequelizeEsocialEventRepository');
const { logAction } = require('../../../../services/auditLogService');

const ListExamPlansUseCase = require('../../application/use-cases/aso/ListExamPlansUseCase');
const CreateExamPlanUseCase = require('../../application/use-cases/aso/CreateExamPlanUseCase');
const UpdateExamPlanUseCase = require('../../application/use-cases/aso/UpdateExamPlanUseCase');
const ListAsoUseCase = require('../../application/use-cases/aso/ListAsoUseCase');
const GetAsoByIdUseCase = require('../../application/use-cases/aso/GetAsoByIdUseCase');
const CreateAsoUseCase = require('../../application/use-cases/aso/CreateAsoUseCase');
const CreateComplementaryExamUseCase = require('../../application/use-cases/aso/CreateComplementaryExamUseCase');
const GetAsoStatusUseCase = require('../../application/use-cases/aso/GetAsoStatusUseCase');
const GetUpcomingAsoUseCase = require('../../application/use-cases/aso/GetUpcomingAsoUseCase');

const asoRepository = new SequelizeAsoRepository();
const esocialEventRepository = new SequelizeEsocialEventRepository();

/** `GET /api/sst/exam-plans` */
exports.listExamPlans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows, total, page, limit, totalPages } = await new ListExamPlansUseCase(asoRepository).execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) { next(error); }
};

/** `POST /api/sst/exam-plans` */
exports.createExamPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plano = await new CreateExamPlanUseCase(asoRepository).execute({ body: req.body });
    res.status(201).json({ success: true, data: plano });
  } catch (error) { next(error); }
};

/** `PUT /api/sst/exam-plans/:id` */
exports.updateExamPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plano = await new UpdateExamPlanUseCase(asoRepository).execute({ id: req.params.id, body: req.body });
    res.json({ success: true, data: plano });
  } catch (error) { next(error); }
};

/** `GET /api/sst/aso` — shape resumido, sem dado clínico. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows, total, page, limit, totalPages } = await new ListAsoUseCase(asoRepository).execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) { next(error); }
};

/** `GET /api/sst/aso/upcoming` — precisa vir ANTES de `/:id` na rota. */
exports.upcoming = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetUpcomingAsoUseCase(asoRepository).execute({ dias: req.query.dias });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `GET /api/sst/aso/status/:employeeId` — exceção `sst`|`rh`, sem dado clínico. */
exports.status = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetAsoStatusUseCase(asoRepository).execute({ employeeId: req.params.employeeId });
    logAction(req, { action: 'read', entityType: 'SstAsoStatus', entityId: Number(req.params.employeeId), description: 'Consulta de status enxuto de ASO (RF-SST-021)' });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `GET /api/sst/aso/:id` — detalhe completo (dado clínico), log de leitura. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const aso = await new GetAsoByIdUseCase(asoRepository).execute({ id: req.params.id });
    logAction(req, { action: 'read', entityType: 'SstAso', entityId: Number(req.params.id), description: 'Leitura de ASO com dado clínico (RNF-SST-05)' });
    res.json({ success: true, data: aso });
  } catch (error) { next(error); }
};

/** `POST /api/sst/aso` */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const aso = await new CreateAsoUseCase(asoRepository, esocialEventRepository).execute({ body: req.body, registradoPor: (req as any).user.id });
    res.status(201).json({ success: true, data: aso });
  } catch (error) { next(error); }
};

/** `POST /api/sst/aso/:id/complementary-exams` */
exports.createComplementaryExam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const exame = await new CreateComplementaryExamUseCase(asoRepository).execute({ asoId: req.params.id, body: req.body });
    res.status(201).json({ success: true, data: exame });
  } catch (error) { next(error); }
};
