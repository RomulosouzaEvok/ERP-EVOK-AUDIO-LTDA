import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP do Plano de Contas (`/api/accounting/accounts`).
 *
 * @module modules/accounting/presentation/controllers/chartOfAccountsController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeAccountingRepository = require('../../infrastructure/sequelize/SequelizeAccountingRepository');
const CreateAccountUseCase = require('../../application/use-cases/account/CreateAccountUseCase');
const ListAccountsUseCase = require('../../application/use-cases/account/ListAccountsUseCase');
const GetAccountByIdUseCase = require('../../application/use-cases/account/GetAccountByIdUseCase');
const UpdateAccountUseCase = require('../../application/use-cases/account/UpdateAccountUseCase');
const {
  createAccountSchema, updateAccountSchema, listAccountQuerySchema, handleZodError,
} = require('../validators/chartOfAccountsValidators');
const { ValidationError } = require('../../../../errors');

const accountingRepository = new SequelizeAccountingRepository();

/** `GET /api/accounting/accounts` — lista paginada, filtros opcionais de `account_type`/`active`/`parent_id`. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listAccountQuerySchema.parse(req.query);
    const useCase = new ListAccountsUseCase(accountingRepository);
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

/** `GET /api/accounting/accounts/:id` — busca por id. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetAccountByIdUseCase(accountingRepository);
    const account = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: account });
  } catch (error) { next(error); }
};

/** `POST /api/accounting/accounts` — cria uma conta do plano (409 se `code` duplicado). */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createAccountSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateAccountUseCase(accountingRepository);
    const account = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'AccountingChartOfAccount',
      entityId: account?.id,
      entityDescription: account?.code,
      newValues: { code: account?.code, name: account?.name, account_type: account?.account_type },
      description: `Conta ${account?.code} - ${account?.name} criada no plano de contas`,
    });

    res.status(201).json({ success: true, data: account });
  } catch (error) { next(error); }
};

/** `PUT /api/accounting/accounts/:id` — atualiza `name`/`account_type`/`accept_entries`/`active`. */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateAccountSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateAccountUseCase(accountingRepository);
    const account = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'AccountingChartOfAccount',
      entityId: account?.id,
      entityDescription: account?.code,
      newValues: parsed.data,
      description: `Conta ${account?.code} atualizada`,
    });

    res.json({ success: true, data: account });
  } catch (error) { next(error); }
};
