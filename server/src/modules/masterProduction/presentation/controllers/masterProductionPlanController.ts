import type { Request, Response, NextFunction } from 'express';

/**
 * Controller do **Plano Mestre de Produção (MPS, G17)**, montado sob
 * `/api/production/master-plans` em `server/app.ts`.
 *
 * ⚠️ `planner_id`, `firmed_by`, `released_by`, `canceled_by` e `decided_by`
 * **nunca** vêm do body: são sempre `req.user.id` (JWT). Anti-spoofing de
 * identidade é regra P0 do projeto (remediação 3.1 de 2026-08-02) e, num
 * registro cuja razão de existir é *quem decidiu produzir o quê*, aceitar o
 * planejador do payload esvaziaria a entrega inteira.
 *
 * @module modules/masterProduction/presentation/controllers/masterProductionPlanController
 */

const SequelizeMasterProductionPlanRepository = require('../../infrastructure/sequelize/SequelizeMasterProductionPlanRepository');
const SequelizeProductionOrderRepository = require('../../../production/infrastructure/sequelize/SequelizeProductionOrderRepository');
const CreateMasterProductionPlanUseCase = require('../../application/use-cases/CreateMasterProductionPlanUseCase');
const ListMasterProductionPlansUseCase = require('../../application/use-cases/ListMasterProductionPlansUseCase');
const GetMasterProductionPlanUseCase = require('../../application/use-cases/GetMasterProductionPlanUseCase');
const DecideMasterProductionPlanLineUseCase = require('../../application/use-cases/DecideMasterProductionPlanLineUseCase');
const ChangeMasterProductionPlanStatusUseCase = require('../../application/use-cases/ChangeMasterProductionPlanStatusUseCase');
const ReleaseMasterProductionPlanUseCase = require('../../application/use-cases/ReleaseMasterProductionPlanUseCase');
const { logAction } = require('../../../../services/auditLogService');

const planRepository = new SequelizeMasterProductionPlanRepository();
const productionOrderRepository = new SequelizeProductionOrderRepository();

/** `POST /api/production/master-plans` — consolida a demanda e abre o plano. */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new CreateMasterProductionPlanUseCase(planRepository);
    const result = await useCase.execute({ ...req.body, plannerId: (req as any).user.id });

    logAction(req, {
      action: 'create',
      entityType: 'MasterProductionPlan',
      entityId: result.plan.id,
      entityDescription: `Plano mestre ${result.plan.plan_number}`,
      newValues: {
        horizon_start: result.plan.horizon_start,
        horizon_end: result.plan.horizon_end,
        lines: result.lines.length,
      },
      description: `Plano mestre ${result.plan.plan_number} consolidado com ${result.lines.length} linha(s)`
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
};

/** `GET /api/production/master-plans` — lista planos (filtro `status`). */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new ListMasterProductionPlansUseCase(planRepository);
    const { rows, total, page, limit, totalPages } = await useCase.execute(req.query as any);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) { next(error); }
};

/** `GET /api/production/master-plans/:id` — plano com linhas e resumo. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetMasterProductionPlanUseCase(planRepository);
    const plan = await useCase.execute({ planId: req.params.id });
    res.json({ success: true, data: plan });
  } catch (error) { next(error); }
};

/** `PATCH /api/production/master-plans/:id/lines/:lineId` — decisão do planejador. */
exports.decideLine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new DecideMasterProductionPlanLineUseCase(planRepository);
    const line = await useCase.execute({
      ...req.body,
      planId: req.params.id,
      lineId: req.params.lineId,
      decidedBy: (req as any).user.id,
    });

    logAction(req, {
      action: 'update',
      entityType: 'MasterProductionPlanLine',
      entityId: line.id,
      entityDescription: `Linha ${line.id} do plano mestre #${req.params.id}`,
      newValues: { planned_quantity: line.planned_quantity, status: line.status },
      description: `Decisao do planejador na linha ${line.id}: ${line.status} (${line.planned_quantity})`
    });

    res.json({ success: true, data: line });
  } catch (error) { next(error); }
};

/** `POST /api/production/master-plans/:id/firm` — congela a decisão. */
exports.firm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new ChangeMasterProductionPlanStatusUseCase(planRepository);
    const plan = await useCase.execute({
      planId: req.params.id,
      targetStatus: 'firm',
      userId: (req as any).user.id,
    });

    logAction(req, {
      action: 'update',
      entityType: 'MasterProductionPlan',
      entityId: plan.id,
      entityDescription: `Plano mestre ${plan.plan_number}`,
      newValues: { status: plan.status },
      description: `Plano mestre ${plan.plan_number} firmado`
    });

    res.json({ success: true, data: plan });
  } catch (error) { next(error); }
};

/** `POST /api/production/master-plans/:id/cancel` — cancela o plano. */
exports.cancel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new ChangeMasterProductionPlanStatusUseCase(planRepository);
    const plan = await useCase.execute({
      planId: req.params.id,
      targetStatus: 'canceled',
      reason: req.body?.reason,
      userId: (req as any).user.id,
    });

    logAction(req, {
      action: 'update',
      entityType: 'MasterProductionPlan',
      entityId: plan.id,
      entityDescription: `Plano mestre ${plan.plan_number}`,
      newValues: { status: plan.status },
      description: `Plano mestre ${plan.plan_number} cancelado`
    });

    res.json({ success: true, data: plan });
  } catch (error) { next(error); }
};

/** `POST /api/production/master-plans/:id/release` — gera as OPs do plano firmado. */
exports.release = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new ReleaseMasterProductionPlanUseCase(planRepository, productionOrderRepository);
    const result = await useCase.execute({ planId: req.params.id, userId: (req as any).user.id });

    logAction(req, {
      action: 'update',
      entityType: 'MasterProductionPlan',
      entityId: result.plan.id,
      entityDescription: `Plano mestre ${result.plan.plan_number}`,
      newValues: {
        status: result.plan.status,
        production_orders: result.production_orders.map((order: any) => order.order_number),
      },
      description: `Plano mestre ${result.plan.plan_number} liberado: ${result.production_orders.length} OP(s) gerada(s)`
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
};
