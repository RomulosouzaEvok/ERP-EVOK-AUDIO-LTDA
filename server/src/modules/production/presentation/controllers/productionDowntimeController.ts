/**
 * Controller HTTP de Paradas de Máquina/Centro de Trabalho (downtime).
 *
 * @module modules/production/presentation/controllers/productionDowntimeController
 */
import type { Request, Response, NextFunction } from 'express';
const { logAction }: any = require('../../../../services/auditLogService');
import SequelizeProductionDowntimeRepository = require('../../infrastructure/sequelize/SequelizeProductionDowntimeRepository');
import OpenProductionDowntimeUseCase = require('../../application/use-cases/OpenProductionDowntimeUseCase');
import FinishProductionDowntimeUseCase = require('../../application/use-cases/FinishProductionDowntimeUseCase');
import ListProductionDowntimesUseCase = require('../../application/use-cases/ListProductionDowntimesUseCase');
const {
  openProductionDowntimeSchema,
  finishProductionDowntimeSchema,
  handleZodError,
} = require('../validators/productionDowntimeValidators');

const downtimeRepository = new SequelizeProductionDowntimeRepository();

/**
 * Trata erros de domínio no envelope atual e delega erros internos.
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

/** `POST /api/production/downtimes` — abre uma parada. @param req - Request. @param res - Response. @param next - Next. @returns Promise<void>. */
export async function open(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const parsed = openProductionDowntimeSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const useCase = new OpenProductionDowntimeUseCase(downtimeRepository);
    const downtime = await useCase.execute({ ...parsed.data, created_by: user.id });
    logAction(req, {
      action: 'create',
      entityType: 'ProductionDowntime',
      entityId: downtime.id,
      entityDescription: `Parada #${downtime.id} — ${downtime.reason}`,
      newValues: { work_center_id: parsed.data.work_center_id, production_order_id: parsed.data.production_order_id ?? null, reason: parsed.data.reason },
      description: `Parada de producao aberta para o centro de trabalho #${parsed.data.work_center_id}`,
    });
    res.status(201).json({ success: true, data: downtime });
  } catch (error) { handleError(error, res, next); }
}

/** `PUT /api/production/downtimes/:id/finish` — encerra uma parada aberta. @param req - Request. @param res - Response. @param next - Next. @returns Promise<void>. */
export async function finish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = finishProductionDowntimeSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const useCase = new FinishProductionDowntimeUseCase(downtimeRepository);
    const downtime = await useCase.execute({ id: Number(req.params.id), finished_at: parsed.data.finished_at });
    logAction(req, {
      action: 'status_change',
      entityType: 'ProductionDowntime',
      entityId: downtime.id,
      entityDescription: `Parada #${downtime.id}`,
      oldValues: { finished_at: null },
      newValues: { finished_at: downtime.finished_at },
      description: `Parada de producao #${downtime.id} encerrada`,
    });
    res.json({ success: true, data: downtime });
  } catch (error) { handleError(error, res, next); }
}

/** `GET /api/production/downtimes` — lista paradas com filtros. @param req - Request. @param res - Response. @param next - Next. @returns Promise<void>. */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { work_center_id, from, to, open: openFilter, page, limit } = req.query;
    const useCase = new ListProductionDowntimesUseCase(downtimeRepository);
    const result = await useCase.execute({ work_center_id, from, to, open: openFilter, page, limit } as any);
    res.json({
      success: true,
      data: result.rows,
      pagination: { total: result.count, page: result.page, limit: result.limit, totalPages: result.totalPages },
    });
  } catch (error) { handleError(error, res, next); }
}
