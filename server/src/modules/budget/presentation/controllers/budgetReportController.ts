import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP do relatório Orçado × Realizado (`/api/budget/report`).
 *
 * @module modules/budget/presentation/controllers/budgetReportController
 */

const SequelizeBudgetRepository = require('../../infrastructure/sequelize/SequelizeBudgetRepository');
const SequelizeCostCenterRepository = require('../../../financial/infrastructure/sequelize/SequelizeCostCenterRepository');
const GetBudgetVsActualReportUseCase = require('../../application/use-cases/report/GetBudgetVsActualReportUseCase');
const { budgetReportQuerySchema, handleZodError } = require('../validators/budgetValidators');

const budgetRepository = new SequelizeBudgetRepository();
const costCenterRepository = new SequelizeCostCenterRepository();

/** `GET /api/budget/report?year=&month=&cost_center_id=` — orçado × realizado por centro de custo. */
exports.get = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = budgetReportQuerySchema.safeParse(req.query);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new GetBudgetVsActualReportUseCase(budgetRepository, costCenterRepository);
    const data = await useCase.execute(parsed.data);

    res.json({ success: true, data });
  } catch (error) { next(error); }
};
