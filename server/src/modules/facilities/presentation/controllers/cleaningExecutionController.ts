import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Execução de Limpeza (`/api/facilities/cleaning-executions`).
 *
 * @module modules/facilities/presentation/controllers/cleaningExecutionController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeCleaningExecutionRepository = require('../../infrastructure/sequelize/SequelizeCleaningExecutionRepository');
const SequelizeCleaningScheduleRepository = require('../../infrastructure/sequelize/SequelizeCleaningScheduleRepository');
const InventoryServiceAdapter = require('../../infrastructure/adapters/InventoryServiceAdapter');
const { ListCleaningExecutionsUseCase, CreateCleaningExecutionUseCase } = require('../../application/use-cases/cleaningExecution/CleaningExecutionUseCases');
const { createCleaningExecutionSchema, listCleaningExecutionQuerySchema, handleZodError } = require('../validators/cleaningExecutionValidators');
const { ValidationError } = require('../../../../errors');

const executionRepository = new SequelizeCleaningExecutionRepository();
const scheduleRepository = new SequelizeCleaningScheduleRepository();
const inventoryService = new InventoryServiceAdapter();

exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listCleaningExecutionQuerySchema.parse(req.query);
    const useCase = new ListCleaningExecutionsUseCase(executionRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({ ...query, offset: (query.page - 1) * query.limit });
    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error: any) {
    if (error?.issues) return next(new ValidationError('Payload inválido.', error.issues));
    next(error);
  }
};

exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createCleaningExecutionSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateCleaningExecutionUseCase(executionRepository, scheduleRepository, inventoryService);
    const execution = await useCase.execute({ ...parsed.data, executedBy: (req as any).user.id });

    logAction(req, {
      action: 'create',
      entityType: 'FacilityCleaningExecution',
      entityId: execution?.id,
      description: `Execução de limpeza registrada para o plano #${parsed.data.plan_id}`,
    });

    res.status(201).json({ success: true, data: execution });
  } catch (error) { next(error); }
};
