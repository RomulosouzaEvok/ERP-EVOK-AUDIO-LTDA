import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Campanhas de Marketing (`/api/marketing/campaigns`).
 *
 * @module modules/marketing/presentation/controllers/campaignController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeCampaignRepository = require('../../infrastructure/sequelize/SequelizeCampaignRepository');
const ListCampaignsUseCase = require('../../application/use-cases/campaign/ListCampaignsUseCase');
const GetCampaignByIdUseCase = require('../../application/use-cases/campaign/GetCampaignByIdUseCase');
const CreateCampaignUseCase = require('../../application/use-cases/campaign/CreateCampaignUseCase');
const UpdateCampaignUseCase = require('../../application/use-cases/campaign/UpdateCampaignUseCase');
const { createCampaignSchema, updateCampaignSchema, listCampaignQuerySchema, handleZodError } = require('../validators/campaignValidators');
const { ValidationError } = require('../../../../errors');

const campaignRepository = new SequelizeCampaignRepository();

/** `GET /api/marketing/campaigns` — lista paginada, com filtros opcionais de `status`/`campaign_type`. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listCampaignQuerySchema.parse(req.query);
    const useCase = new ListCampaignsUseCase(campaignRepository);
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

/** `GET /api/marketing/campaigns/:id` — busca por id. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetCampaignByIdUseCase(campaignRepository);
    const campaign = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: campaign });
  } catch (error) { next(error); }
};

/** `POST /api/marketing/campaigns` — cria uma campanha. */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createCampaignSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateCampaignUseCase(campaignRepository);
    const campaign = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'MarketingCampaign',
      entityId: campaign?.id,
      entityDescription: campaign?.name,
      newValues: { name: campaign?.name, campaign_type: campaign?.campaign_type, status: campaign?.status },
      description: `Campanha "${campaign?.name}" criada`,
    });

    res.status(201).json({ success: true, data: campaign });
  } catch (error) { next(error); }
};

/** `PUT /api/marketing/campaigns/:id` — atualiza campos da campanha. */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateCampaignSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateCampaignUseCase(campaignRepository);
    const campaign = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'MarketingCampaign',
      entityId: campaign?.id,
      entityDescription: campaign?.name,
      newValues: parsed.data,
      description: `Campanha "${campaign?.name}" atualizada`,
    });

    res.json({ success: true, data: campaign });
  } catch (error) { next(error); }
};
