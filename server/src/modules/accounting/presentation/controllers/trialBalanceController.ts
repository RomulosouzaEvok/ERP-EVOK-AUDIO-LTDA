import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP do Balancete (`/api/accounting/trial-balance`).
 *
 * @module modules/accounting/presentation/controllers/trialBalanceController
 */

const SequelizeAccountingRepository = require('../../infrastructure/sequelize/SequelizeAccountingRepository');
const GetTrialBalanceUseCase = require('../../application/use-cases/report/GetTrialBalanceUseCase');
const { trialBalanceQuerySchema, handleZodError } = require('../validators/accountingEntryValidators');

const accountingRepository = new SequelizeAccountingRepository();

/** `GET /api/accounting/trial-balance?year=&month=` — balancete do mês/ano informado, por conta. */
exports.get = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = trialBalanceQuerySchema.safeParse(req.query);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new GetTrialBalanceUseCase(accountingRepository);
    const result = await useCase.execute(parsed.data);

    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};
