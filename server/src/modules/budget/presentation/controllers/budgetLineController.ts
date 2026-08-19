import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Linhas de Orçamento (`/api/budget/lines`).
 *
 * @module modules/budget/presentation/controllers/budgetLineController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeBudgetRepository = require('../../infrastructure/sequelize/SequelizeBudgetRepository');
const CreateBudgetLineUseCase = require('../../application/use-cases/budget-line/CreateBudgetLineUseCase');
const ListBudgetLinesUseCase = require('../../application/use-cases/budget-line/ListBudgetLinesUseCase');
const GetBudgetLineByIdUseCase = require('../../application/use-cases/budget-line/GetBudgetLineByIdUseCase');
const UpdateBudgetLineUseCase = require('../../application/use-cases/budget-line/UpdateBudgetLineUseCase');
const DeleteBudgetLineUseCase = require('../../application/use-cases/budget-line/DeleteBudgetLineUseCase');
const {
  createBudgetLineSchema, updateBudgetLineSchema, listBudgetLineQuerySchema, handleZodError,
} = require('../validators/budgetValidators');
const { ValidationError } = require('../../../../errors');

const budgetRepository = new SequelizeBudgetRepository();

/** `GET /api/budget/lines` — lista paginada, filtros opcionais de `year`/`month`/`cost_center_id`/`category`. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listBudgetLineQuerySchema.parse(req.query);
    const useCase = new ListBudgetLinesUseCase(budgetRepository);
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

/** `GET /api/budget/lines/:id` — busca por id. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetBudgetLineByIdUseCase(budgetRepository);
    const line = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: line });
  } catch (error) { next(error); }
};

/** `POST /api/budget/lines` — cria uma linha de orçamento (409 se `cost_center_id`+`year`+`month`+`category` duplicados). */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createBudgetLineSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateBudgetLineUseCase(budgetRepository);
    const line = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'BudgetLine',
      entityId: line?.id,
      entityDescription: `CC ${line?.cost_center_id} - ${line?.year}${line?.month ? `/${line.month}` : ''}`,
      newValues: {
        cost_center_id: line?.cost_center_id, year: line?.year, month: line?.month, category: line?.category, planned_amount: line?.planned_amount,
      },
      description: `Linha de orçamento criada para o centro de custo ${line?.cost_center_id} (${line?.year}${line?.month ? `/${line.month}` : ' - anual'})`,
    });

    res.status(201).json({ success: true, data: line });
  } catch (error) { next(error); }
};

/** `PUT /api/budget/lines/:id` — atualiza campos de uma linha de orçamento. */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateBudgetLineSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateBudgetLineUseCase(budgetRepository);
    const line = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'BudgetLine',
      entityId: line?.id,
      entityDescription: `CC ${line?.cost_center_id} - ${line?.year}${line?.month ? `/${line.month}` : ''}`,
      newValues: parsed.data,
      description: `Linha de orçamento ${line?.id} atualizada`,
    });

    res.json({ success: true, data: line });
  } catch (error) { next(error); }
};

/** `DELETE /api/budget/lines/:id` — exclui fisicamente a linha (planejamento, não histórico transacional). */
exports.remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const useCase = new DeleteBudgetLineUseCase(budgetRepository);
    const result = await useCase.execute({ id });

    logAction(req, {
      action: 'delete',
      entityType: 'BudgetLine',
      entityId: id,
      description: result.warning ? `Linha de orçamento ${id} excluída. ${result.warning}` : `Linha de orçamento ${id} excluída`,
    });

    res.json({ success: true, data: null, ...(result.warning ? { warnings: [result.warning] } : {}) });
  } catch (error) { next(error); }
};
