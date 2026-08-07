import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Condutor (`/api/facilities/drivers`).
 *
 * @module modules/facilities/presentation/controllers/driverController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeDriverRepository = require('../../infrastructure/sequelize/SequelizeDriverRepository');
const {
  ListDriversUseCase, GetDriverByIdUseCase, CreateDriverUseCase, UpdateDriverUseCase, AuthorizeDriverUseCase, SuspendDriverUseCase,
} = require('../../application/use-cases/driver/DriverUseCases');
const { createDriverSchema, updateDriverSchema, suspendDriverSchema, listDriverQuerySchema, handleZodError } = require('../validators/driverValidators');
const { ValidationError } = require('../../../../errors');

const driverRepository = new SequelizeDriverRepository();

exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listDriverQuerySchema.parse(req.query);
    const useCase = new ListDriversUseCase(driverRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({ ...query, offset: (query.page - 1) * query.limit });
    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error: any) {
    if (error?.issues) return next(new ValidationError('Payload inválido.', error.issues));
    next(error);
  }
};

exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetDriverByIdUseCase(driverRepository);
    const driver = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: driver });
  } catch (error) { next(error); }
};

exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createDriverSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateDriverUseCase(driverRepository);
    const driver = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'FacilityDriver',
      entityId: driver?.id,
      entityDescription: `employee #${driver?.employee_id}`,
      newValues: parsed.data,
      description: `Condutor cadastrado para o funcionário #${driver?.employee_id}`,
    });

    res.status(201).json({ success: true, data: driver });
  } catch (error) { next(error); }
};

exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateDriverSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateDriverUseCase(driverRepository);
    const driver = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'FacilityDriver',
      entityId: driver?.id,
      newValues: parsed.data,
      description: `Condutor #${driver?.id} atualizado`,
    });

    res.json({ success: true, data: driver });
  } catch (error) { next(error); }
};

exports.authorize = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new AuthorizeDriverUseCase(driverRepository);
    const driver = await useCase.execute({ id: Number(req.params.id), authorizedBy: (req as any).user.id });

    logAction(req, {
      action: 'approve',
      entityType: 'FacilityDriver',
      entityId: driver?.id,
      description: `Condutor #${driver?.id} autorizado`,
    });

    res.json({ success: true, data: driver });
  } catch (error) { next(error); }
};

/** `POST /api/facilities/drivers/:id/suspend` — nível approve (RF-FAC-015). */
exports.suspend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = suspendDriverSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new SuspendDriverUseCase(driverRepository);
    const driver = await useCase.execute({ id: Number(req.params.id), suspendedBy: (req as any).user.id, ...parsed.data });

    logAction(req, {
      action: 'approve',
      entityType: 'FacilityDriver',
      entityId: driver?.id,
      description: `Condutor #${driver?.id} suspenso — ${parsed.data.suspension_reason}`,
    });

    res.json({ success: true, data: driver });
  } catch (error) { next(error); }
};
