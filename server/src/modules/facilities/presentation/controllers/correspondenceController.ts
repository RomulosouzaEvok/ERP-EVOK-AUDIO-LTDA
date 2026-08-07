import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Correspondência (`/api/facilities/correspondences`).
 *
 * @module modules/facilities/presentation/controllers/correspondenceController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeCorrespondenceRepository = require('../../infrastructure/sequelize/SequelizeCorrespondenceRepository');
const { ListCorrespondenceUseCase, CreateCorrespondenceUseCase, DeliverCorrespondenceUseCase } = require('../../application/use-cases/correspondence/CorrespondenceUseCases');
const { createCorrespondenceSchema, deliverCorrespondenceSchema, listCorrespondenceQuerySchema, handleZodError } = require('../validators/correspondenceValidators');
const { ValidationError } = require('../../../../errors');

const correspondenceRepository = new SequelizeCorrespondenceRepository();

exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listCorrespondenceQuerySchema.parse(req.query);
    const useCase = new ListCorrespondenceUseCase(correspondenceRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({ ...query, offset: (query.page - 1) * query.limit });
    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error: any) {
    if (error?.issues) return next(new ValidationError('Payload inválido.', error.issues));
    next(error);
  }
};

exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createCorrespondenceSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateCorrespondenceUseCase(correspondenceRepository);
    const correspondence = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'FacilityCorrespondence',
      entityId: correspondence?.id,
      description: `Correspondência registrada de ${parsed.data.sender ?? 'remetente desconhecido'}`,
    });

    res.status(201).json({ success: true, data: correspondence });
  } catch (error) { next(error); }
};

exports.deliver = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = deliverCorrespondenceSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new DeliverCorrespondenceUseCase(correspondenceRepository);
    const correspondence = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'FacilityCorrespondence',
      entityId: correspondence?.id,
      description: `Correspondência #${correspondence?.id} entregue a ${parsed.data.delivered_to}`,
    });

    res.json({ success: true, data: correspondence });
  } catch (error) { next(error); }
};
