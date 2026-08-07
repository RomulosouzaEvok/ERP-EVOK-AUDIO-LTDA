import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Visitante (`/api/facilities/visitors`).
 *
 * @module modules/facilities/presentation/controllers/visitorController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeVisitorRepository = require('../../infrastructure/sequelize/SequelizeVisitorRepository');
const { ListVisitorsUseCase, CreateVisitorUseCase } = require('../../application/use-cases/visitor/VisitorUseCases');
const { createVisitorSchema, listVisitorQuerySchema, handleZodError } = require('../validators/visitValidators');
const { ValidationError } = require('../../../../errors');

const visitorRepository = new SequelizeVisitorRepository();

/** `GET /api/facilities/visitors` — dados pessoais mascarados (LGPD). */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listVisitorQuerySchema.parse(req.query);
    const useCase = new ListVisitorsUseCase(visitorRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({ ...query, offset: (query.page - 1) * query.limit });
    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error: any) {
    if (error?.issues) return next(new ValidationError('Payload inválido.', error.issues));
    next(error);
  }
};

exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createVisitorSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateVisitorUseCase(visitorRepository);
    const visitor = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'FacilityVisitor',
      entityId: visitor?.id,
      description: `Visitante ${visitor?.name} cadastrado`,
    });

    res.status(201).json({ success: true, data: visitor });
  } catch (error) { next(error); }
};
