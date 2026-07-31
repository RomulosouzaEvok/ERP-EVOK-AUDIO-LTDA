const SequelizeDepartmentsRepository = require('../../infrastructure/sequelize/SequelizeDepartmentsRepository');
const ListDepartmentsUseCase = require('../../application/use-cases/ListDepartmentsUseCase');
const GetDepartmentByIdUseCase = require('../../application/use-cases/GetDepartmentByIdUseCase');
const CreateDepartmentUseCase = require('../../application/use-cases/CreateDepartmentUseCase');
const UpdateDepartmentUseCase = require('../../application/use-cases/UpdateDepartmentUseCase');
const DeactivateDepartmentUseCase = require('../../application/use-cases/DeactivateDepartmentUseCase');

/**
 * Controller enxuto do módulo `departments`. Delega toda a regra de negócio
 * aos use cases da camada de aplicação, mantendo o mesmo contrato JSON e os
 * mesmos 5 endpoints do controller anterior
 * (`server/src/controllers/departmentController.ts`).
 */
const departmentsRepository = new SequelizeDepartmentsRepository();

/** `GET /api/departments` — lista departamentos ativos. */
exports.list = async (req, res, next) => {
  try {
    const useCase = new ListDepartmentsUseCase(departmentsRepository);
    const departments = await useCase.execute();
    res.json({ success: true, data: departments });
  } catch (error) {
    next(error);
  }
};

/** `GET /api/departments/:id` — busca um departamento pelo id. */
exports.getById = async (req, res, next) => {
  try {
    const useCase = new GetDepartmentByIdUseCase(departmentsRepository);
    const department = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
};

/** `POST /api/departments` — cria um novo departamento. */
exports.create = async (req, res, next) => {
  try {
    const useCase = new CreateDepartmentUseCase(departmentsRepository);
    const department = await useCase.execute(req.body);
    res.status(201).json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
};

/** `PUT /api/departments/:id` — atualiza um departamento existente. */
exports.update = async (req, res, next) => {
  try {
    const useCase = new UpdateDepartmentUseCase(departmentsRepository);
    const department = await useCase.execute({ id: req.params.id, body: req.body });
    res.json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
};

/** `DELETE /api/departments/:id` — inativa (soft delete) um departamento. */
exports.remove = async (req, res, next) => {
  try {
    const useCase = new DeactivateDepartmentUseCase(departmentsRepository);
    const result = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
