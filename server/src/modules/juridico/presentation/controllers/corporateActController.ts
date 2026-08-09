/**
 * Controller do cluster Ato Societário — `JurCorporateAct` (RF-JUR-030,
 * correção do dono do produto em 2026-08-08).
 *
 * @module modules/juridico/presentation/controllers/corporateActController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeCorporateActRepository = require('../../infrastructure/sequelize/SequelizeCorporateActRepository');
const { logAction } = require('../../../../services/auditLogService');

const CreateCorporateActUseCase = require('../../application/use-cases/corporateAct/CreateCorporateActUseCase');
const ListCorporateActsUseCase = require('../../application/use-cases/corporateAct/ListCorporateActsUseCase');
const GetCorporateActByIdUseCase = require('../../application/use-cases/corporateAct/GetCorporateActByIdUseCase');
const UpdateCorporateActUseCase = require('../../application/use-cases/corporateAct/UpdateCorporateActUseCase');

const corporateActRepository = new SequelizeCorporateActRepository();

/** `GET /api/jur/corporate-acts` */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, ...filters } = req.query as any;
    const result = await new ListCorporateActsUseCase(corporateActRepository).execute({ filters, page: Number(page), limit: Number(limit) });
    res.json({ success: true, data: result.rows, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

/** `GET /api/jur/corporate-acts/:id` */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetCorporateActByIdUseCase(corporateActRepository).execute({ id: req.params.id });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/jur/corporate-acts` */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const act = await new CreateCorporateActUseCase(corporateActRepository).execute({ ...req.body, createdBy: (req as any).user.id });
    logAction(req, { action: 'create', entityType: 'JurCorporateAct', entityId: act.id, newValues: act });
    res.status(201).json({ success: true, data: act });
  } catch (error) { next(error); }
};

/** `PUT /api/jur/corporate-acts/:id` */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const act = await new UpdateCorporateActUseCase(corporateActRepository).execute({ id: Number(req.params.id), ...req.body });
    logAction(req, { action: 'update', entityType: 'JurCorporateAct', entityId: Number(req.params.id), newValues: req.body });
    res.json({ success: true, data: act });
  } catch (error) { next(error); }
};
