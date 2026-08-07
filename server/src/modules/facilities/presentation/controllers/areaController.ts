import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Áreas Físicas (`/api/facilities/areas`).
 *
 * @module modules/facilities/presentation/controllers/areaController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeAreaRepository = require('../../infrastructure/sequelize/SequelizeAreaRepository');
const ListAreasUseCase = require('../../application/use-cases/area/ListAreasUseCase');
const GetAreaByIdUseCase = require('../../application/use-cases/area/GetAreaByIdUseCase');
const CreateAreaUseCase = require('../../application/use-cases/area/CreateAreaUseCase');
const UpdateAreaUseCase = require('../../application/use-cases/area/UpdateAreaUseCase');
const { createAreaSchema, updateAreaSchema, listAreaQuerySchema, handleZodError } = require('../validators/areaValidators');
const { ValidationError } = require('../../../../errors');

const areaRepository = new SequelizeAreaRepository();

/** `GET /api/facilities/areas` — lista paginada, com filtros opcionais de `area_type`/`department_id`. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listAreaQuerySchema.parse(req.query);
    const useCase = new ListAreasUseCase(areaRepository);
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

/** `GET /api/facilities/areas/:id` — busca por id. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetAreaByIdUseCase(areaRepository);
    const area = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: area });
  } catch (error) { next(error); }
};

/** `POST /api/facilities/areas` — cria uma área física. */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createAreaSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateAreaUseCase(areaRepository);
    const area = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'FacilityArea',
      entityId: area?.id,
      entityDescription: area?.name,
      newValues: { name: area?.name, area_type: area?.area_type },
      description: `Área física ${area?.name} criada`,
    });

    res.status(201).json({ success: true, data: area });
  } catch (error) { next(error); }
};

/** `PUT /api/facilities/areas/:id` — atualiza campos da área física. */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateAreaSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateAreaUseCase(areaRepository);
    const area = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'FacilityArea',
      entityId: area?.id,
      entityDescription: area?.name,
      newValues: parsed.data,
      description: `Área física ${area?.name} atualizada`,
    });

    res.json({ success: true, data: area });
  } catch (error) { next(error); }
};
