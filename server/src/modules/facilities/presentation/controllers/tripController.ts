import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Diário de Uso (`/api/facilities/trips`).
 *
 * @module modules/facilities/presentation/controllers/tripController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeTripRepository = require('../../infrastructure/sequelize/SequelizeTripRepository');
const SequelizeDriverRepository = require('../../infrastructure/sequelize/SequelizeDriverRepository');
const SequelizeVehicleDocumentRepository = require('../../infrastructure/sequelize/SequelizeVehicleDocumentRepository');
const SequelizeVehicleRepository = require('../../infrastructure/sequelize/SequelizeVehicleRepository');
const AssetServiceAdapter = require('../../infrastructure/adapters/AssetServiceAdapter');
const {
  ListTripsUseCase, GetTripByIdUseCase, CreateTripUseCase, DepartTripUseCase, ReturnTripUseCase, CancelTripUseCase,
} = require('../../application/use-cases/trip/TripUseCases');
const {
  createTripSchema, departTripSchema, returnTripSchema, cancelTripSchema, listTripQuerySchema, handleZodError,
} = require('../validators/tripValidators');
const { ValidationError } = require('../../../../errors');

const tripRepository = new SequelizeTripRepository();
const driverRepository = new SequelizeDriverRepository();
const documentRepository = new SequelizeVehicleDocumentRepository();
const vehicleRepository = new SequelizeVehicleRepository();
const assetService = new AssetServiceAdapter();

exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listTripQuerySchema.parse(req.query);
    const useCase = new ListTripsUseCase(tripRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({ ...query, offset: (query.page - 1) * query.limit });
    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error: any) {
    if (error?.issues) return next(new ValidationError('Payload inválido.', error.issues));
    next(error);
  }
};

exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetTripByIdUseCase(tripRepository);
    const trip = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: trip });
  } catch (error) { next(error); }
};

exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createTripSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateTripUseCase(tripRepository);
    const trip = await useCase.execute({ ...parsed.data, requestedBy: (req as any).user.id });

    logAction(req, {
      action: 'create',
      entityType: 'FacilityVehicleTrip',
      entityId: trip?.id,
      newValues: parsed.data,
      description: `Uso de veículo #${parsed.data.asset_id} agendado`,
    });

    res.status(201).json({ success: true, data: trip });
  } catch (error) { next(error); }
};

/** `POST /api/facilities/trips/:id/depart` — nível operate, ou approve se divergência de odômetro. */
exports.depart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = departTripSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const user = (req as any).user;
    const hasApproveLevel = user.role === 'admin' || user.permissions?.facilities === 'approve';

    const useCase = new DepartTripUseCase(tripRepository, driverRepository, documentRepository, assetService);
    const trip = await useCase.execute({
      id: Number(req.params.id),
      ...parsed.data,
      hasApproveLevel,
      approvedBy: hasApproveLevel ? user.id : undefined,
    });

    logAction(req, {
      action: 'update',
      entityType: 'FacilityVehicleTrip',
      entityId: trip?.id,
      description: `Saída registrada para o uso #${trip?.id}`,
    });

    res.json({ success: true, data: trip });
  } catch (error) { next(error); }
};

exports.return = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = returnTripSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new ReturnTripUseCase(tripRepository, vehicleRepository);
    const trip = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'FacilityVehicleTrip',
      entityId: trip?.id,
      description: `Retorno registrado para o uso #${trip?.id}`,
    });

    res.json({ success: true, data: trip });
  } catch (error) { next(error); }
};

exports.cancel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = cancelTripSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CancelTripUseCase(tripRepository);
    const trip = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'FacilityVehicleTrip',
      entityId: trip?.id,
      description: `Uso #${trip?.id} cancelado — ${parsed.data.cancel_reason}`,
    });

    res.json({ success: true, data: trip });
  } catch (error) { next(error); }
};
