import type { Request, Response, NextFunction } from 'express';
import type { Transaction } from 'sequelize';

/**
 * Controller HTTP de Operações Financeiras
 * (`/api/treasury/financial-operations`).
 *
 * @module modules/treasury/presentation/controllers/financialOperationController
 */

const { sequelize } = require('../../../../config/database');
const { logAction } = require('../../../../services/auditLogService');
const SequelizeTreasuryRepository = require('../../infrastructure/sequelize/SequelizeTreasuryRepository');
const CreateOperationUseCase = require('../../application/use-cases/operation/CreateOperationUseCase');
const ListOperationsUseCase = require('../../application/use-cases/operation/ListOperationsUseCase');
const GetOperationByIdUseCase = require('../../application/use-cases/operation/GetOperationByIdUseCase');
const UpdateOperationUseCase = require('../../application/use-cases/operation/UpdateOperationUseCase');
const SettleOperationUseCase = require('../../application/use-cases/operation/SettleOperationUseCase');
const CancelOperationUseCase = require('../../application/use-cases/operation/CancelOperationUseCase');
const {
  createOperationSchema, updateOperationSchema, listOperationQuerySchema, settleOperationSchema, handleZodError,
} = require('../validators/treasuryValidators');
const { ValidationError } = require('../../../../errors');

const treasuryRepository = new SequelizeTreasuryRepository();

/**
 * `Transaction` do Sequelize expõe `finished` em runtime, mas a definição de
 * tipos pública do pacote não a declara — mesmo padrão usado em
 * `accountingEntryController.ts`/`rfqController.ts` para evitar
 * `rollback()` duplo depois de um `commit()` bem-sucedido.
 */
type TransactionWithFinishedFlag = Transaction & { finished?: 'commit' | 'rollback' };

async function rollbackIfPending(transaction: TransactionWithFinishedFlag | undefined): Promise<void> {
  if (transaction && !transaction.finished) {
    await transaction.rollback();
  }
}

/** `GET /api/treasury/financial-operations` — lista paginada, filtros de status/tipo. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listOperationQuerySchema.parse(req.query);
    const useCase = new ListOperationsUseCase(treasuryRepository);
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

/** `GET /api/treasury/financial-operations/:id` — busca por id. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetOperationByIdUseCase(treasuryRepository);
    const operation = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: operation });
  } catch (error) { next(error); }
};

/** `POST /api/treasury/financial-operations` — cria uma operação financeira (409 se `contract_number` duplicado). */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createOperationSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateOperationUseCase(treasuryRepository);
    const operation = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'TreasuryFinancialOperation',
      entityId: operation?.id,
      entityDescription: operation?.contract_number,
      newValues: { operation_type: operation?.operation_type, institution: operation?.institution, amount: operation?.amount },
      description: `Operação financeira ${operation?.contract_number} (${operation?.operation_type}) criada`,
    });

    res.status(201).json({ success: true, data: operation });
  } catch (error) { next(error); }
};

/** `PUT /api/treasury/financial-operations/:id` — atualiza uma operação ainda `active`. */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateOperationSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateOperationUseCase(treasuryRepository);
    const operation = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'TreasuryFinancialOperation',
      entityId: operation?.id,
      entityDescription: operation?.contract_number,
      newValues: parsed.data,
      description: `Operação financeira ${operation?.contract_number} atualizada`,
    });

    res.json({ success: true, data: operation });
  } catch (error) { next(error); }
};

/** `PATCH /api/treasury/financial-operations/:id/settle` — liquida a operação (`active -> settled`). */
exports.settle = async (req: Request, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const parsed = settleOperationSchema.safeParse(req.body ?? {});
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new SettleOperationUseCase(treasuryRepository);
    const operation = await useCase.execute({ id: Number(req.params.id), settled_at: parsed.data.settled_at, transaction: t });

    await t.commit();

    logAction(req, {
      action: 'settle',
      entityType: 'TreasuryFinancialOperation',
      entityId: operation?.id,
      entityDescription: operation?.contract_number,
      newValues: { status: operation?.status, settled_at: operation?.settled_at },
      description: `Operação financeira ${operation?.contract_number} liquidada`,
    });

    res.json({ success: true, data: operation });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/** `PATCH /api/treasury/financial-operations/:id/cancel` — cancela a operação (`active -> canceled`). */
exports.cancel = async (req: Request, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const useCase = new CancelOperationUseCase(treasuryRepository);
    const operation = await useCase.execute({ id: Number(req.params.id), transaction: t });

    await t.commit();

    logAction(req, {
      action: 'cancel',
      entityType: 'TreasuryFinancialOperation',
      entityId: operation?.id,
      entityDescription: operation?.contract_number,
      newValues: { status: operation?.status },
      description: `Operação financeira ${operation?.contract_number} cancelada`,
    });

    res.json({ success: true, data: operation });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};
