import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Leads de Marketing (`/api/marketing/leads`).
 *
 * @module modules/marketing/presentation/controllers/leadController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeLeadRepository = require('../../infrastructure/sequelize/SequelizeLeadRepository');
const SequelizeCampaignRepository = require('../../infrastructure/sequelize/SequelizeCampaignRepository');
const SequelizeEventRepository = require('../../infrastructure/sequelize/SequelizeEventRepository');
const ClientServiceAdapter = require('../../infrastructure/adapters/ClientServiceAdapter');
const UserLookupServiceAdapter = require('../../infrastructure/adapters/UserLookupServiceAdapter');
const SalesRevenueServiceAdapter = require('../../infrastructure/adapters/SalesRevenueServiceAdapter');
const ListLeadsUseCase = require('../../application/use-cases/lead/ListLeadsUseCase');
const GetLeadByIdUseCase = require('../../application/use-cases/lead/GetLeadByIdUseCase');
const CreateLeadUseCase = require('../../application/use-cases/lead/CreateLeadUseCase');
const BulkCreateLeadsUseCase = require('../../application/use-cases/lead/BulkCreateLeadsUseCase');
const UpdateLeadUseCase = require('../../application/use-cases/lead/UpdateLeadUseCase');
const ChangeLeadStatusUseCase = require('../../application/use-cases/lead/ChangeLeadStatusUseCase');
const HandoffLeadUseCase = require('../../application/use-cases/lead/HandoffLeadUseCase');
const ConvertLeadUseCase = require('../../application/use-cases/lead/ConvertLeadUseCase');
const RecalculateCampaignMetricsUseCase = require('../../application/use-cases/campaign/RecalculateCampaignMetricsUseCase');
const {
  createLeadSchema, updateLeadSchema, bulkCreateLeadsSchema, changeLeadStatusSchema,
  handoffLeadSchema, convertLeadSchema, listLeadQuerySchema, handleZodError,
} = require('../validators/leadValidators');
const { ValidationError } = require('../../../../errors');

const leadRepository = new SequelizeLeadRepository();
const campaignRepository = new SequelizeCampaignRepository();
const eventRepository = new SequelizeEventRepository();
const clientService = new ClientServiceAdapter();
const userLookupService = new UserLookupServiceAdapter();
const salesRevenueService = new SalesRevenueServiceAdapter();

/** `GET /api/marketing/leads` — lista paginada, com filtros opcionais (status/campanha/evento/origem/responsável/SLA/needs_review). */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listLeadQuerySchema.parse(req.query);
    const useCase = new ListLeadsUseCase(leadRepository);
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

/** `GET /api/marketing/leads/:id` — busca por id. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetLeadByIdUseCase(leadRepository);
    const lead = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: lead });
  } catch (error) { next(error); }
};

/** `POST /api/marketing/leads` — cria um lead (dedup + validação cruzada de contato/origem, RF-MKT-016/017/018). */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createLeadSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateLeadUseCase(leadRepository, campaignRepository, eventRepository, clientService);
    const lead = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'MarketingLead',
      entityId: lead?.id,
      entityDescription: lead?.name,
      newValues: { name: lead?.name, campaign_id: lead?.campaign_id, event_id: lead?.event_id, lead_source: lead?.lead_source },
      description: `Lead "${lead?.name}" criado`,
    });

    res.status(201).json({ success: true, data: lead });
  } catch (error) { next(error); }
};

/** `POST /api/marketing/leads/bulk` — captação em lote (RF-MKT-019), processamento parcial (não tudo-ou-nada). */
exports.bulkCreate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = bulkCreateLeadsSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const createLeadUseCase = new CreateLeadUseCase(leadRepository, campaignRepository, eventRepository, clientService);
    const useCase = new BulkCreateLeadsUseCase(createLeadUseCase);
    const result = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'MarketingLead',
      entityDescription: `Captação em lote (${result.created.length} criados, ${result.rejected.length} rejeitados)`,
      newValues: { event_id: parsed.data.event_id, created: result.created.length, rejected: result.rejected.length },
      description: `Captação em lote de leads: ${result.created.length} criados, ${result.rejected.length} rejeitados`,
    });

    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

/** `PUT /api/marketing/leads/:id` — atualiza dados cadastrais do lead (nunca `status`/conversão). */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateLeadSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateLeadUseCase(leadRepository);
    const lead = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'MarketingLead',
      entityId: lead?.id,
      entityDescription: lead?.name,
      newValues: parsed.data,
      description: `Lead "${lead?.name}" atualizado`,
    });

    res.json({ success: true, data: lead });
  } catch (error) { next(error); }
};

/** `POST /api/marketing/leads/:id/status` — avança o lead no funil (exceto `converted`, RF-MKT-001). */
exports.changeStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = changeLeadStatusSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new ChangeLeadStatusUseCase(leadRepository, campaignRepository, userLookupService);
    const lead = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'MarketingLead',
      entityId: lead?.id,
      entityDescription: lead?.name,
      newValues: { status: parsed.data.status },
      description: `Lead "${lead?.name}" avançou para o status '${parsed.data.status}'`,
    });

    res.json({ success: true, data: lead });
  } catch (error) { next(error); }
};

/** `POST /api/marketing/leads/:id/handoff` — atribui/reatribui responsável de Vendas (RF-MKT-011/012/013/015, UC-64). */
exports.handoff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = handoffLeadSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new HandoffLeadUseCase(leadRepository, userLookupService);
    const lead = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'MarketingLead',
      entityId: lead?.id,
      entityDescription: lead?.name,
      newValues: { sales_owner_user_id: parsed.data.sales_owner_user_id },
      description: `Lead "${lead?.name}" atribuído ao vendedor #${parsed.data.sales_owner_user_id}`,
    });

    res.json({ success: true, data: lead });
  } catch (error) { next(error); }
};

/** `POST /api/marketing/leads/:id/convert` — conversão ATÔMICA lead → cliente (RF-MKT-001/002/003, UC-63). */
exports.convert = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = convertLeadSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const recalculateCampaignMetricsUseCase = new RecalculateCampaignMetricsUseCase(campaignRepository, leadRepository, salesRevenueService);
    const useCase = new ConvertLeadUseCase(leadRepository, clientService, recalculateCampaignMetricsUseCase);
    const result = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'MarketingLead',
      entityId: result.lead?.id,
      entityDescription: result.lead?.name,
      newValues: { status: 'converted', converted_to_customer_id: result.client?.id },
      description: `Lead "${result.lead?.name}" convertido para o cliente #${result.client?.id}`,
    });

    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};
