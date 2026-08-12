import type { Request, Response, NextFunction } from 'express';

const SequelizeSuppliersRepository = require('../../infrastructure/sequelize/SequelizeSuppliersRepository');
const SequelizeItemSupplierRepository = require('../../../items/infrastructure/sequelize/SequelizeItemSupplierRepository');
const ListSuppliersUseCase = require('../../application/use-cases/ListSuppliersUseCase');
const GetSupplierByIdUseCase = require('../../application/use-cases/GetSupplierByIdUseCase');
const CreateSupplierUseCase = require('../../application/use-cases/CreateSupplierUseCase');
const UpdateSupplierUseCase = require('../../application/use-cases/UpdateSupplierUseCase');
const DeactivateSupplierUseCase = require('../../application/use-cases/DeactivateSupplierUseCase');
const ListSupplierItemsUseCase = require('../../application/use-cases/ListSupplierItemsUseCase');
const { createSupplierSchema, updateSupplierSchema, handleZodError } = require('../validators/supplierValidators');

/**
 * Controller enxuto do módulo `suppliers`. Interpreta `req`, delega toda a
 * regra de negócio aos use cases da camada de aplicação e devolve sempre o
 * envelope padrão `{ success: true, data }`, mantendo exatamente o mesmo
 * formato JSON e os mesmos 5 endpoints do controller anterior
 * (`supplierController.ts`, hoje removido do
 * repositório — histórico no git).
 */
const suppliersRepository = new SequelizeSuppliersRepository();
const itemSupplierRepository = new SequelizeItemSupplierRepository();

/**
 * `GET /api/suppliers` — lista fornecedores com busca/filtro e paginação.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const useCase = new ListSuppliersUseCase(suppliersRepository);
    const { rows, count, page: p, limit: l, totalPages } = await useCase.execute({
      search, status, page: parseInt(String(page), 10), limit: parseInt(String(limit), 10)
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: p, limit: l, totalPages }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * `GET /api/suppliers/:id` — busca um fornecedor pelo id.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetSupplierByIdUseCase(suppliersRepository);
    const supplier = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
};

/**
 * `POST /api/suppliers` — cria um novo fornecedor.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createSupplierSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateSupplierUseCase(suppliersRepository);
    const supplier = await useCase.execute(parsed.data);

    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
};

/**
 * `PUT /api/suppliers/:id` — atualiza um fornecedor existente.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateSupplierSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateSupplierUseCase(suppliersRepository);
    const supplier = await useCase.execute({ id: req.params.id, body: parsed.data });
    res.json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
};

/**
 * `DELETE /api/suppliers/:id` — inativa (soft delete) um fornecedor.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new DeactivateSupplierUseCase(suppliersRepository);
    const result = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * `GET /api/suppliers/:id/items` — lista os vinculos ativos de itens
 * (catalogo N:N) de um fornecedor.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.listItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new ListSupplierItemsUseCase(suppliersRepository, itemSupplierRepository);
    const data = await useCase.execute({ supplierId: Number(req.params.id) });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};



