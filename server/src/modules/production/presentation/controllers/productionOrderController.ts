/**
 * Controller HTTP do modulo production.
 *
 * @module modules/production/presentation/controllers/productionOrderController
 */

import type { Request, Response, NextFunction } from 'express';
const { logAction }: any = require('../../../../services/auditLogService');
import SequelizeProductionOrderRepository = require('../../infrastructure/sequelize/SequelizeProductionOrderRepository');
import ListProductionOrdersUseCase = require('../../application/use-cases/ListProductionOrdersUseCase');
import GetProductionOrderByIdUseCase = require('../../application/use-cases/GetProductionOrderByIdUseCase');
import CreateProductionOrderUseCase = require('../../application/use-cases/CreateProductionOrderUseCase');
import UpdateProductionOrderUseCase = require('../../application/use-cases/UpdateProductionOrderUseCase');
import ChangeProductionOrderStatusUseCase = require('../../application/use-cases/ChangeProductionOrderStatusUseCase');
import RemoveProductionOrderUseCase = require('../../application/use-cases/RemoveProductionOrderUseCase');
import GetProductionReportUseCase = require('../../application/use-cases/GetProductionReportUseCase');
import ListProductionTrackingUseCase = require('../../application/use-cases/ListProductionTrackingUseCase');
import CreateProductionTrackingUseCase = require('../../application/use-cases/CreateProductionTrackingUseCase');
import StartProductionTrackingUseCase = require('../../application/use-cases/StartProductionTrackingUseCase');
import CompleteProductionTrackingUseCase = require('../../application/use-cases/CompleteProductionTrackingUseCase');
const {
  createProductionOrderSchema,
  updateProductionOrderSchema,
  updateProductionOrderStatusSchema,
  handleZodError
} = require('../validators/productionValidators');

const productionOrderRepository = new SequelizeProductionOrderRepository();

/**
 * Trata erros de dominio no envelope atual e delega erros internos.
 *
 * @param error - Erro capturado.
 * @param res - Response Express.
 * @param next - Next function Express.
 * @returns void.
 */
function handleError(error: any, res: Response, next: NextFunction): void {
  if (error.statusCode) {
    res.status(error.statusCode).json({ success: false, error: error.message });
    return;
  }
  next(error);
}

/** @param req - Request. @param res - Response. @param next - Next. @returns Promise<void>. */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, status, product_id, start_date, end_date, priority } = req.query;
    const useCase = new ListProductionOrdersUseCase(productionOrderRepository);
    const result = await useCase.execute({ page, limit, status, product_id: product_id as any, priority, start_date, end_date } as any);
    res.json({
      success: true,
      data: result.rows,
      summary: result.summary,
      pagination: { total: result.count, page: result.page, limit: result.limit, totalPages: result.totalPages }
    });
  } catch (error) { handleError(error, res, next); }
}

/** @param req - Request. @param res - Response. @param next - Next. @returns Promise<void>. */
export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const useCase = new GetProductionOrderByIdUseCase(productionOrderRepository);
    const order = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: order });
  } catch (error) { handleError(error, res, next); }
}

/** @param req - Request. @param res - Response. @param next - Next. @returns Promise<void>. */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const parsed = createProductionOrderSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const useCase = new CreateProductionOrderUseCase(productionOrderRepository);
    const order = await useCase.execute({ ...parsed.data, created_by: user.id });
    logAction(req, {
      action: 'create',
      entityType: 'ProductionOrder',
      entityId: order.id,
      entityDescription: order.order_number,
      newValues: { product_id: req.body.product_id, quantity: req.body.quantity, status: 'planned' },
      description: `Ordem de producao ${order.order_number} criada`
    });
    res.status(201).json({ success: true, data: order });
  } catch (error) { handleError(error, res, next); }
}

/** @param req - Request. @param res - Response. @param next - Next. @returns Promise<void>. */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = updateProductionOrderSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const useCase = new UpdateProductionOrderUseCase(productionOrderRepository);
    const { before, updateData, order } = await useCase.execute({ id: Number(req.params.id), data: parsed.data });
    const oldValues: Record<string, unknown> = {};
    for (const field of Object.keys(updateData)) oldValues[field] = before[field];
    logAction(req, {
      action: 'update',
      entityType: 'ProductionOrder',
      entityId: order.id,
      entityDescription: order.order_number,
      oldValues,
      newValues: updateData,
      description: `Ordem de producao ${order.order_number} atualizada`
    });
    res.json({ success: true, data: order });
  } catch (error) { handleError(error, res, next); }
}

/** @param req - Request. @param res - Response. @param next - Next. @returns Promise<void>. */
export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const parsed = updateProductionOrderStatusSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const useCase = new ChangeProductionOrderStatusUseCase(productionOrderRepository);
    const { previousStatus, orderNumber, order, updateData } = await useCase.execute({
      id: Number(req.params.id),
      status: parsed.data.status,
      quantity_produced: parsed.data.quantity_produced,
      quantity_scrapped: parsed.data.quantity_scrapped,
      scrap_reason: parsed.data.scrap_reason,
      allow_overproduction: parsed.data.allow_overproduction,
      lot_consumptions: parsed.data.lot_consumptions,
      finished_lot_number: parsed.data.finished_lot_number,
      serial_numbers: parsed.data.serial_numbers,
      user_id: user.id
    });
    logAction(req, {
      action: 'status_change',
      entityType: 'ProductionOrder',
      entityId: order.id,
      entityDescription: orderNumber,
      oldValues: { status: previousStatus },
      newValues: {
        status: parsed.data.status,
        ...(updateData.quantity_produced !== undefined ? { quantity_produced: updateData.quantity_produced } : {}),
        ...(updateData.quantity_scrapped !== undefined ? { quantity_scrapped: updateData.quantity_scrapped } : {}),
        ...(updateData.scrap_reason !== undefined && updateData.scrap_reason !== null ? { scrap_reason: updateData.scrap_reason } : {})
      },
      description: `Ordem de producao ${orderNumber}: status alterado de ${previousStatus} para ${parsed.data.status}`
    });
    res.json({ success: true, data: order });
  } catch (error) { handleError(error, res, next); }
}

/** @param req - Request. @param res - Response. @param next - Next. @returns Promise<void>. */
export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const useCase = new RemoveProductionOrderUseCase(productionOrderRepository);
    const order = await useCase.execute({ id: Number(req.params.id) });
    logAction(req, {
      action: 'delete',
      entityType: 'ProductionOrder',
      entityId: order.id,
      entityDescription: order.order_number,
      oldValues: { status: order.status },
      description: `Ordem de producao ${order.order_number} removida`
    });
    res.json({ success: true, data: { message: 'Ordem de producao removida com sucesso' } });
  } catch (error) { handleError(error, res, next); }
}

/** @param req - Request. @param res - Response. @param next - Next. @returns Promise<void>. */
export async function getProductionReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const useCase = new GetProductionReportUseCase(productionOrderRepository);
    const result = await useCase.execute({ start_date: req.query.start_date as string, end_date: req.query.end_date as string });
    res.json({ success: true, data: result });
  } catch (error) { handleError(error, res, next); }
}

/** @param req - Request. @param res - Response. @param next - Next. @returns Promise<void>. */
export async function listTracking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const useCase = new ListProductionTrackingUseCase(productionOrderRepository);
    const tracking = await useCase.execute({ production_order_id: Number(req.params.id) });
    res.json({ success: true, data: tracking });
  } catch (error) { handleError(error, res, next); }
}

/** @param req - Request. @param res - Response. @param next - Next. @returns Promise<void>. */
export async function createTracking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const useCase = new CreateProductionTrackingUseCase(productionOrderRepository);
    const tracking = await useCase.execute({ production_order_id: Number(req.params.id), ...req.body });
    logAction(req, {
      action: 'create',
      entityType: 'ProductionOrderTracking',
      entityId: tracking.id,
      entityDescription: `OP #${req.params.id} etapa ${tracking.sequence}`,
      newValues: { production_order_id: req.params.id, sequence: tracking.sequence, status: tracking.status },
      description: `Apontamento de etapa criado para OP #${req.params.id}`
    });
    res.status(201).json({ success: true, data: tracking });
  } catch (error) { handleError(error, res, next); }
}

/** @param req - Request. @param res - Response. @param next - Next. @returns Promise<void>. */
export async function startTracking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const useCase = new StartProductionTrackingUseCase(productionOrderRepository);
    const tracking = await useCase.execute({ tracking_id: Number(req.params.trackingId), operator_id: req.body.operator_id });
    logAction(req, {
      action: 'status_change',
      entityType: 'ProductionOrderTracking',
      entityId: tracking.id,
      entityDescription: `Etapa #${tracking.id}`,
      oldValues: { status: 'pending' },
      newValues: { status: 'in_progress', operator_id: req.body.operator_id },
      description: `Etapa de producao #${tracking.id} iniciada`
    });
    res.json({ success: true, data: tracking });
  } catch (error) { handleError(error, res, next); }
}

/** @param req - Request. @param res - Response. @param next - Next. @returns Promise<void>. */
export async function completeTracking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const useCase = new CompleteProductionTrackingUseCase(productionOrderRepository);
    const tracking = await useCase.execute({ tracking_id: Number(req.params.trackingId), ...req.body });
    logAction(req, {
      action: 'status_change',
      entityType: 'ProductionOrderTracking',
      entityId: tracking.id,
      entityDescription: `Etapa #${tracking.id}`,
      oldValues: { status: 'in_progress' },
      newValues: { status: 'completed', quantity_good: req.body.quantity_good, quantity_scrapped: req.body.quantity_scrapped },
      description: `Etapa de producao #${tracking.id} concluida`
    });
    res.json({ success: true, data: tracking });
  } catch (error) { handleError(error, res, next); }
}
