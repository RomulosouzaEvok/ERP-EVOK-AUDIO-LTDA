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
const SequelizeContractApprovalRepository = require('../../infrastructure/sequelize/SequelizeContractApprovalRepository');
const SequelizeApprovalThresholdRepository = require('../../infrastructure/sequelize/SequelizeApprovalThresholdRepository');
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
const ApproveContractUseCase = require('../../application/use-cases/contract/ApproveContractUseCase');
const ListContractApprovalsUseCase = require('../../application/use-cases/contract/ListContractApprovalsUseCase');
const CreateContractAddendumUseCase = require('../../application/use-cases/contract/CreateContractAddendumUseCase');
const ListContractAddendumsUseCase = require('../../application/use-cases/contract/ListContractAddendumsUseCase');
const TerminateContractUseCase = require('../../application/use-cases/contract/TerminateContractUseCase');
const CrossReferenceContractsUseCase = require('../../application/use-cases/contract/CrossReferenceContractsUseCase');

const contractRepository = new SequelizeContractRepository();
const alertRepository = new SequelizeLegalAlertRepository();
const approvalRepository = new SequelizeContractApprovalRepository();
/** Politica configuravel de alcada (FIND-ERP-005 Falha 1, APR-2026-021 B.3). */
const thresholdRepository = new SequelizeApprovalThresholdRepository();

function hasApprove(req: Request): boolean {
  const user = (req as any).user;
  return user?.role === 'admin' || user?.permissions?.juridico === 'approve';
}

/**
 * Resolve os papéis de aprovador (`diretor`/`financeiro`) que o usuário
 * logado efetivamente possui — RBAC real (RF-JUR-003), nunca aceito do
 * body. `role === 'admin'` é tratado como tendo os dois papéis (mesmo
 * curto-circuito de `authorizeModule`/`authorizeAnyModule`): privilégio é
 * concedível. Quem impede o `admin` de sozinho satisfazer a dupla aprovação
 * é a segregação de IDENTIDADE (D-K) no use case, não esta função.
 *
 * ## FIND-ERP-005 / Falha 2 — fim da truthiness
 *
 * Até 2026-08-14 esta função testava `if (user?.permissions?.diretor)`:
 * truthiness pura, satisfeita por **qualquer** string não vazia — inclusive
 * `'operate'`, que é o nível mais baixo existente
 * (`AccessModuleLevel = 'operate' | 'approve'`) e explicitamente NÃO é
 * `approve`. Um `diretor:operate` registrava a aprovação de diretoria.
 *
 * A comparação agora é **estrita** (`=== 'approve'`). Estrita, e não uma
 * lista de valores proibidos: assim os vetores adversariais de R2(e)
 * (`'read'`, `''`, `0`, `'Approve'`, `'APPROVE'`, `' approve '`, `true`,
 * `['approve']`, `{}`, `null`) caem todos pelo mesmo motivo, sem tratamento
 * caso a caso.
 *
 * A rota é a primeira barreira (`requiredLevel: 'approve'` em `juridico.ts`);
 * esta função é a segunda, porque é ela que NOMEIA o papel gravado — deixar
 * truthiness aqui faria qualquer rota futura que a reutilize herdar a falha.
 */
function hasApproveLevel(value: unknown): boolean {
  return value === 'approve';
}

function resolveAvailableApproverRoles(req: Request): Array<'diretor' | 'financeiro'> {
  const user = (req as any).user;
  if (user?.role === 'admin') return ['diretor', 'financeiro'];
  const roles: Array<'diretor' | 'financeiro'> = [];
  if (hasApproveLevel(user?.permissions?.diretor)) roles.push('diretor');
  if (hasApproveLevel(user?.permissions?.financeiro)) roles.push('financeiro');
  return roles;
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
    const contract = await new ActivateContractUseCase(contractRepository, alertRepository, approvalRepository, thresholdRepository).execute({
      id: Number(req.params.id),
      responsible_user_id: req.body?.responsible_user_id ?? null,
      approverHasApprove: hasApprove(req),
    });
    logAction(req, { action: 'activate', entityType: 'JurContract', entityId: Number(req.params.id) });
    res.json({ success: true, data: contract });
  } catch (error) { next(error); }
};

/**
 * `POST /api/jur/contracts/:id/approve` — RF-JUR-003 (alçada de aprovação
 * por valor). Rota protegida por `authorizeAnyModule` (diretor OU
 * financeiro) — `approver_user_id` sempre vem do JWT, `approver_role`
 * sempre resolvido por RBAC (`resolveAvailableApproverRoles`); `role` no
 * body só desambigua quando o usuário tem os dois perfis.
 */
exports.approve = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const approval = await new ApproveContractUseCase(contractRepository, approvalRepository, thresholdRepository).execute({
      contractId: Number(req.params.id),
      approverUserId: (req as any).user.id,
      availableRoles: resolveAvailableApproverRoles(req),
      desiredRole: req.body?.role ?? null,
    });
    logAction(req, { action: 'approve', entityType: 'JurContract', entityId: Number(req.params.id), newValues: approval });
    res.status(201).json({ success: true, data: approval });
  } catch (error) { next(error); }
};

/**
 * `GET /api/jur/contracts/:id/approvals` — situação da alçada (RF-JUR-003):
 * papéis exigidos pela faixa de valor, aprovações já registradas e o que
 * falta. Somente leitura, sem efeito colateral.
 */
exports.listApprovals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new ListContractApprovalsUseCase(contractRepository, approvalRepository, thresholdRepository).execute({
      contractId: Number(req.params.id),
    });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/jur/contracts/:id/addendums` */
exports.addAddendum = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const addendum = await new CreateContractAddendumUseCase(contractRepository, approvalRepository, thresholdRepository).execute({
      contractId: Number(req.params.id),
      ...req.body,
      createdBy: (req as any).user.id,
      // FIND-ERP-005 Falha 3 / APR-2026-021 B.4: nivel resolvido server-side,
      // DEPOIS do spread do body — nenhum campo do cliente pode sobrescreve-lo.
      requesterHasApprove: hasApprove(req),
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
