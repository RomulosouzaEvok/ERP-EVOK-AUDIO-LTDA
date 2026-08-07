/**
 * Controller do cluster Termo de Responsabilidade de Equipamento (UC-50,
 * `docs/business/BLOCO_2_TI_API.md` §2).
 *
 * @module modules/ti/presentation/controllers/termController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeResponsibilityTermRepository = require('../../infrastructure/sequelize/SequelizeResponsibilityTermRepository');
const SequelizeTicketRepository = require('../../infrastructure/sequelize/SequelizeTicketRepository');
const SequelizeTiSettingsRepository = require('../../infrastructure/sequelize/SequelizeTiSettingsRepository');
const AssetLookupServiceAdapter = require('../../infrastructure/adapters/AssetLookupServiceAdapter');

const CreateResponsibilityTermUseCase = require('../../application/use-cases/term/CreateResponsibilityTermUseCase');
const ReturnResponsibilityTermUseCase = require('../../application/use-cases/term/ReturnResponsibilityTermUseCase');
const MarkTermLostUseCase = require('../../application/use-cases/term/MarkTermLostUseCase');
const GetEmployeeTermsUseCase = require('../../application/use-cases/term/GetEmployeeTermsUseCase');
const ListPendingTermsForOffboardingUseCase = require('../../application/use-cases/term/ListPendingTermsForOffboardingUseCase');
const ListResponsibilityTermsUseCase = require('../../application/use-cases/term/ListResponsibilityTermsUseCase');
const GetResponsibilityTermByIdUseCase = require('../../application/use-cases/term/GetResponsibilityTermByIdUseCase');

const termRepository = new SequelizeResponsibilityTermRepository();
const ticketRepository = new SequelizeTicketRepository();
const settingsRepository = new SequelizeTiSettingsRepository();
const assetLookupService = new AssetLookupServiceAdapter();

/** `GET /api/ti/responsibility-terms` */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, ...filters } = req.query as any;
    const result = await new ListResponsibilityTermsUseCase(termRepository).execute({ filters, page: Number(page), limit: Number(limit) });
    res.json({ success: true, data: result.rows, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

/** `GET /api/ti/responsibility-terms/:id` */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const term = await new GetResponsibilityTermByIdUseCase(termRepository).execute({ id: Number(req.params.id) });
    res.json({ success: true, data: term });
  } catch (error) { next(error); }
};

/** `POST /api/ti/responsibility-terms` */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const term = await new CreateResponsibilityTermUseCase(termRepository, assetLookupService).execute({
      ...req.body,
      deliveredBy: (req as any).user.id,
    });
    res.status(201).json({ success: true, data: term });
  } catch (error) { next(error); }
};

/** `POST /api/ti/responsibility-terms/:id/return` */
exports.returnTerm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const term = await new ReturnResponsibilityTermUseCase(termRepository, assetLookupService, ticketRepository, settingsRepository).execute({
      id: Number(req.params.id),
      ...req.body,
      receivedBy: (req as any).user.id,
    });
    res.json({ success: true, data: term });
  } catch (error) { next(error); }
};

/** `POST /api/ti/responsibility-terms/:id/lost` */
exports.markLost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const term = await new MarkTermLostUseCase(termRepository, assetLookupService).execute({ id: Number(req.params.id), justification: req.body?.justification });
    res.json({ success: true, data: term });
  } catch (error) { next(error); }
};

/** `GET /api/ti/responsibility-terms/by-employee/:employeeId` */
exports.byEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetEmployeeTermsUseCase(termRepository).execute({ employeeId: Number(req.params.employeeId) });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `GET /api/ti/responsibility-terms/pending-for-offboarding/:employeeId` */
exports.pendingForOffboarding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new ListPendingTermsForOffboardingUseCase(termRepository).execute({ employeeId: Number(req.params.employeeId) });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};
