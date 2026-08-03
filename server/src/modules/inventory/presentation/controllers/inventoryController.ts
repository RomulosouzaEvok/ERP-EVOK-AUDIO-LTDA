const { sequelize } = require('../../../../config/database');
const { logAction } = require('../../../../services/auditLogService');
const SequelizeInventoryRepository = require('../../infrastructure/sequelize/SequelizeInventoryRepository');
const ListInventoryMovementsUseCase = require('../../application/use-cases/ListInventoryMovementsUseCase');
const GetInventoryMovementByIdUseCase = require('../../application/use-cases/GetInventoryMovementByIdUseCase');
const CreateInventoryMovementUseCase = require('../../application/use-cases/CreateInventoryMovementUseCase');
const GetStockReportUseCase = require('../../application/use-cases/GetStockReportUseCase');
const ListLowStockUseCase = require('../../application/use-cases/ListLowStockUseCase');
const ListLotsUseCase = require('../../application/use-cases/ListLotsUseCase');
const ReleaseLotUseCase = require('../../application/use-cases/ReleaseLotUseCase');
const BlockLotUseCase = require('../../application/use-cases/BlockLotUseCase');
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
 * DUAL-READ: Aceita `product_id` (legado) OU `item_id` (novo, PREFERIDO).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, product_id, item_id, type, start_date, end_date } = req.query;
    const useCase = new ListInventoryMovementsUseCase(inventoryRepository);
    const { rows, count, page: p, limit: l, totalPages } = await useCase.execute({
      product_id: product_id ? parseInt(String(product_id), 10) : undefined,
      item_id: String(item_id || '').trim() || undefined,
      type,
      start_date,
      end_date,
      limit: parseInt(String(limit), 10),
      offset: (parseInt(String(page), 10) - 1) * parseInt(String(limit), 10),
      page: parseInt(String(page), 10)
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
 * DUAL-READ: Aceita `product_id` (legado) OU `item_id` (novo, PREFERIDO).
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
    const { product_id, item_id, type, quantity, description, reference_id, reference_type } = parsed.data;
    const useCase = new CreateInventoryMovementUseCase();
    try {
      const { movement } = await useCase.execute({
        product_id, item_id, type, quantity, description, reference_id, reference_type,
        userId: req.user.id,
        transaction: t
      });

      await t.commit();

      // Log de auditoria feito após o commit para não segurar locks de banco.
      const entityDesc = item_id ? `Item #${item_id}` : `Produto #${product_id}`;
      logAction(req, {
        action: type === 'out' ? 'update' : 'create',
        entityType: 'InventoryMovement',
        entityId: movement.id,
        entityDescription: entityDesc,
        newValues: { type, quantity },
        description: `Movimentação de estoque (${type}) - quantidade ${quantity}`
      });

      res.status(201).json({ success: true, data: movement });
    } catch (innerError) {
      await t.rollback();
      throw innerError;
    }
  } catch (error) {
    if (!error.statusCode) await t.rollback();
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

/**
 * `GET /api/inventory/lots?product_id=&status=&page=&limit=` — lista lotes
 * (`LotControl`) com filtros e paginação, incluindo `product` e `supplier`.
 *
 * DUAL-USO:
 * - Sem `status` e com `product_id` (uso legado/produção): mantém o
 *   comportamento anterior — apenas lotes `status='available'` com
 *   `quantity_available > 0`, usado para escolher lotes na conclusão de OP
 *   (`lot_consumptions` exigido por `ChangeProductionOrderStatusUseCase`).
 * - Com `status` explícito (ex.: `status=quarantine`): usado pela inspeção
 *   de recebimento de qualidade para listar lotes pendentes de liberação.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.listLots = async (req, res, next) => {
  try {
    const { product_id, status, page, limit } = req.query;
    const useCase = new ListLotsUseCase();
    const { rows, total, page: p, limit: l, totalPages } = await useCase.execute({ product_id, status, page, limit });
    res.json({ success: true, data: rows, pagination: { total, page: p, limit: l, totalPages } });
  } catch (error) { next(error); }
};

/**
 * `POST /api/inventory/lots/:id/release` — libera um lote para consumo
 * (`quarantine|blocked` -> `available`). Usado pela inspeção de recebimento
 * (pós-quarentena) e pela qualidade (pós-tratativa de RNC). `body.notes` é
 * opcional.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.releaseLot = async (req, res, next) => {
  try {
    const useCase = new ReleaseLotUseCase();
    const lot = await useCase.execute({ id: req.params.id, notes: req.body?.notes });

    logAction(req, {
      action: 'update',
      entityType: 'LotControl',
      entityId: lot.id,
      entityDescription: `Lote ${lot.lot_number}`,
      newValues: { status: 'available' },
      description: `Lote ${lot.lot_number} liberado para consumo`
    });

    res.json({ success: true, data: lot });
  } catch (error) { next(error); }
};

/**
 * `POST /api/inventory/lots/:id/block` — bloqueia um lote
 * (`quarantine|available` -> `blocked`), com `body.reason` obrigatório
 * (mínimo 3 caracteres). Usado pela inspeção de recebimento e,
 * internamente, por `CreateNonConformityUseCase` ao registrar uma RNC
 * vinculada a um lote.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.blockLot = async (req, res, next) => {
  try {
    const useCase = new BlockLotUseCase();
    const lot = await useCase.execute({ id: req.params.id, reason: req.body?.reason });

    logAction(req, {
      action: 'update',
      entityType: 'LotControl',
      entityId: lot.id,
      entityDescription: `Lote ${lot.lot_number}`,
      newValues: { status: 'blocked', reason: req.body?.reason },
      description: `Lote ${lot.lot_number} bloqueado: ${req.body?.reason}`
    });

    res.json({ success: true, data: lot });
  } catch (error) { next(error); }
};



