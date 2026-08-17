import type { Request, Response, NextFunction } from 'express';

const SequelizeMobileInventoryRepository = require('../../infrastructure/sequelize/SequelizeMobileInventoryRepository');
const ScanItemUseCase = require('../../application/use-cases/ScanItemUseCase');
const BatchScanUseCase = require('../../application/use-cases/BatchScanUseCase');
const ListMobileInventoryMovementsUseCase = require('../../application/use-cases/ListMobileInventoryMovementsUseCase');
const { sequelize } = require('../../../../config/database');

/**
 * Controller enxuto do módulo `mobileInventory`. Delega toda a regra de
 * negócio aos use cases da camada de aplicação, mantendo o mesmo contrato
 * JSON e os mesmos 3 endpoints do controller anterior
 * (`server/src/controllers/mobileInventoryController.ts`). A transação
 * Sequelize (operação multi-tabela: `Product` + `InventoryMovement`) é
 * aberta/commitada/revertida aqui, mesma responsabilidade do controller
 * anterior.
 */
const mobileInventoryRepository = new SequelizeMobileInventoryRepository();

/** `POST /api/mobile-inventory/scan` — registra uma movimentação de estoque via scanner mobile. */
exports.scanItem = async (req: Request, res: Response, next: NextFunction) => {
  const t = await sequelize.transaction();
  try {
    const user = (req as any).user;
    const useCase = new ScanItemUseCase(mobileInventoryRepository);
    const result = await useCase.execute({ ...req.body, userId: user.id, transaction: t });
    await t.commit();
    res.json({ success: true, data: result });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/** `POST /api/mobile-inventory/batch` — registra em lote movimentações de estoque via scanner mobile. */
exports.batchScan = async (req: Request, res: Response, next: NextFunction) => {
  const t = await sequelize.transaction();
  try {
    const user = (req as any).user;
    const useCase = new BatchScanUseCase(mobileInventoryRepository);
    const result = await useCase.execute({ items: req.body.items, warehouse_code: req.body.warehouse_code, userId: user.id, transaction: t });
    await t.commit();
    res.json({ success: true, data: result });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/** `GET /api/mobile-inventory/movements` — lista movimentações de estoque (paginação). */
exports.listMovements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new ListMobileInventoryMovementsUseCase(mobileInventoryRepository);
    const { rows, total, page, limit, totalPages } = await useCase.execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) {
    next(error);
  }
};
