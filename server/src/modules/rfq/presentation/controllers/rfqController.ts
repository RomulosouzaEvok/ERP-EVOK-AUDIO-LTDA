import type { Request, Response, NextFunction } from 'express';
import type { Transaction } from 'sequelize';

const { sequelize } = require('../../../../config/database');
const { logAction } = require('../../../../services/auditLogService');
import SequelizeRfqRepository = require('../../infrastructure/sequelize/SequelizeRfqRepository');
import SequelizeItemRepository = require('../../../items/infrastructure/sequelize/SequelizeItemRepository');
import SequelizeItemSupplierRepository = require('../../../items/infrastructure/sequelize/SequelizeItemSupplierRepository');
// `SequelizePurchaseRepository` (modulo `purchases`) ainda usa
// `module.exports =` em vez de `export =`, entao o TS o resolve como
// namespace (nao construtivel) em `import X = require(...)` — mesmo
// contorno ja usado em `purchaseRequisitionController.ts`.
const SequelizePurchaseRepository = require('../../../purchases/infrastructure/sequelize/SequelizePurchaseRepository');
import CreateRfqUseCase = require('../../application/use-cases/CreateRfqUseCase');
import ListRfqsUseCase = require('../../application/use-cases/ListRfqsUseCase');
import GetRfqByIdUseCase = require('../../application/use-cases/GetRfqByIdUseCase');
import InviteRfqSuppliersUseCase = require('../../application/use-cases/InviteRfqSuppliersUseCase');
import RegisterRfqQuoteUseCase = require('../../application/use-cases/RegisterRfqQuoteUseCase');
import GetRfqComparisonUseCase = require('../../application/use-cases/GetRfqComparisonUseCase');
import AwardRfqUseCase = require('../../application/use-cases/AwardRfqUseCase');
const {
  createRfqSchema,
  listRfqQuerySchema,
  inviteRfqSuppliersSchema,
  registerRfqQuoteSchema,
  awardRfqSchema,
  handleZodError,
} = require('../validators/rfqValidators');
const { ValidationError } = require('../../../../errors');

const rfqRepository = new SequelizeRfqRepository();
const itemRepository = new SequelizeItemRepository();
const itemSupplierRepository = new SequelizeItemSupplierRepository();
const purchaseRepository = new SequelizePurchaseRepository();

/**
 * Requisicao autenticada: `req.user` e populado pelo middleware
 * `authenticate` (mesmo padrao de `purchaseRequisitionController.ts`).
 */
type AuthenticatedRequest = Request & { user: { id: number; role: 'admin' | 'operator' | 'financial' } };

/**
 * `Transaction` do Sequelize expõe `finished` em runtime, mas a definição
 * de tipos pública do pacote não a declara — mesmo padrão usado no projeto
 * inteiro para evitar `rollback()` duplo depois de um `commit()` bem-sucedido.
 */
type TransactionWithFinishedFlag = Transaction & { finished?: 'commit' | 'rollback' };

/** Desfaz (`ROLLBACK`) uma transacao Sequelize ainda pendente, se houver. */
async function rollbackIfPending(transaction: TransactionWithFinishedFlag | undefined): Promise<void> {
  if (transaction && !transaction.finished) {
    await transaction.rollback();
  }
}

function extractZodIssues(error: unknown): unknown[] | null {
  if (error && typeof error === 'object' && 'issues' in error) {
    return (error as { issues: unknown[] }).issues;
  }
  return null;
}

/** `GET /api/rfqs` — listagem paginada, filtro por status/requisicao. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listRfqQuerySchema.parse(req.query);
    const useCase = new ListRfqsUseCase(rfqRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({
      ...query,
      offset: (query.page - 1) * query.limit,
    });

    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error) {
    const issues = extractZodIssues(error);
    if (issues) return next(new ValidationError('Payload invalido.', issues));
    next(error);
  }
};

/** `GET /api/rfqs/:id` — detalhe com itens/fornecedores/cotacoes. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetRfqByIdUseCase(rfqRepository);
    const rfq = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: rfq });
  } catch (error) {
    next(error);
  }
};

/**
 * `POST /api/rfqs` — cria uma cotacao (avulsa com `items`, ou a partir de
 * `requisition_id`, que puxa os itens automaticamente).
 */
exports.create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const parsed = createRfqSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateRfqUseCase(rfqRepository, itemRepository);
    const rfq = await useCase.execute({
      ...parsed.data,
      created_by: req.user.id,
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'create',
      entityType: 'Rfq',
      entityId: rfq?.id,
      entityDescription: rfq?.rfq_number,
      newValues: { status: rfq?.status, requisition_id: rfq?.requisition_id },
      description: `Cotacao ${rfq?.rfq_number} criada`,
    });

    res.status(201).json({ success: true, data: rfq });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/**
 * `POST /api/rfqs/:id/suppliers` — convida fornecedores a cotar (transiciona
 * `draft -> sent` no primeiro convite).
 */
exports.inviteSuppliers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const parsed = inviteRfqSuppliersSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new InviteRfqSuppliersUseCase(rfqRepository, itemSupplierRepository);
    const rfq = await useCase.execute({
      id: Number(req.params.id),
      supplier_ids: parsed.data.supplier_ids,
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'invite_suppliers',
      entityType: 'Rfq',
      entityId: rfq?.id,
      entityDescription: rfq?.rfq_number,
      newValues: { supplier_ids: parsed.data.supplier_ids, status: rfq?.status },
      description: `Fornecedores convidados na cotacao ${rfq?.rfq_number}`,
    });

    res.status(201).json({ success: true, data: rfq });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/**
 * `POST /api/rfqs/:id/quotes` — registra a resposta de cotacao de um
 * fornecedor (preco/prazo/MOQ/validade por item; upsert por item x fornecedor).
 */
exports.registerQuote = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const parsed = registerRfqQuoteSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new RegisterRfqQuoteUseCase(rfqRepository);
    const rfq = await useCase.execute({
      id: Number(req.params.id),
      supplier_id: parsed.data.supplier_id,
      items: parsed.data.items,
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'register_quote',
      entityType: 'Rfq',
      entityId: rfq?.id,
      entityDescription: rfq?.rfq_number,
      newValues: { supplier_id: parsed.data.supplier_id, status: rfq?.status },
      description: `Cotacao registrada na RFQ ${rfq?.rfq_number} (fornecedor ${parsed.data.supplier_id})`,
    });

    res.status(201).json({ success: true, data: rfq });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/** `GET /api/rfqs/:id/comparison` — mapa comparativo item x fornecedor. */
exports.getComparison = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetRfqComparisonUseCase(rfqRepository);
    const comparison = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: comparison });
  } catch (error) {
    next(error);
  }
};

/**
 * `POST /api/rfqs/:id/award` — adjudica a cotacao (podendo dividir itens
 * entre fornecedores), gera pedido(s) de compra por fornecedor vencedor e
 * realimenta o catalogo `item_suppliers` com o preco/prazo cotado.
 */
exports.award = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const parsed = awardRfqSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new AwardRfqUseCase(rfqRepository, purchaseRepository, itemSupplierRepository);
    const result = await useCase.execute({
      id: Number(req.params.id),
      awards: parsed.data.awards,
      notes: parsed.data.notes,
      userId: req.user.id,
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'award',
      entityType: 'Rfq',
      entityId: result.rfq_id,
      newValues: { status: result.rfq_status, purchase_orders: result.purchase_orders.map((p: { order_number: string }) => p.order_number) },
      description: `Cotacao ${result.rfq_id} adjudicada, gerando ${result.purchase_orders.length} pedido(s) de compra`,
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};
