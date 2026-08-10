import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP do Grupo 4 — Demissão
 * (`/api/rh/termination-processes`, §6 do contrato de API, UC-70,
 * RF-RH-017 a 023).
 *
 * @module modules/rh/presentation/controllers/terminationController
 */

/** Arquivo Multer (memória) — tipo local, mesmo motivo de `marketing/materialController.ts`. */
type MulterFile = { originalname: string; mimetype: string; size: number; buffer?: Buffer };
type RequestWithFile = Request & { file?: MulterFile };

const { logAction } = require('../../../../services/auditLogService');
const { ValidationError } = require('../../../../errors');
const { uploadFile } = require('../../../../services/uploadService');

const SequelizeTerminationProcessRepository = require('../../infrastructure/sequelize/SequelizeTerminationProcessRepository');
const SequelizeEmployeeDocumentRepository = require('../../infrastructure/sequelize/SequelizeEmployeeDocumentRepository');
const AssetServiceAdapter = require('../../infrastructure/adapters/AssetServiceAdapter');
const UserAccountServiceAdapter = require('../../infrastructure/adapters/UserAccountServiceAdapter');
const SstAsoServiceAdapter = require('../../infrastructure/adapters/SstAsoServiceAdapter');
const EmployeeDirectoryServiceAdapter = require('../../infrastructure/adapters/EmployeeDirectoryServiceAdapter');

const CreateTerminationProcessUseCase = require('../../application/use-cases/termination/CreateTerminationProcessUseCase');
const ListTerminationProcessesUseCase = require('../../application/use-cases/termination/ListTerminationProcessesUseCase');
const GetTerminationProcessByIdUseCase = require('../../application/use-cases/termination/GetTerminationProcessByIdUseCase');
const RequestTerminationAsoUseCase = require('../../application/use-cases/termination/RequestTerminationAsoUseCase');
const ConfirmTerminationAsoResultUseCase = require('../../application/use-cases/termination/ConfirmTerminationAsoResultUseCase');
const GetAssetChecklistUseCase = require('../../application/use-cases/termination/GetAssetChecklistUseCase');
const AttachTrctUseCase = require('../../application/use-cases/termination/AttachTrctUseCase');
const ConfirmTerminationEsocialUseCase = require('../../application/use-cases/termination/ConfirmTerminationEsocialUseCase');
const ConcludeTerminationProcessUseCase = require('../../application/use-cases/termination/ConcludeTerminationProcessUseCase');

const {
  createTerminationSchema, confirmTerminationAsoSchema, attachTrctSchema,
  terminationEsocialConfirmationSchema, listTerminationQuerySchema,
} = require('../validators/terminationValidators');

const terminationRepository = new SequelizeTerminationProcessRepository();
const employeeDocumentRepository = new SequelizeEmployeeDocumentRepository();
const assetService = new AssetServiceAdapter();
const userAccountService = new UserAccountServiceAdapter();
const sstAsoService = new SstAsoServiceAdapter();
const employeeDirectoryService = new EmployeeDirectoryServiceAdapter();

/** Extensões aceitas para o TRCT (documento fiscal/trabalhista digitalizado). */
const TRCT_ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

function toValidationError(error: any) {
  return error?.issues ? new ValidationError('Payload inválido.', error.issues) : error;
}

/** `GET /api/rh/termination-processes` — filtros `status`/`payment_deadline_at_risk` (alerta de Art. 477 §6º, CLT). */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listTerminationQuerySchema.parse(req.query);
    const result = await new ListTerminationProcessesUseCase(terminationRepository).execute(query);
    res.json({
      success: true,
      data: result.rows,
      pagination: { total: result.count, page: result.page, limit: result.limit, totalPages: result.totalPages },
    });
  } catch (error) { next(toValidationError(error)); }
};

/** `GET /api/rh/termination-processes/:id` — detalhe. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetTerminationProcessByIdUseCase(terminationRepository).execute({ id: req.params.id });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/**
 * `POST /api/rh/termination-processes` — RF-RH-017/019.
 *
 * `hire_date` é resolvido no servidor a partir de `employees` para sugerir
 * o aviso prévio proporcional (Lei 12.506/2011) — nunca vem do body.
 */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createTerminationSchema.parse(req.body);
    const employee = await employeeDirectoryService.findById(parsed.employee_id);
    const data = await new CreateTerminationProcessUseCase(terminationRepository).execute({
      ...parsed,
      hireDate: employee?.hire_date ?? null,
      createdBy: (req as any).user.id,
    });
    logAction(req, {
      action: 'create', entityType: 'HrTerminationProcess', entityId: data?.id,
      newValues: parsed, description: `Processo de demissão aberto para funcionário #${parsed.employee_id} (${parsed.termination_type})`,
    });
    res.status(201).json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `POST /api/rh/termination-processes/:id/request-aso` — RF-RH-020. */
exports.requestAso = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new RequestTerminationAsoUseCase(terminationRepository, sstAsoService).execute({ id: req.params.id });
    logAction(req, {
      action: 'update', entityType: 'HrTerminationProcess', entityId: Number(req.params.id),
      description: 'ASO demissional solicitado à SST (RF-RH-020)',
    });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `PATCH /api/rh/termination-processes/:id/aso-confirmation` — RF-RH-020/030 (endpoint acrescentado ao contrato). */
exports.confirmAsoResult = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = confirmTerminationAsoSchema.parse(req.body);
    const data = await new ConfirmTerminationAsoResultUseCase(terminationRepository).execute({ id: req.params.id, ...parsed });
    logAction(req, {
      action: 'update', entityType: 'HrTerminationProcess', entityId: Number(req.params.id),
      newValues: parsed, description: `Resultado do ASO demissional registrado: ${parsed.aso_result}`,
    });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `GET /api/rh/termination-processes/:id/asset-checklist` — RF-RH-023 (read-only sobre `Asset.responsible_id`). */
exports.assetChecklist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetAssetChecklistUseCase(terminationRepository, assetService).execute({ id: req.params.id });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/**
 * `POST /api/rh/termination-processes/:id/trct` — RF-RH-021 (multipart
 * opcional: anexa o TRCT recebido do provedor de folha e/ou marca
 * `trct_paid_at` com `{ paid: true }`).
 *
 * O ERP **não calcula** verbas rescisórias (RNF-RH-03/§6.1) — apenas
 * arquiva o documento e controla o prazo do Art. 477 §6º, CLT.
 */
exports.attachTrct = async (req: RequestWithFile, res: Response, next: NextFunction) => {
  try {
    const parsed = attachTrctSchema.parse(req.body ?? {});
    let filePath: string | undefined;
    if (req.file) {
      const uploaded = await uploadFile(req.file, { allowedExtensions: TRCT_ALLOWED_EXTENSIONS, subfolder: 'rh-trct' });
      filePath = uploaded.path;
    }
    const data = await new AttachTrctUseCase(terminationRepository).execute({ id: req.params.id, filePath, paid: parsed.paid });
    logAction(req, {
      action: 'update', entityType: 'HrTerminationProcess', entityId: Number(req.params.id),
      newValues: { trct_file_path: filePath, paid: parsed.paid },
      description: 'TRCT anexado/atualizado no processo de demissão',
    });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `PATCH /api/rh/termination-processes/:id/esocial-confirmation` — `s2299_confirmed_at`. */
exports.confirmEsocial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    terminationEsocialConfirmationSchema.parse(req.body);
    const data = await new ConfirmTerminationEsocialUseCase(terminationRepository)
      .execute({ id: req.params.id, confirmedBy: (req as any).user.id });
    logAction(req, {
      action: 'update', entityType: 'HrTerminationProcess', entityId: Number(req.params.id),
      description: 'Transmissão do eSocial S-2299 confirmada pelo RH',
    });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/**
 * `POST /api/rh/termination-processes/:id/conclude` — RF-RH-022
 * (transacional; exige `rh:approve`, aplicado no router).
 *
 * Ação de maior blast radius do bloco: grava `employees.status='fired'` e
 * desativa o login do sistema no MESMO ato transacional.
 */
exports.conclude = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new ConcludeTerminationProcessUseCase(
      terminationRepository,
      employeeDocumentRepository,
      assetService,
      userAccountService,
      employeeDirectoryService,
    );
    const data = await useCase.execute({ id: req.params.id, concludedBy: (req as any).user.id });
    logAction(req, {
      action: 'update', entityType: 'HrTerminationProcess', entityId: Number(req.params.id),
      description: `Demissão concluída — funcionário #${data?.employee?.id} desligado e login desativado (RF-RH-022)`,
    });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};
