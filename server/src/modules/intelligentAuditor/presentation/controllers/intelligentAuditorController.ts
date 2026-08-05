import type { Request, Response, NextFunction } from 'express';

const SequelizeIntelligentAuditorRepository = require('../../infrastructure/sequelize/SequelizeIntelligentAuditorRepository');
const AuditStockUseCase = require('../../application/use-cases/AuditStockUseCase');
const AuditSalesUseCase = require('../../application/use-cases/AuditSalesUseCase');
const AuditPurchasesUseCase = require('../../application/use-cases/AuditPurchasesUseCase');
const AuditFinancialUseCase = require('../../application/use-cases/AuditFinancialUseCase');

/**
 * Controller enxuto do módulo `intelligentAuditor`. Delega toda a
 * agregação de dados aos use cases da camada de aplicação, mantendo o
 * mesmo contrato JSON e os mesmos 4 endpoints do controller anterior
 * (`server/src/controllers/intelligentAuditorController.ts`).
 */
const intelligentAuditorRepository = new SequelizeIntelligentAuditorRepository();

/** `GET /api/auditor/stock` — audita consistência de estoque. */
exports.auditStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new AuditStockUseCase(intelligentAuditorRepository);
    const data = await useCase.execute();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/** `GET /api/auditor/sales` — audita consistência de vendas. */
exports.auditSales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new AuditSalesUseCase(intelligentAuditorRepository);
    const data = await useCase.execute();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/** `GET /api/auditor/purchases` — audita compras paradas. */
exports.auditPurchases = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new AuditPurchasesUseCase(intelligentAuditorRepository);
    const data = await useCase.execute();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/** `GET /api/auditor/financial` — audita consistência financeira. */
exports.auditFinancial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new AuditFinancialUseCase(intelligentAuditorRepository);
    const data = await useCase.execute();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
