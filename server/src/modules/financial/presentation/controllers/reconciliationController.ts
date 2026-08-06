import type { Request, Response, NextFunction } from 'express';
import type { Transaction } from 'sequelize';

const { sequelize } = require('../../../../config/database');
const { logAction } = require('../../../../services/auditLogService');
const { ValidationError } = require('../../../../errors');
const SequelizeReconciliationRepository = require('../../infrastructure/sequelize/SequelizeReconciliationRepository');
const ImportStatementUseCase = require('../../application/use-cases/ImportStatementUseCase');
const ListStatementsUseCase = require('../../application/use-cases/ListStatementsUseCase');
const ListStatementEntriesUseCase = require('../../application/use-cases/ListStatementEntriesUseCase');
const GetMatchSuggestionsUseCase = require('../../application/use-cases/GetMatchSuggestionsUseCase');
const MatchEntryUseCase = require('../../application/use-cases/MatchEntryUseCase');
const IgnoreEntryUseCase = require('../../application/use-cases/IgnoreEntryUseCase');
const UnmatchEntryUseCase = require('../../application/use-cases/UnmatchEntryUseCase');
const {
  listStatementsQuerySchema, listStatementEntriesQuerySchema, matchEntrySchema, handleZodError,
} = require('../validators/reconciliationValidators');

/**
 * Controller da Conciliação Bancária v1 (importação OFX). Interpreta
 * `req`, delega toda a regra de negócio aos use cases da camada de
 * aplicação e devolve sempre o envelope padrão `{ success: true, data }`.
 */
const reconciliationRepository = new SequelizeReconciliationRepository();

/** Requisição autenticada: `req.user` populado pelo middleware `authenticate`. */
type AuthenticatedRequest = Request & { user: { id: number } };

/** `Transaction` expõe `finished` em runtime (não declarado publicamente pelo pacote) — mesmo padrão do resto do projeto. */
type TransactionWithFinishedFlag = Transaction & { finished?: 'commit' | 'rollback' };

/** Desfaz (`ROLLBACK`) uma transação Sequelize ainda pendente, se houver. */
async function rollbackIfPending(transaction: TransactionWithFinishedFlag | undefined): Promise<void> {
  if (transaction && !transaction.finished) {
    await transaction.rollback();
  }
}

/**
 * `POST /api/finance/reconciliation/statements` — importa um arquivo
 * `.ofx` (upload multipart, campo `file`), criando o extrato e seus
 * lançamentos (dedup por `fitid` na reimportação).
 */
exports.importStatement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const file = (req as unknown as { file?: { originalname: string; buffer: Buffer } }).file;
    if (!file) {
      throw new ValidationError('Nenhum arquivo enviado. Envie o extrato no campo "file" (multipart/form-data).');
    }

    const useCase = new ImportStatementUseCase(reconciliationRepository);
    const result = await useCase.execute({
      filename: file.originalname,
      buffer: file.buffer,
      importedBy: req.user.id,
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'create',
      entityType: 'BankStatement',
      entityId: result.statement.id,
      entityDescription: result.statement.filename,
      newValues: {
        entries_created: result.entries_created,
        duplicates_skipped: result.duplicates_skipped,
        total_in_file: result.total_in_file,
      },
      description: `Extrato "${result.statement.filename}" importado (${result.entries_created} lançamento(s) novo(s), ${result.duplicates_skipped} duplicado(s) ignorado(s))`,
    });

    res.status(201).json({
      success: true,
      data: {
        statement: result.statement,
        entries_created: result.entries_created,
        duplicates_skipped: result.duplicates_skipped,
        total_in_file: result.total_in_file,
      },
    });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/** `GET /api/finance/reconciliation/statements` — lista extratos importados, paginados. */
exports.listStatements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listStatementsQuerySchema.parse(req.query);
    const useCase = new ListStatementsUseCase(reconciliationRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute(query);
    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) return next(new ValidationError('Payload invalido.', (error as any).issues));
    next(error);
  }
};

/** `GET /api/finance/reconciliation/statements/:id/entries?status=` — lista lançamentos de um extrato. */
exports.listStatementEntries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listStatementEntriesQuerySchema.parse(req.query);
    const useCase = new ListStatementEntriesUseCase(reconciliationRepository);
    const entries = await useCase.execute({ statementId: req.params.id, status: query.status });
    res.json({ success: true, data: entries });
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) return next(new ValidationError('Payload invalido.', (error as any).issues));
    next(error);
  }
};

/**
 * `GET /api/finance/reconciliation/statements/:id/suggestions` — sugestões
 * automáticas de match por lançamento pendente (nunca vincula sozinho).
 */
exports.getSuggestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetMatchSuggestionsUseCase(reconciliationRepository);
    const suggestions = await useCase.execute({ statementId: req.params.id });
    res.json({ success: true, data: suggestions });
  } catch (error) { next(error); }
};

/**
 * `POST /api/finance/reconciliation/entries/:id/match` — vincula e dá
 * baixa (XOR `payable_id`/`receivable_id`).
 */
exports.matchEntry = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const parsed = matchEntrySchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new MatchEntryUseCase(reconciliationRepository);
    const result = await useCase.execute({
      entryId: req.params.id,
      payableId: parsed.data.payable_id,
      receivableId: parsed.data.receivable_id,
      userId: req.user.id,
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'status_change',
      entityType: 'BankStatementEntry',
      entityId: result.entry.id,
      newValues: { status: 'matched', accountType: result.accountType, accountId: result.account.id },
      description: `Lançamento #${result.entry.id} conciliado com ${result.accountType === 'payable' ? 'conta a pagar' : 'conta a receber'} #${result.account.id}`,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/** `POST /api/finance/reconciliation/entries/:id/ignore` — marca o lançamento como sem conciliação necessária. */
exports.ignoreEntry = async (req: Request, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const useCase = new IgnoreEntryUseCase(reconciliationRepository);
    const entry = await useCase.execute({ entryId: req.params.id, transaction: t });
    await t.commit();

    logAction(req, {
      action: 'status_change',
      entityType: 'BankStatementEntry',
      entityId: entry.id,
      newValues: { status: 'ignored' },
      description: `Lançamento #${entry.id} ignorado na conciliação bancária`,
    });

    res.json({ success: true, data: entry });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/** `POST /api/finance/reconciliation/entries/:id/unmatch` — desfaz o vínculo (422 se a conta já foi baixada). */
exports.unmatchEntry = async (req: Request, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const useCase = new UnmatchEntryUseCase(reconciliationRepository);
    const entry = await useCase.execute({ entryId: req.params.id, transaction: t });
    await t.commit();

    logAction(req, {
      action: 'status_change',
      entityType: 'BankStatementEntry',
      entityId: entry.id,
      newValues: { status: 'pending' },
      description: `Vínculo de conciliação do lançamento #${entry.id} desfeito`,
    });

    res.json({ success: true, data: entry });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};
