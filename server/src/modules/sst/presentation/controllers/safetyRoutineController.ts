/**
 * Controller do cluster Rotina Preventiva (Inspeções, PT, Brigada, DDS).
 *
 * @module modules/sst/presentation/controllers/safetyRoutineController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeSafetyRoutineRepository = require('../../infrastructure/sequelize/SequelizeSafetyRoutineRepository');

const ListInspectionsUseCase = require('../../application/use-cases/safetyRoutine/ListInspectionsUseCase');
const CreateInspectionUseCase = require('../../application/use-cases/safetyRoutine/CreateInspectionUseCase');
const ListWorkPermitsUseCase = require('../../application/use-cases/safetyRoutine/ListWorkPermitsUseCase');
const CreateWorkPermitUseCase = require('../../application/use-cases/safetyRoutine/CreateWorkPermitUseCase');
const CloseWorkPermitUseCase = require('../../application/use-cases/safetyRoutine/CloseWorkPermitUseCase');
const ListBrigadeUseCase = require('../../application/use-cases/safetyRoutine/ListBrigadeUseCase');
const CreateBrigadeMemberUseCase = require('../../application/use-cases/safetyRoutine/CreateBrigadeMemberUseCase');
const UpdateBrigadeMemberUseCase = require('../../application/use-cases/safetyRoutine/UpdateBrigadeMemberUseCase');
const ListDdsUseCase = require('../../application/use-cases/safetyRoutine/ListDdsUseCase');
const CreateDdsUseCase = require('../../application/use-cases/safetyRoutine/CreateDdsUseCase');

const repository = new SequelizeSafetyRoutineRepository();

/** `GET /api/sst/inspections` */
exports.listInspections = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows, total, page, limit, totalPages } = await new ListInspectionsUseCase(repository).execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) { next(error); }
};

/** `POST /api/sst/inspections` */
exports.createInspection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new CreateInspectionUseCase(repository).execute({ body: req.body, inspetorId: (req as any).user.id });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

/** `GET /api/sst/work-permits` */
exports.listWorkPermits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows, total, page, limit, totalPages } = await new ListWorkPermitsUseCase(repository).execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) { next(error); }
};

/** `POST /api/sst/work-permits` */
exports.createWorkPermit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new CreateWorkPermitUseCase(repository).execute({ body: req.body, autorizanteId: (req as any).user.id });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/sst/work-permits/:id/close` */
exports.closeWorkPermit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new CloseWorkPermitUseCase(repository).execute({ id: req.params.id });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `GET /api/sst/brigade` */
exports.listBrigade = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows, total, page, limit, totalPages } = await new ListBrigadeUseCase(repository).execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) { next(error); }
};

/** `POST /api/sst/brigade` */
exports.createBrigadeMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new CreateBrigadeMemberUseCase(repository).execute({ body: req.body });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

/** `PUT /api/sst/brigade/:id` */
exports.updateBrigadeMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new UpdateBrigadeMemberUseCase(repository).execute({ id: req.params.id, body: req.body });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `GET /api/sst/dds` */
exports.listDds = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows, total, page, limit, totalPages } = await new ListDdsUseCase(repository).execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) { next(error); }
};

/** `POST /api/sst/dds` */
exports.createDds = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new CreateDdsUseCase(repository).execute({ body: req.body });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};
