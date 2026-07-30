const SequelizeItemRepository = require('../../infrastructure/sequelize/SequelizeItemRepository');
const SequelizeItemEstruturaRepository = require('../../infrastructure/sequelize/SequelizeItemEstruturaRepository');
const CreateItemUseCase = require('../../application/use-cases/CreateItemUseCase');
const CreateItemStructureUseCase = require('../../application/use-cases/CreateItemStructureUseCase');
const ExplodeItemStructureUseCase = require('../../application/use-cases/ExplodeItemStructureUseCase');
const DeactivateItemUseCase = require('../../application/use-cases/DeactivateItemUseCase');
const { createItemSchema, createItemStructureSchema, listItemsQuerySchema, explodeItemStructureQuerySchema } = require('../validators/itemValidators');
const { ValidationError } = require('../../../../errors');
const Validators = require('../../../../utils/validators');

const itemRepository = new SequelizeItemRepository();
const itemEstruturaRepository = new SequelizeItemEstruturaRepository();

/**
 * Controller do modulo de itens industriais.
 */
exports.list = async (req, res, next) => {
  try {
    const query = listItemsQuerySchema.parse(req.query);
    const { page = 1, limit = 10 } = query;
    const { rows, count } = await itemRepository.list({
      search: query.search ? Validators.sanitizeSearch(query.search) : undefined,
      tipo: query.tipo,
      status: query.status,
      limit,
      offset: (page - 1) * limit,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    if (error?.issues) {
      return next(new ValidationError('Payload invalido.', error.issues));
    }
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const body = createItemSchema.parse(req.body);
    const useCase = new CreateItemUseCase(itemRepository);
    const item = await useCase.execute(body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    if (error?.issues) {
      return next(new ValidationError('Payload invalido.', error.issues));
    }
    next(error);
  }
};

exports.createStructure = async (req, res, next) => {
  try {
    const body = createItemStructureSchema.parse({ ...req.body, item_pai_id: req.params.id, criado_por: req.user?.id ?? null });
    const useCase = new CreateItemStructureUseCase(itemRepository, itemEstruturaRepository);
    const structure = await useCase.execute(body);
    res.status(201).json({ success: true, data: structure });
  } catch (error) {
    if (error?.issues) {
      return next(new ValidationError('Payload invalido.', error.issues));
    }
    next(error);
  }
};

exports.explode = async (req, res, next) => {
  try {
    const query = explodeItemStructureQuerySchema.parse(req.query);
    const useCase = new ExplodeItemStructureUseCase(itemRepository, itemEstruturaRepository);
    const data = await useCase.execute({
      itemId: req.params.id,
      quantity: query.quantity,
      dueDate: query.due_date,
    });
    res.json({ success: true, data });
  } catch (error) {
    if (error?.issues) {
      return next(new ValidationError('Payload invalido.', error.issues));
    }
    next(error);
  }
};

/**
 * PATCH /api/items/:id/inactivate
 * Inativa um item (soft delete) com verificacao de vinculos ativos.
 * Retorna 422 se houver dependencias (BOM, OP, movimentos, lotes, MRP).
 */
exports.inactivate = async (req, res, next) => {
  try {
    const useCase = new DeactivateItemUseCase(itemRepository, itemEstruturaRepository);
    const item = await useCase.execute({ itemId: req.params.id });
    res.json({ success: true, data: item });
  } catch (error) {
    if (error?.issues) {
      return next(new ValidationError('Payload invalido.', error.issues));
    }
    next(error);
  }
};
