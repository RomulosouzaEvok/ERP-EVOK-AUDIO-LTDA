import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP do Grupo 8 — Benefícios (`/api/rh/benefit-types`,
 * `/api/rh/employee-benefits`, §10 do contrato de API, RF-RH-050 a 054).
 *
 * @module modules/rh/presentation/controllers/benefitController
 */

const { logAction } = require('../../../../services/auditLogService');
const { ValidationError } = require('../../../../errors');

const SequelizeBenefitTypeRepository = require('../../infrastructure/sequelize/SequelizeBenefitTypeRepository');
const SequelizeEmployeeBenefitRepository = require('../../infrastructure/sequelize/SequelizeEmployeeBenefitRepository');
const EmployeeDirectoryServiceAdapter = require('../../infrastructure/adapters/EmployeeDirectoryServiceAdapter');

const CreateBenefitTypeUseCase = require('../../application/use-cases/benefit/CreateBenefitTypeUseCase');
const UpdateBenefitTypeUseCase = require('../../application/use-cases/benefit/UpdateBenefitTypeUseCase');
const ListBenefitTypesUseCase = require('../../application/use-cases/benefit/ListBenefitTypesUseCase');
const CreateEmployeeBenefitUseCase = require('../../application/use-cases/benefit/CreateEmployeeBenefitUseCase');
const CancelEmployeeBenefitUseCase = require('../../application/use-cases/benefit/CancelEmployeeBenefitUseCase');
const ListEmployeeBenefitsUseCase = require('../../application/use-cases/benefit/ListEmployeeBenefitsUseCase');
const GetMonthlyBenefitReportUseCase = require('../../application/use-cases/benefit/GetMonthlyBenefitReportUseCase');

const {
  createBenefitTypeSchema, updateBenefitTypeSchema, listBenefitTypeQuerySchema,
  createEmployeeBenefitSchema, listEmployeeBenefitQuerySchema, monthlyBenefitReportQuerySchema,
} = require('../validators/benefitValidators');

const benefitTypeRepository = new SequelizeBenefitTypeRepository();
const employeeBenefitRepository = new SequelizeEmployeeBenefitRepository();
const employeeDirectoryService = new EmployeeDirectoryServiceAdapter();

function toValidationError(error: any) {
  return error?.issues ? new ValidationError('Payload inválido.', error.issues) : error;
}

/** `GET /api/rh/benefit-types` — RF-RH-050. */
exports.listTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listBenefitTypeQuerySchema.parse(req.query);
    const result = await new ListBenefitTypesUseCase(benefitTypeRepository).execute(query);
    res.json({
      success: true,
      data: result.rows,
      pagination: { total: result.count, page: result.page, limit: result.limit, totalPages: result.totalPages },
    });
  } catch (error) { next(toValidationError(error)); }
};

/** `POST /api/rh/benefit-types` — RF-RH-050. */
exports.createType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createBenefitTypeSchema.parse(req.body);
    const data = await new CreateBenefitTypeUseCase(benefitTypeRepository).execute(parsed);
    logAction(req, {
      action: 'create', entityType: 'HrBenefitType', entityId: data?.id,
      entityDescription: parsed.name,
      newValues: parsed, description: `Tipo de benefício criado: ${parsed.name}`,
    });
    res.status(201).json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `PUT /api/rh/benefit-types/:id` — sem `DELETE` (catálogo referenciado). */
exports.updateType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateBenefitTypeSchema.parse(req.body);
    const data = await new UpdateBenefitTypeUseCase(benefitTypeRepository).execute({ id: req.params.id, ...parsed });
    logAction(req, {
      action: 'update', entityType: 'HrBenefitType', entityId: Number(req.params.id),
      entityDescription: `Tipo de benefício #${req.params.id}`,
      newValues: parsed, description: 'Tipo de benefício atualizado',
    });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `GET /api/rh/employee-benefits` — filtros `employee_id`/`benefit_type_id`/`enrollment_status`. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listEmployeeBenefitQuerySchema.parse(req.query);
    const result = await new ListEmployeeBenefitsUseCase(employeeBenefitRepository).execute(query);
    res.json({
      success: true,
      data: result.rows,
      pagination: { total: result.count, page: result.page, limit: result.limit, totalPages: result.totalPages },
    });
  } catch (error) { next(toValidationError(error)); }
};

/** `POST /api/rh/employee-benefits` — RF-RH-051/052 (opt-in, limite de 6% de VT). */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createEmployeeBenefitSchema.parse(req.body);
    const useCase = new CreateEmployeeBenefitUseCase(employeeBenefitRepository, benefitTypeRepository, employeeDirectoryService);
    const data = await useCase.execute({ ...parsed, createdBy: (req as any).user.id });
    logAction(req, {
      action: 'create', entityType: 'HrEmployeeBenefit', entityId: data?.id,
      entityDescription: `Adesão do funcionário #${parsed.employee_id} ao benefício #${parsed.benefit_type_id}`,
      newValues: { employee_id: parsed.employee_id, benefit_type_id: parsed.benefit_type_id },
      description: 'Adesão de benefício registrada',
    });
    res.status(201).json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `POST /api/rh/employee-benefits/:id/cancel` — RF-RH-054 (opt-out, nunca DELETE físico). */
exports.cancel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new CancelEmployeeBenefitUseCase(employeeBenefitRepository).execute({ id: req.params.id });
    logAction(req, {
      action: 'update', entityType: 'HrEmployeeBenefit', entityId: Number(req.params.id),
      entityDescription: `Adesão de benefício #${req.params.id}`,
      description: 'Adesão de benefício cancelada',
    });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `GET /api/rh/employee-benefits/monthly-report` — RF-RH-053. */
exports.monthlyReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = monthlyBenefitReportQuerySchema.parse(req.query);
    const data = await new GetMonthlyBenefitReportUseCase(employeeBenefitRepository).execute(query);
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};
