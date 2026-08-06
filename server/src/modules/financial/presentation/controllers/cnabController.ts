import type { Request, Response, NextFunction } from 'express';
import type { Transaction } from 'sequelize';

const { sequelize } = require('../../../../config/database');
const { logAction } = require('../../../../services/auditLogService');
const { ValidationError } = require('../../../../errors');
const SequelizeCnabRepository = require('../../infrastructure/sequelize/SequelizeCnabRepository');
const GetBankingConfigUseCase = require('../../application/use-cases/GetBankingConfigUseCase');
const UpsertBankingConfigUseCase = require('../../application/use-cases/UpsertBankingConfigUseCase');
const GenerateRemittanceUseCase = require('../../application/use-cases/GenerateRemittanceUseCase');
const ListRemittancesUseCase = require('../../application/use-cases/ListRemittancesUseCase');
const GetRemittanceUseCase = require('../../application/use-cases/GetRemittanceUseCase');
const ProcessReturnFileUseCase = require('../../application/use-cases/ProcessReturnFileUseCase');
const ListReturnFilesUseCase = require('../../application/use-cases/ListReturnFilesUseCase');
const ListReturnOccurrencesUseCase = require('../../application/use-cases/ListReturnOccurrencesUseCase');
const {
  upsertBankingConfigSchema, generateRemittanceSchema, listRemittancesQuerySchema, handleZodError,
} = require('../validators/cnabValidators');

/**
 * Controller da Cobrança CNAB 240 v1 (`/api/finance/cnab/*`) — remessa e
 * retorno de cobrança registrada. Interpreta `req`, delega toda a regra de
 * negócio aos use cases da camada de aplicação e devolve sempre o envelope
 * padrão `{ success: true, data }`.
 *
 * @module modules/financial/presentation/controllers/cnabController
 */
const cnabRepository = new SequelizeCnabRepository();

/** Requisição autenticada: `req.user` populado pelo middleware `authenticate`. */
type AuthenticatedRequest = Request & { user: { id: number } };

/** `Transaction` expõe `finished` em runtime (não declarado publicamente pelo pacote) — mesmo padrão do resto do módulo. */
type TransactionWithFinishedFlag = Transaction & { finished?: 'commit' | 'rollback' };

/** Desfaz (`ROLLBACK`) uma transação Sequelize ainda pendente, se houver. */
async function rollbackIfPending(transaction: TransactionWithFinishedFlag | undefined): Promise<void> {
  if (transaction && !transaction.finished) {
    await transaction.rollback();
  }
}

/** `GET /api/finance/cnab/banking-config` — busca a configuração bancária singleton (`null` se ainda não cadastrada). */
exports.getBankingConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetBankingConfigUseCase(cnabRepository);
    const config = await useCase.execute();
    res.json({ success: true, data: config });
  } catch (error) { next(error); }
};

/** `PUT /api/finance/cnab/banking-config` — cria/atualiza a configuração bancária singleton. */
exports.upsertBankingConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = upsertBankingConfigSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpsertBankingConfigUseCase(cnabRepository);
    const config = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'update',
      entityType: 'CompanyBankingConfig',
      entityId: config?.id,
      newValues: { bank_code: config?.bank_code, agency: config?.agency, account_number: config?.account_number },
      description: 'Configuração bancária (CNAB) da empresa atualizada',
    });

    res.json({ success: true, data: config });
  } catch (error) { next(error); }
};

/** `POST /api/finance/cnab/remittances` — gera uma remessa CNAB 240 a partir de `receivable_ids`. */
exports.generateRemittance = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const parsed = generateRemittanceSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new GenerateRemittanceUseCase(cnabRepository);
    const result = await useCase.execute({
      receivableIds: parsed.data.receivable_ids,
      userId: req.user.id,
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'create',
      entityType: 'CnabRemittance',
      entityId: result.remittance.id,
      entityDescription: result.remittance.filename,
      newValues: { total_items: result.remittance.total_items, total_amount: result.remittance.total_amount },
      description: `Remessa CNAB "${result.remittance.filename}" gerada com ${result.items.length} título(s)`,
    });

    res.status(201).json({
      success: true,
      data: {
        remittance: {
          id: result.remittance.id,
          sequential_number: result.remittance.sequential_number,
          filename: result.remittance.filename,
          total_items: result.remittance.total_items,
          total_amount: result.remittance.total_amount,
        },
        items: result.items,
      },
    });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/** `GET /api/finance/cnab/remittances` — lista remessas geradas, paginadas. */
exports.listRemittances = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listRemittancesQuerySchema.parse(req.query);
    const useCase = new ListRemittancesUseCase(cnabRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute(query);
    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error: any) {
    if (error?.issues) return next(new ValidationError('Payload invalido.', error.issues));
    next(error);
  }
};

/** `GET /api/finance/cnab/remittances/:id/download` — baixa o conteúdo do arquivo de remessa (`text/plain`). */
exports.downloadRemittance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetRemittanceUseCase(cnabRepository);
    const remittance = await useCase.execute({ id: req.params.id });

    res.setHeader('Content-Type', 'text/plain; charset=latin1');
    res.setHeader('Content-Disposition', `attachment; filename="${remittance.filename}"`);
    res.send(remittance.file_content);
  } catch (error) { next(error); }
};

/** `POST /api/finance/cnab/returns` — processa um arquivo de retorno (upload multipart, campo `file`). */
exports.processReturnFile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const file = (req as unknown as { file?: { originalname: string; buffer: Buffer } }).file;
    if (!file) {
      throw new ValidationError('Nenhum arquivo enviado. Envie o retorno no campo "file" (multipart/form-data).');
    }

    const useCase = new ProcessReturnFileUseCase(cnabRepository);
    const result = await useCase.execute({
      filename: file.originalname,
      buffer: file.buffer,
      userId: req.user.id,
      transaction: t,
    });

    await t.commit();

    logAction(req, {
      action: 'create',
      entityType: 'CnabReturnFile',
      entityId: result.returnFile.id,
      entityDescription: result.returnFile.filename,
      newValues: {
        occurrences_count: result.occurrences_count,
        settled_count: result.settled_count,
        duplicates_skipped: result.duplicates_skipped,
      },
      description: `Retorno CNAB "${result.returnFile.filename}" processado (${result.settled_count} título(s) liquidado(s), ${result.duplicates_skipped} ocorrência(s) duplicada(s) ignorada(s))`,
    });

    res.status(201).json({
      success: true,
      data: {
        return_file: result.returnFile,
        occurrences_count: result.occurrences_count,
        settled_count: result.settled_count,
        duplicates_skipped: result.duplicates_skipped,
        unmatched_count: result.unmatched_count,
      },
    });
  } catch (error) {
    await rollbackIfPending(t);
    next(error);
  }
};

/** `GET /api/finance/cnab/returns` — lista arquivos de retorno processados, paginados. */
exports.listReturnFiles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listRemittancesQuerySchema.parse(req.query);
    const useCase = new ListReturnFilesUseCase(cnabRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute(query);
    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error: any) {
    if (error?.issues) return next(new ValidationError('Payload invalido.', error.issues));
    next(error);
  }
};

/** `GET /api/finance/cnab/returns/:id/occurrences` — lista as ocorrências de um retorno processado. */
exports.listReturnOccurrences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new ListReturnOccurrencesUseCase(cnabRepository);
    const occurrences = await useCase.execute({ returnFileId: req.params.id });
    res.json({ success: true, data: occurrences });
  } catch (error) { next(error); }
};
