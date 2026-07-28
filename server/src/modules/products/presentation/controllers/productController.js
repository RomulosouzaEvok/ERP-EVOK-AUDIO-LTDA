const { logAction } = require('../../../../services/auditLogService');
const SequelizeProductRepository = require('../../infrastructure/sequelize/SequelizeProductRepository');
const ListProductsUseCase = require('../../application/use-cases/ListProductsUseCase');
const GetProductByIdUseCase = require('../../application/use-cases/GetProductByIdUseCase');
const CreateProductUseCase = require('../../application/use-cases/CreateProductUseCase');
const UpdateProductUseCase = require('../../application/use-cases/UpdateProductUseCase');
const DeactivateProductUseCase = require('../../application/use-cases/DeactivateProductUseCase');
const RegisterProductMovementUseCase = require('../../application/use-cases/RegisterProductMovementUseCase');
const { validateMovementBody } = require('../validators/productValidators');

/**
 * Controller enxuto do módulo `products`. Interpreta `req`, delega toda a
 * regra de negócio aos use cases da camada de aplicação e devolve sempre o
 * envelope padrão `{ success: true, data, ... }` — mantendo exatamente o
 * mesmo formato JSON do controller legado
 * (`server/src/controllers/productController.js`), que permanece no
 * repositório apenas como referência histórica e não está mais registrado
 * em nenhuma rota ativa (ver `server/src/modules/products/README.md`).
 */
const productRepository = new SequelizeProductRepository();

/**
 * `GET /api/products` — lista produtos com filtros e paginação.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, category_id, low_stock, status } = req.query;
    const useCase = new ListProductsUseCase(productRepository);
    const { rows, count, page: p, limit: l, totalPages } = await useCase.execute({
      search, category_id, status, low_stock,
      limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit), page: parseInt(page)
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: l, totalPages } });
  } catch (error) { next(error); }
};

/**
 * `GET /api/products/:id` — busca um produto pelo id.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getById = async (req, res, next) => {
  try {
    const useCase = new GetProductByIdUseCase(productRepository);
    const product = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: product });
  } catch (error) { next(error); }
};

/**
 * `POST /api/products` — cria um novo produto.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.create = async (req, res, next) => {
  try {
    const useCase = new CreateProductUseCase(productRepository);
    const product = await useCase.execute({ ...req.body, tsParams: extractTsParams(req.body) });

    logAction(req, {
      action: 'create',
      entityType: 'Product',
      entityId: product.id,
      entityDescription: product.code,
      newValues: { name: product.name, code: product.code, price: product.price },
      description: `Produto ${product.code} criado`
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, error: 'Código do produto já existe' });
    next(error);
  }
};

/**
 * `PUT /api/products/:id` — atualiza um produto existente.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.update = async (req, res, next) => {
  try {
    const useCase = new UpdateProductUseCase(productRepository);
    const { product, oldValues, updateData, isRevision, before } = await useCase.execute({ id: req.params.id, body: req.body });

    logAction(req, {
      action: 'update',
      entityType: 'Product',
      entityId: product.id,
      entityDescription: product.code,
      oldValues,
      newValues: updateData,
      description: isRevision
        ? `Produto ${product.code} revisado (revisão ${before.revision} → ${updateData.revision})`
        : `Produto ${product.code} atualizado`
    });

    res.json({ success: true, data: product });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, error: 'Código já existe' });
    next(error);
  }
};

/**
 * `DELETE /api/products/:id` — inativa (soft delete) um produto.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.remove = async (req, res, next) => {
  try {
    const useCase = new DeactivateProductUseCase(productRepository);
    const { before } = await useCase.execute({ id: req.params.id });

    logAction(req, {
      action: 'soft_delete',
      entityType: 'Product',
      entityId: before.id,
      entityDescription: before.code,
      oldValues: { status: before.status },
      newValues: { status: 'inactive' },
      description: `Produto ${before.code} inativado`
    });

    res.json({ success: true, data: { message: 'Produto inativado com sucesso' } });
  } catch (error) { next(error); }
};

/**
 * `POST /api/products/movements` — registra movimentação manual de estoque.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.movement = async (req, res, next) => {
  try {
    validateMovementBody(req.body);
    const { product_id, type, quantity, description } = req.body;
    const useCase = new RegisterProductMovementUseCase(productRepository);
    const { movement, product, previousQuantity, newQuantity } = await useCase.execute({
      product_id, type, quantity, description, userId: req.user.id
    });

    logAction(req, {
      action: 'create',
      entityType: 'InventoryMovement',
      entityId: movement.id,
      entityDescription: product.code,
      oldValues: { quantity: previousQuantity },
      newValues: { quantity: newQuantity },
      description: `Movimentação manual de estoque (${type}) - produto ${product.code}`
    });

    res.status(201).json({ success: true, data: movement });
  } catch (error) { next(error); }
};

/**
 * Extrai os campos `ts_*`/`tsParams` enviados no corpo da requisição para o
 * formato aceito por `ThieleSmallParams` (chaves em minúsculas sem prefixo).
 * Aceita tanto `req.body.tsParams = { fs, qms, ... }` quanto campos soltos
 * `ts_params_fs`, `ts_params_qms`, ... (formato usado pelo model Sequelize),
 * para compatibilidade com clients existentes.
 *
 * @param {Object} body - `req.body`.
 * @returns {Object} Objeto `{ fs, qms, qes, ... }` pronto para `ThieleSmallParams`.
 */
function extractTsParams(body) {
  if (body.tsParams && typeof body.tsParams === 'object') return body.tsParams;
  const fields = ['fs', 'qms', 'qes', 'qts', 'vas', 'sd', 'xmax', 're', 'le', 'bl', 'mms', 'cms', 'spl'];
  const out = {};
  for (const f of fields) {
    const key = `ts_params_${f}`;
    if (body[key] !== undefined) out[f] = body[key];
  }
  return out;
}
