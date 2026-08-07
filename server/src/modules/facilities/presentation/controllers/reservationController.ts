import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Reserva de Recursos (`/api/facilities/resource-reservations`, P2).
 *
 * @module modules/facilities/presentation/controllers/reservationController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeReservationRepository = require('../../infrastructure/sequelize/SequelizeReservationRepository');
const { ListReservationsUseCase, GetReservationByIdUseCase, CreateReservationUseCase, CancelReservationUseCase } = require('../../application/use-cases/reservation/ReservationUseCases');
const { createReservationSchema, listReservationQuerySchema, handleZodError } = require('../validators/reservationValidators');
const { ValidationError } = require('../../../../errors');

const reservationRepository = new SequelizeReservationRepository();

exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listReservationQuerySchema.parse(req.query);
    const useCase = new ListReservationsUseCase(reservationRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({ ...query, offset: (query.page - 1) * query.limit });
    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error: any) {
    if (error?.issues) return next(new ValidationError('Payload inválido.', error.issues));
    next(error);
  }
};

exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetReservationByIdUseCase(reservationRepository);
    const reservation = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: reservation });
  } catch (error) { next(error); }
};

exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createReservationSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateReservationUseCase(reservationRepository);
    const reservation = await useCase.execute({ ...parsed.data, reservedBy: (req as any).user.id });

    logAction(req, {
      action: 'create',
      entityType: 'FacilityResourceReservation',
      entityId: reservation?.id,
      description: `Reserva de ${parsed.data.resource_type} criada`,
    });

    res.status(201).json({ success: true, data: reservation });
  } catch (error) { next(error); }
};

exports.cancel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new CancelReservationUseCase(reservationRepository);
    const reservation = await useCase.execute({ id: Number(req.params.id) });

    logAction(req, {
      action: 'update',
      entityType: 'FacilityResourceReservation',
      entityId: reservation?.id,
      description: `Reserva #${reservation?.id} cancelada`,
    });

    res.json({ success: true, data: reservation });
  } catch (error) { next(error); }
};
