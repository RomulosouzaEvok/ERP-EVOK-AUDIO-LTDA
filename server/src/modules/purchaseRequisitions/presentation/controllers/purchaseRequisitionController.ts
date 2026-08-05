import type { Request, Response, NextFunction } from 'express';
import type { Transaction } from 'sequelize';

const { sequelize } = require('../../../../config/database');
const { logAction } = require('../../../../services/auditLogService');
import SequelizePurchaseRequisitionRepository = require('../../infrastructure/sequelize/SequelizePurchaseRequisitionRepository');
import SequelizeItemRepository = require('../../../items/infrastructure/sequelize/SequelizeItemRepository');
// `SequelizePurchaseRepository` (modulo `purchases`, fora do escopo desta
// tarefa) ainda usa `module.exports =` em vez de `export =`, entao o TS o
// resolve como namespace (nao construtivel) em `import X = require(...)`.
// Mantido como `require` "solto" ate o modulo `purchases` ser normalizado.
const SequelizePurchaseRepository = require('../../../purchases/infrastructure/sequelize/SequelizePurchaseRepository');
import SequelizeItemSupplierRepository = require('../../../items/infrastructure/sequelize/SequelizeItemSupplierRepository');
import CreatePurchaseRequisitionUseCase = require('../../application/use-cases/CreatePurchaseRequisitionUseCase');
import ListPurchaseRequisitionsUseCase = require('../../application/use-cases/ListPurchaseRequisitionsUseCase');
import GetPurchaseRequisitionByIdUseCase = require('../../application/use-cases/GetPurchaseRequisitionByIdUseCase');
import ChangePurchaseRequisitionStatusUseCase = require('../../application/use-cases/ChangePurchaseRequisitionStatusUseCase');
import ConvertRequisitionToPurchaseOrdersUseCase = require('../../application/use-cases/ConvertRequisitionToPurchaseOrdersUseCase');
const {
  createPurchaseRequisitionSchema,
  listPurchaseRequisitionQuerySchema,
  changePurchaseRequisitionStatusSchema,
  convertPurchaseRequisitionSchema,
  handleZodError,
} = require('../validators/purchaseRequisitionValidators');
const { ValidationError, ForbiddenError } = require('../../../../errors');

const requisitionRepository = new SequelizePurchaseRequisitionRepository();
const itemRepository = new SequelizeItemRepository();
const purchaseRepository = new SequelizePurchaseRepository();
const itemSupplierRepository = new SequelizeItemSupplierRepository();

/**
 * Requisicao autenticada: `req.user` e populado pelo middleware
 * `authenticate` (nao tipado globalmente em `Express.Request` neste
 * projeto). `permissions` e opcional/parcial pois usuarios `admin` nao tem
 * `AccessProfile` associado.
 */
type AuthenticatedRequest = Request & {
  user: {
    id: number;
    role: 'admin' | 'operator' | 'financial';
    permissions?: Partial<Record<string, string>>;
  };
};

/**
 * Extrai a lista de `issues` de um erro de validacao Zod (`ZodError`), sem
 * depender de `instanceof`. Retorna `null` quando o erro nao tem o formato
 * esperado.
 *
 * @param error - Erro capturado no `catch` (tipado `unknown`).
 * @returns Lista de issues do Zod, ou `null`.
 */
function extractZodIssues(error: unknown): unknown[] | null {
  if (error && typeof error === 'object' && 'issues' in error) {
    return (error as { issues: unknown[] }).issues;
  }
  return null;
}

/**
 * `Transaction` do Sequelize expõe `finished` (`'commit'|'rollback'|undefined`)
 * em runtime, mas a definição de tipos pública do pacote não a declara —
 * usado no projeto todo (ver outros controllers) para evitar `rollback()`
 * duplo depois de um `commit()` bem-sucedido.
 */
type TransactionWithFinishedFlag = Transaction & { finished?: 'commit' | 'rollback' };

/**
 * Desfaz (`ROLLBACK`) uma transacao Sequelize ainda pendente, se houver.
 * Usado nos `catch` de rotas que abrem transacao antes de qualquer `await`
 * que possa falhar (`create`, `convert`).
 *
 * @param transaction - Transacao Sequelize aberta, ou `undefined`.
 */
async function rollbackIfPending(transaction: TransactionWithFinishedFlag | undefined): Promise<void> {
  if (transaction && !transaction.finished) {
    await transaction.rollback();
  }
}

exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listPurchaseRequisitionQuerySchema.parse(req.query);
    const useCase = new ListPurchaseRequisitionsUseCase(requisitionRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({
      ...query,
      offset: (query.page - 1) * query.limit,
    });

    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error) {
    const issues = extractZodIssues(error);
    if (issues) {
      return next(new ValidationError('Payload invalido.', issues));
    }
    next(error);
  }
};

exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetPurchaseRequisitionByIdUseCase(requisitionRepository);
    const requisition = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: requisition });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const parsed = createPurchaseRequisitionSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreatePurchaseRequisitionUseCase(requisitionRepository, itemRepository);
    const requisition = await useCase.execute({
      ...parsed.data,
      requester_id: req.user.id,
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'create',
      entityType: 'PurchaseRequisition',
      entityId: requisition?.id,
      entityDescription: requisition?.requisition_number,
      newValues: { status: requisition?.status, origin: requisition?.origin },
      description: `Requisicao de compra ${requisition?.requisition_number} criada`,
    });

    res.status(201).json({ success: true, data: requisition });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/**
 * `PATCH /api/purchase-requisitions/:id/status` — transiciona o status da
 * requisicao (draft->pending|canceled, pending->approved|canceled). A
 * autorizacao de aprovacao e da ROTA, via
 * `authorizeModule('requisicoes', 'approve')` (admin global ou gestor da
 * area); o controller nao repete checagem por role.
 */
exports.changeStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = changePurchaseRequisitionStatusSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    // Aprovar exige nivel gestor da area (ou admin global). As demais
    // transicoes (draft->pending, cancelamento) ficam no nivel operate da rota.
    const isApproval = parsed.data.status === 'approved';
    const isAdmin = req.user?.role === 'admin';
    const hasApproveLevel = req.user?.permissions?.requisicoes === 'approve';
    if (isApproval && !isAdmin && !hasApproveLevel) {
      throw new ForbiddenError('Aprovar requisicoes exige nivel gestor da area de requisicoes.');
    }

    const useCase = new ChangePurchaseRequisitionStatusUseCase(requisitionRepository);
    const requisition = await useCase.execute({
      id: Number(req.params.id),
      status: parsed.data.status,
      userId: req.user.id,
    });

    logAction(req, {
      action: 'update_status',
      entityType: 'PurchaseRequisition',
      entityId: requisition?.id,
      entityDescription: requisition?.requisition_number,
      newValues: { status: requisition?.status },
      description: `Requisicao de compra ${requisition?.requisition_number} alterada para ${requisition?.status}`,
    });

    res.json({ success: true, data: requisition });
  } catch (error) {
    next(error);
  }
};

/**
 * `POST /api/purchase-requisitions/:id/convert` — converte uma requisicao
 * de compra APROVADA em um ou mais pedidos de compra (um por fornecedor
 * resolvido), transacional com lock pessimista na requisicao.
 */
exports.convert = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const parsed = convertPurchaseRequisitionSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new ConvertRequisitionToPurchaseOrdersUseCase(
      requisitionRepository,
      purchaseRepository,
      itemSupplierRepository,
    );
    const result = await useCase.execute({
      id: Number(req.params.id),
      fallback_supplier_id: parsed.data.fallback_supplier_id,
      notes: parsed.data.notes,
      userId: req.user.id,
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'convert',
      entityType: 'PurchaseRequisition',
      entityId: result.requisition_id,
      newValues: { status: result.requisition_status, purchase_orders: result.purchase_orders.map((p: { order_number: string }) => p.order_number) },
      description: `Requisicao de compra ${result.requisition_id} convertida em ${result.purchase_orders.length} pedido(s) de compra`,
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

