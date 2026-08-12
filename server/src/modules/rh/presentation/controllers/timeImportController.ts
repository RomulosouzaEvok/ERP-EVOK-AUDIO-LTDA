import type { Request, Response, NextFunction } from 'express';
import type { Transaction } from 'sequelize';

/**
 * Controller HTTP do Grupo 10 — Frequência/Ponto
 * (`/api/rh/time-imports`, `/api/rh/attendance`) — importação do AEJ
 * (Arquivo Eletrônico de Jornada) exportado pela administradora dos REPs
 * RWTech/Pointline. Ver `docs/rh/04-FREQUENCIA.md`.
 *
 * @module modules/rh/presentation/controllers/timeImportController
 */

/** Arquivo Multer (memória) — tipo local, mesmo padrão de `employeeDocumentController.ts`. */
type MulterFile = { originalname: string; mimetype: string; size: number; buffer?: Buffer };
type RequestWithFile = Request & { file?: MulterFile; user: { id: number } };

const { sequelize } = require('../../../../config/database');
const { logAction } = require('../../../../services/auditLogService');
const { ValidationError } = require('../../../../errors');

const SequelizeTimeImportRepository = require('../../infrastructure/sequelize/SequelizeTimeImportRepository');

const CreateTimeImportBatchUseCase = require('../../application/use-cases/timeImport/CreateTimeImportBatchUseCase');
const ConfirmTimeImportBatchUseCase = require('../../application/use-cases/timeImport/ConfirmTimeImportBatchUseCase');
const ListTimeImportBatchesUseCase = require('../../application/use-cases/timeImport/ListTimeImportBatchesUseCase');
const GetTimeImportBatchUseCase = require('../../application/use-cases/timeImport/GetTimeImportBatchUseCase');
const GetMonthlyAttendanceSummaryUseCase = require('../../application/use-cases/timeImport/GetMonthlyAttendanceSummaryUseCase');

const {
  createTimeImportBatchSchema, listTimeImportBatchQuerySchema, monthlyAttendanceSummaryQuerySchema,
} = require('../validators/timeImportValidators');

const path = require('path');

const timeImportRepository = new SequelizeTimeImportRepository();

/**
 * Extensões aceitas para o arquivo AEJ. O parser (`aejParser`) trabalha
 * puramente sobre texto, então nenhuma delas é validada por magic bytes
 * (arquivo texto puro não tem assinatura binária) — só a extensão, no
 * mesmo espírito de `DOCUMENT_ALLOWED_EXTENSIONS` de
 * `employeeDocumentController.ts`.
 */
const AEJ_ALLOWED_EXTENSIONS = ['.txt', '.aej', '.rem'];

function toValidationError(error: any) {
  return error?.issues ? new ValidationError('Payload inválido.', error.issues) : error;
}

/** `Transaction` expõe `finished` em runtime (não declarado publicamente pelo pacote) — mesmo padrão do resto do projeto. */
type TransactionWithFinishedFlag = Transaction & { finished?: 'commit' | 'rollback' };

async function rollbackIfPending(transaction: TransactionWithFinishedFlag | undefined): Promise<void> {
  if (transaction && !transaction.finished) {
    await transaction.rollback();
  }
}

/**
 * `POST /api/rh/time-imports` — upload multipart (campo `file`) do AEJ +
 * `competencia_inicio`/`competencia_fim` no corpo. Parseia, grava lote +
 * itens e devolve o relatório de não-casados na mesma resposta.
 */
exports.create = async (req: RequestWithFile, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const parsed = createTimeImportBatchSchema.parse(req.body ?? {});
    if (!req.file || !req.file.buffer) {
      throw new ValidationError('Arquivo AEJ é obrigatório (campo "file").');
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!AEJ_ALLOWED_EXTENSIONS.includes(ext)) {
      throw new ValidationError(`Extensão "${ext}" não permitida. Permitidas: ${AEJ_ALLOWED_EXTENSIONS.join(', ')}.`);
    }

    const useCase = new CreateTimeImportBatchUseCase(timeImportRepository);
    const result = await useCase.execute({
      filename: req.file.originalname,
      buffer: req.file.buffer,
      competencia_inicio: parsed.competencia_inicio,
      competencia_fim: parsed.competencia_fim,
      importedBy: req.user.id,
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'import',
      entityType: 'HrTimeImportBatch',
      entityId: result.batch?.id,
      entityDescription: `Lote de ponto "${req.file.originalname}" (${parsed.competencia_inicio} a ${parsed.competencia_fim})`,
      newValues: {
        status: result.batch?.status,
        total_lines: result.batch?.total_lines,
        matched_count: result.matched_count ?? 0,
        unmatched_count: result.unmatched_count ?? 0,
        rejected_count: result.rejected_count ?? 0,
      },
      description: result.batch?.status === 'rejected'
        ? `Importação de ponto rejeitada (erro estrutural): ${result.batch?.rejection_reason}`
        : `Ponto importado: ${result.matched_count ?? 0} linha(s) casada(s), `
          + `${result.unmatched_count ?? 0} não-casada(s), ${result.rejected_count ?? 0} linha(s) rejeitada(s)`,
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    await rollbackIfPending(t);
    next(toValidationError(error));
  }
};

/** `GET /api/rh/time-imports` — lista lotes, filtros `status`/`competencia` (YYYY-MM). */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listTimeImportBatchQuerySchema.parse(req.query);
    const result = await new ListTimeImportBatchesUseCase(timeImportRepository).execute(query);
    res.json({
      success: true,
      data: result.rows,
      pagination: { total: result.count, page: result.page, limit: result.limit, totalPages: result.totalPages },
    });
  } catch (error) { next(toValidationError(error)); }
};

/** `GET /api/rh/time-imports/:id` — detalhe com itens e não-casados. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetTimeImportBatchUseCase(timeImportRepository).execute({ id: req.params.id });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `POST /api/rh/time-imports/:id/confirm` — confirma o lote (só a partir de `validated`). */
exports.confirm = async (req: RequestWithFile, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const data = await new ConfirmTimeImportBatchUseCase(timeImportRepository).execute({
      id: req.params.id,
      confirmedBy: req.user.id,
      transaction: t,
    });
    await t.commit();

    logAction(req, {
      action: 'status_change',
      entityType: 'HrTimeImportBatch',
      entityId: Number(req.params.id),
      entityDescription: `Lote de ponto #${req.params.id}`,
      newValues: { status: 'confirmed' },
      description: `Lote de importação de ponto #${req.params.id} confirmado`,
    });

    res.json({ success: true, data });
  } catch (error) {
    await rollbackIfPending(t);
    next(toValidationError(error));
  }
};

/** `GET /api/rh/attendance/monthly-summary?competencia=YYYY-MM&employee_id=` — resumo mensal por funcionário. */
exports.monthlySummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = monthlyAttendanceSummaryQuerySchema.parse(req.query);
    const data = await new GetMonthlyAttendanceSummaryUseCase(timeImportRepository).execute(query);
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

module.exports.AEJ_ALLOWED_EXTENSIONS = AEJ_ALLOWED_EXTENSIONS;
