import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP da Posição de Caixa (`/api/treasury/cash-position`).
 *
 * @module modules/treasury/presentation/controllers/cashPositionController
 */

const SequelizeTreasuryRepository = require('../../infrastructure/sequelize/SequelizeTreasuryRepository');
const GetCashPositionUseCase = require('../../application/use-cases/report/GetCashPositionUseCase');

const treasuryRepository = new SequelizeTreasuryRepository();

/** `GET /api/treasury/cash-position` — posição de caixa consolidada (somente leitura). */
exports.get = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetCashPositionUseCase(treasuryRepository);
    const report = await useCase.execute();
    res.json({ success: true, data: report });
  } catch (error) { next(error); }
};
