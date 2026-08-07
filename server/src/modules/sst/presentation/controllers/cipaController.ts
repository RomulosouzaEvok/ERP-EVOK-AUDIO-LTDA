/**
 * Controller do cluster CIPA (NR-5, CF/88).
 *
 * @module modules/sst/presentation/controllers/cipaController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeCipaRepository = require('../../infrastructure/sequelize/SequelizeCipaRepository');

const GetDimensioningUseCase = require('../../application/use-cases/cipa/GetDimensioningUseCase');
const ListMandatesUseCase = require('../../application/use-cases/cipa/ListMandatesUseCase');
const GetMandateByIdUseCase = require('../../application/use-cases/cipa/GetMandateByIdUseCase');
const CreateMandateUseCase = require('../../application/use-cases/cipa/CreateMandateUseCase');
const AddMemberUseCase = require('../../application/use-cases/cipa/AddMemberUseCase');
const TakeOfficeUseCase = require('../../application/use-cases/cipa/TakeOfficeUseCase');
const OpenElectoralProcessUseCase = require('../../application/use-cases/cipa/OpenElectoralProcessUseCase');
const AddCandidateUseCase = require('../../application/use-cases/cipa/AddCandidateUseCase');
const CloseElectoralProcessUseCase = require('../../application/use-cases/cipa/CloseElectoralProcessUseCase');
const ListMeetingsUseCase = require('../../application/use-cases/cipa/ListMeetingsUseCase');
const CreateMeetingUseCase = require('../../application/use-cases/cipa/CreateMeetingUseCase');
const GetStabilityUseCase = require('../../application/use-cases/cipa/GetStabilityUseCase');

const cipaRepository = new SequelizeCipaRepository();

/** `GET /api/sst/cipa/dimensioning` */
exports.dimensioning = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetDimensioningUseCase(cipaRepository).execute();
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `GET /api/sst/cipa/mandates` */
exports.listMandates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows, total, page, limit, totalPages } = await new ListMandatesUseCase(cipaRepository).execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) { next(error); }
};

/** `GET /api/sst/cipa/mandates/:id` */
exports.getMandateById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetMandateByIdUseCase(cipaRepository).execute({ id: req.params.id });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/sst/cipa/mandates` */
exports.createMandate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new CreateMandateUseCase(cipaRepository).execute({ body: req.body });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/sst/cipa/mandates/:id/members` */
exports.addMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new AddMemberUseCase(cipaRepository).execute({ mandateId: req.params.id, body: req.body });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/sst/cipa/members/:id/take-office` */
exports.takeOffice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new TakeOfficeUseCase(cipaRepository).execute({ memberId: req.params.id });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/sst/cipa/electoral-processes` */
exports.openElectoralProcess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new OpenElectoralProcessUseCase(cipaRepository).execute({ body: req.body });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/sst/cipa/electoral-processes/:id/candidates` */
exports.addCandidate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new AddCandidateUseCase(cipaRepository).execute({ processId: req.params.id, body: req.body });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/sst/cipa/electoral-processes/:id/close` */
exports.closeElectoralProcess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new CloseElectoralProcessUseCase(cipaRepository).execute({ processId: req.params.id, body: req.body });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `GET /api/sst/cipa/meetings` */
exports.listMeetings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows, total, page, limit, totalPages } = await new ListMeetingsUseCase(cipaRepository).execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) { next(error); }
};

/** `POST /api/sst/cipa/meetings` */
exports.createMeeting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new CreateMeetingUseCase(cipaRepository).execute({ body: req.body, createdBy: (req as any).user.id });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

/** `GET /api/sst/cipa/stability/:employeeId` — exceção `sst`|`rh`. */
exports.stability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetStabilityUseCase(cipaRepository).execute({ employeeId: req.params.employeeId });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};
