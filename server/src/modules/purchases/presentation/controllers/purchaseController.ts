const { sequelize } = require('../../../../config/database');
const { logAction } = require('../../../../services/auditLogService');
const SequelizePurchaseRepository = require('../../infrastructure/sequelize/SequelizePurchaseRepository');
const ListPurchasesUseCase = require('../../application/use-cases/ListPurchasesUseCase');
const GetPurchaseByIdUseCase = require('../../application/use-cases/GetPurchaseByIdUseCase');
const CreatePurchaseUseCase = require('../../application/use-cases/CreatePurchaseUseCase');
const UpdatePurchaseUseCase = require('../../application/use-cases/UpdatePurchaseUseCase');
const ChangePurchaseStatusUseCase = require('../../application/use-cases/ChangePurchaseStatusUseCase');
const ReceivePurchaseItemsUseCase = require('../../application/use-cases/ReceivePurchaseItemsUseCase');
const {
  createPurchaseSchema,
  updatePurchaseSchema,
  updatePurchaseStatusSchema,
  receivePurchaseItemsSchema,
  handleZodError
} = require('../validators/purchaseValidators');

/**
 * Controller enxuto do módulo `purchases`. Interpreta `req`, delega toda a
 * regra de negócio aos use cases da camada de aplicação e devolve sempre o
 * envelope padrão `{ success: true, data, ... }` — mantendo exatamente o
 * mesmo formato JSON e os mesmos 6 endpoints do controller anterior
 * (`server/src/controllers/purchaseController.ts`), que permanece no
 * repositório apenas como referência histórica e não está mais registrado
 * em nenhuma rota ativa (ver `server/src/modules/purchases/README.md`).
 */
const purchaseRepository = new SequelizePurchaseRepository();

async function rollbackIfPending(transaction) {
  if (transaction && !transaction.finished) {
    await transaction.rollback();
  }
}

/**
 * `GET /api/purchases` — lista pedidos de compra com filtros e paginação.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, supplier_id, start_date, end_date } = req.query;
    const useCase = new ListPurchasesUseCase(purchaseRepository);
    const { rows, count, page: p, limit: l, totalPages } = await useCase.execute({
      status, supplier_id, start_date, end_date,
      page: parseInt(String(page), 10), limit: parseInt(String(limit), 10), offset: (parseInt(String(page), 10) - 1) * parseInt(String(limit), 10)
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: l, totalPages } });
  } catch (error) { next(error); }
};

/**
 * `GET /api/purchases/:id` — busca um pedido de compra pelo id.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getById = async (req, res, next) => {
  try {
    const useCase = new GetPurchaseByIdUseCase(purchaseRepository);
    const purchase = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: purchase });
  } catch (error) { next(error); }
};

/**
 * `POST /api/purchases` — cria um pedido de compra com seus itens
 * (transacional).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.create = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const parsed = createPurchaseSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const { supplier_id, items, notes, expected_date } = parsed.data;
    const useCase = new CreatePurchaseUseCase(purchaseRepository);
    const { purchase, totalAmount } = await useCase.execute({
      supplier_id, items, notes, expected_date, userId: req.user.id, transaction: t
    });

    await t.commit();

    // Log de auditoria feito após o commit para não segurar locks de banco.
    logAction(req, {
      action: 'create',
      entityType: 'Purchase',
      entityId: purchase.id,
      entityDescription: purchase.order_number,
      newValues: { supplier_id, total_amount: totalAmount, status: 'pending' },
      description: `Pedido de compra ${purchase.order_number} criado`
    });

    const fullPurchase = await purchaseRepository.findPurchaseById(purchase.id);
    res.status(201).json({ success: true, data: fullPurchase });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/**
 * `PUT /api/purchases/:id` — atualiza campos permitidos de um pedido de compra.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.update = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const parsed = updatePurchaseSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const useCase = new UpdatePurchaseUseCase(purchaseRepository);
    const { updated, oldValues, updateData } = await useCase.execute({ id: req.params.id, body: parsed.data, transaction: t });

    await t.commit();

    // Log de auditoria feito após o commit para não segurar locks de banco.
    logAction(req, {
      action: 'update',
      entityType: 'Purchase',
      entityId: updated.id,
      entityDescription: updated.order_number,
      oldValues,
      newValues: updateData,
      description: `Pedido de compra ${updated.order_number} atualizado`
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/**
 * `PUT /api/purchases/:id/status` — altera o status do pedido de compra
 * respeitando a máquina de estados; ao aprovar, gera a `AccountPayable`
 * correspondente. Transacional (correção do bug pré-existente em que a
 * aprovação e a criação da conta a pagar não eram atômicas — ver README).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.updateStatus = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const parsed = updatePurchaseStatusSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const { status } = parsed.data;
    const useCase = new ChangePurchaseStatusUseCase(purchaseRepository);
    const { purchase, previousStatus } = await useCase.execute({ id: req.params.id, status, userId: req.user.id, transaction: t });

    await t.commit();

    // Log de auditoria feito após o commit para não segurar locks de banco.
    logAction(req, {
      action: status === 'approved' ? 'approve' : 'status_change',
      entityType: 'Purchase',
      entityId: purchase.id,
      entityDescription: purchase.order_number,
      oldValues: { status: previousStatus },
      newValues: { status },
      description: `Pedido de compra ${purchase.order_number}: status alterado de ${previousStatus} para ${status}`
    });

    res.json({ success: true, data: purchase });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/**
 * `POST /api/purchases/:id/receive` — registra o recebimento (total ou
 * parcial) dos itens de um pedido de compra (transacional, com lock
 * pessimista via `InventoryService`).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.receiveItems = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const parsed = receivePurchaseItemsSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const { items, invoice_number } = parsed.data;
    const useCase = new ReceivePurchaseItemsUseCase(purchaseRepository);
    const { purchase, previousStatus } = await useCase.execute({ id: req.params.id, items, invoiceNumber: invoice_number, userId: req.user.id, transaction: t });

    await t.commit();

    // Log de auditoria feito após o commit para não segurar locks de banco.
    logAction(req, {
      action: 'update',
      entityType: 'Purchase',
      entityId: purchase.id,
      entityDescription: purchase.order_number,
      oldValues: { status: previousStatus },
      newValues: { status: purchase.status },
      description: `Recebimento de itens do pedido ${purchase.order_number}`
    });

    const fullPurchase = await purchaseRepository.findPurchaseById(purchase.id);
    res.json({ success: true, data: fullPurchase });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};



