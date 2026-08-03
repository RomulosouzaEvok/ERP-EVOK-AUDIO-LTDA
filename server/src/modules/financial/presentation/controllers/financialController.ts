const { logAction } = require('../../../../services/auditLogService');
const SequelizeFinancialRepository = require('../../infrastructure/sequelize/SequelizeFinancialRepository');
const ListReceivablesUseCase = require('../../application/use-cases/ListReceivablesUseCase');
const ReceivePaymentUseCase = require('../../application/use-cases/ReceivePaymentUseCase');
const ListPayablesUseCase = require('../../application/use-cases/ListPayablesUseCase');
const CreatePayableUseCase = require('../../application/use-cases/CreatePayableUseCase');
const PayPayableUseCase = require('../../application/use-cases/PayPayableUseCase');
const GetCashFlowUseCase = require('../../application/use-cases/GetCashFlowUseCase');
const GetCashFlowProjectionUseCase = require('../../application/use-cases/GetCashFlowProjectionUseCase');
const { createPayableSchema, payAccountSchema, cashFlowProjectionQuerySchema, handleZodError } = require('../validators/financialValidators');

/**
 * Controller enxuto do módulo `financial`. Interpreta `req`, delega toda a
 * regra de negócio aos use cases da camada de aplicação e devolve sempre o
 * envelope padrão `{ success: true, data, ... }` — mantendo exatamente o
 * mesmo formato JSON e os mesmos 6 endpoints do controller anterior
 * (`server/src/controllers/financeController.ts`), que permanece no
 * repositório apenas como referência histórica e não está mais registrado
 * em nenhuma rota ativa (ver `server/src/modules/financial/README.md`).
 */
const financialRepository = new SequelizeFinancialRepository();

/**
 * `GET /api/finance/receivable` — lista contas a receber com filtros e paginação.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.listReceivable = async (req, res, next) => {
  try {
    const { status, start_date, end_date, customer_id, page = 1, limit = 10 } = req.query;
    const useCase = new ListReceivablesUseCase(financialRepository);
    const { rows, count, page: p, limit: l, totalPages } = await useCase.execute({
      status, customer_id, start_date, end_date,
      page: parseInt(String(page), 10), limit: parseInt(String(limit), 10), offset: (parseInt(String(page), 10) - 1) * parseInt(String(limit), 10)
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: l, totalPages } });
  } catch (error) { next(error); }
};

/**
 * `PUT /api/finance/receivable/:id/pay` — registra o recebimento de uma conta a receber.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.receivePayment = async (req, res, next) => {
  try {
    const parsed = payAccountSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const { payment_date, payment_method, amount } = parsed.data;
    const useCase = new ReceivePaymentUseCase(financialRepository);
    const { account, previousStatus } = await useCase.execute({ id: req.params.id, payment_date, payment_method, amount });

    logAction(req, {
      action: 'status_change',
      entityType: 'AccountReceivable',
      entityId: account.id,
      entityDescription: `Conta a receber #${account.id}`,
      oldValues: { status: previousStatus },
      newValues: { status: 'paid', amount: account.amount },
      description: `Conta a receber #${account.id} recebida`
    });

    res.json({ success: true, data: account });
  } catch (error) { next(error); }
};

/**
 * `GET /api/finance/payable` — lista contas a pagar com filtros e paginação.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.listPayable = async (req, res, next) => {
  try {
    const { status, start_date, end_date, page = 1, limit = 10 } = req.query;
    const useCase = new ListPayablesUseCase(financialRepository);
    const { rows, count, page: p, limit: l, totalPages } = await useCase.execute({
      status, start_date, end_date,
      page: parseInt(String(page), 10), limit: parseInt(String(limit), 10), offset: (parseInt(String(page), 10) - 1) * parseInt(String(limit), 10)
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: l, totalPages } });
  } catch (error) { next(error); }
};

/**
 * `POST /api/finance/payable` — cria uma conta a pagar.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.createPayable = async (req, res, next) => {
  try {
    const parsed = createPayableSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const { description, amount, due_date, category, supplier_id, purchase_id, notes } = parsed.data;
    const useCase = new CreatePayableUseCase(financialRepository);
    const account = await useCase.execute({ description, amount, due_date, category, supplier_id, purchase_id, notes });

    logAction(req, {
      action: 'create',
      entityType: 'AccountPayable',
      entityId: account.id,
      entityDescription: description,
      newValues: { description, amount, due_date, status: 'pending' },
      description: `Conta a pagar "${description}" criada`
    });

    res.status(201).json({ success: true, data: account });
  } catch (error) { next(error); }
};

/**
 * `PUT /api/finance/payable/:id/pay` — registra o pagamento de uma conta a pagar.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.payPayable = async (req, res, next) => {
  try {
    const parsed = payAccountSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const { payment_date, payment_method, amount } = parsed.data;
    const useCase = new PayPayableUseCase(financialRepository);
    const { account, previousStatus } = await useCase.execute({ id: req.params.id, payment_date, payment_method, amount });

    logAction(req, {
      action: 'status_change',
      entityType: 'AccountPayable',
      entityId: account.id,
      entityDescription: account.description,
      oldValues: { status: previousStatus },
      newValues: { status: 'paid', amount: account.amount },
      description: `Conta a pagar "${account.description}" paga`
    });

    res.json({ success: true, data: account });
  } catch (error) { next(error); }
};

/**
 * `GET /api/finance/cash-flow` — calcula o fluxo de caixa em um período.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.cashFlow = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const useCase = new GetCashFlowUseCase(financialRepository);
    const data = await useCase.execute({ start_date, end_date });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/**
 * `GET /api/finance/cash-flow-projection` — projeta o fluxo de caixa dos
 * títulos em aberto (contas a receber/pagar) por semana, com saldo
 * acumulado e bucket separado de títulos vencidos e não pagos.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.cashFlowProjection = async (req, res, next) => {
  try {
    const parsed = cashFlowProjectionQuerySchema.safeParse(req.query);
    if (!parsed.success) handleZodError(parsed.error);
    const { days } = parsed.data;
    const useCase = new GetCashFlowProjectionUseCase(financialRepository);
    const data = await useCase.execute({ days });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};



