const { sequelize } = require('../../../../config/database');
const { logAction } = require('../../../../services/auditLogService');
const SequelizeInventoryRepository = require('../../infrastructure/sequelize/SequelizeInventoryRepository');
const ListInventoryMovementsUseCase = require('../../application/use-cases/ListInventoryMovementsUseCase');
const GetInventoryMovementByIdUseCase = require('../../application/use-cases/GetInventoryMovementByIdUseCase');
const CreateInventoryMovementUseCase = require('../../application/use-cases/CreateInventoryMovementUseCase');
const GetStockReportUseCase = require('../../application/use-cases/GetStockReportUseCase');
const ListLowStockUseCase = require('../../application/use-cases/ListLowStockUseCase');
const { createInventoryMovementSchema, handleZodError } = require('../validators/inventoryValidators');

/**
 * Controller enxuto do módulo `inventory`. Interpreta `req`, delega toda a
 * regra de negócio aos use cases da camada de aplicação (que por sua vez
 * delegam a alteração real de `Product.quantity` ao já existente
 * `InventoryService`) e devolve sempre o envelope padrão
 * `{ success: true, data, ... }` — mantendo exatamente o mesmo formato JSON
 * do controller anterior (`server/src/controllers/inventoryController.ts`),
 * que permanece no repositório apenas como referência histórica e não está
 * mais registrado em nenhuma rota ativa (ver
 * `server/src/modules/inventory/README.md`).
 */
const inventoryRepository = new SequelizeInventoryRepository();

/**
 * `GET /api/inventory/movements` — lista movimentações de estoque com filtros e paginação.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, product_id, type, start_date, end_date } = req.query;
    const useCase = new ListInventoryMovementsUseCase(inventoryRepository);
    const { rows, count, page: p, limit: l, totalPages } = await useCase.execute({
      product_id, type, start_date, end_date,
      limit: parseInt(String(limit), 10), offset: (parseInt(String(page), 10) - 1) * parseInt(String(limit), 10), page: parseInt(String(page), 10)
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: l, totalPages } });
  } catch (error) { next(error); }
};

/**
 * `GET /api/inventory/movements/:id` — busca uma movimentação de estoque pelo id.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getById = async (req, res, next) => {
  try {
    const useCase = new GetInventoryMovementByIdUseCase(inventoryRepository);
    const movement = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: movement });
  } catch (error) { next(error); }
};

/**
 * `POST /api/inventory/movements` — registra uma movimentação de estoque
 * (entrada/saída/ajuste), aplicando lock pessimista e transação via
 * `InventoryService.adjust` (Fase 4.1).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.create = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const parsed = createInventoryMovementSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const { product_id, type, quantity, description, reference_id, reference_type } = parsed.data;
    const useCase = new CreateInventoryMovementUseCase();
    const { movement } = await useCase.execute({
      product_id, type, quantity, description, reference_id, reference_type,
      userId: req.user.id,
      transaction: t
    });

    await t.commit();

    // Log de auditoria feito após o commit para não segurar locks de banco.
    logAction(req, {
      action: type === 'out' ? 'update' : 'create',
      entityType: 'InventoryMovement',
      entityId: movement.id,
      entityDescription: `Produto #${product_id}`,
      newValues: { type, quantity },
      description: `Movimentação de estoque (${type}) - quantidade ${quantity}`
    });

    res.status(201).json({ success: true, data: movement });
  } catch (error) {
    await t.rollback();
    if (error.statusCode && !error.code) {
      // Erros lançados por InventoryService (Error simples com statusCode),
      // mantém o mesmo formato de resposta do controller anterior.
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    next(error);
  }
};

/**
 * `GET /api/inventory/stock-report` — relatório consolidado de estoque
 * (resumo + lista de produtos ativos).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getStockReport = async (req, res, next) => {
  try {
    const useCase = new GetStockReportUseCase(inventoryRepository);
    const { summary, products } = await useCase.execute();
    res.json({ success: true, data: { summary, products } });
  } catch (error) { next(error); }
};

/**
 * `GET /api/inventory/low-stock` — lista produtos ativos com estoque em ou
 * abaixo do ponto de reposição (`quantity <= min_quantity`). Endpoint novo
 * (aditivo), não substitui nenhum comportamento existente.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.listLowStock = async (req, res, next) => {
  try {
    const useCase = new ListLowStockUseCase(inventoryRepository);
    const products = await useCase.execute();
    res.json({ success: true, data: products });
  } catch (error) { next(error); }
};



