const { logAction } = require('../../../../services/auditLogService');
const SequelizeProductionOrderRepository = require('../../infrastructure/sequelize/SequelizeProductionOrderRepository');
const ListProductionOrdersUseCase = require('../../application/use-cases/ListProductionOrdersUseCase');
const GetProductionOrderByIdUseCase = require('../../application/use-cases/GetProductionOrderByIdUseCase');
const CreateProductionOrderUseCase = require('../../application/use-cases/CreateProductionOrderUseCase');
const UpdateProductionOrderUseCase = require('../../application/use-cases/UpdateProductionOrderUseCase');
const ChangeProductionOrderStatusUseCase = require('../../application/use-cases/ChangeProductionOrderStatusUseCase');
const RemoveProductionOrderUseCase = require('../../application/use-cases/RemoveProductionOrderUseCase');
const GetProductionReportUseCase = require('../../application/use-cases/GetProductionReportUseCase');

/**
 * Controller enxuto do módulo `production` (Ordem de Produção). Interpreta
 * `req`, delega toda a regra de negócio aos use cases da camada de
 * aplicação (que por sua vez reutilizam `BomService` e `InventoryService`
 * para o consumo/entrada de estoque) e devolve sempre o envelope padrão
 * `{ success: true, data, ... }` — mantendo exatamente o mesmo formato JSON
 * do controller legado (`server/src/controllers/productionOrderController.js`),
 * que permanece no repositório apenas como referência histórica e não está
 * mais registrado em nenhuma rota ativa (ver
 * `server/src/modules/production/README.md`).
 */
const productionOrderRepository = new SequelizeProductionOrderRepository();

/**
 * Responde erros de domínio (`AppError`, com `code`/`statusCode`) no
 * formato `{ success: false, error: message }`, igual ao controller
 * legado; demais erros são delegados ao `errorHandler` global via `next`.
 *
 * @param {Error} error
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
function handleError(error, res, next) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ success: false, error: error.message });
  }
  next(error);
}

/**
 * `GET /api/production-orders` — lista OPs com filtros, paginação e summary.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.list = async (req, res, next) => {
  try {
    const { page, limit, status, product_id, start_date, end_date, priority } = req.query;
    const useCase = new ListProductionOrdersUseCase(productionOrderRepository);
    const { rows, count, page: p, limit: l, totalPages, summary } = await useCase.execute({
      page, limit, status, product_id, priority, start_date, end_date
    });
    res.json({
      success: true,
      data: rows,
      summary,
      pagination: { total: count, page: p, limit: l, totalPages }
    });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `GET /api/production-orders/:id` — busca uma OP por id.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getById = async (req, res, next) => {
  try {
    const useCase = new GetProductionOrderByIdUseCase(productionOrderRepository);
    const order = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: order });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `POST /api/production-orders` — cria uma nova ordem de produção.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.create = async (req, res, next) => {
  try {
    const { product_id, quantity, priority, due_date, responsible_id, sales_order_id, notes } = req.body;
    const useCase = new CreateProductionOrderUseCase(productionOrderRepository);
    const order = await useCase.execute({
      product_id, quantity, priority, due_date, responsible_id, sales_order_id, notes, created_by: req.user.id
    });

    // Log de auditoria feito após o commit (dentro do use case) para não segurar locks de banco.
    logAction(req, {
      action: 'create',
      entityType: 'ProductionOrder',
      entityId: order.id,
      entityDescription: order.order_number,
      newValues: { product_id, quantity, status: 'planned' },
      description: `Ordem de produção ${order.order_number} criada`
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `PUT /api/production-orders/:id` — atualiza campos não-status de uma OP.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.update = async (req, res, next) => {
  try {
    const useCase = new UpdateProductionOrderUseCase(productionOrderRepository);
    const { before, updateData, order } = await useCase.execute({ id: req.params.id, data: req.body });

    const oldValues = {};
    for (const field of Object.keys(updateData)) oldValues[field] = before[field];

    logAction(req, {
      action: 'update',
      entityType: 'ProductionOrder',
      entityId: order.id,
      entityDescription: order.order_number,
      oldValues,
      newValues: updateData,
      description: `Ordem de produção ${order.order_number} atualizada`
    });

    res.json({ success: true, data: order });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `PUT /api/production-orders/:id/status` — muda o status de uma OP,
 * dirigido pela máquina de estados única (ver
 * `ChangeProductionOrderStatusUseCase`).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, quantity_produced } = req.body;
    const useCase = new ChangeProductionOrderStatusUseCase(productionOrderRepository);
    const { previousStatus, orderNumber, order, updateData } = await useCase.execute({
      id: req.params.id, status, quantity_produced, user_id: req.user.id
    });

    // Log de auditoria feito após o commit (dentro do use case) para não segurar locks de banco.
    logAction(req, {
      action: 'status_change',
      entityType: 'ProductionOrder',
      entityId: order.id,
      entityDescription: orderNumber,
      oldValues: { status: previousStatus },
      newValues: { status, ...(updateData.quantity_produced !== undefined ? { quantity_produced: updateData.quantity_produced } : {}) },
      description: `Ordem de produção ${orderNumber}: status alterado de ${previousStatus} para ${status}`
    });

    res.json({ success: true, data: order });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `DELETE /api/production-orders/:id` — remove uma OP (apenas `planned`, `released`, `paused` ou `canceled`).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.remove = async (req, res, next) => {
  try {
    const useCase = new RemoveProductionOrderUseCase(productionOrderRepository);
    const order = await useCase.execute({ id: req.params.id });

    logAction(req, {
      action: 'delete',
      entityType: 'ProductionOrder',
      entityId: order.id,
      entityDescription: order.order_number,
      oldValues: { status: order.status },
      description: `Ordem de produção ${order.order_number} removida`
    });

    res.json({ success: true, data: { message: 'Ordem de produção removida com sucesso' } });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `GET /api/production-orders/report` — relatório de produção de um período.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getProductionReport = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const useCase = new GetProductionReportUseCase(productionOrderRepository);
    const result = await useCase.execute({ start_date, end_date });
    res.json({ success: true, data: result });
  } catch (error) { handleError(error, res, next); }
};
