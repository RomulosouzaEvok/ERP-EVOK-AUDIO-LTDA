import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Abastecimento (`/api/facilities/fuel-records`).
 * BREAKING (D-2): `vehicle_id` renomeado para `asset_id`.
 *
 * @module modules/facilities/presentation/controllers/fuelRecordController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeFuelRecordRepository = require('../../infrastructure/sequelize/SequelizeFuelRecordRepository');
const SequelizeVehicleRepository = require('../../infrastructure/sequelize/SequelizeVehicleRepository');
const ListFuelRecordsUseCase = require('../../application/use-cases/fuelRecord/ListFuelRecordsUseCase');
const GetFuelRecordByIdUseCase = require('../../application/use-cases/fuelRecord/GetFuelRecordByIdUseCase');
const CreateFuelRecordUseCase = require('../../application/use-cases/fuelRecord/CreateFuelRecordUseCase');
const UpdateFuelRecordUseCase = require('../../application/use-cases/fuelRecord/UpdateFuelRecordUseCase');
const { createFuelRecordSchema, updateFuelRecordSchema, listFuelRecordQuerySchema, handleZodError } = require('../validators/fuelRecordValidators');
const { ValidationError } = require('../../../../errors');

const fuelRecordRepository = new SequelizeFuelRecordRepository();
const vehicleRepository = new SequelizeVehicleRepository();

/** `GET /api/facilities/fuel-records` — lista paginada, com filtro opcional de `asset_id`. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listFuelRecordQuerySchema.parse(req.query);
    const useCase = new ListFuelRecordsUseCase(fuelRecordRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({
      ...query,
      offset: (query.page - 1) * query.limit,
    });
    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error: any) {
    if (error?.issues) return next(new ValidationError('Payload inválido.', error.issues));
    next(error);
  }
};

/** `GET /api/facilities/fuel-records/:id` — busca por id. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetFuelRecordByIdUseCase(fuelRecordRepository);
    const record = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: record });
  } catch (error) { next(error); }
};

/** `POST /api/facilities/fuel-records` — valida km/tanque, atualiza current_km, calcula consumption_alert. */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createFuelRecordSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateFuelRecordUseCase(fuelRecordRepository, vehicleRepository);
    const record = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'FacilityFuelRecord',
      entityId: record?.id,
      entityDescription: `Veículo asset #${record?.asset_id}`,
      newValues: { asset_id: record?.asset_id, liters: record?.liters, total_cost: record?.total_cost },
      description: `Abastecimento registrado para o veículo #${record?.asset_id}`,
    });

    res.status(201).json({ success: true, data: record });
  } catch (error) { next(error); }
};

/** `PUT /api/facilities/fuel-records/:id` — corrige apenas campos não recalculáveis (RNF-FAC-01). */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateFuelRecordSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateFuelRecordUseCase(fuelRecordRepository);
    const record = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'FacilityFuelRecord',
      entityId: record?.id,
      entityDescription: `Veículo asset #${record?.asset_id}`,
      newValues: parsed.data,
      description: `Abastecimento ${record?.id} atualizado`,
    });

    res.json({ success: true, data: record });
  } catch (error) { next(error); }
};
