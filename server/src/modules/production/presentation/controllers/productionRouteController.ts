/**
 * Controller HTTP do Roteiro de Producao (gap G5).
 *
 * Camada fina: interpreta `req`, abre/fecha a transacao e delega toda a regra
 * aos use cases. Envelope de resposta padrao do projeto
 * (`{ success: true, data, ... }`).
 *
 * ANTI-SPOOFING (P0): `created_by` e `approved_by` vem SEMPRE de
 * `req.user.id` (JWT) — nunca do body, que nem sequer aceita esses campos
 * (schemas `.strict()`).
 *
 * @module modules/production/presentation/controllers/productionRouteController
 */

import type { Request, Response, NextFunction } from 'express';

const { sequelize } = require('../../../../config/database');
const { logAction } = require('../../../../services/auditLogService');
const SequelizeProductionRouteRepository = require('../../infrastructure/sequelize/SequelizeProductionRouteRepository');
const ListProductionRoutesUseCase = require('../../application/use-cases/ListProductionRoutesUseCase');
const GetProductionRouteByIdUseCase = require('../../application/use-cases/GetProductionRouteByIdUseCase');
const CreateProductionRouteUseCase = require('../../application/use-cases/CreateProductionRouteUseCase');
const UpdateProductionRouteUseCase = require('../../application/use-cases/UpdateProductionRouteUseCase');
const ReplaceProductionRouteStepsUseCase = require('../../application/use-cases/ReplaceProductionRouteStepsUseCase');
const ActivateProductionRouteUseCase = require('../../application/use-cases/ActivateProductionRouteUseCase');
const InactivateProductionRouteUseCase = require('../../application/use-cases/InactivateProductionRouteUseCase');
const ReviseProductionRouteUseCase = require('../../application/use-cases/ReviseProductionRouteUseCase');
const RemoveProductionRouteUseCase = require('../../application/use-cases/RemoveProductionRouteUseCase');
const {
  createProductionRouteSchema,
  updateProductionRouteSchema,
  replaceProductionRouteStepsSchema,
  reviseProductionRouteSchema,
  listProductionRouteQuerySchema,
  handleZodError,
} = require('../validators/productionRouteValidators');

const productionRouteRepository = new SequelizeProductionRouteRepository();

/**
 * Faz rollback apenas se a transacao ainda estiver aberta (evita
 * `Transaction cannot be rolled back because it has been finished`).
 *
 * @param transaction - Transacao Sequelize.
 */
async function rollbackIfPending(transaction: any): Promise<void> {
  if (transaction && !transaction.finished) {
    await transaction.rollback();
  }
}

/**
 * Id do usuario logado (JWT). Unica origem aceita para `created_by`/`approved_by`.
 *
 * @param req - Requisicao Express autenticada.
 * @returns Id do usuario ou `null`.
 */
function currentUserId(req: Request): number | null {
  const user = (req as any).user;
  return user?.id ?? null;
}

/** `GET /api/production/routes` — lista paginada de roteiros. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = listProductionRouteQuerySchema.safeParse(req.query);
    if (!parsed.success) handleZodError(parsed.error);

    const query = parsed.data;
    const useCase = new ListProductionRoutesUseCase(productionRouteRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({
      ...query,
      offset: (query.page - 1) * query.limit,
    });

    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error) {
    next(error);
  }
};

/** `GET /api/production/routes/:id` — roteiro com etapas e totais derivados. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetProductionRouteByIdUseCase(productionRouteRepository);
    const route = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: route });
  } catch (error) {
    next(error);
  }
};

/** `POST /api/production/routes` — cria roteiro em rascunho (com etapas opcionais). */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  const t = await sequelize.transaction();
  try {
    const parsed = createProductionRouteSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateProductionRouteUseCase(productionRouteRepository);
    const route = await useCase.execute({
      ...parsed.data,
      created_by: currentUserId(req),
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'create',
      entityType: 'ProductionRoute',
      entityId: route?.id,
      entityDescription: route?.route_code,
      newValues: { route_code: route?.route_code, revision: route?.revision, product_id: route?.product_id },
      description: `Roteiro de producao ${route?.route_code} criado (rascunho)`,
    });

    res.status(201).json({ success: true, data: route });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/** `PUT /api/production/routes/:id` — atualiza cabecalho (somente rascunho). */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  const t = await sequelize.transaction();
  try {
    const parsed = updateProductionRouteSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateProductionRouteUseCase(productionRouteRepository);
    const route = await useCase.execute({ id: Number(req.params.id), ...parsed.data, transaction: t });

    await t.commit();

    logAction(req, {
      action: 'update',
      entityType: 'ProductionRoute',
      entityId: route?.id,
      entityDescription: route?.route_code,
      newValues: parsed.data,
      description: `Roteiro de producao ${route?.route_code} atualizado`,
    });

    res.json({ success: true, data: route });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/** `PUT /api/production/routes/:id/steps` — substitui todas as etapas (somente rascunho). */
exports.replaceSteps = async (req: Request, res: Response, next: NextFunction) => {
  const t = await sequelize.transaction();
  try {
    const parsed = replaceProductionRouteStepsSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new ReplaceProductionRouteStepsUseCase(productionRouteRepository);
    const steps = await useCase.execute({ id: Number(req.params.id), steps: parsed.data.steps, transaction: t });

    await t.commit();

    logAction(req, {
      action: 'update_steps',
      entityType: 'ProductionRoute',
      entityId: Number(req.params.id),
      newValues: { steps_count: parsed.data.steps.length },
      description: `Etapas do roteiro de producao ${req.params.id} substituidas`,
    });

    res.json({ success: true, data: steps });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/** `PATCH /api/production/routes/:id/activate` — libera o roteiro e congela o conteudo. */
exports.activate = async (req: Request, res: Response, next: NextFunction) => {
  const t = await sequelize.transaction();
  try {
    const useCase = new ActivateProductionRouteUseCase(productionRouteRepository);
    const { route, superseded_route_id } = await useCase.execute({
      id: Number(req.params.id),
      approved_by: currentUserId(req),
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'activate',
      entityType: 'ProductionRoute',
      entityId: route?.id,
      entityDescription: route?.route_code,
      newValues: { status: 'active', superseded_route_id },
      description: `Roteiro de producao ${route?.route_code} liberado (revisao ${route?.revision})`,
    });

    res.json({ success: true, data: route, meta: { superseded_route_id } });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/** `PATCH /api/production/routes/:id/inactivate` — aposenta um roteiro ativo. */
exports.inactivate = async (req: Request, res: Response, next: NextFunction) => {
  const t = await sequelize.transaction();
  try {
    const useCase = new InactivateProductionRouteUseCase(productionRouteRepository);
    const route = await useCase.execute({ id: Number(req.params.id), transaction: t });

    await t.commit();

    logAction(req, {
      action: 'inactivate',
      entityType: 'ProductionRoute',
      entityId: route?.id,
      entityDescription: route?.route_code,
      newValues: { status: 'inactive' },
      description: `Roteiro de producao ${route?.route_code} inativado`,
    });

    res.json({ success: true, data: route });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/** `POST /api/production/routes/:id/revise` — clona o roteiro em uma nova revisao rascunho. */
exports.revise = async (req: Request, res: Response, next: NextFunction) => {
  const t = await sequelize.transaction();
  try {
    const parsed = reviseProductionRouteSchema.safeParse(req.body ?? {});
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new ReviseProductionRouteUseCase(productionRouteRepository);
    const draft = await useCase.execute({
      id: Number(req.params.id),
      ...parsed.data,
      created_by: currentUserId(req),
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'revise',
      entityType: 'ProductionRoute',
      entityId: draft?.id,
      entityDescription: draft?.route_code,
      newValues: { source_route_id: Number(req.params.id), revision: draft?.revision },
      description: `Nova revisao ${draft?.revision} criada a partir do roteiro ${req.params.id}`,
    });

    res.status(201).json({ success: true, data: draft });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/** `DELETE /api/production/routes/:id` — remove rascunho nunca usado. */
exports.remove = async (req: Request, res: Response, next: NextFunction) => {
  const t = await sequelize.transaction();
  try {
    const useCase = new RemoveProductionRouteUseCase(productionRouteRepository);
    const result = await useCase.execute({ id: Number(req.params.id), transaction: t });

    await t.commit();

    logAction(req, {
      action: 'delete',
      entityType: 'ProductionRoute',
      entityId: result.id,
      description: `Roteiro de producao ${result.id} (rascunho) removido`,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};
