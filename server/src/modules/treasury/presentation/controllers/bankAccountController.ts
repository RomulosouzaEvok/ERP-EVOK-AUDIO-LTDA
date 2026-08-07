import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Contas Bancárias (`/api/treasury/bank-accounts`).
 *
 * @module modules/treasury/presentation/controllers/bankAccountController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeTreasuryRepository = require('../../infrastructure/sequelize/SequelizeTreasuryRepository');
const CreateBankAccountUseCase = require('../../application/use-cases/bank-account/CreateBankAccountUseCase');
const ListBankAccountsUseCase = require('../../application/use-cases/bank-account/ListBankAccountsUseCase');
const GetBankAccountByIdUseCase = require('../../application/use-cases/bank-account/GetBankAccountByIdUseCase');
const UpdateBankAccountUseCase = require('../../application/use-cases/bank-account/UpdateBankAccountUseCase');
const {
  createBankAccountSchema, updateBankAccountSchema, listBankAccountQuerySchema, handleZodError,
} = require('../validators/treasuryValidators');
const { ValidationError } = require('../../../../errors');

const treasuryRepository = new SequelizeTreasuryRepository();

/** `GET /api/treasury/bank-accounts` — lista paginada, filtros opcionais de `account_type`/`active`. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listBankAccountQuerySchema.parse(req.query);
    const useCase = new ListBankAccountsUseCase(treasuryRepository);
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

/** `GET /api/treasury/bank-accounts/:id` — busca por id. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetBankAccountByIdUseCase(treasuryRepository);
    const account = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: account });
  } catch (error) { next(error); }
};

/** `POST /api/treasury/bank-accounts` — cria uma conta bancária (409 se agência+número duplicados). */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createBankAccountSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateBankAccountUseCase(treasuryRepository);
    const account = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'TreasuryBankAccount',
      entityId: account?.id,
      entityDescription: `${account?.bank_name} - ${account?.agency}/${account?.account_number}`,
      newValues: { bank_name: account?.bank_name, agency: account?.agency, account_number: account?.account_number, account_type: account?.account_type },
      description: `Conta bancária ${account?.bank_name} (${account?.agency}/${account?.account_number}) cadastrada`,
    });

    res.status(201).json({ success: true, data: account });
  } catch (error) { next(error); }
};

/** `PUT /api/treasury/bank-accounts/:id` — atualiza campos de uma conta bancária. */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateBankAccountSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateBankAccountUseCase(treasuryRepository);
    const account = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'TreasuryBankAccount',
      entityId: account?.id,
      entityDescription: `${account?.bank_name} - ${account?.agency}/${account?.account_number}`,
      newValues: parsed.data,
      description: `Conta bancária ${account?.bank_name} (${account?.agency}/${account?.account_number}) atualizada`,
    });

    res.json({ success: true, data: account });
  } catch (error) { next(error); }
};
