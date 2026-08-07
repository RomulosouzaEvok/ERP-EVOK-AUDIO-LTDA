import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Leads de Marketing (`/api/marketing/leads`).
 *
 * @module modules/marketing/presentation/controllers/leadController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeLeadRepository = require('../../infrastructure/sequelize/SequelizeLeadRepository');
const SequelizeCampaignRepository = require('../../infrastructure/sequelize/SequelizeCampaignRepository');
const ListLeadsUseCase = require('../../application/use-cases/lead/ListLeadsUseCase');
const GetLeadByIdUseCase = require('../../application/use-cases/lead/GetLeadByIdUseCase');
const CreateLeadUseCase = require('../../application/use-cases/lead/CreateLeadUseCase');
const UpdateLeadUseCase = require('../../application/use-cases/lead/UpdateLeadUseCase');
const ChangeLeadStatusUseCase = require('../../application/use-cases/lead/ChangeLeadStatusUseCase');
const {
  createLeadSchema, updateLeadSchema, changeLeadStatusSchema, listLeadQuerySchema, handleZodError,
} = require('../validators/leadValidators');
const { ValidationError } = require('../../../../errors');

const leadRepository = new SequelizeLeadRepository();
const campaignRepository = new SequelizeCampaignRepository();

/** `GET /api/marketing/leads` — lista paginada, com filtros opcionais de `status`/`campaign_id`/`lead_source`. */
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

/** `POST /api/marketing/leads` — cria um lead (404 se `campaign_id` informado e inexistente). */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createLeadSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateLeadUseCase(leadRepository, campaignRepository);
    const lead = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'MarketingLead',
      entityId: lead?.id,
      entityDescription: lead?.name,
      newValues: { name: lead?.name, campaign_id: lead?.campaign_id, lead_source: lead?.lead_source },
      description: `Lead "${lead?.name}" criado`,
    });

    res.status(201).json({ success: true, data: lead });
  } catch (error) { next(error); }
};

/** `PUT /api/marketing/leads/:id` — atualiza dados cadastrais do lead (não altera `status`). */
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

/** `POST /api/marketing/leads/:id/status` — avança o lead no funil (ação dedicada, não `PUT` genérico). */
exports.changeStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = changeLeadStatusSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new ChangeLeadStatusUseCase(leadRepository, campaignRepository);
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
