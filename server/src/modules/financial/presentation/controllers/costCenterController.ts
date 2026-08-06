import type { Request, Response, NextFunction } from 'express';

const { logAction } = require('../../../../services/auditLogService');
const SequelizeCostCenterRepository = require('../../infrastructure/sequelize/SequelizeCostCenterRepository');
const ListCostCentersUseCase = require('../../application/use-cases/ListCostCentersUseCase');
const CreateCostCenterUseCase = require('../../application/use-cases/CreateCostCenterUseCase');
const UpdateCostCenterUseCase = require('../../application/use-cases/UpdateCostCenterUseCase');
const GetCostCenterReportUseCase = require('../../application/use-cases/GetCostCenterReportUseCase');
const {
  createCostCenterSchema, updateCostCenterSchema, listCostCenterQuerySchema,
  costCenterReportQuerySchema, handleZodError,
} = require('../validators/costCenterValidators');
const { ValidationError } = require('../../../../errors');

/**
 * Controller HTTP do módulo de Centros de Custo (`/api/finance/cost-centers`).
 *
 * @module modules/financial/presentation/controllers/costCenterController
 */
const costCenterRepository = new SequelizeCostCenterRepository();

/** `GET /api/finance/cost-centers` — lista paginada, com filtro opcional de `active`. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listCostCenterQuerySchema.parse(req.query);
    const useCase = new ListCostCentersUseCase(costCenterRepository);
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

/** `POST /api/finance/cost-centers` — cria um centro de custo (409 se `code` duplicado). */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createCostCenterSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateCostCenterUseCase(costCenterRepository);
    const costCenter = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'CostCenter',
      entityId: costCenter?.id,
      entityDescription: costCenter?.code,
      newValues: { code: costCenter?.code, name: costCenter?.name },
      description: `Centro de custo ${costCenter?.code} criado`,
    });

    res.status(201).json({ success: true, data: costCenter });
  } catch (error) { next(error); }
};

/** `PUT /api/finance/cost-centers/:id` — atualiza campos do centro de custo (inclusive desativação via `active`). */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateCostCenterSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateCostCenterUseCase(costCenterRepository);
    const costCenter = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'CostCenter',
      entityId: costCenter?.id,
      entityDescription: costCenter?.code,
      newValues: parsed.data,
      description: `Centro de custo ${costCenter?.code} atualizado`,
    });

    res.json({ success: true, data: costCenter });
  } catch (error) { next(error); }
};

/** `GET /api/finance/cost-centers/report?from=&to=` — relatório de aberto/realizado a pagar/receber por centro de custo. */
exports.report = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = costCenterReportQuerySchema.safeParse(req.query);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new GetCostCenterReportUseCase(costCenterRepository);
    const data = await useCase.execute(parsed.data);

    res.json({ success: true, data });
  } catch (error) { next(error); }
};
