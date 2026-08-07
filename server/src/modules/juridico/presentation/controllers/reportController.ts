/**
 * Controller do relatório financeiro sanitizado — `GET /api/jur/reports/financeiro`
 * (§8.2, RF-JUR-042/BR-JUR-050). Rota liberada a `authorizeModule('financeiro',
 * 'operate')` OU `authorizeModule('juridico', 'operate')` — checagem inline
 * no controller (mesmo padrão de checagem redundante rota+controller já
 * usado para as rotas cross-módulo de SST/TI).
 *
 * @module modules/juridico/presentation/controllers/reportController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeLegalCaseRepository = require('../../infrastructure/sequelize/SequelizeLegalCaseRepository');
const AccountPayableServiceAdapter = require('../../infrastructure/adapters/AccountPayableServiceAdapter');
const FinancialReportUseCase = require('../../application/use-cases/report/FinancialReportUseCase');

const legalCaseRepository = new SequelizeLegalCaseRepository();
const accountPayableService = new AccountPayableServiceAdapter();

/** `GET /api/jur/reports/financeiro` */
exports.financeiro = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const authorized = user?.role === 'admin' || user?.permissions?.financeiro || user?.permissions?.juridico;
    if (!authorized) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Acesso negado ao relatório financeiro jurídico.' } });
      return;
    }

    const data = await new FinancialReportUseCase(legalCaseRepository, accountPayableService).execute();
    res.json({ success: true, data });
  } catch (error) { next(error); }
};
