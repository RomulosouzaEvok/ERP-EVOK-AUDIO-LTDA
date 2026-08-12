import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP do Grupo 9 — Treinamentos (`/api/rh/training-courses`,
 * `/api/rh/employee-trainings`, §11 do contrato de API, RF-RH-055 a 059).
 *
 * @module modules/rh/presentation/controllers/trainingController
 */

const { logAction } = require('../../../../services/auditLogService');
const { ValidationError } = require('../../../../errors');

const SequelizeTrainingCourseRepository = require('../../infrastructure/sequelize/SequelizeTrainingCourseRepository');
const SequelizeEmployeeTrainingRepository = require('../../infrastructure/sequelize/SequelizeEmployeeTrainingRepository');
const EmployeeDirectoryServiceAdapter = require('../../infrastructure/adapters/EmployeeDirectoryServiceAdapter');
const TrainingMatrixServiceAdapter = require('../../infrastructure/adapters/TrainingMatrixServiceAdapter');

const CreateTrainingCourseUseCase = require('../../application/use-cases/training/CreateTrainingCourseUseCase');
const UpdateTrainingCourseUseCase = require('../../application/use-cases/training/UpdateTrainingCourseUseCase');
const ListTrainingCoursesUseCase = require('../../application/use-cases/training/ListTrainingCoursesUseCase');
const CreateEmployeeTrainingUseCase = require('../../application/use-cases/training/CreateEmployeeTrainingUseCase');
const ListEmployeeTrainingsUseCase = require('../../application/use-cases/training/ListEmployeeTrainingsUseCase');
const GetCannotOperateReportUseCase = require('../../application/use-cases/training/GetCannotOperateReportUseCase');

const {
  createTrainingCourseSchema, updateTrainingCourseSchema, listTrainingCourseQuerySchema,
  createEmployeeTrainingSchema, listEmployeeTrainingQuerySchema, cannotOperateReportQuerySchema,
} = require('../validators/trainingValidators');

const trainingCourseRepository = new SequelizeTrainingCourseRepository();
const employeeTrainingRepository = new SequelizeEmployeeTrainingRepository();
const employeeDirectoryService = new EmployeeDirectoryServiceAdapter();
const trainingMatrixService = new TrainingMatrixServiceAdapter();

function toValidationError(error: any) {
  return error?.issues ? new ValidationError('Payload inválido.', error.issues) : error;
}

/** `GET /api/rh/training-courses` — RF-RH-055. */
exports.listCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listTrainingCourseQuerySchema.parse(req.query);
    const result = await new ListTrainingCoursesUseCase(trainingCourseRepository).execute(query);
    res.json({
      success: true,
      data: result.rows,
      pagination: { total: result.count, page: result.page, limit: result.limit, totalPages: result.totalPages },
    });
  } catch (error) { next(toValidationError(error)); }
};

/**
 * `POST /api/rh/training-courses` — RF-RH-055. Quando normativo + `nr_code`
 * cadastrado na matriz SST, a validade grava a DA MATRIZ
 * (`validity_source: 'sst_matrix'`, RF-INT-RH-SST-01); senão, mantém o fluxo
 * manual + `warning` (RF-RH-059).
 */
exports.createCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createTrainingCourseSchema.parse(req.body);
    const data = await new CreateTrainingCourseUseCase(trainingCourseRepository, trainingMatrixService).execute(parsed);
    logAction(req, {
      action: 'create', entityType: 'HrTrainingCourse', entityId: data?.id,
      entityDescription: parsed.name,
      newValues: { ...parsed, validity_source: data?.validity_source }, description: `Curso de treinamento criado: ${parsed.name}`,
    });
    res.status(201).json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `PUT /api/rh/training-courses/:id` — sem `DELETE`. Mesma sobrescrita de validade pela matriz SST (RF-INT-RH-SST-01). */
exports.updateCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateTrainingCourseSchema.parse(req.body);
    const data = await new UpdateTrainingCourseUseCase(trainingCourseRepository, trainingMatrixService).execute({ id: req.params.id, ...parsed });
    logAction(req, {
      action: 'update', entityType: 'HrTrainingCourse', entityId: Number(req.params.id),
      entityDescription: `Curso de treinamento #${req.params.id}`,
      newValues: { ...parsed, validity_source: data?.validity_source }, description: 'Curso de treinamento atualizado',
    });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `GET /api/rh/employee-trainings` — filtros `employee_id`/`training_course_id`/`expiring_in_days`/`department_id`. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listEmployeeTrainingQuerySchema.parse(req.query);
    const result = await new ListEmployeeTrainingsUseCase(employeeTrainingRepository).execute(query);
    res.json({
      success: true,
      data: result.rows,
      pagination: { total: result.count, page: result.page, limit: result.limit, totalPages: result.totalPages },
    });
  } catch (error) { next(toValidationError(error)); }
};

/** `POST /api/rh/employee-trainings` — RF-RH-057 (`valid_until` calculado no servidor). */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createEmployeeTrainingSchema.parse(req.body);
    const useCase = new CreateEmployeeTrainingUseCase(employeeTrainingRepository, trainingCourseRepository, employeeDirectoryService);
    const data = await useCase.execute({ ...parsed, createdBy: (req as any).user.id });
    logAction(req, {
      action: 'create', entityType: 'HrEmployeeTraining', entityId: data?.id,
      entityDescription: `Treinamento do funcionário #${parsed.employee_id} no curso #${parsed.training_course_id}`,
      newValues: { employee_id: parsed.employee_id, training_course_id: parsed.training_course_id, completed_at: parsed.completed_at },
      description: 'Conclusão de treinamento registrada',
    });
    res.status(201).json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `GET /api/rh/employee-trainings/cannot-operate-report` — RF-RH-058. */
exports.cannotOperateReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = cannotOperateReportQuerySchema.parse(req.query);
    const data = await new GetCannotOperateReportUseCase(trainingCourseRepository, employeeTrainingRepository, employeeDirectoryService)
      .execute(query);
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};
