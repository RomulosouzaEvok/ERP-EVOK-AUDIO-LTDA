import type { Request, Response, NextFunction } from 'express';
import type { Transaction } from 'sequelize';

/**
 * Controller HTTP de Lançamentos Contábeis (`/api/accounting/entries`).
 *
 * @module modules/accounting/presentation/controllers/accountingEntryController
 */

const { sequelize } = require('../../../../config/database');
const { logAction } = require('../../../../services/auditLogService');
const SequelizeAccountingRepository = require('../../infrastructure/sequelize/SequelizeAccountingRepository');
const CreateEntryUseCase = require('../../application/use-cases/entry/CreateEntryUseCase');
const ListEntriesUseCase = require('../../application/use-cases/entry/ListEntriesUseCase');
const GetEntryByIdUseCase = require('../../application/use-cases/entry/GetEntryByIdUseCase');
const UpdateEntryUseCase = require('../../application/use-cases/entry/UpdateEntryUseCase');
const PostEntryUseCase = require('../../application/use-cases/entry/PostEntryUseCase');
const ReverseEntryUseCase = require('../../application/use-cases/entry/ReverseEntryUseCase');
const {
  createEntrySchema, updateEntrySchema, listEntryQuerySchema, handleZodError,
} = require('../validators/accountingEntryValidators');
const { ValidationError } = require('../../../../errors');

const accountingRepository = new SequelizeAccountingRepository();

type AuthenticatedRequest = Request & { user: { id: number; role: 'admin' | 'operator' | 'financial' } };

/**
 * `Transaction` do Sequelize expõe `finished` em runtime, mas a definição
 * de tipos pública do pacote não a declara — mesmo padrão usado no projeto
 * inteiro (`rfqController.ts`) para evitar `rollback()` duplo depois de um
 * `commit()` bem-sucedido.
 */
type TransactionWithFinishedFlag = Transaction & { finished?: 'commit' | 'rollback' };

async function rollbackIfPending(transaction: TransactionWithFinishedFlag | undefined): Promise<void> {
  if (transaction && !transaction.finished) {
    await transaction.rollback();
  }
}

/** `GET /api/accounting/entries` — listagem paginada, filtros de status/tipo/período. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listEntryQuerySchema.parse(req.query);
    const useCase = new ListEntriesUseCase(accountingRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({
      ...query,
      offset: (query.page - 1) * query.limit,
    });
    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error: any) {
    if (error?.issues) return next(new ValidationError('Payload inválido.', error.issues));
    next(error);
  }
};

/** `GET /api/accounting/entries/:id` — busca por id, com itens carregados. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetEntryByIdUseCase(accountingRepository);
    const entry = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: entry });
  } catch (error) { next(error); }
};

/** `POST /api/accounting/entries` — cria um lançamento (sempre `draft`) com seus itens. */
exports.create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const parsed = createEntrySchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateEntryUseCase(accountingRepository);
    const entry = await useCase.execute({ ...parsed.data, userId: req.user.id, transaction: t });

    await t.commit();

    logAction(req, {
      action: 'create',
      entityType: 'AccountingEntry',
      entityId: entry?.id,
      entityDescription: entry?.entry_number,
      newValues: { entry_type: entry?.entry_type, status: entry?.status },
      description: `Lançamento ${entry?.entry_number} criado (rascunho)`,
    });

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/** `PUT /api/accounting/entries/:id` — atualiza cabeçalho/itens de um lançamento em rascunho. */
exports.update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const parsed = updateEntrySchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateEntryUseCase(accountingRepository);
    const entry = await useCase.execute({ id: Number(req.params.id), ...parsed.data, transaction: t });

    await t.commit();

    logAction(req, {
      action: 'update',
      entityType: 'AccountingEntry',
      entityId: entry?.id,
      entityDescription: entry?.entry_number,
      newValues: parsed.data,
      description: `Lançamento ${entry?.entry_number} atualizado`,
    });

    res.json({ success: true, data: entry });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/**
 * `PATCH /api/accounting/entries/:id/post` — contabiliza o lançamento
 * (`draft -> posted`), validando débito total = crédito total.
 */
exports.post = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const useCase = new PostEntryUseCase(accountingRepository);
    const entry = await useCase.execute({ id: Number(req.params.id), userId: req.user.id, transaction: t });

    await t.commit();

    logAction(req, {
      action: 'post',
      entityType: 'AccountingEntry',
      entityId: entry?.id,
      entityDescription: entry?.entry_number,
      newValues: { status: entry?.status },
      description: `Lançamento ${entry?.entry_number} postado (contabilizado)`,
    });

    res.json({ success: true, data: entry });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/**
 * `PATCH /api/accounting/entries/:id/reverse` — estorna o lançamento
 * (`posted -> reversed`), gerando um novo lançamento de estorno com
 * débito/crédito invertidos.
 */
exports.reverse = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const useCase = new ReverseEntryUseCase(accountingRepository);
    const { original, reversalEntry } = await useCase.execute({ id: Number(req.params.id), userId: req.user.id, transaction: t });

    await t.commit();

    logAction(req, {
      action: 'reverse',
      entityType: 'AccountingEntry',
      entityId: original?.id,
      entityDescription: original?.entry_number,
      newValues: { status: original?.status, reversal_entry_number: reversalEntry?.entry_number },
      description: `Lançamento ${original?.entry_number} estornado pelo lançamento ${reversalEntry?.entry_number}`,
    });

    res.status(201).json({ success: true, data: { original, reversal_entry: reversalEntry } });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};
