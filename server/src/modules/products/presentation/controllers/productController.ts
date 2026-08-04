const { sequelize } = require('../../../../config/database');
const { logAction } = require('../../../../services/auditLogService');
const SequelizeProductRepository = require('../../infrastructure/sequelize/SequelizeProductRepository');
const ListProductsUseCase = require('../../application/use-cases/ListProductsUseCase');
const GetProductByIdUseCase = require('../../application/use-cases/GetProductByIdUseCase');
const CreateProductUseCase = require('../../application/use-cases/CreateProductUseCase');
const UpdateProductUseCase = require('../../application/use-cases/UpdateProductUseCase');
const DeactivateProductUseCase = require('../../application/use-cases/DeactivateProductUseCase');
const RegisterProductMovementUseCase = require('../../application/use-cases/RegisterProductMovementUseCase');
const GetProductStockByWarehouseUseCase = require('../../application/use-cases/GetProductStockByWarehouseUseCase');
const UploadEntityPhotoUseCase = require('../../../../shared/application/UploadEntityPhotoUseCase');
const GenerateEntityQrCodeUseCase = require('../../../../shared/application/GenerateEntityQrCodeUseCase');
const { createProductSchema, updateProductSchema, productMovementSchema, handleZodError } = require('../validators/productValidators');

/**
 * Controller enxuto do módulo `products`. Interpreta `req`, delega toda a
 * regra de negócio aos use cases da camada de aplicação e devolve sempre o
 * envelope padrão `{ success: true, data, ... }` — mantendo exatamente o
 * mesmo formato JSON do controller anterior
 * (`server/src/controllers/productController.ts`), que permanece no
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
      limit: parseInt(String(limit), 10), offset: (parseInt(String(page), 10) - 1) * parseInt(String(limit), 10), page: parseInt(String(page), 10)
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
 * `GET /api/products/:id/stock-by-warehouse` — saldo de um produto
 * específico, detalhado por depósito (Bloco 4, docs/governance/TODO.md).
 * Protegido com `authorizeModule('estoque')` (nível de leitura), mesmo
 * padrão do endpoint de listagem `GET /api/inventory/warehouse-stock` —
 * consulta de saldo é operação do módulo de estoque, mesmo estando
 * aninhada sob `/api/products`.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getStockByWarehouse = async (req, res, next) => {
  try {
    const useCase = new GetProductStockByWarehouseUseCase(productRepository);
    const result = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: result });
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
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(parsed.error);

    const useCase = new CreateProductUseCase(productRepository);
    const product = await useCase.execute({ ...parsed.data, tsParams: extractTsParams(parsed.data) });

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
    const parsed = updateProductSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(parsed.error);

    const useCase = new UpdateProductUseCase(productRepository);
    const { product, oldValues, updateData, isRevision, before } = await useCase.execute({ id: req.params.id, body: parsed.data });

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
  let t;
  try {
    const parsed = productMovementSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const { product_id, type, quantity, description } = parsed.data;
    t = await sequelize.transaction();
    const useCase = new RegisterProductMovementUseCase(productRepository);
    const { movement, product, previousQuantity, newQuantity } = await useCase.execute({
      product_id, type, quantity, description, userId: req.user.id, transaction: t
    });

    await t.commit();

    // Log de auditoria feito após o commit para não segurar locks de banco.
    logAction(req, {
      action: 'create',
      entityType: 'InventoryMovement',
      entityId: movement.id,
      entityDescription: product.code,
      oldValues: { quantity: previousQuantity },
      newValues: { quantity: newQuantity },
      description: `Movimentação manual de estoque (${type}) - produto ${product.code}`
    });

    res.status(201).json({ success: true, data: { product, movementId: movement.id } });
  } catch (error) {
    if (t && !t.finished) await t.rollback();
    if (error.statusCode && !error.code) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    next(error);
  }
};

/**
 * `POST /api/products/:id/photo` — envia/substitui a foto do produto.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.uploadPhoto = async (req, res, next) => {
  try {
    const useCase = new UploadEntityPhotoUseCase();
    const { photo_path, entity } = await useCase.execute({
      repository: productRepository,
      id: req.params.id,
      file: req.file,
      subfolder: 'products',
      entityLabel: 'Produto',
    });

    logAction(req, {
      action: 'update',
      entityType: 'Product',
      entityId: entity.id,
      entityDescription: entity.code,
      newValues: { photo_path },
      description: `Foto do produto ${entity.code} atualizada`
    });

    res.json({ success: true, data: entity });
  } catch (error) { next(error); }
};

/**
 * `GET /api/products/:id/qrcode` — gera o QR Code do produto (PNG ou SVG via `?format=svg`).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getQrCode = async (req, res, next) => {
  try {
    const useCase = new GenerateEntityQrCodeUseCase();
    const result = await useCase.execute({
      repository: productRepository,
      id: req.params.id,
      entityType: 'product',
      entityLabel: 'Produto',
      format: req.query.format === 'svg' ? 'svg' : 'png',
      buildData: (product) => ({ code: product.code, name: product.name }),
    });

    res.json({ success: true, data: result });
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



