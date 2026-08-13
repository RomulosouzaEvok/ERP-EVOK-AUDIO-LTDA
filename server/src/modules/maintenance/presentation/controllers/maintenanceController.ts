import type { Request, Response, NextFunction } from 'express';

const { logAction } = require('../../../../services/auditLogService');
const SequelizeMaintenanceRepository = require('../../infrastructure/sequelize/SequelizeMaintenanceRepository');
const ListMaintenanceOrdersUseCase = require('../../application/use-cases/ListMaintenanceOrdersUseCase');
const GetMaintenanceOrderByIdUseCase = require('../../application/use-cases/GetMaintenanceOrderByIdUseCase');
const CreateMaintenanceOrderUseCase = require('../../application/use-cases/CreateMaintenanceOrderUseCase');
const UpdateMaintenanceOrderUseCase = require('../../application/use-cases/UpdateMaintenanceOrderUseCase');
const CancelMaintenanceOrderUseCase = require('../../application/use-cases/CancelMaintenanceOrderUseCase');

/**
 * Controller enxuto do módulo `maintenance`. Delega toda a regra de negócio
 * aos use cases da camada de aplicação, mantendo o mesmo contrato JSON e os
 * mesmos 5 endpoints do controller anterior
 * (`server/src/controllers/maintenanceController.ts`).
 */
const maintenanceRepository = new SequelizeMaintenanceRepository();

/** `GET /api/maintenance` — lista ordens de manutenção (filtros e paginação). */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new ListMaintenanceOrdersUseCase(maintenanceRepository);
    const { rows, total, page, limit, totalPages } = await useCase.execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) {
    next(error);
  }
};

/** `GET /api/maintenance/:id` — busca uma ordem de manutenção pelo id. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetMaintenanceOrderByIdUseCase(maintenanceRepository);
    const order = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

/** `POST /api/maintenance` — cria uma nova ordem de manutenção. */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new CreateMaintenanceOrderUseCase(maintenanceRepository);
    const order = await useCase.execute({ ...req.body, reportedBy: (req as any).user.id });

    logAction(req, {
      action: 'create',
      entityType: 'MaintenanceOrder',
      entityId: order?.id,
      entityDescription: order?.order_number ?? order?.description,
      newValues: order,
      description: `Ordem de manutenção ${order?.order_number ?? order?.id} criada`,
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

/** `PUT /api/maintenance/:id` — atualiza uma ordem de manutenção existente. */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new UpdateMaintenanceOrderUseCase(maintenanceRepository);
    const order = await useCase.execute({ id: req.params.id, body: req.body });

    logAction(req, {
      action: 'update',
      entityType: 'MaintenanceOrder',
      entityId: order?.id,
      newValues: req.body,
      description: `Ordem de manutenção ${order?.order_number ?? order?.id} atualizada`,
    });

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

/** `DELETE /api/maintenance/:id` — cancela uma ordem de manutenção. */
exports.remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new CancelMaintenanceOrderUseCase(maintenanceRepository);
    const result = await useCase.execute({ id: req.params.id });

    logAction(req, {
      action: 'cancel',
      entityType: 'MaintenanceOrder',
      entityId: Number(req.params.id),
      description: `Ordem de manutenção ${req.params.id} cancelada`,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
