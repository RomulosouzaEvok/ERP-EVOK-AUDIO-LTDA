import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP do Grupo 5 — Documentos do Funcionário
 * (`/api/rh/employee-documents`, §7 do contrato de API, RF-RH-027 a 030).
 *
 * 🔒 Para `doc_type` iniciado em `aso_`, só aptidão e validade são
 * armazenadas — o laudo clínico permanece exclusivamente com a SST
 * (RF-RH-028, LGPD art. 5º II). O `.strict()` do validator rejeita
 * qualquer campo clínico com `400`.
 *
 * @module modules/rh/presentation/controllers/employeeDocumentController
 */

/** Arquivo Multer (memória) — tipo local, mesmo motivo de `marketing/materialController.ts`. */
type MulterFile = { originalname: string; mimetype: string; size: number; buffer?: Buffer };
type RequestWithFile = Request & { file?: MulterFile };

const { logAction } = require('../../../../services/auditLogService');
const { ValidationError, NotFoundError } = require('../../../../errors');
const { uploadFile } = require('../../../../services/uploadService');

const SequelizeEmployeeDocumentRepository = require('../../infrastructure/sequelize/SequelizeEmployeeDocumentRepository');
const EmployeeDirectoryServiceAdapter = require('../../infrastructure/adapters/EmployeeDirectoryServiceAdapter');

const CreateEmployeeDocumentUseCase = require('../../application/use-cases/employeeDocument/CreateEmployeeDocumentUseCase');
const ListEmployeeDocumentsUseCase = require('../../application/use-cases/employeeDocument/ListEmployeeDocumentsUseCase');
const GetEmployeeDocumentByIdUseCase = require('../../application/use-cases/employeeDocument/GetEmployeeDocumentByIdUseCase');
const UpdateEmployeeDocumentUseCase = require('../../application/use-cases/employeeDocument/UpdateEmployeeDocumentUseCase');

const {
  createEmployeeDocumentSchema, updateEmployeeDocumentSchema, listEmployeeDocumentQuerySchema,
} = require('../validators/employeeDocumentValidators');

const employeeDocumentRepository = new SequelizeEmployeeDocumentRepository();
const employeeDirectoryService = new EmployeeDirectoryServiceAdapter();

const DOCUMENT_ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

/**
 * Janelas de alerta de vencimento de documento (RF-RH-029) — ponto único de
 * configuração, nunca hard-code espalhado (§7 do contrato de API).
 */
const EMPLOYEE_DOCUMENT_ALERT_WINDOWS_DAYS: readonly number[] = [60, 30, 7];

function toValidationError(error: any) {
  return error?.issues ? new ValidationError('Payload inválido.', error.issues) : error;
}

/** `GET /api/rh/employee-documents` — filtros `employee_id`/`doc_type`/`expiring_in_days` (RF-RH-029). */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listEmployeeDocumentQuerySchema.parse(req.query);
    const result = await new ListEmployeeDocumentsUseCase(employeeDocumentRepository).execute(query);
    res.json({
      success: true,
      data: result.rows,
      pagination: { total: result.count, page: result.page, limit: result.limit, totalPages: result.totalPages },
      meta: { alert_windows_days: EMPLOYEE_DOCUMENT_ALERT_WINDOWS_DAYS },
    });
  } catch (error) { next(toValidationError(error)); }
};

/** `GET /api/rh/employee-documents/:id` — detalhe (nunca inclui laudo clínico — RF-RH-028). */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetEmployeeDocumentByIdUseCase(employeeDocumentRepository).execute({ id: req.params.id });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `POST /api/rh/employee-documents` — RF-RH-027 (multipart, campo `file`). */
exports.create = async (req: RequestWithFile, res: Response, next: NextFunction) => {
  try {
    const parsed = createEmployeeDocumentSchema.parse(req.body);
    if (!req.file) throw new ValidationError('Arquivo é obrigatório (campo "file").');

    const employee = await employeeDirectoryService.findById(parsed.employee_id);
    if (!employee) throw new NotFoundError('Funcionário não encontrado.');

    const uploaded = await uploadFile(req.file, { allowedExtensions: DOCUMENT_ALLOWED_EXTENSIONS, subfolder: 'rh-employee-documents' });
    const data = await new CreateEmployeeDocumentUseCase(employeeDocumentRepository).execute({
      ...parsed,
      file_path: uploaded.path,
      uploadedBy: (req as any).user.id,
    });

    logAction(req, {
      action: 'create', entityType: 'HrEmployeeDocument', entityId: data?.id,
      newValues: { ...parsed, file_path: uploaded.path },
      description: `Documento ${parsed.doc_type} anexado ao funcionário #${parsed.employee_id}`,
    });
    res.status(201).json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `PUT /api/rh/employee-documents/:id` — atualiza validade/aptidão e/ou substitui o arquivo. */
exports.update = async (req: RequestWithFile, res: Response, next: NextFunction) => {
  try {
    const parsed = updateEmployeeDocumentSchema.parse(req.body ?? {});
    let filePath: string | undefined;
    if (req.file) {
      const uploaded = await uploadFile(req.file, { allowedExtensions: DOCUMENT_ALLOWED_EXTENSIONS, subfolder: 'rh-employee-documents' });
      filePath = uploaded.path;
    }
    const data = await new UpdateEmployeeDocumentUseCase(employeeDocumentRepository)
      .execute({ id: req.params.id, ...parsed, ...(filePath ? { file_path: filePath } : {}) });

    logAction(req, {
      action: 'update', entityType: 'HrEmployeeDocument', entityId: Number(req.params.id),
      newValues: { ...parsed, ...(filePath ? { file_path: filePath } : {}) },
      description: 'Documento do funcionário atualizado',
    });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};
