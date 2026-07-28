const SequelizeSuppliersRepository = require('../../infrastructure/sequelize/SequelizeSuppliersRepository');
const ListSuppliersUseCase = require('../../application/use-cases/ListSuppliersUseCase');
const GetSupplierByIdUseCase = require('../../application/use-cases/GetSupplierByIdUseCase');
const CreateSupplierUseCase = require('../../application/use-cases/CreateSupplierUseCase');
const UpdateSupplierUseCase = require('../../application/use-cases/UpdateSupplierUseCase');
const DeactivateSupplierUseCase = require('../../application/use-cases/DeactivateSupplierUseCase');

/**
 * Controller enxuto do módulo `suppliers`. Interpreta `req`, delega toda a
 * regra de negócio aos use cases da camada de aplicação e devolve sempre o
 * envelope padrão `{ success: true, data }`, mantendo exatamente o mesmo
 * formato JSON e os mesmos 5 endpoints do controller legado
 * (`server/src/controllers/supplierController.js`), que permanece no
 * repositório apenas como referência histórica e não está mais registrado
 * em nenhuma rota ativa (ver `server/src/modules/suppliers/README.md`).
 */
const suppliersRepository = new SequelizeSuppliersRepository();

/**
 * `GET /api/suppliers` — lista fornecedores com busca/filtro e paginação.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const useCase = new ListSuppliersUseCase(suppliersRepository);
    const { rows, count, page: p, limit: l, totalPages } = await useCase.execute({
      search, status, page: parseInt(page), limit: parseInt(limit)
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
exports.getById = async (req, res, next) => {
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
exports.create = async (req, res, next) => {
  try {
    const {
      company_name, trade_name, cnpj, ie, phone, email, address,
      contact_name, contact_phone, payment_terms, delivery_time, notes
    } = req.body;

    const useCase = new CreateSupplierUseCase(suppliersRepository);
    const supplier = await useCase.execute({
      company_name, trade_name, cnpj, ie, phone, email, address,
      contact_name, contact_phone, payment_terms, delivery_time, notes
    });

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
exports.update = async (req, res, next) => {
  try {
    const useCase = new UpdateSupplierUseCase(suppliersRepository);
    const supplier = await useCase.execute({ id: req.params.id, body: req.body });
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
exports.remove = async (req, res, next) => {
  try {
    const useCase = new DeactivateSupplierUseCase(suppliersRepository);
    const result = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
