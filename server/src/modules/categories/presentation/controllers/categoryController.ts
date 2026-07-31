const SequelizeCategoriesRepository = require('../../infrastructure/sequelize/SequelizeCategoriesRepository');
const ListCategoriesUseCase = require('../../application/use-cases/ListCategoriesUseCase');
const GetCategoryByIdUseCase = require('../../application/use-cases/GetCategoryByIdUseCase');
const CreateCategoryUseCase = require('../../application/use-cases/CreateCategoryUseCase');
const UpdateCategoryUseCase = require('../../application/use-cases/UpdateCategoryUseCase');
const DeactivateCategoryUseCase = require('../../application/use-cases/DeactivateCategoryUseCase');

/**
 * Controller enxuto do módulo `categories`. Delega toda a regra de negócio
 * aos use cases da camada de aplicação, mantendo o mesmo contrato JSON e os
 * mesmos 5 endpoints do controller anterior
 * (`server/src/controllers/categoryController.ts`).
 */
const categoriesRepository = new SequelizeCategoriesRepository();

/** `GET /api/categories` — lista categorias ativas. */
exports.list = async (req, res, next) => {
  try {
    const useCase = new ListCategoriesUseCase(categoriesRepository);
    const categories = await useCase.execute();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

/** `GET /api/categories/:id` — busca uma categoria pelo id. */
exports.getById = async (req, res, next) => {
  try {
    const useCase = new GetCategoryByIdUseCase(categoriesRepository);
    const category = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

/** `POST /api/categories` — cria uma nova categoria. */
exports.create = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const useCase = new CreateCategoryUseCase(categoriesRepository);
    const category = await useCase.execute({ name, description });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

/** `PUT /api/categories/:id` — atualiza uma categoria existente. */
exports.update = async (req, res, next) => {
  try {
    const useCase = new UpdateCategoryUseCase(categoriesRepository);
    const category = await useCase.execute({ id: req.params.id, body: req.body });
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

/** `DELETE /api/categories/:id` — inativa (soft delete) uma categoria. */
exports.remove = async (req, res, next) => {
  try {
    const useCase = new DeactivateCategoryUseCase(categoriesRepository);
    const result = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
