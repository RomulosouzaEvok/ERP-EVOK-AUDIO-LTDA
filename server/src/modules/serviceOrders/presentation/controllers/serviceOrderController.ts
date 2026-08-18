import type { Request, Response, NextFunction } from 'express';

const SequelizeServiceOrdersRepository = require('../../infrastructure/sequelize/SequelizeServiceOrdersRepository');
const ListServiceOrdersUseCase = require('../../application/use-cases/ListServiceOrdersUseCase');
const GetServiceOrderByIdUseCase = require('../../application/use-cases/GetServiceOrderByIdUseCase');
const CreateServiceOrderUseCase = require('../../application/use-cases/CreateServiceOrderUseCase');
const UpdateServiceOrderUseCase = require('../../application/use-cases/UpdateServiceOrderUseCase');
const CancelServiceOrderUseCase = require('../../application/use-cases/CancelServiceOrderUseCase');
const { logAction } = require('../../../../services/auditLogService');

/**
 * Controller enxuto do módulo `serviceOrders`. Delega toda a regra de
 * negócio aos use cases da camada de aplicação, mantendo o mesmo contrato
 * JSON e os mesmos 5 endpoints do controller anterior
 * (`server/src/controllers/serviceOrderController.ts`).
 */
const serviceOrdersRepository = new SequelizeServiceOrdersRepository();

/** `GET /api/service-orders` — lista ordens de serviço (filtros e paginação). */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new ListServiceOrdersUseCase(serviceOrdersRepository);
    const { rows, total, page, limit, totalPages } = await useCase.execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) {
    next(error);
  }
};

/** `GET /api/service-orders/:id` — busca uma ordem de serviço pelo id. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetServiceOrderByIdUseCase(serviceOrdersRepository);
    const order = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

/** `POST /api/service-orders` — cria uma nova ordem de serviço. */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new CreateServiceOrderUseCase(serviceOrdersRepository);
    const order = await useCase.execute(req.body);

    logAction(req, {
      action: 'create',
      entityType: 'ServiceOrder',
      entityId: order.id,
      entityDescription: order.order_number,
      newValues: {
        order_number: order.order_number,
        client_id: order.client_id,
        product_id: order.product_id,
        status: order.status,
        priority: order.priority,
      },
      description: `Ordem de serviço ${order.order_number} criada`,
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

/** `PUT /api/service-orders/:id` — atualiza uma ordem de serviço existente. */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const before = await serviceOrdersRepository.findById(Number(req.params.id));
    const useCase = new UpdateServiceOrderUseCase(serviceOrdersRepository);
    const order = await useCase.execute({ id: req.params.id, body: req.body });

    logAction(req, {
      action: 'update',
      entityType: 'ServiceOrder',
      entityId: order.id,
      entityDescription: order.order_number,
      oldValues: {
        status: before.status,
        priority: before.priority,
        technician_id: before.technician_id,
        responsible_id: before.responsible_id,
      },
      newValues: {
        status: order.status,
        priority: order.priority,
        technician_id: order.technician_id,
        responsible_id: order.responsible_id,
      },
      description: `Ordem de serviço ${order.order_number} atualizada`,
    });

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

/** `DELETE /api/service-orders/:id` — cancela uma ordem de serviço. */
exports.remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const before = await serviceOrdersRepository.findById(Number(req.params.id));
    const useCase = new CancelServiceOrderUseCase(serviceOrdersRepository);
    const result = await useCase.execute({ id: req.params.id });

    logAction(req, {
      action: 'soft_delete',
      entityType: 'ServiceOrder',
      entityId: before.id,
      entityDescription: before.order_number,
      oldValues: { status: before.status },
      newValues: { status: 'canceled' },
      description: `Ordem de serviço ${before.order_number} cancelada`,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
