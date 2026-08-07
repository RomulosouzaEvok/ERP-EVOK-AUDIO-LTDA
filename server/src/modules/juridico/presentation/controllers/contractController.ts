/**
 * Controller do cluster Contratos — JurContract/JurContractDocument/
 * JurContractSignatory/JurContractAddendum (UC-52,
 * `docs/business/BLOCO_3_JUR_API.md` §2).
 *
 * @module modules/juridico/presentation/controllers/contractController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeContractRepository = require('../../infrastructure/sequelize/SequelizeContractRepository');
const SequelizeLegalAlertRepository = require('../../infrastructure/sequelize/SequelizeLegalAlertRepository');
const { logAction } = require('../../../../services/auditLogService');

const CreateContractUseCase = require('../../application/use-cases/contract/CreateContractUseCase');
const UpdateContractUseCase = require('../../application/use-cases/contract/UpdateContractUseCase');
const GetContractByIdUseCase = require('../../application/use-cases/contract/GetContractByIdUseCase');
const ListContractsUseCase = require('../../application/use-cases/contract/ListContractsUseCase');
const AddContractDocumentUseCase = require('../../application/use-cases/contract/AddContractDocumentUseCase');
const ListContractDocumentsUseCase = require('../../application/use-cases/contract/ListContractDocumentsUseCase');
const AddContractSignatoryUseCase = require('../../application/use-cases/contract/AddContractSignatoryUseCase');
const ListContractSignatoriesUseCase = require('../../application/use-cases/contract/ListContractSignatoriesUseCase');
const UpdateContractChecklistUseCase = require('../../application/use-cases/contract/UpdateContractChecklistUseCase');
const ActivateContractUseCase = require('../../application/use-cases/contract/ActivateContractUseCase');
const CreateContractAddendumUseCase = require('../../application/use-cases/contract/CreateContractAddendumUseCase');
const ListContractAddendumsUseCase = require('../../application/use-cases/contract/ListContractAddendumsUseCase');
const TerminateContractUseCase = require('../../application/use-cases/contract/TerminateContractUseCase');
const CrossReferenceContractsUseCase = require('../../application/use-cases/contract/CrossReferenceContractsUseCase');

const contractRepository = new SequelizeContractRepository();
const alertRepository = new SequelizeLegalAlertRepository();

function hasApprove(req: Request): boolean {
  const user = (req as any).user;
  return user?.role === 'admin' || user?.permissions?.juridico === 'approve';
}

/** `GET /api/jur/contracts` */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, ...filters } = req.query as any;
    const result = await new ListContractsUseCase(contractRepository).execute({ filters, page: Number(page), limit: Number(limit) });
    res.json({ success: true, data: result.rows, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

/** `GET /api/jur/contracts/:id` */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetContractByIdUseCase(contractRepository).execute({ id: req.params.id });
    logAction(req, { action: 'read', entityType: 'JurContract', entityId: Number(req.params.id) });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/jur/contracts` */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contract = await new CreateContractUseCase(contractRepository).execute({ ...req.body, createdBy: (req as any).user.id });
    logAction(req, { action: 'create', entityType: 'JurContract', entityId: contract.id, newValues: contract });
    res.status(201).json({ success: true, data: contract });
  } catch (error) { next(error); }
};

/** `PUT /api/jur/contracts/:id` */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contract = await new UpdateContractUseCase(contractRepository).execute({ id: Number(req.params.id), ...req.body });
    logAction(req, { action: 'update', entityType: 'JurContract', entityId: Number(req.params.id), newValues: req.body });
    res.json({ success: true, data: contract });
  } catch (error) { next(error); }
};

/** `POST /api/jur/contracts/:id/documents` */
exports.addDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const document = await new AddContractDocumentUseCase(contractRepository).execute({
      contractId: Number(req.params.id),
      ...req.body,
      authorId: (req as any).user.id,
    });
    res.status(201).json({ success: true, data: document });
  } catch (error) { next(error); }
};

/** `GET /api/jur/contracts/:id/documents` */
exports.listDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new ListContractDocumentsUseCase(contractRepository).execute({ contractId: Number(req.params.id) });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/jur/contracts/:id/signatories` */
exports.addSignatory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signatory = await new AddContractSignatoryUseCase(contractRepository).execute({ contractId: Number(req.params.id), ...req.body });
    res.status(201).json({ success: true, data: signatory });
  } catch (error) { next(error); }
};

/** `GET /api/jur/contracts/:id/signatories` */
exports.listSignatories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new ListContractSignatoriesUseCase(contractRepository).execute({ contractId: Number(req.params.id) });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/jur/contracts/:id/checklist` */
exports.updateChecklist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contract = await new UpdateContractChecklistUseCase(contractRepository).execute({
      contractId: Number(req.params.id),
      checklist: req.body?.checklist ?? req.body,
    });
    res.json({ success: true, data: contract });
  } catch (error) { next(error); }
};

/** `POST /api/jur/contracts/:id/activate` */
exports.activate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contract = await new ActivateContractUseCase(contractRepository, alertRepository).execute({
      id: Number(req.params.id),
      responsible_user_id: req.body?.responsible_user_id ?? null,
      approverHasApprove: hasApprove(req),
    });
    logAction(req, { action: 'activate', entityType: 'JurContract', entityId: Number(req.params.id) });
    res.json({ success: true, data: contract });
  } catch (error) { next(error); }
};

/** `POST /api/jur/contracts/:id/addendums` */
exports.addAddendum = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const addendum = await new CreateContractAddendumUseCase(contractRepository).execute({
      contractId: Number(req.params.id),
      ...req.body,
      createdBy: (req as any).user.id,
    });
    logAction(req, { action: 'create', entityType: 'JurContractAddendum', entityId: addendum.id, newValues: addendum });
    res.status(201).json({ success: true, data: addendum });
  } catch (error) { next(error); }
};

/** `GET /api/jur/contracts/:id/addendums` */
exports.listAddendums = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new ListContractAddendumsUseCase(contractRepository).execute({ contractId: Number(req.params.id) });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/jur/contracts/:id/terminate` */
exports.terminate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contract = await new TerminateContractUseCase(contractRepository).execute({ id: Number(req.params.id), ...req.body });
    logAction(req, { action: 'terminate', entityType: 'JurContract', entityId: Number(req.params.id), newValues: req.body });
    res.json({ success: true, data: contract });
  } catch (error) { next(error); }
};

// ---- fichas cruzadas (RF-JUR-045, §8.3) ----

/** `GET /api/jur/contracts/by-supplier/:supplierId` */
exports.bySupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new CrossReferenceContractsUseCase(contractRepository).execute({ type: 'supplier', id: req.params.supplierId });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `GET /api/jur/contracts/by-client/:clientId` */
exports.byClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new CrossReferenceContractsUseCase(contractRepository).execute({ type: 'client', id: req.params.clientId });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `GET /api/jur/contracts/by-employee/:employeeId` */
exports.byEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new CrossReferenceContractsUseCase(contractRepository).execute({ type: 'employee', id: req.params.employeeId });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};
