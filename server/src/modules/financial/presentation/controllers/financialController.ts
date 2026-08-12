import type { Request, Response, NextFunction } from 'express';

const { logAction } = require('../../../../services/auditLogService');
const SequelizeFinancialRepository = require('../../infrastructure/sequelize/SequelizeFinancialRepository');
const ListReceivablesUseCase = require('../../application/use-cases/ListReceivablesUseCase');
const ReceivePaymentUseCase = require('../../application/use-cases/ReceivePaymentUseCase');
const ListPayablesUseCase = require('../../application/use-cases/ListPayablesUseCase');
const CreatePayableUseCase = require('../../application/use-cases/CreatePayableUseCase');
const CreateReceivableUseCase = require('../../application/use-cases/CreateReceivableUseCase');
const PayPayableUseCase = require('../../application/use-cases/PayPayableUseCase');
const GetCashFlowUseCase = require('../../application/use-cases/GetCashFlowUseCase');
const GetCashFlowProjectionUseCase = require('../../application/use-cases/GetCashFlowProjectionUseCase');
const GetDailyCashFlowProjectionUseCase = require('../../application/use-cases/GetDailyCashFlowProjectionUseCase');
const UpdatePayableCostCenterUseCase = require('../../application/use-cases/UpdatePayableCostCenterUseCase');
const UpdateReceivableCostCenterUseCase = require('../../application/use-cases/UpdateReceivableCostCenterUseCase');
const SequelizeCostCenterRepository = require('../../infrastructure/sequelize/SequelizeCostCenterRepository');
const {
  createPayableSchema, createReceivableSchema, payAccountSchema, cashFlowProjectionQuerySchema,
  dailyCashFlowProjectionQuerySchema, updateCostCenterAssignmentSchema, handleZodError,
} = require('../validators/financialValidators');

/**
 * Controller enxuto do módulo `financial`. Interpreta `req`, delega toda a
 * regra de negócio aos use cases da camada de aplicação e devolve sempre o
 * envelope padrão `{ success: true, data, ... }` — mantendo exatamente o
 * mesmo formato JSON e os mesmos 6 endpoints do controller anterior
 * (`financeController.ts`, hoje removido do
 * repositório — histórico no git).
 */
const financialRepository = new SequelizeFinancialRepository();
const costCenterRepository = new SequelizeCostCenterRepository();

/**
 * `GET /api/finance/receivable` — lista contas a receber com filtros e paginação.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.listReceivable = async (req: Request, res: Response, next: NextFunction) => {
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
exports.receivePayment = async (req: Request, res: Response, next: NextFunction) => {
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
exports.listPayable = async (req: Request, res: Response, next: NextFunction) => {
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
exports.createPayable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createPayableSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const { description, amount, due_date, category, supplier_id, purchase_id, invoice_type, notes, cost_center_id } = parsed.data;
    const useCase = new CreatePayableUseCase(financialRepository);
    const account = await useCase.execute({ description, amount, due_date, category, supplier_id, purchase_id, invoice_type, notes, cost_center_id });

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
 * `POST /api/finance/receivable` — cria uma conta a receber **avulsa**
 * (sem venda vinculada).
 *
 * Decisão D-J do dono do produto (2026-08-10): cobrança sem pedido de venda
 * — reembolso, aluguel, venda de sucata — é caso legítimo da operação e
 * este caminho permanece aberto. O que o G13 fechou foi o outro: recebível
 * **de venda** agora nasce na autorização da NF-e (CPC 47 item 108), então
 * informar `sale_id` aqui devolve 422 com `details.rule = 'G13-AR'`.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.createReceivable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createReceivableSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const useCase = new CreateReceivableUseCase(financialRepository);
    const account = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'AccountReceivable',
      entityId: account.id,
      entityDescription: parsed.data.notes || `Cobranca avulsa cliente #${parsed.data.customer_id}`,
      newValues: { customer_id: parsed.data.customer_id, amount: parsed.data.amount, due_date: parsed.data.due_date, status: 'pending', sale_id: null },
      description: 'Conta a receber avulsa (sem venda vinculada) criada'
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
exports.payPayable = async (req: Request, res: Response, next: NextFunction) => {
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
exports.cashFlow = async (req: Request, res: Response, next: NextFunction) => {
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
exports.cashFlowProjection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = cashFlowProjectionQuerySchema.safeParse(req.query);
    if (!parsed.success) handleZodError(parsed.error);
    const { days } = parsed.data;
    const useCase = new GetCashFlowProjectionUseCase(financialRepository);
    const data = await useCase.execute({ days });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/**
 * `GET /api/finance/cashflow/projection` — projeta o fluxo de caixa DIÁRIO
 * (série dia a dia, saldo acumulado a partir de um saldo inicial opcional e
 * menor saldo do período) no horizonte de 30, 60 ou 90 dias — o dado de
 * decisão do CFO para antecipar risco de caixa negativo.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.dailyCashFlowProjection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = dailyCashFlowProjectionQuerySchema.safeParse(req.query);
    if (!parsed.success) handleZodError(parsed.error);
    const { days, opening_balance } = parsed.data;
    const useCase = new GetDailyCashFlowProjectionUseCase(financialRepository);
    const data = await useCase.execute({ days, opening_balance });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/**
 * `PUT /api/finance/payable/:id/cost-center` — atribui (ou remove, com
 * `cost_center_id: null`) o centro de custo de uma conta a pagar existente.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.updatePayableCostCenter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateCostCenterAssignmentSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const useCase = new UpdatePayableCostCenterUseCase(financialRepository, costCenterRepository);
    const account = await useCase.execute({ id: req.params.id, cost_center_id: parsed.data.cost_center_id });

    logAction(req, {
      action: 'update',
      entityType: 'AccountPayable',
      entityId: account.id,
      entityDescription: account.description,
      newValues: { cost_center_id: parsed.data.cost_center_id },
      description: `Centro de custo da conta a pagar #${account.id} atualizado`
    });

    res.json({ success: true, data: account });
  } catch (error) { next(error); }
};

/**
 * `PUT /api/finance/receivable/:id/cost-center` — atribui (ou remove, com
 * `cost_center_id: null`) o centro de custo de uma conta a receber existente.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.updateReceivableCostCenter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateCostCenterAssignmentSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);
    const useCase = new UpdateReceivableCostCenterUseCase(financialRepository, costCenterRepository);
    const account = await useCase.execute({ id: req.params.id, cost_center_id: parsed.data.cost_center_id });

    logAction(req, {
      action: 'update',
      entityType: 'AccountReceivable',
      entityId: account.id,
      entityDescription: `Conta a receber #${account.id}`,
      newValues: { cost_center_id: parsed.data.cost_center_id },
      description: `Centro de custo da conta a receber #${account.id} atualizado`
    });

    res.json({ success: true, data: account });
  } catch (error) { next(error); }
};



