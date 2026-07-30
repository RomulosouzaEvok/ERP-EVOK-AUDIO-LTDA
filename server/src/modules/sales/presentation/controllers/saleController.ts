const { sequelize } = require('../../../../config/database');
const { logAction } = require('../../../../services/auditLogService');
const SequelizeSaleRepository = require('../../infrastructure/sequelize/SequelizeSaleRepository');
const ListSalesUseCase = require('../../application/use-cases/ListSalesUseCase');
const GetSaleByIdUseCase = require('../../application/use-cases/GetSaleByIdUseCase');
const CreateSaleUseCase = require('../../application/use-cases/CreateSaleUseCase');
const ChangeSaleStatusUseCase = require('../../application/use-cases/ChangeSaleStatusUseCase');
const {
  createSaleSchema,
  updateSaleStatusSchema,
  listSalesQuerySchema,
  getSaleByIdParamSchema,
  handleZodError
} = require('../validators/saleValidators');

/**
 * Controller enxuto do módulo `sales`. Interpreta `req`, delega toda a
 * regra de negócio aos use cases da camada de aplicação e devolve sempre o
 * envelope padrão `{ success: true, data, ... }` — mantendo exatamente o
 * mesmo formato JSON e os mesmos 4 endpoints do controller anterior
 * (`server/src/controllers/saleController.ts`), que permanece no
 * repositório apenas como referência histórica e não está mais registrado
 * em nenhuma rota ativa (ver `server/src/modules/sales/README.md`).
 */
const saleRepository = new SequelizeSaleRepository();

/**
 * `GET /api/sales` — lista vendas com filtros e paginação.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.list = async (req, res, next) => {
  try {
    // Validação de payload
    const validatedQuery = listSalesQuerySchema.safeParse(req.query);
    if (!validatedQuery.success) {
      return handleZodError(validatedQuery.error);
    }

    const { page = 1, limit = 10, status, start_date, end_date, customer_id } = validatedQuery.data;
    const useCase = new ListSalesUseCase(saleRepository);
    const { rows, count, page: p, limit: l, totalPages } = await useCase.execute({
      status, customer_id, start_date, end_date,
      page: parseInt(String(page), 10), limit: parseInt(String(limit), 10), offset: (parseInt(String(page), 10) - 1) * parseInt(String(limit), 10)
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: l, totalPages } });
  } catch (error) { next(error); }
};

/**
 * `GET /api/sales/:id` — busca uma venda pelo id.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getById = async (req, res, next) => {
  try {
    // Validação de payload
    const validatedParams = getSaleByIdParamSchema.safeParse(req.params);
    if (!validatedParams.success) {
      return handleZodError(validatedParams.error);
    }

    const useCase = new GetSaleByIdUseCase(saleRepository);
    const sale = await useCase.execute({ id: validatedParams.data.id });
    res.json({ success: true, data: sale });
  } catch (error) { next(error); }
};

/**
 * `POST /api/sales` — cria uma venda com seus itens, debita estoque e gera
 * as parcelas em `AccountReceivable` (transacional).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.create = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    // Validação de payload
    const validatedBody = createSaleSchema.safeParse(req.body);
    if (!validatedBody.success) {
      await t.rollback();
      return handleZodError(validatedBody.error);
    }

    const { customer_id, items, discount = 0, payment_method, installments = 1, notes } = validatedBody.data;
    const useCase = new CreateSaleUseCase(saleRepository);
    const { sale, totalNet } = await useCase.execute({
      customer_id, items, discount, payment_method, installments, notes,
      userId: req.user.id, transaction: t
    });

    await t.commit();

    // Log de auditoria feito após o commit para não segurar locks de banco.
    logAction(req, {
      action: 'create',
      entityType: 'Sale',
      entityId: sale.id,
      entityDescription: `Venda #${sale.id}`,
      newValues: { customer_id, total_amount: totalNet, status: 'confirmed' },
      description: `Venda #${sale.id} criada`
    });

    const fullSale = await saleRepository.findSaleWithCustomerSummary(sale.id);
    res.status(201).json({ success: true, data: fullSale });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * `PUT /api/sales/:id/status` — altera o status da venda respeitando a
 * máquina de estados; ao cancelar, restaura o estoque e cancela as
 * parcelas pendentes (transacional).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.updateStatus = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    // Validação de payload
    const validatedBody = updateSaleStatusSchema.safeParse(req.body);
    if (!validatedBody.success) {
      await t.rollback();
      return handleZodError(validatedBody.error);
    }

    const { status } = validatedBody.data;
    const useCase = new ChangeSaleStatusUseCase(saleRepository);
    const { sale, previousStatus } = await useCase.execute({ id: req.params.id, status, userId: req.user.id, transaction: t });

    await t.commit();

    // Log de auditoria feito após o commit para não segurar locks de banco.
    logAction(req, {
      action: 'status_change',
      entityType: 'Sale',
      entityId: sale.id,
      entityDescription: `Venda #${sale.id}`,
      oldValues: { status: previousStatus },
      newValues: { status },
      description: `Venda #${sale.id}: status alterado de ${previousStatus} para ${status}`
    });

    res.json({ success: true, data: sale });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};



