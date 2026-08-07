/**
 * Controller do cluster LGPD — RoPA (`JurLgpdProcessingActivity`),
 * Solicitação de Titular (`JurLgpdDataSubjectRequest`) e Incidente
 * (`JurLgpdIncident`) — UC-56, `docs/business/BLOCO_3_JUR_API.md` §7.
 *
 * @module modules/juridico/presentation/controllers/lgpdController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeLgpdActivityRepository = require('../../infrastructure/sequelize/SequelizeLgpdActivityRepository');
const SequelizeLgpdRequestRepository = require('../../infrastructure/sequelize/SequelizeLgpdRequestRepository');
const SequelizeLgpdIncidentRepository = require('../../infrastructure/sequelize/SequelizeLgpdIncidentRepository');
const { logAction } = require('../../../../services/auditLogService');

const CreateProcessingActivityUseCase = require('../../application/use-cases/lgpd/CreateProcessingActivityUseCase');
const UpdateProcessingActivityUseCase = require('../../application/use-cases/lgpd/UpdateProcessingActivityUseCase');
const ListProcessingActivitiesUseCase = require('../../application/use-cases/lgpd/ListProcessingActivitiesUseCase');
const GetProcessingActivityByIdUseCase = require('../../application/use-cases/lgpd/GetProcessingActivityByIdUseCase');
const ReviewProcessingActivityUseCase = require('../../application/use-cases/lgpd/ReviewProcessingActivityUseCase');

const CreateDataSubjectRequestUseCase = require('../../application/use-cases/lgpd/CreateDataSubjectRequestUseCase');
const VerifyIdentityUseCase = require('../../application/use-cases/lgpd/VerifyIdentityUseCase');
const ResolveDataSubjectRequestUseCase = require('../../application/use-cases/lgpd/ResolveDataSubjectRequestUseCase');
const RejectDataSubjectRequestUseCase = require('../../application/use-cases/lgpd/RejectDataSubjectRequestUseCase');
const ListDataSubjectRequestsUseCase = require('../../application/use-cases/lgpd/ListDataSubjectRequestsUseCase');
const GetDataSubjectRequestByIdUseCase = require('../../application/use-cases/lgpd/GetDataSubjectRequestByIdUseCase');
const PendingCriticalDataSubjectRequestsUseCase = require('../../application/use-cases/lgpd/PendingCriticalDataSubjectRequestsUseCase');

const CreateIncidentUseCase = require('../../application/use-cases/lgpd/CreateIncidentUseCase');
const DecideIncidentUseCase = require('../../application/use-cases/lgpd/DecideIncidentUseCase');
const CloseIncidentUseCase = require('../../application/use-cases/lgpd/CloseIncidentUseCase');
const ListIncidentsUseCase = require('../../application/use-cases/lgpd/ListIncidentsUseCase');
const GetIncidentByIdUseCase = require('../../application/use-cases/lgpd/GetIncidentByIdUseCase');

const activityRepository = new SequelizeLgpdActivityRepository();
const requestRepository = new SequelizeLgpdRequestRepository();
const incidentRepository = new SequelizeLgpdIncidentRepository();

// ---- RoPA ----

/** `GET /api/jur/lgpd/processing-activities` */
exports.listActivities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, ...filters } = req.query as any;
    const result = await new ListProcessingActivitiesUseCase(activityRepository).execute({ filters, page: Number(page), limit: Number(limit) });
    res.json({ success: true, data: result.rows, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

/** `GET /api/jur/lgpd/processing-activities/:id` */
exports.getActivityById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetProcessingActivityByIdUseCase(activityRepository).execute({ id: req.params.id });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/jur/lgpd/processing-activities` */
exports.createActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity = await new CreateProcessingActivityUseCase(activityRepository).execute({ ...req.body, createdBy: (req as any).user.id });
    logAction(req, { action: 'create', entityType: 'JurLgpdProcessingActivity', entityId: activity.id, newValues: activity });
    res.status(201).json({ success: true, data: activity });
  } catch (error) { next(error); }
};

/** `PUT /api/jur/lgpd/processing-activities/:id` */
exports.updateActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity = await new UpdateProcessingActivityUseCase(activityRepository).execute({ id: Number(req.params.id), ...req.body });
    logAction(req, { action: 'update', entityType: 'JurLgpdProcessingActivity', entityId: Number(req.params.id), newValues: req.body });
    res.json({ success: true, data: activity });
  } catch (error) { next(error); }
};

/** `POST /api/jur/lgpd/processing-activities/:id/review` */
exports.reviewActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity = await new ReviewProcessingActivityUseCase(activityRepository).execute({ id: Number(req.params.id), reviewedAt: req.body?.reviewed_at ?? null });
    logAction(req, { action: 'review', entityType: 'JurLgpdProcessingActivity', entityId: Number(req.params.id) });
    res.json({ success: true, data: activity });
  } catch (error) { next(error); }
};

// ---- Solicitação de Titular ----

/** `GET /api/jur/lgpd/data-subject-requests` */
exports.listDataSubjectRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, ...filters } = req.query as any;
    const result = await new ListDataSubjectRequestsUseCase(requestRepository).execute({ filters, page: Number(page), limit: Number(limit) });
    res.json({ success: true, data: result.rows, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

/** `GET /api/jur/lgpd/data-subject-requests/pending-critical` — antes de `/:id` na rota. */
exports.pendingCriticalDataSubjectRequests = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new PendingCriticalDataSubjectRequestsUseCase(requestRepository).execute();
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `GET /api/jur/lgpd/data-subject-requests/:id` */
exports.getDataSubjectRequestById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetDataSubjectRequestByIdUseCase(requestRepository).execute({ id: req.params.id });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/jur/lgpd/data-subject-requests` */
exports.createDataSubjectRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = await new CreateDataSubjectRequestUseCase(requestRepository).execute({
      ...req.body,
      dpoUserId: req.body?.dpo_user_id ?? (req as any).user.id,
    });
    logAction(req, { action: 'create', entityType: 'JurLgpdDataSubjectRequest', entityId: request.id, newValues: request });
    res.status(201).json({ success: true, data: request });
  } catch (error) { next(error); }
};

/** `POST /api/jur/lgpd/data-subject-requests/:id/verify-identity` */
exports.verifyIdentity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = await new VerifyIdentityUseCase(requestRepository).execute({
      id: Number(req.params.id),
      identity_verified: Boolean(req.body?.identity_verified),
      verification_notes: req.body?.verification_notes ?? null,
      verifiedBy: (req as any).user.id,
    });
    logAction(req, { action: 'verify_identity', entityType: 'JurLgpdDataSubjectRequest', entityId: Number(req.params.id) });
    res.json({ success: true, data: request });
  } catch (error) { next(error); }
};

/** `POST /api/jur/lgpd/data-subject-requests/:id/resolve` */
exports.resolveDataSubjectRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = await new ResolveDataSubjectRequestUseCase(requestRepository).execute({
      id: Number(req.params.id),
      resolution_notes: req.body?.resolution_notes,
      answered_at: req.body?.answered_at ?? null,
    });
    logAction(req, { action: 'resolve', entityType: 'JurLgpdDataSubjectRequest', entityId: Number(req.params.id), newValues: req.body });
    res.json({ success: true, data: request });
  } catch (error) { next(error); }
};

/** `POST /api/jur/lgpd/data-subject-requests/:id/reject` */
exports.rejectDataSubjectRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = await new RejectDataSubjectRequestUseCase(requestRepository).execute({
      id: Number(req.params.id),
      rejection_justification: req.body?.rejection_justification,
    });
    logAction(req, { action: 'reject', entityType: 'JurLgpdDataSubjectRequest', entityId: Number(req.params.id), newValues: req.body });
    res.json({ success: true, data: request });
  } catch (error) { next(error); }
};

// ---- Incidente ----

/** `GET /api/jur/lgpd/incidents` */
exports.listIncidents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, ...filters } = req.query as any;
    const result = await new ListIncidentsUseCase(incidentRepository).execute({ filters, page: Number(page), limit: Number(limit) });
    res.json({ success: true, data: result.rows, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

/** `GET /api/jur/lgpd/incidents/:id` */
exports.getIncidentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetIncidentByIdUseCase(incidentRepository).execute({ id: req.params.id });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/jur/lgpd/incidents` */
exports.createIncident = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const incident = await new CreateIncidentUseCase(incidentRepository).execute({
      ...req.body,
      createdBy: (req as any).user.id,
      dpoUserId: req.body?.dpo_user_id ?? null,
    });
    logAction(req, { action: 'create', entityType: 'JurLgpdIncident', entityId: incident.id, newValues: incident });
    res.status(201).json({ success: true, data: incident });
  } catch (error) { next(error); }
};

/** `POST /api/jur/lgpd/incidents/:id/decision` */
exports.decideIncident = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const incident = await new DecideIncidentUseCase(incidentRepository).execute({ id: Number(req.params.id), ...req.body });
    logAction(req, { action: 'decision', entityType: 'JurLgpdIncident', entityId: Number(req.params.id), newValues: req.body });
    res.json({ success: true, data: incident });
  } catch (error) { next(error); }
};

/** `POST /api/jur/lgpd/incidents/:id/close` */
exports.closeIncident = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const incident = await new CloseIncidentUseCase(incidentRepository).execute({ id: Number(req.params.id) });
    logAction(req, { action: 'close', entityType: 'JurLgpdIncident', entityId: Number(req.params.id) });
    res.json({ success: true, data: incident });
  } catch (error) { next(error); }
};
