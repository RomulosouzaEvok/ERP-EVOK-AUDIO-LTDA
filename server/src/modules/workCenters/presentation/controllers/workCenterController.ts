/**
 * Controller HTTP do modulo de Centros de Trabalho.
 *
 * @module modules/workCenters/presentation/controllers/workCenterController
 */

const { sequelize } = require('../../../../config/database');
const { logAction } = require('../../../../services/auditLogService');
const SequelizeWorkCenterRepository = require('../../infrastructure/sequelize/SequelizeWorkCenterRepository');
const ListWorkCentersUseCase = require('../../application/use-cases/ListWorkCentersUseCase');
const GetWorkCenterByIdUseCase = require('../../application/use-cases/GetWorkCenterByIdUseCase');
const CreateWorkCenterUseCase = require('../../application/use-cases/CreateWorkCenterUseCase');
const UpdateWorkCenterUseCase = require('../../application/use-cases/UpdateWorkCenterUseCase');
const ReplaceWorkCenterShiftsUseCase = require('../../application/use-cases/ReplaceWorkCenterShiftsUseCase');
const GetWorkCenterLoadUseCase = require('../../application/use-cases/GetWorkCenterLoadUseCase');
const {
  createWorkCenterSchema,
  updateWorkCenterSchema,
  listWorkCenterQuerySchema,
  replaceWorkCenterShiftsSchema,
  getWorkCenterLoadQuerySchema,
  handleZodError,
} = require('../validators/workCenterValidators');
const { ValidationError } = require('../../../../errors');

const workCenterRepository = new SequelizeWorkCenterRepository();

async function rollbackIfPending(transaction: any) {
  if (transaction && !transaction.finished) {
    await transaction.rollback();
  }
}

/** `GET /api/work-centers` — lista paginada com turnos incluidos. */
exports.list = async (req: any, res: any, next: any) => {
  try {
    const query = listWorkCenterQuerySchema.parse(req.query);
    const useCase = new ListWorkCentersUseCase(workCenterRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({
      ...query,
      offset: (query.page - 1) * query.limit,
    });

    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error: any) {
    if (error?.issues) {
      return next(new ValidationError('Payload invalido.', error.issues));
    }
    next(error);
  }
};

/** `GET /api/work-centers/:id` — busca por id, com turnos incluidos. */
exports.getById = async (req: any, res: any, next: any) => {
  try {
    const useCase = new GetWorkCenterByIdUseCase(workCenterRepository);
    const workCenter = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: workCenter });
  } catch (error) {
    next(error);
  }
};

/** `POST /api/work-centers` — cria um centro de trabalho (409 se `code` duplicado). */
exports.create = async (req: any, res: any, next: any) => {
  try {
    const parsed = createWorkCenterSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateWorkCenterUseCase(workCenterRepository);
    const workCenter = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'WorkCenter',
      entityId: workCenter?.id,
      entityDescription: workCenter?.code,
      newValues: { code: workCenter?.code, name: workCenter?.name },
      description: `Centro de trabalho ${workCenter?.code} criado`,
    });

    res.status(201).json({ success: true, data: workCenter });
  } catch (error) {
    next(error);
  }
};

/** `PUT /api/work-centers/:id` — atualiza campos do centro de trabalho. */
exports.update = async (req: any, res: any, next: any) => {
  try {
    const parsed = updateWorkCenterSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateWorkCenterUseCase(workCenterRepository);
    const workCenter = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'WorkCenter',
      entityId: workCenter?.id,
      entityDescription: workCenter?.code,
      newValues: parsed.data,
      description: `Centro de trabalho ${workCenter?.code} atualizado`,
    });

    res.json({ success: true, data: workCenter });
  } catch (error) {
    next(error);
  }
};

/** `PUT /api/work-centers/:id/shifts` — substitui os turnos (transacional, 422 se invalido). */
exports.replaceShifts = async (req: any, res: any, next: any) => {
  const t = await sequelize.transaction();
  try {
    const parsed = replaceWorkCenterShiftsSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new ReplaceWorkCenterShiftsUseCase(workCenterRepository);
    const workCenter = await useCase.execute({
      work_center_id: Number(req.params.id),
      shifts: parsed.data.shifts,
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'update_shifts',
      entityType: 'WorkCenter',
      entityId: workCenter?.id,
      entityDescription: workCenter?.code,
      newValues: { shifts_count: parsed.data.shifts.length },
      description: `Turnos do centro de trabalho ${workCenter?.code} substituidos`,
    });

    res.json({ success: true, data: workCenter });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/** `GET /api/work-centers/load?days=` — relatorio de carga-maquina por centro de trabalho ativo. */
exports.getLoad = async (req: any, res: any, next: any) => {
  try {
    const query = getWorkCenterLoadQuerySchema.parse(req.query);
    const useCase = new GetWorkCenterLoadUseCase(workCenterRepository);
    const result = await useCase.execute(query);

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error?.issues) {
      return next(new ValidationError('Payload invalido.', error.issues));
    }
    next(error);
  }
};
