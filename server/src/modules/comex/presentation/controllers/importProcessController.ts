import type { Request, Response, NextFunction } from 'express';
import type { Transaction } from 'sequelize';

const { sequelize } = require('../../../../config/database');
const { logAction } = require('../../../../services/auditLogService');
import SequelizeComexRepository = require('../../infrastructure/sequelize/SequelizeComexRepository');
import SequelizeItemRepository = require('../../../items/infrastructure/sequelize/SequelizeItemRepository');
import CreateImportProcessUseCase = require('../../application/use-cases/CreateImportProcessUseCase');
import ListImportProcessesUseCase = require('../../application/use-cases/ListImportProcessesUseCase');
import GetImportProcessByIdUseCase = require('../../application/use-cases/GetImportProcessByIdUseCase');
import RegisterImportTrackingUseCase = require('../../application/use-cases/RegisterImportTrackingUseCase');
import CancelImportProcessUseCase = require('../../application/use-cases/CancelImportProcessUseCase');
import ReceiveImportProcessUseCase = require('../../application/use-cases/ReceiveImportProcessUseCase');
const {
  createImportProcessSchema,
  listImportProcessQuerySchema,
  registerImportTrackingSchema,
  cancelImportProcessSchema,
  handleZodError,
} = require('../validators/importProcessValidators');
const { ValidationError } = require('../../../../errors');

const comexRepository = new SequelizeComexRepository();
const itemRepository = new SequelizeItemRepository();

/**
 * Requisicao autenticada: `req.user` e populado pelo middleware
 * `authenticate` (mesmo padrao de `rfqController.ts`).
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

/** `GET /api/comex/import-processes` — listagem paginada, filtro por status/fornecedor. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listImportProcessQuerySchema.parse(req.query);
    const useCase = new ListImportProcessesUseCase(comexRepository);
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

/** `GET /api/comex/import-processes/:id` — detalhe com itens/fornecedor/criador. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetImportProcessByIdUseCase(comexRepository);
    const importProcess = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: importProcess });
  } catch (error) {
    next(error);
  }
};

/** `POST /api/comex/import-processes` — registra um processo de importacao com seus itens (tributos calculados na criacao). */
exports.create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const parsed = createImportProcessSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateImportProcessUseCase(comexRepository, itemRepository);
    const importProcess = await useCase.execute({
      ...parsed.data,
      created_by: req.user.id,
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'create',
      entityType: 'ImportProcess',
      entityId: importProcess?.id,
      entityDescription: importProcess?.process_number,
      newValues: { status: importProcess?.status, supplier_id: importProcess?.supplier_id },
      description: `Processo de importacao ${importProcess?.process_number} registrado`,
    });

    res.status(201).json({ success: true, data: importProcess });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/** `POST /api/comex/import-processes/:id/tracking` — registra embarque/chegada/desembaraco. */
exports.registerTracking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const parsed = registerImportTrackingSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new RegisterImportTrackingUseCase(comexRepository);
    const importProcess = await useCase.execute({
      id: Number(req.params.id),
      ...parsed.data,
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'register_tracking',
      entityType: 'ImportProcess',
      entityId: importProcess?.id,
      entityDescription: importProcess?.process_number,
      newValues: { event: parsed.data.event, status: importProcess?.status },
      description: `Acompanhamento "${parsed.data.event}" registrado no processo ${importProcess?.process_number}`,
    });

    res.status(201).json({ success: true, data: importProcess });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/** `POST /api/comex/import-processes/:id/receive` — nacionaliza e da entrada em estoque com custo nacionalizado. */
exports.receive = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const useCase = new ReceiveImportProcessUseCase(comexRepository, itemRepository);
    const importProcess = await useCase.execute({
      id: Number(req.params.id),
      userId: req.user.id,
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'receive',
      entityType: 'ImportProcess',
      entityId: importProcess?.id,
      entityDescription: importProcess?.process_number,
      newValues: { status: importProcess?.status },
      description: `Processo de importacao ${importProcess?.process_number} recebido (entrada em estoque com custo nacionalizado)`,
    });

    res.status(201).json({ success: true, data: importProcess });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/** `POST /api/comex/import-processes/:id/cancel` — cancela um processo ainda nao recebido. */
exports.cancel = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const parsed = cancelImportProcessSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CancelImportProcessUseCase(comexRepository);
    const importProcess = await useCase.execute({
      id: Number(req.params.id),
      reason: parsed.data.reason,
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'cancel',
      entityType: 'ImportProcess',
      entityId: importProcess?.id,
      entityDescription: importProcess?.process_number,
      newValues: { status: importProcess?.status, reason: parsed.data.reason },
      description: `Processo de importacao ${importProcess?.process_number} cancelado`,
    });

    res.status(200).json({ success: true, data: importProcess });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};
