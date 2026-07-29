const { logAction } = require('../../../../services/auditLogService');
const SequelizeBOMRepository = require('../../infrastructure/sequelize/SequelizeBOMRepository');
const ListBOMsUseCase = require('../../application/use-cases/ListBOMsUseCase');
const GetBOMByIdUseCase = require('../../application/use-cases/GetBOMByIdUseCase');
const GetActiveBOMByProductUseCase = require('../../application/use-cases/GetActiveBOMByProductUseCase');
const ListBOMVersionsUseCase = require('../../application/use-cases/ListBOMVersionsUseCase');
const CreateBOMUseCase = require('../../application/use-cases/CreateBOMUseCase');
const UpdateBOMUseCase = require('../../application/use-cases/UpdateBOMUseCase');
const DeactivateBOMUseCase = require('../../application/use-cases/DeactivateBOMUseCase');
const ExplodeBOMUseCase = require('../../application/use-cases/ExplodeBOMUseCase');
const CalculateBOMCostUseCase = require('../../application/use-cases/CalculateBOMCostUseCase');
const CheckBOMAvailabilityUseCase = require('../../application/use-cases/CheckBOMAvailabilityUseCase');
const GetBOMTreeUseCase = require('../../application/use-cases/GetBOMTreeUseCase');
const ListBOMItemsUseCase = require('../../application/use-cases/ListBOMItemsUseCase');

/**
 * Controller enxuto do módulo `bom` (Estrutura de Produto). Interpreta
 * `req`, delega toda a regra de negócio aos use cases da camada de
 * aplicação (que por sua vez delegam a lógica pesada de explosão, custo,
 * disponibilidade e versionamento ao já existente `BomService`) e devolve
 * sempre o envelope padrão `{ success: true, data, ... }` — mantendo
 * exatamente o mesmo formato JSON do controller anterior
 * (`server/src/controllers/bomController.ts`), que permanece no
 * repositório apenas como referência histórica e não está mais registrado
 * em nenhuma rota ativa (ver `server/src/modules/bom/README.md`).
 */
const bomRepository = new SequelizeBOMRepository();

/**
 * Responde erros lançados por `BomService` (objetos `Error` simples com
 * `statusCode`, não `AppError`) no mesmo formato usado pelo controller
 * anterior; demais erros são deanteriors ao `errorHandler` global via `next`.
 *
 * @param {Error} error
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
function handleError(error, res, next) {
  if (error.statusCode && !error.code) {
    return res.status(error.statusCode).json({ success: false, error: error.message });
  }
  next(error);
}

/**
 * `GET /api/engineering/bom` — lista BOMs com filtros e paginação.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.list = async (req, res, next) => {
  try {
    const { page, limit, status, search, product_id } = req.query;
    const useCase = new ListBOMsUseCase(bomRepository);
    const { rows, count, page: p, limit: l, totalPages } = await useCase.execute({ page, limit, status, search, product_id });
    res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: l, totalPages } });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `GET /api/engineering/bom/:id` — busca uma BOM por id com itens.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getById = async (req, res, next) => {
  try {
    const useCase = new GetBOMByIdUseCase(bomRepository);
    const bom = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: bom });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `GET /api/engineering/bom/product/:productId` — retorna a BOM ativa de um produto.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getByProduct = async (req, res, next) => {
  try {
    const useCase = new GetActiveBOMByProductUseCase(bomRepository);
    const bom = await useCase.execute({ productId: req.params.productId });
    res.json({ success: true, data: bom });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `GET /api/engineering/bom/product/:productId/versions` — **novo endpoint
 * aditivo**. Lista todas as versões (qualquer status) de BOM de um
 * produto, ordenadas por data de criação.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.listVersions = async (req, res, next) => {
  try {
    const useCase = new ListBOMVersionsUseCase(bomRepository);
    const versions = await useCase.execute({ productId: req.params.productId });
    res.json({ success: true, data: versions });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `POST /api/engineering/bom` — cria uma nova BOM para um produto com seus
 * componentes. `BomService.createBOM` já cuida do versionamento automático
 * (supersede das BOMs ativas anteriores).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.create = async (req, res, next) => {
  try {
    const { product_id, items, revision, revision_notes, notes } = req.body;
    const useCase = new CreateBOMUseCase();
    const result = await useCase.execute({ product_id, items, revision, revision_notes, notes, userId: req.user.id });

    const bomId = result && (result.id || (result.bom && result.bom.id));
    logAction(req, {
      action: 'create',
      entityType: 'BOM',
      entityId: bomId,
      entityDescription: `Produto #${product_id}`,
      newValues: { product_id, revision, items_count: items ? items.length : 0 },
      description: `BOM criada para o produto #${product_id}`
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `PUT /api/engineering/bom/:id` — atualiza dados gerais de uma BOM
 * (via `UpdateBOMUseCase`, que aceita todos os campos permitidos incluindo
 * `status`). Quando `status` muda para `active`, o log de auditoria usa
 * `action: 'approve'` (mesma detecção `isApproval` do controller anterior).
 * `ApproveBOMUseCase` existe como wrapper dedicado (Fase 6 do TODO.md) e
 * pode ser usado por fluxos futuros de aprovação isolada — ver README.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.update = async (req, res, next) => {
  try {
    // Usa sempre UpdateBOMUseCase (aceita todos os ALLOWED_FIELDS, incluindo
    // status) para preservar 100% o comportamento do controller anterior, que
    // aplicava todos os campos enviados em uma única chamada. ApproveBOMUseCase
    // fica disponível como wrapper dedicado para fluxos futuros que precisem
    // de uma aprovação isolada (ver README do módulo).
    const useCase = new UpdateBOMUseCase(bomRepository);
    const { before, updateData, bom } = await useCase.execute({ id: req.params.id, data: req.body });

    const oldValues: any = {};
    for (const field of Object.keys(updateData)) oldValues[field] = before[field];

    const isApproval = updateData.status === 'active' && before.status !== 'active';
    const isRevision = updateData.revision !== undefined && updateData.revision !== before.revision;

    logAction(req, {
      action: isApproval ? 'approve' : 'update',
      entityType: 'BOM',
      entityId: bom.id,
      entityDescription: bom.product ? bom.product.code : `BOM #${bom.id}`,
      oldValues,
      newValues: updateData,
      description: isApproval
        ? `BOM #${bom.id} aprovada (status alterado para active)`
        : (isRevision ? `BOM #${bom.id} revisada (revisão ${before.revision} → ${updateData.revision})` : `BOM #${bom.id} atualizada`)
    });

    res.json({ success: true, data: bom });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `DELETE /api/engineering/bom/:id` — inativa (soft delete) uma BOM.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.remove = async (req, res, next) => {
  try {
    const useCase = new DeactivateBOMUseCase(bomRepository);
    const bom = await useCase.execute({ id: req.params.id });

    logAction(req, {
      action: 'soft_delete',
      entityType: 'BOM',
      entityId: bom.id,
      entityDescription: `BOM #${bom.id}`,
      oldValues: { status: bom.status },
      newValues: { status: 'inactive' },
      description: `BOM #${bom.id} inativada`
    });

    res.json({ success: true, data: { message: 'BOM inativada com sucesso' } });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `GET /api/engineering/bom/:id/explode?qty=` — explode a BOM para uma quantidade.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.explode = async (req, res, next) => {
  try {
    const useCase = new ExplodeBOMUseCase(bomRepository);
    const result = await useCase.execute({ id: req.params.id, qty: req.query.qty });
    res.json({ success: true, data: result });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `GET /api/engineering/bom/:id/cost?qty=` — calcula o custo do produto baseado na BOM ativa.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.cost = async (req, res, next) => {
  try {
    const useCase = new CalculateBOMCostUseCase(bomRepository);
    const result = await useCase.execute({ id: req.params.id, qty: req.query.qty });
    res.json({ success: true, data: result });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `GET /api/engineering/bom/:id/availability?qty=` — verifica disponibilidade de estoque.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.availability = async (req, res, next) => {
  try {
    const useCase = new CheckBOMAvailabilityUseCase(bomRepository);
    const result = await useCase.execute({ id: req.params.id, qty: req.query.qty });
    res.json({ success: true, data: result });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `GET /api/engineering/bom/:id/tree` — retorna a árvore hierárquica completa da BOM.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.tree = async (req, res, next) => {
  try {
    const useCase = new GetBOMTreeUseCase();
    const result = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: result });
  } catch (error) { handleError(error, res, next); }
};

/**
 * `GET /api/engineering/bom/:id/items` — lista os itens de uma BOM.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.listItems = async (req, res, next) => {
  try {
    const useCase = new ListBOMItemsUseCase(bomRepository);
    const items = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: items });
  } catch (error) { handleError(error, res, next); }
};



