import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Veículos de Frota (`/api/facilities/vehicles`).
 *
 * @module modules/facilities/presentation/controllers/vehicleController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeVehicleRepository = require('../../infrastructure/sequelize/SequelizeVehicleRepository');
const ListVehiclesUseCase = require('../../application/use-cases/vehicle/ListVehiclesUseCase');
const GetVehicleByIdUseCase = require('../../application/use-cases/vehicle/GetVehicleByIdUseCase');
const CreateVehicleUseCase = require('../../application/use-cases/vehicle/CreateVehicleUseCase');
const UpdateVehicleUseCase = require('../../application/use-cases/vehicle/UpdateVehicleUseCase');
const { createVehicleSchema, updateVehicleSchema, listVehicleQuerySchema, handleZodError } = require('../validators/vehicleValidators');
const { ValidationError } = require('../../../../errors');

const vehicleRepository = new SequelizeVehicleRepository();

/** `GET /api/facilities/vehicles` — lista paginada, com filtro opcional de `status`. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listVehicleQuerySchema.parse(req.query);
    const useCase = new ListVehiclesUseCase(vehicleRepository);
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

/** `GET /api/facilities/vehicles/:id` — busca por id. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetVehicleByIdUseCase(vehicleRepository);
    const vehicle = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: vehicle });
  } catch (error) { next(error); }
};

/** `POST /api/facilities/vehicles` — cria um veículo (409 se `plate` duplicada). */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createVehicleSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateVehicleUseCase(vehicleRepository);
    const vehicle = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'FacilityVehicle',
      entityId: vehicle?.id,
      entityDescription: vehicle?.plate,
      newValues: { plate: vehicle?.plate, brand: vehicle?.brand, model: vehicle?.model },
      description: `Veículo ${vehicle?.plate} criado`,
    });

    res.status(201).json({ success: true, data: vehicle });
  } catch (error) { next(error); }
};

/** `PUT /api/facilities/vehicles/:id` — atualiza campos do veículo. */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateVehicleSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateVehicleUseCase(vehicleRepository);
    const vehicle = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'FacilityVehicle',
      entityId: vehicle?.id,
      entityDescription: vehicle?.plate,
      newValues: parsed.data,
      description: `Veículo ${vehicle?.plate} atualizado`,
    });

    res.json({ success: true, data: vehicle });
  } catch (error) { next(error); }
};
