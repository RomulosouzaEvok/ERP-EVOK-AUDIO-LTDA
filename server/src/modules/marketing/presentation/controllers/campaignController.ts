import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Campanhas de Marketing (`/api/marketing/campaigns`).
 *
 * @module modules/marketing/presentation/controllers/campaignController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeCampaignRepository = require('../../infrastructure/sequelize/SequelizeCampaignRepository');
const SequelizeLeadRepository = require('../../infrastructure/sequelize/SequelizeLeadRepository');
const SalesRevenueServiceAdapter = require('../../infrastructure/adapters/SalesRevenueServiceAdapter');
const ListCampaignsUseCase = require('../../application/use-cases/campaign/ListCampaignsUseCase');
const GetCampaignByIdUseCase = require('../../application/use-cases/campaign/GetCampaignByIdUseCase');
const CreateCampaignUseCase = require('../../application/use-cases/campaign/CreateCampaignUseCase');
const UpdateCampaignUseCase = require('../../application/use-cases/campaign/UpdateCampaignUseCase');
const BudgetDecisionUseCase = require('../../application/use-cases/campaign/BudgetDecisionUseCase');
const RecalculateCampaignMetricsUseCase = require('../../application/use-cases/campaign/RecalculateCampaignMetricsUseCase');
const {
  createCampaignSchema, updateCampaignSchema, budgetDecisionSchema, listCampaignQuerySchema, handleZodError,
} = require('../validators/campaignValidators');
const { ValidationError } = require('../../../../errors');
const { BUDGET_ALERT_WARNING_THRESHOLD, BUDGET_ALERT_OVER_THRESHOLD } = require('../../domain/constants');

const campaignRepository = new SequelizeCampaignRepository();
const leadRepository = new SequelizeLeadRepository();
const salesRevenueService = new SalesRevenueServiceAdapter();

/**
 * Calcula `budget_alert_level` (RF-MKT-032/033) em tempo de leitura —
 * `null` se `budget_approved` ainda não existir (aprovação pendente).
 */
function withBudgetAlertLevel(campaign: any) {
  const plain = typeof campaign?.toJSON === 'function' ? campaign.toJSON() : campaign;
  if (!plain) return plain;

  const budgetApproved = plain.budget_approved !== null && plain.budget_approved !== undefined ? Number(plain.budget_approved) : null;
  let budgetAlertLevel: 'none' | 'warning_90' | 'over_100' | null = null;
  if (budgetApproved !== null && budgetApproved > 0) {
    const ratio = Number(plain.actual_cost || 0) / budgetApproved;
    budgetAlertLevel = ratio >= BUDGET_ALERT_OVER_THRESHOLD ? 'over_100' : ratio >= BUDGET_ALERT_WARNING_THRESHOLD ? 'warning_90' : 'none';
  }

  return { ...plain, budget_alert_level: budgetAlertLevel };
}

/** `GET /api/marketing/campaigns` — lista paginada, expõe `budget_alert_level` calculado (RF-MKT-032). */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listCampaignQuerySchema.parse(req.query);
    const useCase = new ListCampaignsUseCase(campaignRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({
      ...query,
      offset: (query.page - 1) * query.limit,
    });
    res.json({ success: true, data: rows.map(withBudgetAlertLevel), pagination: { total: count, page, limit, totalPages } });
  } catch (error: any) {
    if (error?.issues) return next(new ValidationError('Payload inválido.', error.issues));
    next(error);
  }
};

/** `GET /api/marketing/campaigns/:id` — busca por id, expõe `budget_alert_level` calculado. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetCampaignByIdUseCase(campaignRepository);
    const campaign = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: withBudgetAlertLevel(campaign) });
  } catch (error) { next(error); }
};

/** `POST /api/marketing/campaigns` — cria uma campanha (`budget_requested`, sem `leads_generated`/`conversions`/`roi`). */
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

    res.status(201).json({ success: true, data: withBudgetAlertLevel(campaign) });
  } catch (error) { next(error); }
};

/** `PUT /api/marketing/campaigns/:id` — atualiza campos (imutabilidade pós-conclusão + orçamento aprovado exigido para `active`). */
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

    res.json({ success: true, data: withBudgetAlertLevel(campaign) });
  } catch (error) { next(error); }
};

/** `POST /api/marketing/campaigns/:id/budget-decision` — aprova/rejeita orçamento (RF-MKT-030/031, nível `approve`). */
exports.budgetDecision = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = budgetDecisionSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new BudgetDecisionUseCase(campaignRepository);
    const campaign = await useCase.execute({
      id: Number(req.params.id),
      ...parsed.data,
      decidedByUserId: (req as any).user?.id,
    });

    logAction(req, {
      action: 'update',
      entityType: 'MarketingCampaign',
      entityId: campaign?.id,
      entityDescription: campaign?.name,
      newValues: { budget_approval_status: parsed.data.decision, budget_approved: parsed.data.budget_approved },
      description: `Orçamento da campanha "${campaign?.name}" ${parsed.data.decision === 'approved' ? 'aprovado' : 'rejeitado'}`,
    });

    res.json({ success: true, data: withBudgetAlertLevel(campaign) });
  } catch (error) { next(error); }
};

/** `POST /api/marketing/campaigns/:id/recalculate-metrics` — recálculo idempotente do cache de métricas (RF-MKT-009, RNF-MKT-001). */
exports.recalculateMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new RecalculateCampaignMetricsUseCase(campaignRepository, leadRepository, salesRevenueService);
    const result = await useCase.execute({ id: Number(req.params.id) });

    logAction(req, {
      action: 'update',
      entityType: 'MarketingCampaign',
      entityId: result?.id,
      newValues: { leads_generated: result?.leads_generated, conversions: result?.conversions, roi: result?.roi },
      description: `Métricas da campanha #${result?.id} recalculadas`,
    });

    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};
