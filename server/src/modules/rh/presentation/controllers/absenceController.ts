import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP do Grupo 7 — Afastamentos (`/api/rh/absences`, §9 do
 * contrato de API, UC-71, RF-RH-044 a 049).
 *
 * `cid` é omitido da resposta salvo interseção `rh` + `sst`/admin
 * (`rhSensitiveFields.sanitizeAbsence`, RNF-RH-01) — nunca 403 de rota por
 * causa desse campo isoladamente.
 *
 * @module modules/rh/presentation/controllers/absenceController
 */

const { logAction } = require('../../../../services/auditLogService');
const { ValidationError } = require('../../../../errors');
const { sanitizeAbsence } = require('../../domain/services/rhSensitiveFields');

const SequelizeAbsenceRepository = require('../../infrastructure/sequelize/SequelizeAbsenceRepository');
const SequelizeEmployeeDocumentRepository = require('../../infrastructure/sequelize/SequelizeEmployeeDocumentRepository');
const SequelizeEmployeeBenefitRepository = require('../../infrastructure/sequelize/SequelizeEmployeeBenefitRepository');
const SequelizeVacationAccrualPeriodRepository = require('../../infrastructure/sequelize/SequelizeVacationAccrualPeriodRepository');
const EmployeeDirectoryServiceAdapter = require('../../infrastructure/adapters/EmployeeDirectoryServiceAdapter');

const CreateAbsenceUseCase = require('../../application/use-cases/absence/CreateAbsenceUseCase');
const ReturnFromAbsenceUseCase = require('../../application/use-cases/absence/ReturnFromAbsenceUseCase');
const ConfirmAbsenceEsocialUseCase = require('../../application/use-cases/absence/ConfirmAbsenceEsocialUseCase');
const ListAbsencesUseCase = require('../../application/use-cases/absence/ListAbsencesUseCase');
const GetAbsenceByIdUseCase = require('../../application/use-cases/absence/GetAbsenceByIdUseCase');
const ResetVacationAccrualPeriodUseCase = require('../../application/use-cases/vacation/ResetVacationAccrualPeriodUseCase');
const OpenVacationAccrualPeriodUseCase = require('../../application/use-cases/vacation/OpenVacationAccrualPeriodUseCase');

const {
  createAbsenceSchema, returnFromAbsenceSchema, confirmAbsenceEsocialSchema, listAbsenceQuerySchema,
} = require('../validators/absenceValidators');

const absenceRepository = new SequelizeAbsenceRepository();
const employeeDocumentRepository = new SequelizeEmployeeDocumentRepository();
const employeeBenefitRepository = new SequelizeEmployeeBenefitRepository();
const accrualRepository = new SequelizeVacationAccrualPeriodRepository();
const employeeDirectoryService = new EmployeeDirectoryServiceAdapter();
const openVacationAccrualPeriodUseCase = new OpenVacationAccrualPeriodUseCase(accrualRepository);
const resetVacationAccrualPeriodUseCase = new ResetVacationAccrualPeriodUseCase(accrualRepository, openVacationAccrualPeriodUseCase);

function toValidationError(error: any) {
  return error?.issues ? new ValidationError('Payload inválido.', error.issues) : error;
}

/** `GET /api/rh/absences` — RF-RH-044, `cid` segregado por interseção rh+sst. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listAbsenceQuerySchema.parse(req.query);
    const result = await new ListAbsencesUseCase(absenceRepository).execute(query);
    res.json({
      success: true,
      data: result.rows.map((row: any) => sanitizeAbsence(row, (req as any).user)),
      pagination: { total: result.count, page: result.page, limit: result.limit, totalPages: result.totalPages },
    });
  } catch (error) { next(toValidationError(error)); }
};

/** `GET /api/rh/absences/:id` — idem segregação de `cid`. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetAbsenceByIdUseCase(absenceRepository).execute({ id: req.params.id });
    res.json({ success: true, data: sanitizeAbsence(data, (req as any).user) });
  } catch (error) { next(toValidationError(error)); }
};

/** `POST /api/rh/absences` — RF-RH-044/045/047/049 (transação única). */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createAbsenceSchema.parse(req.body);
    const useCase = new CreateAbsenceUseCase(
      absenceRepository, employeeDocumentRepository, employeeBenefitRepository,
      accrualRepository, employeeDirectoryService, resetVacationAccrualPeriodUseCase,
    );
    const data = await useCase.execute({ ...parsed, createdBy: (req as any).user.id });
    logAction(req, {
      action: 'create', entityType: 'HrAbsence', entityId: data?.id,
      entityDescription: `Afastamento ${parsed.type} do funcionário #${parsed.employee_id}`,
      newValues: { employee_id: parsed.employee_id, type: parsed.type, start_date: parsed.start_date },
      description: `Afastamento registrado (${parsed.type}) a partir de ${parsed.start_date}`,
    });
    res.status(201).json({ success: true, data: sanitizeAbsence(data, (req as any).user) });
  } catch (error) { next(toValidationError(error)); }
};

/** `PATCH /api/rh/absences/:id/return` — RF-RH-048 (gate de ASO de retorno). */
exports.returnFromAbsence = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = returnFromAbsenceSchema.parse(req.body);
    const data = await new ReturnFromAbsenceUseCase(
      absenceRepository, employeeDocumentRepository, employeeDirectoryService, employeeBenefitRepository,
    ).execute({ id: req.params.id, actual_end_date: parsed.actual_end_date });
    logAction(req, {
      action: 'update', entityType: 'HrAbsence', entityId: Number(req.params.id),
      entityDescription: `Afastamento #${req.params.id}`,
      newValues: { ...parsed, reactivated_benefits: data?.reactivated_benefits ?? [] },
      description: `Retorno de afastamento confirmado em ${parsed.actual_end_date}`,
    });
    res.json({ success: true, data: sanitizeAbsence(data, (req as any).user) });
  } catch (error) { next(toValidationError(error)); }
};

/** `PATCH /api/rh/absences/:id/esocial-confirmation` — `s2230_confirmed_at`. */
exports.confirmEsocial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    confirmAbsenceEsocialSchema.parse(req.body ?? {});
    const data = await new ConfirmAbsenceEsocialUseCase(absenceRepository)
      .execute({ id: req.params.id, confirmedBy: (req as any).user.id });
    logAction(req, {
      action: 'update', entityType: 'HrAbsence', entityId: Number(req.params.id),
      entityDescription: `Afastamento #${req.params.id}`,
      description: 'Confirmação eSocial (S-2230) registrada',
    });
    res.json({ success: true, data: sanitizeAbsence(data, (req as any).user) });
  } catch (error) { next(toValidationError(error)); }
};
