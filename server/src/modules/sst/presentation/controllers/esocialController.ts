/**
 * Controller da fila de eventos eSocial SST (S-2210/S-2220/S-2240).
 *
 * @module modules/sst/presentation/controllers/esocialController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeEsocialEventRepository = require('../../infrastructure/sequelize/SequelizeEsocialEventRepository');
const ListEsocialEventsUseCase = require('../../application/use-cases/esocial/ListEsocialEventsUseCase');
const GetEsocialEventByIdUseCase = require('../../application/use-cases/esocial/GetEsocialEventByIdUseCase');
const ResendEsocialEventUseCase = require('../../application/use-cases/esocial/ResendEsocialEventUseCase');

const esocialEventRepository = new SequelizeEsocialEventRepository();

/** `GET /api/sst/esocial-events` */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows, total, page, limit, totalPages } = await new ListEsocialEventsUseCase(esocialEventRepository).execute(req.query);
    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (error) { next(error); }
};

/** `GET /api/sst/esocial-events/:id` */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const evento = await new GetEsocialEventByIdUseCase(esocialEventRepository).execute({ id: req.params.id });
    res.json({ success: true, data: evento });
  } catch (error) { next(error); }
};

/** `POST /api/sst/esocial-events/:id/resend` */
exports.resend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const evento = await new ResendEsocialEventUseCase(esocialEventRepository).execute({ id: req.params.id });
    res.status(201).json({ success: true, data: evento });
  } catch (error) { next(error); }
};
