/**
 * Controller do cluster Solicitações de Acesso — Onboarding/Change/
 * Offboarding (UC-51, `docs/business/BLOCO_2_TI_API.md` §4).
 *
 * @module modules/ti/presentation/controllers/accessRequestController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeAccessRequestRepository = require('../../infrastructure/sequelize/SequelizeAccessRequestRepository');
const SequelizeResponsibilityTermRepository = require('../../infrastructure/sequelize/SequelizeResponsibilityTermRepository');
const AccessProfileExecutionServiceAdapter = require('../../infrastructure/adapters/AccessProfileExecutionServiceAdapter');

const CreateAccessRequestUseCase = require('../../application/use-cases/accessRequest/CreateAccessRequestUseCase');
const ApproveAccessRequestUseCase = require('../../application/use-cases/accessRequest/ApproveAccessRequestUseCase');
const RejectAccessRequestUseCase = require('../../application/use-cases/accessRequest/RejectAccessRequestUseCase');
const ExecuteAccessRequestUseCase = require('../../application/use-cases/accessRequest/ExecuteAccessRequestUseCase');
const CancelAccessRequestUseCase = require('../../application/use-cases/accessRequest/CancelAccessRequestUseCase');
const CheckOffboardingBlockersUseCase = require('../../application/use-cases/accessRequest/CheckOffboardingBlockersUseCase');
const UpdateAccessRequestChecklistUseCase = require('../../application/use-cases/accessRequest/UpdateAccessRequestChecklistUseCase');
const ListAccessRequestsUseCase = require('../../application/use-cases/accessRequest/ListAccessRequestsUseCase');
const GetAccessRequestByIdUseCase = require('../../application/use-cases/accessRequest/GetAccessRequestByIdUseCase');
const ListPendingTermsForOffboardingUseCase = require('../../application/use-cases/term/ListPendingTermsForOffboardingUseCase');
const { isEligibleApprover } = require('../../domain/services/approverEligibilityService');

const accessRequestRepository = new SequelizeAccessRequestRepository();
const termRepository = new SequelizeResponsibilityTermRepository();
const accessProfileExecutionService = new AccessProfileExecutionServiceAdapter();

/**
 * Ownership check de `authorizeSelfOrModule('ti', 'approve', ...)` para
 * `/approve` e `/reject` — cobre a branch (c) "é gestor do department_id da
 * solicitação" (§4.1 da API); a branch (b) "ti:approve" já é resolvida pelo
 * próprio middleware antes de chamar esta função.
 */
exports.approverEligibilityCheck = async (req: Request): Promise<boolean> => {
  const request = await accessRequestRepository.findById(req.params.id);
  if (!request) return false;
  const user = (req as any).user;
  return isEligibleApprover({
    approverUserId: user.id,
    approverRole: user.role,
    approverHasTiApprove: false, // já coberto pela branch (b) do middleware
    departmentId: request.department_id,
  });
};

/** `GET /api/ti/access-requests` */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, ...filters } = req.query as any;
    const result = await new ListAccessRequestsUseCase(accessRequestRepository).execute({ filters, page: Number(page), limit: Number(limit) });
    res.json({ success: true, data: result.rows, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

/** `GET /api/ti/access-requests/:id` */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetAccessRequestByIdUseCase(accessRequestRepository).execute({ id: Number(req.params.id) });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/ti/access-requests` */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new CreateAccessRequestUseCase(accessRequestRepository).execute({ ...req.body, requestedBy: (req as any).user.id });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/ti/access-requests/:id/approve` */
exports.approve = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const data = await new ApproveAccessRequestUseCase(accessRequestRepository).execute({
      id: Number(req.params.id),
      approverUserId: user.id,
      approverRole: user.role,
      approverHasTiApprove: user.permissions?.ti === 'approve',
    });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/ti/access-requests/:id/reject` */
exports.reject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const data = await new RejectAccessRequestUseCase(accessRequestRepository).execute({
      id: Number(req.params.id),
      rejection_reason: req.body?.rejection_reason,
      approverUserId: user.id,
      approverRole: user.role,
      approverHasTiApprove: user.permissions?.ti === 'approve',
    });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/ti/access-requests/:id/execute` */
exports.execute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const checkOffboardingBlockersUseCase = new CheckOffboardingBlockersUseCase(new ListPendingTermsForOffboardingUseCase(termRepository));
    const data = await new ExecuteAccessRequestUseCase(accessRequestRepository, accessProfileExecutionService, checkOffboardingBlockersUseCase).execute({
      id: Number(req.params.id),
      executedBy: (req as any).user.id,
      req,
    });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/ti/access-requests/:id/checklist` */
exports.updateChecklist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new UpdateAccessRequestChecklistUseCase(accessRequestRepository).execute({ id: Number(req.params.id), ...req.body });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/ti/access-requests/:id/cancel` */
exports.cancel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new CancelAccessRequestUseCase(accessRequestRepository).execute({ id: Number(req.params.id) });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};
