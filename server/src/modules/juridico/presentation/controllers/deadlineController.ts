/**
 * Controller de `JurLegalCaseDeadline` — fluxo mais crítico do módulo
 * (UC-54, `docs/business/BLOCO_3_JUR_API.md` §4).
 *
 * @module modules/juridico/presentation/controllers/deadlineController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeDeadlineRepository = require('../../infrastructure/sequelize/SequelizeDeadlineRepository');
const SequelizeLegalCaseRepository = require('../../infrastructure/sequelize/SequelizeLegalCaseRepository');
const { logAction } = require('../../../../services/auditLogService');

const CreateDeadlineUseCase = require('../../application/use-cases/deadline/CreateDeadlineUseCase');
const AcknowledgeDeadlineUseCase = require('../../application/use-cases/deadline/AcknowledgeDeadlineUseCase');
const FulfillDeadlineUseCase = require('../../application/use-cases/deadline/FulfillDeadlineUseCase');
const ConfirmDeadlineUseCase = require('../../application/use-cases/deadline/ConfirmDeadlineUseCase');
const ListDeadlinesUseCase = require('../../application/use-cases/deadline/ListDeadlinesUseCase');
const GetDeadlineByIdUseCase = require('../../application/use-cases/deadline/GetDeadlineByIdUseCase');
const CriticalDeadlinesUseCase = require('../../application/use-cases/deadline/CriticalDeadlinesUseCase');

const deadlineRepository = new SequelizeDeadlineRepository();
const legalCaseRepository = new SequelizeLegalCaseRepository();

/** `GET /api/jur/legal-case-deadlines` */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, ...filters } = req.query as any;
    const result = await new ListDeadlinesUseCase(deadlineRepository).execute({ filters, page: Number(page), limit: Number(limit) });
    res.json({ success: true, data: result.rows, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

/** `GET /api/jur/legal-case-deadlines/critical` — antes de `/:id` na rota. */
exports.critical = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new CriticalDeadlinesUseCase(deadlineRepository).execute();
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `GET /api/jur/legal-case-deadlines/:id` */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetDeadlineByIdUseCase(deadlineRepository).execute({ id: req.params.id });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/jur/legal-cases/:caseId/deadlines` */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deadline = await new CreateDeadlineUseCase(deadlineRepository, legalCaseRepository).execute({
      legalCaseId: Number(req.params.caseId),
      ...req.body,
      createdBy: (req as any).user.id,
    });
    logAction(req, { action: 'create', entityType: 'JurLegalCaseDeadline', entityId: deadline.id, newValues: deadline });
    res.status(201).json({ success: true, data: deadline });
  } catch (error) { next(error); }
};

/** `POST /api/jur/legal-case-deadlines/:id/acknowledge` */
exports.acknowledge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deadline = await new AcknowledgeDeadlineUseCase(deadlineRepository).execute({
      id: Number(req.params.id),
      requestingUserId: (req as any).user.id,
      asBackup: Boolean(req.body?.as_backup),
    });
    res.json({ success: true, data: deadline });
  } catch (error) { next(error); }
};

/** `POST /api/jur/legal-case-deadlines/:id/fulfill` */
exports.fulfill = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deadline = await new FulfillDeadlineUseCase(deadlineRepository).execute({
      id: Number(req.params.id),
      evidence_file_path: req.body?.evidence_file_path,
      retroactive_justification: req.body?.retroactive_justification ?? null,
      fulfilledBy: (req as any).user.id,
    });
    logAction(req, { action: 'fulfill', entityType: 'JurLegalCaseDeadline', entityId: Number(req.params.id) });
    res.json({ success: true, data: deadline });
  } catch (error) { next(error); }
};

/** `POST /api/jur/legal-case-deadlines/:id/confirm` */
exports.confirm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deadline = await new ConfirmDeadlineUseCase(deadlineRepository).execute({
      id: Number(req.params.id),
      confirmedBy: (req as any).user.id,
    });
    logAction(req, { action: 'confirm', entityType: 'JurLegalCaseDeadline', entityId: Number(req.params.id) });
    res.json({ success: true, data: deadline });
  } catch (error) { next(error); }
};
