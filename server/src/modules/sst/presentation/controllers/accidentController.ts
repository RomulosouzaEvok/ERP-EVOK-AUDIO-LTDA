/**
 * Controller do cluster Acidente/CAT (Lei 8.213/91).
 *
 * @module modules/sst/presentation/controllers/accidentController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeAccidentRepository = require('../../infrastructure/sequelize/SequelizeAccidentRepository');
const SequelizeEsocialEventRepository = require('../../infrastructure/sequelize/SequelizeEsocialEventRepository');
const { logAction } = require('../../../../services/auditLogService');

const ListAccidentsUseCase = require('../../application/use-cases/accident/ListAccidentsUseCase');
const GetAccidentByIdUseCase = require('../../application/use-cases/accident/GetAccidentByIdUseCase');
const CreateAccidentUseCase = require('../../application/use-cases/accident/CreateAccidentUseCase');
const CreateAccidentComplementUseCase = require('../../application/use-cases/accident/CreateAccidentComplementUseCase');
const CloseAccidentUseCase = require('../../application/use-cases/accident/CloseAccidentUseCase');
const EmitCatUseCase = require('../../application/use-cases/accident/EmitCatUseCase');
const ListCatsByAccidentUseCase = require('../../application/use-cases/accident/ListCatsByAccidentUseCase');
const ReopenCatUseCase = require('../../application/use-cases/accident/ReopenCatUseCase');
const CreateAccidentInvestigationUseCase = require('../../application/use-cases/accident/CreateAccidentInvestigationUseCase');
const GetAccidentInvestigationUseCase = require('../../application/use-cases/accident/GetAccidentInvestigationUseCase');

const accidentRepository = new SequelizeAccidentRepository();
const esocialEventRepository = new SequelizeEsocialEventRepository();

/** `GET /api/sst/accidents` */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows, total, page, limit, totalPages } = await new ListAccidentsUseCase(accidentRepository).execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) { next(error); }
};

/** `GET /api/sst/accidents/:id` — dado sensível, log de leitura (RNF-SST-05). */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const acidente = await new GetAccidentByIdUseCase(accidentRepository).execute({ id: req.params.id });
    logAction(req, { action: 'read', entityType: 'SstAcidente', entityId: Number(req.params.id) });
    res.json({ success: true, data: acidente });
  } catch (error) { next(error); }
};

/** `POST /api/sst/accidents` */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const acidente = await new CreateAccidentUseCase(accidentRepository).execute({ body: req.body, registradoPor: (req as any).user.id });
    res.status(201).json({ success: true, data: acidente });
  } catch (error) { next(error); }
};

/** `POST /api/sst/accidents/:id/complements` */
exports.createComplement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const acidente = await new CreateAccidentComplementUseCase(accidentRepository).execute({ accidentId: req.params.id, body: req.body, registradoPor: (req as any).user.id });
    res.status(201).json({ success: true, data: acidente });
  } catch (error) { next(error); }
};

/** `POST /api/sst/accidents/:id/close` */
exports.close = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const acidente = await new CloseAccidentUseCase(accidentRepository).execute({ id: req.params.id });
    res.json({ success: true, data: acidente });
  } catch (error) { next(error); }
};

/** `POST /api/sst/accidents/:id/cat` */
exports.emitCat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await new EmitCatUseCase(accidentRepository, esocialEventRepository).execute({ accidentId: req.params.id, emitenteId: (req as any).user.id, body: req.body });
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
};

/** `GET /api/sst/accidents/:id/cat` */
exports.listCats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cats = await new ListCatsByAccidentUseCase(accidentRepository).execute({ accidentId: req.params.id });
    res.json({ success: true, data: cats });
  } catch (error) { next(error); }
};

/** `POST /api/sst/cat/:catId/reopen` */
exports.reopenCat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cat = await new ReopenCatUseCase(accidentRepository, esocialEventRepository).execute({ catId: req.params.catId, emitenteId: (req as any).user.id });
    res.status(201).json({ success: true, data: cat });
  } catch (error) { next(error); }
};

/** `POST /api/sst/accidents/:id/investigation` */
exports.createInvestigation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const investigacao = await new CreateAccidentInvestigationUseCase(accidentRepository).execute({ accidentId: req.params.id, body: req.body, createdBy: (req as any).user.id });
    res.status(201).json({ success: true, data: investigacao });
  } catch (error) { next(error); }
};

/** `GET /api/sst/accidents/:id/investigation` */
exports.getInvestigation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const investigacao = await new GetAccidentInvestigationUseCase(accidentRepository).execute({ accidentId: req.params.id });
    res.json({ success: true, data: investigacao });
  } catch (error) { next(error); }
};
