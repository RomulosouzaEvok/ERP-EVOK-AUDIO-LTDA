import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Multa (`/api/facilities/fines`).
 *
 * @module modules/facilities/presentation/controllers/fineController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeFineRepository = require('../../infrastructure/sequelize/SequelizeFineRepository');
const SequelizeVehicleRepository = require('../../infrastructure/sequelize/SequelizeVehicleRepository');
const SequelizeTripRepository = require('../../infrastructure/sequelize/SequelizeTripRepository');
const AccountPayableServiceAdapter = require('../../infrastructure/adapters/AccountPayableServiceAdapter');
const {
  ListFinesUseCase, GetFineByIdUseCase, CreateFineUseCase, SuggestFineDriverUseCase,
  IndicateFineDriverUseCase, AppealFineUseCase, PayFineUseCase, ChargeDriverFineUseCase,
} = require('../../application/use-cases/fine/FineUseCases');
const {
  createFineSchema, indicateFineSchema, payFineSchema, chargeDriverFineSchema, listFineQuerySchema, handleZodError,
} = require('../validators/fineValidators');
const { ValidationError } = require('../../../../errors');

const fineRepository = new SequelizeFineRepository();
const vehicleRepository = new SequelizeVehicleRepository();
const tripRepository = new SequelizeTripRepository();
const accountPayableService = new AccountPayableServiceAdapter();

exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listFineQuerySchema.parse(req.query);
    const useCase = new ListFinesUseCase(fineRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({ ...query, offset: (query.page - 1) * query.limit });
    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error: any) {
    if (error?.issues) return next(new ValidationError('Payload inválido.', error.issues));
    next(error);
  }
};

exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetFineByIdUseCase(fineRepository);
    const fine = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: fine });
  } catch (error) { next(error); }
};

exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createFineSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateFineUseCase(fineRepository, vehicleRepository, tripRepository);
    const fine = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'FacilityFine',
      entityId: fine?.id,
      newValues: parsed.data,
      description: `Multa registrada para o veículo #${parsed.data.asset_id}`,
    });

    res.status(201).json({ success: true, data: fine });
  } catch (error) { next(error); }
};

exports.suggestedDriver = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new SuggestFineDriverUseCase(fineRepository, tripRepository);
    const result = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

/** `POST /api/facilities/fines/:id/indicate` — nível approve. */
exports.indicate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = indicateFineSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new IndicateFineDriverUseCase(fineRepository);
    const fine = await useCase.execute({ id: Number(req.params.id), indicatedBy: (req as any).user.id, ...parsed.data });

    logAction(req, {
      action: 'approve',
      entityType: 'FacilityFine',
      entityId: fine?.id,
      description: `Indicação de condutor confirmada para a multa #${fine?.id}`,
    });

    res.json({ success: true, data: fine });
  } catch (error) { next(error); }
};

exports.appeal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new AppealFineUseCase(fineRepository);
    const fine = await useCase.execute({ id: Number(req.params.id) });

    logAction(req, {
      action: 'update',
      entityType: 'FacilityFine',
      entityId: fine?.id,
      description: `Multa #${fine?.id} recorrida`,
    });

    res.json({ success: true, data: fine });
  } catch (error) { next(error); }
};

/** `POST /api/facilities/fines/:id/pay` — nível approve, gera título em AP. */
exports.pay = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = payFineSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new PayFineUseCase(fineRepository, accountPayableService);
    const fine = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'approve',
      entityType: 'FacilityFine',
      entityId: fine?.id,
      description: `Multa #${fine?.id} paga — título gerado em Contas a Pagar`,
    });

    res.json({ success: true, data: fine });
  } catch (error) { next(error); }
};

exports.chargeDriver = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = chargeDriverFineSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new ChargeDriverFineUseCase(fineRepository);
    const fine = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'FacilityFine',
      entityId: fine?.id,
      description: `Repasse ao condutor registrado para a multa #${fine?.id}`,
    });

    res.json({ success: true, data: fine });
  } catch (error) { next(error); }
};
