import type { Request, Response, NextFunction } from 'express';

const { logAction } = require('../../../../services/auditLogService');
const SequelizeProductionCostSettingsRepository = require('../../infrastructure/sequelize/SequelizeProductionCostSettingsRepository');
const GetProductionCostSettingsUseCase = require('../../application/use-cases/GetProductionCostSettingsUseCase');
const UpsertProductionCostSettingsUseCase = require('../../application/use-cases/UpsertProductionCostSettingsUseCase');
const { upsertProductionCostSettingsSchema, handleZodError } = require('../validators/productionCostSettingsValidators');

const repository = new SequelizeProductionCostSettingsRepository();

/** `GET /api/production/cost-settings` - busca a configuracao singleton de custeio. */
exports.get = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetProductionCostSettingsUseCase(repository);
    const settings = await useCase.execute();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

/** `PUT /api/production/cost-settings` - cria/atualiza a configuracao singleton de custeio. */
exports.upsert = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = upsertProductionCostSettingsSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpsertProductionCostSettingsUseCase(repository);
    const settings = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'update',
      entityType: 'ProductionCostSettings',
      entityId: settings?.id,
      entityDescription: 'Configuracao de custeio de producao',
      newValues: parsed.data,
      description: 'Configuracao de custeio de producao atualizada',
    });

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};
