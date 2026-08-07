import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Programação de Limpeza (`/api/facilities/cleaning-schedules`).
 *
 * @module modules/facilities/presentation/controllers/cleaningScheduleController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeCleaningScheduleRepository = require('../../infrastructure/sequelize/SequelizeCleaningScheduleRepository');
const ListCleaningSchedulesUseCase = require('../../application/use-cases/cleaningSchedule/ListCleaningSchedulesUseCase');
const GetCleaningScheduleByIdUseCase = require('../../application/use-cases/cleaningSchedule/GetCleaningScheduleByIdUseCase');
const CreateCleaningScheduleUseCase = require('../../application/use-cases/cleaningSchedule/CreateCleaningScheduleUseCase');
const UpdateCleaningScheduleUseCase = require('../../application/use-cases/cleaningSchedule/UpdateCleaningScheduleUseCase');
const {
  createCleaningScheduleSchema, updateCleaningScheduleSchema, listCleaningScheduleQuerySchema, handleZodError,
} = require('../validators/cleaningScheduleValidators');
const { ValidationError } = require('../../../../errors');

const cleaningScheduleRepository = new SequelizeCleaningScheduleRepository();

/** `GET /api/facilities/cleaning-schedules` — lista paginada, com filtro opcional de `frequency`. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listCleaningScheduleQuerySchema.parse(req.query);
    const useCase = new ListCleaningSchedulesUseCase(cleaningScheduleRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({
      ...query,
      offset: (query.page - 1) * query.limit,
    });
    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error: any) {
    if (error?.issues) return next(new ValidationError('Payload inválido.', error.issues));
    next(error);
  }
};

/** `GET /api/facilities/cleaning-schedules/:id` — busca por id. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetCleaningScheduleByIdUseCase(cleaningScheduleRepository);
    const schedule = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: schedule });
  } catch (error) { next(error); }
};

/** `POST /api/facilities/cleaning-schedules` — cria uma programação de limpeza. */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createCleaningScheduleSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateCleaningScheduleUseCase(cleaningScheduleRepository);
    const schedule = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'FacilityCleaningSchedule',
      entityId: schedule?.id,
      entityDescription: schedule?.area,
      newValues: { area: schedule?.area, frequency: schedule?.frequency },
      description: `Programação de limpeza da área ${schedule?.area} criada`,
    });

    res.status(201).json({ success: true, data: schedule });
  } catch (error) { next(error); }
};

/** `PUT /api/facilities/cleaning-schedules/:id` — atualiza campos da programação de limpeza. */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateCleaningScheduleSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateCleaningScheduleUseCase(cleaningScheduleRepository);
    const schedule = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'FacilityCleaningSchedule',
      entityId: schedule?.id,
      entityDescription: schedule?.area,
      newValues: parsed.data,
      description: `Programação de limpeza ${schedule?.id} atualizada`,
    });

    res.json({ success: true, data: schedule });
  } catch (error) { next(error); }
};
