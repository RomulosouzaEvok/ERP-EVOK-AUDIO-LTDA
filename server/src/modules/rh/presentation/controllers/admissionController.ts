import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP do Grupo 2 — Admissão (`/api/rh/admission-processes`,
 * §4 do contrato de API, UC-69, RF-RH-007 a 012).
 *
 * Anti-spoofing (P0 do projeto): `created_by` e
 * `esocial_s2200_confirmed_by` vêm SEMPRE de `req.user.id`, nunca do body
 * (os validators `.strict()` rejeitam o campo se enviado).
 *
 * @module modules/rh/presentation/controllers/admissionController
 */

const { logAction } = require('../../../../services/auditLogService');
const { ValidationError } = require('../../../../errors');

const SequelizeAdmissionProcessRepository = require('../../infrastructure/sequelize/SequelizeAdmissionProcessRepository');
const SequelizeEmployeeContractRepository = require('../../infrastructure/sequelize/SequelizeEmployeeContractRepository');
const SequelizeEmployeeJobHistoryRepository = require('../../infrastructure/sequelize/SequelizeEmployeeJobHistoryRepository');
const SequelizeVacationAccrualPeriodRepository = require('../../infrastructure/sequelize/SequelizeVacationAccrualPeriodRepository');
const EmployeeDirectoryServiceAdapter = require('../../infrastructure/adapters/EmployeeDirectoryServiceAdapter');

const CreateAdmissionProcessUseCase = require('../../application/use-cases/admission/CreateAdmissionProcessUseCase');
const ListAdmissionProcessesUseCase = require('../../application/use-cases/admission/ListAdmissionProcessesUseCase');
const GetAdmissionProcessByIdUseCase = require('../../application/use-cases/admission/GetAdmissionProcessByIdUseCase');
const RequestAdmissionAsoUseCase = require('../../application/use-cases/admission/RequestAdmissionAsoUseCase');
const ConfirmAdmissionAsoResultUseCase = require('../../application/use-cases/admission/ConfirmAdmissionAsoResultUseCase');
const UpdateAdmissionChecklistUseCase = require('../../application/use-cases/admission/UpdateAdmissionChecklistUseCase');
const ConcludeAdmissionProcessUseCase = require('../../application/use-cases/admission/ConcludeAdmissionProcessUseCase');
const ConfirmAdmissionEsocialUseCase = require('../../application/use-cases/admission/ConfirmAdmissionEsocialUseCase');
const CancelAdmissionProcessUseCase = require('../../application/use-cases/admission/CancelAdmissionProcessUseCase');
const OpenVacationAccrualPeriodUseCase = require('../../application/use-cases/vacation/OpenVacationAccrualPeriodUseCase');

const {
  createAdmissionProcessSchema, updateChecklistSchema, confirmAsoResultSchema,
  concludeAdmissionSchema, esocialConfirmationSchema, cancelAdmissionSchema, listAdmissionQuerySchema,
} = require('../validators/admissionValidators');

const admissionRepository = new SequelizeAdmissionProcessRepository();
const contractRepository = new SequelizeEmployeeContractRepository();
const jobHistoryRepository = new SequelizeEmployeeJobHistoryRepository();
const accrualRepository = new SequelizeVacationAccrualPeriodRepository();
const employeeDirectoryService = new EmployeeDirectoryServiceAdapter();

/** Converte erro de Zod em `ValidationError` (400) preservando os `issues`. */
function toValidationError(error: any) {
  return error?.issues ? new ValidationError('Payload inválido.', error.issues) : error;
}

/** `GET /api/rh/admission-processes` — lista paginada (filtros `status`/`department_id`). */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listAdmissionQuerySchema.parse(req.query);
    const result = await new ListAdmissionProcessesUseCase(admissionRepository).execute(query);
    res.json({
      success: true,
      data: result.rows,
      pagination: { total: result.count, page: result.page, limit: result.limit, totalPages: result.totalPages },
    });
  } catch (error) { next(toValidationError(error)); }
};

/** `GET /api/rh/admission-processes/:id` — detalhe + checklist de documentos. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetAdmissionProcessByIdUseCase(admissionRepository).execute({ id: req.params.id });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `POST /api/rh/admission-processes` — RF-RH-007. */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createAdmissionProcessSchema.parse(req.body);
    const data = await new CreateAdmissionProcessUseCase(admissionRepository)
      .execute({ ...parsed, createdBy: (req as any).user.id });
    logAction(req, {
      action: 'create', entityType: 'HrAdmissionProcess', entityId: data?.id,
      entityDescription: parsed.candidate_name, newValues: parsed,
      description: `Processo de admissão de "${parsed.candidate_name}" aberto`,
    });
    res.status(201).json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `POST /api/rh/admission-processes/:id/request-aso` — RF-RH-008. */
exports.requestAso = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new RequestAdmissionAsoUseCase(admissionRepository).execute({ id: req.params.id });
    logAction(req, {
      action: 'update', entityType: 'HrAdmissionProcess', entityId: Number(req.params.id),
      description: 'ASO admissional solicitado à SST (RF-RH-008)',
    });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/**
 * `PATCH /api/rh/admission-processes/:id/aso-confirmation` — RF-RH-008/030.
 * Endpoint acrescentado ao contrato (§4 não previa quem grava
 * `aso_result`); sem ele o gate de conclusão seria inalcançável.
 */
exports.confirmAsoResult = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = confirmAsoResultSchema.parse(req.body);
    const data = await new ConfirmAdmissionAsoResultUseCase(admissionRepository).execute({ id: req.params.id, ...parsed });
    logAction(req, {
      action: 'update', entityType: 'HrAdmissionProcess', entityId: Number(req.params.id),
      newValues: parsed, description: `Resultado do ASO admissional registrado: ${parsed.aso_result}`,
    });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `POST /api/rh/admission-processes/:id/checklist` — marca item de documento como recebido. */
exports.updateChecklist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateChecklistSchema.parse(req.body);
    const data = await new UpdateAdmissionChecklistUseCase(admissionRepository).execute({ id: req.params.id, ...parsed });
    logAction(req, {
      action: 'update', entityType: 'HrAdmissionProcess', entityId: Number(req.params.id),
      newValues: parsed, description: `Checklist de admissão atualizado: ${parsed.document}`,
    });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `POST /api/rh/admission-processes/:id/conclude` — RF-RH-009 (transacional). */
exports.conclude = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = concludeAdmissionSchema.parse(req.body);
    const useCase = new ConcludeAdmissionProcessUseCase(
      admissionRepository,
      contractRepository,
      jobHistoryRepository,
      employeeDirectoryService,
      new OpenVacationAccrualPeriodUseCase(accrualRepository),
    );
    const data = await useCase.execute({ id: req.params.id, ...parsed, createdBy: (req as any).user.id });
    logAction(req, {
      action: 'update', entityType: 'HrAdmissionProcess', entityId: Number(req.params.id),
      entityDescription: parsed.employee.name,
      description: `Admissão concluída — funcionário #${data?.employee?.id} criado com contrato ${parsed.contract_type}`,
    });
    res.status(201).json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `PATCH /api/rh/admission-processes/:id/esocial-confirmation` — RF-RH-010. */
exports.confirmEsocial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    esocialConfirmationSchema.parse(req.body);
    const data = await new ConfirmAdmissionEsocialUseCase(admissionRepository)
      .execute({ id: req.params.id, confirmedBy: (req as any).user.id });
    logAction(req, {
      action: 'update', entityType: 'HrAdmissionProcess', entityId: Number(req.params.id),
      description: 'Transmissão do eSocial S-2200 confirmada pelo RH (RF-RH-010)',
    });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `POST /api/rh/admission-processes/:id/cancel` — RF-RH-012 (nunca exclusão física). */
exports.cancel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = cancelAdmissionSchema.parse(req.body);
    const data = await new CancelAdmissionProcessUseCase(admissionRepository).execute({ id: req.params.id, reason: parsed.reason });
    logAction(req, {
      action: 'update', entityType: 'HrAdmissionProcess', entityId: Number(req.params.id),
      newValues: parsed, description: `Processo de admissão cancelado: ${parsed.reason}`,
    });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};
