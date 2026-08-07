/**
 * Controller do cluster Contencioso — JurLegalCase/JurLegalCaseEvent/
 * JurLegalCaseProvision/JurExternalLawyer (UC-53,
 * `docs/business/BLOCO_3_JUR_API.md` §3).
 *
 * @module modules/juridico/presentation/controllers/legalCaseController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeLegalCaseRepository = require('../../infrastructure/sequelize/SequelizeLegalCaseRepository');
const SequelizeExternalLawyerRepository = require('../../infrastructure/sequelize/SequelizeExternalLawyerRepository');
const AccountPayableServiceAdapter = require('../../infrastructure/adapters/AccountPayableServiceAdapter');
const { logAction } = require('../../../../services/auditLogService');

const CreateExternalLawyerUseCase = require('../../application/use-cases/externalLawyer/CreateExternalLawyerUseCase');
const UpdateExternalLawyerUseCase = require('../../application/use-cases/externalLawyer/UpdateExternalLawyerUseCase');
const ListExternalLawyersUseCase = require('../../application/use-cases/externalLawyer/ListExternalLawyersUseCase');
const GetExternalLawyerByIdUseCase = require('../../application/use-cases/externalLawyer/GetExternalLawyerByIdUseCase');

const CreateLegalCaseUseCase = require('../../application/use-cases/legalCase/CreateLegalCaseUseCase');
const GetLegalCaseByIdUseCase = require('../../application/use-cases/legalCase/GetLegalCaseByIdUseCase');
const ListLegalCasesUseCase = require('../../application/use-cases/legalCase/ListLegalCasesUseCase');
const CreateLegalCaseEventUseCase = require('../../application/use-cases/legalCase/CreateLegalCaseEventUseCase');
const ListLegalCaseEventsUseCase = require('../../application/use-cases/legalCase/ListLegalCaseEventsUseCase');
const CreateLegalCaseProvisionUseCase = require('../../application/use-cases/legalCase/CreateLegalCaseProvisionUseCase');
const ListLegalCaseProvisionsUseCase = require('../../application/use-cases/legalCase/ListLegalCaseProvisionsUseCase');
const GetCurrentProvisionUseCase = require('../../application/use-cases/legalCase/GetCurrentProvisionUseCase');
const RegisterCaseCostUseCase = require('../../application/use-cases/legalCase/RegisterCaseCostUseCase');
const CloseLegalCaseUseCase = require('../../application/use-cases/legalCase/CloseLegalCaseUseCase');
const ProvisionsReportUseCase = require('../../application/use-cases/legalCase/ProvisionsReportUseCase');

const legalCaseRepository = new SequelizeLegalCaseRepository();
const externalLawyerRepository = new SequelizeExternalLawyerRepository();
const accountPayableService = new AccountPayableServiceAdapter();

function hasApprove(req: Request): boolean {
  const user = (req as any).user;
  return user?.role === 'admin' || user?.permissions?.juridico === 'approve';
}

// ---- advogados externos ----

/** `GET /api/jur/external-lawyers` */
exports.listExternalLawyers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, ...filters } = req.query as any;
    const result = await new ListExternalLawyersUseCase(externalLawyerRepository).execute({ filters, page: Number(page), limit: Number(limit) });
    res.json({ success: true, data: result.rows, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

/** `GET /api/jur/external-lawyers/:id` */
exports.getExternalLawyerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetExternalLawyerByIdUseCase(externalLawyerRepository).execute({ id: req.params.id });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/jur/external-lawyers` */
exports.createExternalLawyer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lawyer = await new CreateExternalLawyerUseCase(externalLawyerRepository).execute(req.body);
    res.status(201).json({ success: true, data: lawyer });
  } catch (error) { next(error); }
};

/** `PUT /api/jur/external-lawyers/:id` */
exports.updateExternalLawyer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lawyer = await new UpdateExternalLawyerUseCase(externalLawyerRepository).execute({ id: Number(req.params.id), ...req.body });
    res.json({ success: true, data: lawyer });
  } catch (error) { next(error); }
};

// ---- processos ----

/** `GET /api/jur/legal-cases` */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, ...filters } = req.query as any;
    const result = await new ListLegalCasesUseCase(legalCaseRepository).execute({ filters, page: Number(page), limit: Number(limit) });
    res.json({ success: true, data: result.rows, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

/** `GET /api/jur/legal-cases/:id` */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetLegalCaseByIdUseCase(legalCaseRepository).execute({ id: req.params.id });
    logAction(req, { action: 'read', entityType: 'JurLegalCase', entityId: Number(req.params.id) });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/jur/legal-cases` */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const legalCase = await new CreateLegalCaseUseCase(legalCaseRepository).execute({ ...req.body, createdBy: (req as any).user.id });
    logAction(req, { action: 'create', entityType: 'JurLegalCase', entityId: legalCase.id, newValues: legalCase });
    res.status(201).json({ success: true, data: legalCase });
  } catch (error) { next(error); }
};

/** `POST /api/jur/legal-cases/:id/events` */
exports.addEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await new CreateLegalCaseEventUseCase(legalCaseRepository).execute({
      legalCaseId: Number(req.params.id),
      ...req.body,
      createdBy: (req as any).user.id,
    });
    res.status(201).json({ success: true, data: event });
  } catch (error) { next(error); }
};

/** `GET /api/jur/legal-cases/:id/events` */
exports.listEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new ListLegalCaseEventsUseCase(legalCaseRepository).execute({ legalCaseId: Number(req.params.id) });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/jur/legal-cases/:id/provisions` */
exports.addProvision = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const provision = await new CreateLegalCaseProvisionUseCase(legalCaseRepository).execute({
      legalCaseId: Number(req.params.id),
      ...req.body,
      assessedBy: (req as any).user.id,
      hasApprove: hasApprove(req),
    });
    logAction(req, { action: 'create', entityType: 'JurLegalCaseProvision', entityId: provision.id, newValues: provision });
    res.status(201).json({ success: true, data: provision });
  } catch (error) { next(error); }
};

/** `GET /api/jur/legal-cases/:id/provisions` */
exports.listProvisions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new ListLegalCaseProvisionsUseCase(legalCaseRepository).execute({ legalCaseId: Number(req.params.id) });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `GET /api/jur/legal-cases/:id/provisions/current` */
exports.getCurrentProvision = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetCurrentProvisionUseCase(legalCaseRepository).execute({ legalCaseId: Number(req.params.id) });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/jur/legal-cases/:id/costs` */
exports.registerCost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payable = await new RegisterCaseCostUseCase(legalCaseRepository, accountPayableService).execute({
      legalCaseId: Number(req.params.id),
      ...req.body,
    });
    logAction(req, { action: 'create', entityType: 'AccountPayable', entityId: payable.id, newValues: payable, entityDescription: `Custo do processo #${req.params.id}` });
    res.status(201).json({ success: true, data: payable });
  } catch (error) { next(error); }
};

/** `POST /api/jur/legal-cases/:id/close` */
exports.close = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const legalCase = await new CloseLegalCaseUseCase(legalCaseRepository, accountPayableService).execute({ id: Number(req.params.id), ...req.body });
    logAction(req, { action: 'close', entityType: 'JurLegalCase', entityId: Number(req.params.id), newValues: req.body });
    res.json({ success: true, data: legalCase });
  } catch (error) { next(error); }
};

/** `GET /api/jur/reports/provisions` */
exports.provisionsReport = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new ProvisionsReportUseCase(legalCaseRepository).execute();
    res.json({ success: true, data });
  } catch (error) { next(error); }
};
