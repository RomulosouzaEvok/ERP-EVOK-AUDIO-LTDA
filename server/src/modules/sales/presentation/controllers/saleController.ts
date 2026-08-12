import type { Request, Response, NextFunction } from 'express';

const { sequelize } = require('../../../../config/database');
const { logAction } = require('../../../../services/auditLogService');
const SequelizeSaleRepository = require('../../infrastructure/sequelize/SequelizeSaleRepository');
const ListSalesUseCase = require('../../application/use-cases/ListSalesUseCase');
const GetSaleByIdUseCase = require('../../application/use-cases/GetSaleByIdUseCase');
const CreateSaleUseCase = require('../../application/use-cases/CreateSaleUseCase');
const ChangeSaleStatusUseCase = require('../../application/use-cases/ChangeSaleStatusUseCase');
const EditSaleItemsUseCase = require('../../application/use-cases/EditSaleItemsUseCase');
const ListCustomerPricesUseCase = require('../../application/use-cases/ListCustomerPricesUseCase');
const CreateCustomerPriceUseCase = require('../../application/use-cases/CreateCustomerPriceUseCase');
const UpdateCustomerPriceUseCase = require('../../application/use-cases/UpdateCustomerPriceUseCase');
const DeactivateCustomerPriceUseCase = require('../../application/use-cases/DeactivateCustomerPriceUseCase');
const {
  createSaleSchema,
  updateSaleStatusSchema,
  listSalesQuerySchema,
  getSaleByIdParamSchema,
  editSaleItemsSchema,
  editSaleItemsParamSchema,
  customerIdParamSchema,
  customerPriceIdParamSchema,
  listCustomerPricesQuerySchema,
  createCustomerPriceSchema,
  updateCustomerPriceSchema,
  handleZodError
} = require('../validators/saleValidators');

/**
 * Controller enxuto do módulo `sales`. Interpreta `req`, delega toda a
 * regra de negócio aos use cases da camada de aplicação e devolve sempre o
 * envelope padrão `{ success: true, data, ... }` — mantendo exatamente o
 * mesmo formato JSON e os mesmos 4 endpoints do controller anterior
 * (`saleController.ts`, hoje removido do
 * repositório — histórico no git).
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
exports.list = async (req: Request, res: Response, next: NextFunction) => {
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
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
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
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  const t = await sequelize.transaction();
  try {
    // Validação de payload. `handleZodError` sempre lança; o rollback desta
    // transação acontece uma única vez, no catch abaixo.
    const validatedBody = createSaleSchema.safeParse(req.body);
    if (!validatedBody.success) {
      return handleZodError(validatedBody.error);
    }

    const { customer_id, items, discount = 0, payment_method, installments = 1, notes, status = 'confirmed' } = validatedBody.data;
    const useCase = new CreateSaleUseCase(saleRepository);
    const { sale, totalNet } = await useCase.execute({
      customer_id, items, discount, payment_method, installments, notes, status,
      userId: (req as any).user.id, transaction: t
    });

    await t.commit();

    // Log de auditoria feito após o commit para não segurar locks de banco.
    logAction(req, {
      action: 'create',
      entityType: 'Sale',
      entityId: sale.id,
      entityDescription: `Venda #${sale.id}`,
      newValues: { customer_id, total_amount: totalNet, status: sale.status },
      description: `Venda #${sale.id} criada (${sale.status})`
    });

    const fullSale = await saleRepository.findSaleWithCustomerSummary(sale.id);
    res.status(201).json({ success: true, data: fullSale });
  } catch (error) {
    if (!t.finished) await t.rollback();
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
exports.updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  const t = await sequelize.transaction();
  try {
    // Validação de payload. `handleZodError` sempre lança; o rollback desta
    // transação acontece uma única vez, no catch abaixo.
    const validatedBody = updateSaleStatusSchema.safeParse(req.body);
    if (!validatedBody.success) {
      return handleZodError(validatedBody.error);
    }

    const { status } = validatedBody.data;
    const useCase = new ChangeSaleStatusUseCase(saleRepository);
    const { sale, previousStatus } = await useCase.execute({ id: req.params.id, status, userId: (req as any).user.id, transaction: t });

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
    if (!t.finished) await t.rollback();
    next(error);
  }
};

/**
 * `PUT /api/sales/:id/items` — substitui o conjunto de itens de uma venda
 * `quote`/`confirmed` (ajustando estoque quando `confirmed`), gap 2/3
 * ("Alteração de pedido").
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.editItems = async (req: Request, res: Response, next: NextFunction) => {
  const t = await sequelize.transaction();
  try {
    const validatedParams = editSaleItemsParamSchema.safeParse(req.params);
    if (!validatedParams.success) {
      return handleZodError(validatedParams.error);
    }
    const validatedBody = editSaleItemsSchema.safeParse(req.body);
    if (!validatedBody.success) {
      return handleZodError(validatedBody.error);
    }

    const useCase = new EditSaleItemsUseCase(saleRepository);
    const { sale, oldItems } = await useCase.execute({
      id: validatedParams.data.id,
      items: validatedBody.data.items,
      userId: (req as any).user.id,
      transaction: t
    });

    await t.commit();

    logAction(req, {
      action: 'update',
      entityType: 'Sale',
      entityId: sale.id,
      entityDescription: `Venda #${sale.id}`,
      oldValues: { items: oldItems.map((item: any) => ({ product_id: item.product_id, quantity: item.quantity, unit_price: item.unit_price })), total_amount: null },
      newValues: { items: validatedBody.data.items, total_amount: sale.total_amount },
      description: `Venda #${sale.id}: itens alterados`
    });

    const fullSale = await saleRepository.findSaleWithCustomerSummary(sale.id);
    res.json({ success: true, data: fullSale });
  } catch (error) {
    if (!t.finished) await t.rollback();
    next(error);
  }
};

/**
 * `GET /api/sales/customers/:id/prices` — lista a tabela de preços de um
 * cliente (gap 1/3, "Tabela de preços por cliente").
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.listCustomerPrices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedParams = customerIdParamSchema.safeParse(req.params);
    if (!validatedParams.success) return handleZodError(validatedParams.error);
    const validatedQuery = listCustomerPricesQuerySchema.safeParse(req.query);
    if (!validatedQuery.success) return handleZodError(validatedQuery.error);

    const useCase = new ListCustomerPricesUseCase(saleRepository);
    const prices = await useCase.execute({
      customerId: validatedParams.data.id,
      productId: validatedQuery.data.product_id,
      activeOnly: validatedQuery.data.active_only
    });
    res.json({ success: true, data: prices });
  } catch (error) { next(error); }
};

/**
 * `POST /api/sales/customers/:id/prices` — cadastra um preço para o par
 * cliente×produto (gap 1/3).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.createCustomerPrice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedParams = customerIdParamSchema.safeParse(req.params);
    if (!validatedParams.success) return handleZodError(validatedParams.error);
    const validatedBody = createCustomerPriceSchema.safeParse(req.body);
    if (!validatedBody.success) return handleZodError(validatedBody.error);

    const useCase = new CreateCustomerPriceUseCase(saleRepository);
    const price = await useCase.execute({
      customerId: validatedParams.data.id,
      productId: validatedBody.data.product_id,
      unitPrice: validatedBody.data.unit_price,
      currency: validatedBody.data.currency,
      validFrom: validatedBody.data.valid_from,
      validUntil: validatedBody.data.valid_until,
      userId: (req as any).user.id
    });

    logAction(req, {
      action: 'create',
      entityType: 'CustomerPriceList',
      entityId: price.id,
      entityDescription: `Preço cliente #${validatedParams.data.id} / produto #${price.product_id}`,
      newValues: { unit_price: price.unit_price, valid_from: price.valid_from, valid_until: price.valid_until },
      description: `Preço cadastrado para cliente #${validatedParams.data.id}, produto #${price.product_id}`
    });

    res.status(201).json({ success: true, data: price });
  } catch (error) { next(error); }
};

/**
 * `PUT /api/sales/customers/:id/prices/:priceId` — atualiza um preço do
 * cliente (gap 1/3).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.updateCustomerPrice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedParams = customerPriceIdParamSchema.safeParse(req.params);
    if (!validatedParams.success) return handleZodError(validatedParams.error);
    const validatedBody = updateCustomerPriceSchema.safeParse(req.body);
    if (!validatedBody.success) return handleZodError(validatedBody.error);

    const useCase = new UpdateCustomerPriceUseCase(saleRepository);
    const price = await useCase.execute({
      customerId: validatedParams.data.id,
      priceId: validatedParams.data.priceId,
      unitPrice: validatedBody.data.unit_price,
      currency: validatedBody.data.currency,
      validFrom: validatedBody.data.valid_from,
      validUntil: validatedBody.data.valid_until
    });

    logAction(req, {
      action: 'update',
      entityType: 'CustomerPriceList',
      entityId: price.id,
      entityDescription: `Preço cliente #${validatedParams.data.id} / produto #${price.product_id}`,
      newValues: validatedBody.data,
      description: `Preço #${price.id} atualizado`
    });

    res.json({ success: true, data: price });
  } catch (error) { next(error); }
};

/**
 * `DELETE /api/sales/customers/:id/prices/:priceId` — desativa (soft
 * delete) um preço do cliente (gap 1/3).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.deactivateCustomerPrice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedParams = customerPriceIdParamSchema.safeParse(req.params);
    if (!validatedParams.success) return handleZodError(validatedParams.error);

    const useCase = new DeactivateCustomerPriceUseCase(saleRepository);
    const price = await useCase.execute({ customerId: validatedParams.data.id, priceId: validatedParams.data.priceId });

    logAction(req, {
      action: 'delete',
      entityType: 'CustomerPriceList',
      entityId: price.id,
      entityDescription: `Preço cliente #${validatedParams.data.id} / produto #${price.product_id}`,
      description: `Preço #${price.id} desativado`
    });

    res.json({ success: true, data: price });
  } catch (error) { next(error); }
};


