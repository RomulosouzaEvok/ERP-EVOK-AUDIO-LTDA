const { logAction } = require('../../../../services/auditLogService');
const SequelizeInventoryCountRepository = require('../../infrastructure/sequelize/SequelizeInventoryCountRepository');
const CreateInventoryCountUseCase = require('../../application/use-cases/CreateInventoryCountUseCase');
const StartInventoryCountUseCase = require('../../application/use-cases/StartInventoryCountUseCase');
const CountInventoryItemUseCase = require('../../application/use-cases/CountInventoryItemUseCase');
const SubmitInventoryCountUseCase = require('../../application/use-cases/SubmitInventoryCountUseCase');
const ApproveInventoryCountUseCase = require('../../application/use-cases/ApproveInventoryCountUseCase');
const RejectInventoryCountUseCase = require('../../application/use-cases/RejectInventoryCountUseCase');
const ListInventoryCountsUseCase = require('../../application/use-cases/ListInventoryCountsUseCase');
const GetInventoryCountByIdUseCase = require('../../application/use-cases/GetInventoryCountByIdUseCase');

/**
 * Controller enxuto do submódulo `inventory-counts` (Inventário Cíclico,
 * Fase F09). Interpreta `req`, delega toda a regra de negócio aos use cases
 * da camada de aplicação (que por sua vez delegam a alteração real de
 * `Product.quantity` a `InventoryService.adjust`) e devolve sempre o
 * envelope padrão `{ success: true, data }` / `{ success: false, error }`.
 */
const inventoryCountRepository = new SequelizeInventoryCountRepository();

/**
 * Responde erros lançados por `InventoryService` (objetos `Error` simples
 * com `statusCode`, não `AppError`) no mesmo formato usado pelos demais
 * controllers do módulo `inventory`; demais erros (incluindo `AppError`)
 * são deanteriors ao `errorHandler` global via `next`.
 *
 * @param {Error} error
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
function handleError(error, res, next) {
  if (error.statusCode && !error.code) {
    return res.status(error.statusCode).json({ success: false, error: error.message });
  }
  next(error);
}

/**
 * `POST /api/inventory-counts` — cria uma nova contagem de inventário
 * (status `draft`), opcionalmente já com itens (`product_ids`).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.create = async (req, res, next) => {
  try {
    const { count_type, location, notes, product_ids } = req.body;
    const useCase = new CreateInventoryCountUseCase(inventoryCountRepository);
    const { count, items } = await useCase.execute({
      count_type, location, notes, product_ids, created_by: req.user.id
    });

    logAction(req, {
      action: 'create',
      entityType: 'InventoryCount',
      entityId: count.id,
      entityDescription: count.count_number,
      newValues: { count_type: count.count_type, location: count.location, items_count: items.length },
      description: `Contagem de inventário ${count.count_number} criada`
    });

    res.status(201).json({ success: true, data: { count, items } });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `GET /api/inventory-counts` — lista contagens de inventário com filtros e paginação.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.list = async (req, res, next) => {
  try {
    const { page, limit, status, count_type } = req.query;
    const useCase = new ListInventoryCountsUseCase(inventoryCountRepository);
    const { rows, count, page: p, limit: l, totalPages } = await useCase.execute({ status, count_type, page, limit });
    res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: l, totalPages } });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `GET /api/inventory-counts/:id` — busca uma contagem de inventário por id, com itens.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getById = async (req, res, next) => {
  try {
    const useCase = new GetInventoryCountByIdUseCase(inventoryCountRepository);
    const count = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: count });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `POST /api/inventory-counts/:id/start` — inicia a contagem (`draft` → `counting`).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.start = async (req, res, next) => {
  try {
    const useCase = new StartInventoryCountUseCase(inventoryCountRepository);
    const count = await useCase.execute({ id: req.params.id });

    logAction(req, {
      action: 'update',
      entityType: 'InventoryCount',
      entityId: count.id,
      entityDescription: count.count_number,
      newValues: { status: 'counting' },
      description: `Contagem de inventário ${count.count_number} iniciada`
    });

    res.json({ success: true, data: count });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `POST /api/inventory-counts/:id/items/:itemId/count` — registra a
 * quantidade contada fisicamente de um item.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.countItem = async (req, res, next) => {
  try {
    const { counted_quantity, notes } = req.body;
    const useCase = new CountInventoryItemUseCase(inventoryCountRepository);
    const item = await useCase.execute({
      id: req.params.id,
      itemId: req.params.itemId,
      counted_quantity,
      notes,
      userId: req.user.id
    });

    logAction(req, {
      action: 'update',
      entityType: 'InventoryCountItem',
      entityId: item.id,
      entityDescription: `Item #${item.id} (produto #${item.product_id})`,
      newValues: { counted_quantity: item.counted_quantity, variance_quantity: item.variance_quantity },
      description: `Item #${item.id} contado (quantidade ${item.counted_quantity})`
    });

    res.json({ success: true, data: item });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `POST /api/inventory-counts/:id/submit` — envia a contagem para
 * aprovação (`counting` → `pending_approval`).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.submit = async (req, res, next) => {
  try {
    const useCase = new SubmitInventoryCountUseCase(inventoryCountRepository);
    const count = await useCase.execute({ id: req.params.id });

    logAction(req, {
      action: 'update',
      entityType: 'InventoryCount',
      entityId: count.id,
      entityDescription: count.count_number,
      newValues: { status: 'pending_approval' },
      description: `Contagem de inventário ${count.count_number} enviada para aprovação`
    });

    res.json({ success: true, data: count });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `POST /api/inventory-counts/:id/approve` — aprova a contagem
 * (`pending_approval` → `adjusted`), disparando `InventoryService.adjust`
 * para cada item com variância.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.approve = async (req, res, next) => {
  try {
    const useCase = new ApproveInventoryCountUseCase(inventoryCountRepository);
    const { count, adjustments } = await useCase.execute({ id: req.params.id, approverId: req.user.id });

    logAction(req, {
      action: 'approve',
      entityType: 'InventoryCount',
      entityId: count.id,
      entityDescription: count.count_number,
      newValues: { status: 'adjusted', adjustments_count: adjustments.length },
      description: `Contagem de inventário ${count.count_number} aprovada e estoque ajustado (${adjustments.length} produto(s))`
    });

    res.json({ success: true, data: { count, adjustments } });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `POST /api/inventory-counts/:id/reject` — rejeita a contagem
 * (`pending_approval` → `rejected`), sem aplicar ajuste de estoque.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.reject = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const useCase = new RejectInventoryCountUseCase(inventoryCountRepository);
    const count = await useCase.execute({ id: req.params.id, approverId: req.user.id, reason });

    logAction(req, {
      action: 'update',
      entityType: 'InventoryCount',
      entityId: count.id,
      entityDescription: count.count_number,
      newValues: { status: 'rejected' },
      description: `Contagem de inventário ${count.count_number} rejeitada${reason ? `: ${reason}` : ''}`
    });

    res.json({ success: true, data: count });
  } catch (error) { handleError(error, res, next); }
};


