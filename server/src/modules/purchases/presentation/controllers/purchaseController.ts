import type { Request, Response, NextFunction } from 'express';
import type { Transaction } from 'sequelize';

const { sequelize } = require('../../../../config/database');
const { logAction } = require('../../../../services/auditLogService');
const SequelizePurchaseRepository = require('../../infrastructure/sequelize/SequelizePurchaseRepository');
const ListPurchasesUseCase = require('../../application/use-cases/ListPurchasesUseCase');
const GetPurchaseByIdUseCase = require('../../application/use-cases/GetPurchaseByIdUseCase');
const CreatePurchaseUseCase = require('../../application/use-cases/CreatePurchaseUseCase');
const UpdatePurchaseUseCase = require('../../application/use-cases/UpdatePurchaseUseCase');
const ChangePurchaseStatusUseCase = require('../../application/use-cases/ChangePurchaseStatusUseCase');
const ApprovePurchaseUseCase = require('../../application/use-cases/ApprovePurchaseUseCase');
const ListPurchaseApprovalsUseCase = require('../../application/use-cases/ListPurchaseApprovalsUseCase');
const ReceivePurchaseItemsUseCase = require('../../application/use-cases/ReceivePurchaseItemsUseCase');
const GetPurchaseCockpitUseCase = require('../../application/use-cases/GetPurchaseCockpitUseCase');
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

async function rollbackIfPending(transaction: Transaction) {
  if (transaction && !(transaction as any).finished) {
    await transaction.rollback();
  }
}

/**
 * G11 — resolve os papéis de aprovador de alçada que o usuário logado
 * efetivamente possui, a partir do RBAC real (`req.user.permissions`),
 * NUNCA do body. Mesmo padrão anti-spoofing de
 * `resolveAvailableApproverRoles` do Jurídico (RF-JUR-003).
 * `role === 'admin'` é tratado como tendo o papel (mesmo curto-circuito de
 * `authorizeModule`).
 *
 * @param {import('express').Request} req
 * @returns {string[]} Papéis disponíveis (hoje apenas `diretor`).
 */
function resolveAvailableApproverRoles(req: Request): string[] {
  const user = (req as any).user;
  if (user?.role === 'admin') return ['diretor'];
  return user?.permissions?.diretor ? ['diretor'] : [];
}

/**
 * `GET /api/purchases` — lista pedidos de compra com filtros e paginação.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
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
 * `GET /api/purchases/cockpit` — retorna as métricas agregadas do cockpit
 * de compras (requisições pendentes, pedidos em aberto, chegadas da semana
 * e pedidos em atraso). Somente leitura, sem paginação.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.cockpit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetPurchaseCockpitUseCase(purchaseRepository);
    const data = await useCase.execute();
    res.json({ success: true, data });
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
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
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
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  const t = await sequelize.transaction();
  try {
    const parsed = createPurchaseSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const { supplier_id, items, notes, expected_date, origin } = parsed.data;
    const useCase = new CreatePurchaseUseCase(purchaseRepository);
    const { purchase, totalAmount } = await useCase.execute({
      supplier_id, items, notes, expected_date, origin, userId: (req as any).user.id, transaction: t
    });

    await t.commit();

    // Log de auditoria feito após o commit para não segurar locks de banco.
    logAction(req, {
      action: 'create',
      entityType: 'Purchase',
      entityId: purchase.id,
      entityDescription: purchase.order_number,
      newValues: { supplier_id, total_amount: totalAmount, status: 'pending', origin: purchase.origin },
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
exports.update = async (req: Request, res: Response, next: NextFunction) => {
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
exports.updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  const t = await sequelize.transaction();
  try {
    const parsed = updatePurchaseStatusSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const { status } = parsed.data;
    const useCase = new ChangePurchaseStatusUseCase(purchaseRepository);
    const { purchase, previousStatus } = await useCase.execute({ id: req.params.id, status, userId: (req as any).user.id, transaction: t });

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
 * `POST /api/purchases/:id/approve` — G11: registra a aprovação de alçada da
 * DIRETORIA sobre um pedido de compra (não aprova o pedido; a aprovação do
 * pedido continua sendo `PUT /api/purchases/:id/status`).
 *
 * `approver_user_id` vem sempre do JWT e `approver_role` é sempre resolvido
 * por RBAC (`resolveAvailableApproverRoles`) — nada disso é aceito do body.
 * Transacional: a leitura do pedido, a checagem de duplicidade de papel e a
 * gravação da aprovação acontecem na mesma transação, para que duas
 * requisições simultâneas do mesmo diretor não gerem duas linhas (a UNIQUE
 * `uq_purchase_order_approvals_purchase_role` é a garantia final).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.approveAuthority = async (req: Request, res: Response, next: NextFunction) => {
  const t = await sequelize.transaction();
  try {
    const useCase = new ApprovePurchaseUseCase(purchaseRepository);
    const approval = await useCase.execute({
      purchaseId: req.params.id,
      approverUserId: (req as any).user.id,
      availableRoles: resolveAvailableApproverRoles(req),
      transaction: t
    });

    await t.commit();

    logAction(req, {
      action: 'approve',
      entityType: 'PurchaseOrderApproval',
      entityId: approval.id,
      entityDescription: `Pedido ${req.params.id}`,
      newValues: { purchase_id: approval.purchase_id, approver_role: approval.approver_role, approver_user_id: approval.approver_user_id },
      description: `Alcada G11: aprovacao "${approval.approver_role}" registrada para o pedido de compra ${req.params.id}`
    });

    res.status(201).json({ success: true, data: approval });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/**
 * `GET /api/purchases/:id/approvals` — G11: situação da alçada do pedido
 * (origem efetiva, valor comparado com o teto, papéis exigidos, aprovações
 * já registradas e o que falta). Somente leitura, sem efeito colateral.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.listApprovals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new ListPurchaseApprovalsUseCase(purchaseRepository);
    const data = await useCase.execute({ purchaseId: req.params.id });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/**
 * `POST /api/purchases/:id/receive` — registra o recebimento (total ou
 * parcial) dos itens de um pedido de compra (transacional, com lock
 * pessimista via `InventoryService`).
 *
 * Devolve também `requisition_status` (gap G15): o novo status da requisição
 * de origem quando este recebimento a fez avançar para `partial`/`received`,
 * ou `null` quando o pedido é avulso ou nada mudou.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.receiveItems = async (req: Request, res: Response, next: NextFunction) => {
  const t = await sequelize.transaction();
  try {
    const parsed = receivePurchaseItemsSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const { items, invoice_number, warehouse_code, invoice_date, due_date } = parsed.data;
    const useCase = new ReceivePurchaseItemsUseCase(purchaseRepository);
    const { purchase, previousStatus, requisitionStatus, payable, payableSkipReason } = await useCase.execute({
      id: req.params.id,
      items,
      invoiceNumber: invoice_number,
      warehouseCode: warehouse_code,
      invoiceDate: invoice_date,
      dueDate: due_date,
      userId: (req as any).user.id,
      transaction: t
    });

    await t.commit();

    // Log de auditoria feito após o commit para não segurar locks de banco.
    logAction(req, {
      action: 'update',
      entityType: 'Purchase',
      entityId: purchase.id,
      entityDescription: purchase.order_number,
      oldValues: { status: previousStatus },
      newValues: {
        status: purchase.status,
        requisition_status: requisitionStatus ?? null,
        // G13: rastro de qual conta a pagar este recebimento gerou (ou por
        // que não gerou nenhuma).
        account_payable_id: payable?.id ?? null,
        payable_skip_reason: payableSkipReason ?? null
      },
      description: requisitionStatus
        ? `Recebimento de itens do pedido ${purchase.order_number} (requisicao de origem -> ${requisitionStatus})`
        : `Recebimento de itens do pedido ${purchase.order_number}`
    });

    const fullPurchase = await purchaseRepository.findPurchaseById(purchase.id);
    res.json({
      success: true,
      data: fullPurchase,
      requisition_status: requisitionStatus ?? null,
      // G13 — a conta a pagar deste recebimento (CPC 00 (R2) 4.58).
      // `account_payable` é `null` quando nada foi lançado; nesse caso
      // `payable_skip_reason` explica (`legacy_created_on_approval`,
      // `no_supplier`, `zero_amount`, `already_exists`).
      account_payable: payable ? { id: payable.id, amount: payable.amount, due_date: payable.due_date, invoice_number: payable.invoice_number } : null,
      payable_skip_reason: payableSkipReason ?? null
    });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};



