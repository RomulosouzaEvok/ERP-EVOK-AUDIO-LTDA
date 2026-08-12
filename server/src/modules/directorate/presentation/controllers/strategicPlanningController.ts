import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Planejamento Estratégico (`/api/directorate/strategic-plannings`).
 *
 * @module modules/directorate/presentation/controllers/strategicPlanningController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeDirectorateRepository = require('../../infrastructure/sequelize/SequelizeDirectorateRepository');
const CreateStrategicPlanningUseCase = require('../../application/use-cases/strategic-planning/CreateStrategicPlanningUseCase');
const ListStrategicPlanningsUseCase = require('../../application/use-cases/strategic-planning/ListStrategicPlanningsUseCase');
const GetStrategicPlanningByIdUseCase = require('../../application/use-cases/strategic-planning/GetStrategicPlanningByIdUseCase');
const UpdateStrategicPlanningUseCase = require('../../application/use-cases/strategic-planning/UpdateStrategicPlanningUseCase');
const UpdateStrategicPlanningActualUseCase = require('../../application/use-cases/strategic-planning/UpdateStrategicPlanningActualUseCase');
const {
  createStrategicPlanningSchema, updateStrategicPlanningSchema, updateStrategicPlanningActualSchema,
  listStrategicPlanningQuerySchema, handleZodError,
} = require('../validators/directorateValidators');
const { ValidationError } = require('../../../../errors');

const directorateRepository = new SequelizeDirectorateRepository();

/** `GET /api/directorate/strategic-plannings` — lista paginada, filtros `year`/`directorate_id`/`department_id`/`status`. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listStrategicPlanningQuerySchema.parse(req.query);
    const useCase = new ListStrategicPlanningsUseCase(directorateRepository);
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

/** `GET /api/directorate/strategic-plannings/:id` — busca por id. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetStrategicPlanningByIdUseCase(directorateRepository);
    const planning = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: planning });
  } catch (error) { next(error); }
};

/** `POST /api/directorate/strategic-plannings` — cria um objetivo estratégico anual. */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createStrategicPlanningSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateStrategicPlanningUseCase(directorateRepository);
    const planning = await useCase.execute({ ...parsed.data, createdBy: (req as any).user.id });

    logAction(req, {
      action: 'create',
      entityType: 'StrategicPlanning',
      entityId: planning?.id,
      entityDescription: `${planning?.year} - ${String(planning?.objective).slice(0, 80)}`,
      newValues: {
        year: planning?.year, objective: planning?.objective, directorate_id: planning?.directorate_id, department_id: planning?.department_id,
      },
      description: `Objetivo estratégico ${planning?.id} criado para ${planning?.year}`,
    });

    res.status(201).json({ success: true, data: planning });
  } catch (error) { next(error); }
};

/** `PUT /api/directorate/strategic-plannings/:id` — atualiza campos do objetivo (exceto `actual_value`). */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateStrategicPlanningSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateStrategicPlanningUseCase(directorateRepository);
    const planning = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'StrategicPlanning',
      entityId: planning?.id,
      newValues: parsed.data,
      description: `Objetivo estratégico ${planning?.id} atualizado`,
    });

    res.json({ success: true, data: planning });
  } catch (error) { next(error); }
};

/** `PATCH /api/directorate/strategic-plannings/:id/actual` — registra o valor realizado. */
exports.updateActual = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateStrategicPlanningActualSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateStrategicPlanningActualUseCase(directorateRepository);
    const planning = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'StrategicPlanning',
      entityId: planning?.id,
      newValues: { actual_value: planning?.actual_value, status: planning?.status },
      description: `Realizado do objetivo estratégico ${planning?.id} atualizado para ${planning?.actual_value}`,
    });

    res.json({ success: true, data: planning });
  } catch (error) { next(error); }
};
