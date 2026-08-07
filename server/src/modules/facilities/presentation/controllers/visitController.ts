import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Visita/Check-in-out (`/api/facilities/visits`).
 *
 * @module modules/facilities/presentation/controllers/visitController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeVisitRepository = require('../../infrastructure/sequelize/SequelizeVisitRepository');
const SequelizeVisitorRepository = require('../../infrastructure/sequelize/SequelizeVisitorRepository');
const { ListVisitsUseCase, GetVisitByIdUseCase, CreateVisitUseCase, CheckoutVisitUseCase, OnsiteOverdueVisitsUseCase } = require('../../application/use-cases/visit/VisitUseCases');
const { createVisitSchema, listVisitQuerySchema, handleZodError } = require('../validators/visitValidators');
const { ValidationError } = require('../../../../errors');

const visitRepository = new SequelizeVisitRepository();
const visitorRepository = new SequelizeVisitorRepository();

exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listVisitQuerySchema.parse(req.query);
    const useCase = new ListVisitsUseCase(visitRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({ ...query, offset: (query.page - 1) * query.limit });
    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error: any) {
    if (error?.issues) return next(new ValidationError('Payload inválido.', error.issues));
    next(error);
  }
};

/** `GET /api/facilities/visits/onsite-overdue` — precisa vir ANTES de `/:id` na rota. */
exports.onsiteOverdue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new OnsiteOverdueVisitsUseCase(visitRepository);
    const data = await useCase.execute();
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetVisitByIdUseCase(visitRepository);
    const visit = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: visit });
  } catch (error) { next(error); }
};

exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createVisitSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateVisitUseCase(visitRepository, visitorRepository);
    const visit = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'FacilityVisit',
      entityId: visit?.id,
      description: `Check-in de visitante ${parsed.data.visitor?.name}`,
    });

    res.status(201).json({ success: true, data: visit });
  } catch (error) { next(error); }
};

exports.checkout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new CheckoutVisitUseCase(visitRepository);
    const visit = await useCase.execute({ id: Number(req.params.id) });

    logAction(req, {
      action: 'update',
      entityType: 'FacilityVisit',
      entityId: visit?.id,
      description: `Check-out da visita #${visit?.id}`,
    });

    res.json({ success: true, data: visit });
  } catch (error) { next(error); }
};
