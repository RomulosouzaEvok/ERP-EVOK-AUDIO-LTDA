import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Evento/Feira de Marketing (`/api/marketing/events`),
 * NOVO no BLOCO 5 MKT (correção) — RF-MKT-020 a 025, UC-65.
 *
 * @module modules/marketing/presentation/controllers/eventController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeEventRepository = require('../../infrastructure/sequelize/SequelizeEventRepository');
const SequelizeCampaignRepository = require('../../infrastructure/sequelize/SequelizeCampaignRepository');
const SequelizeLeadRepository = require('../../infrastructure/sequelize/SequelizeLeadRepository');
const ListEventsUseCase = require('../../application/use-cases/event/ListEventsUseCase');
const GetEventByIdUseCase = require('../../application/use-cases/event/GetEventByIdUseCase');
const CreateEventUseCase = require('../../application/use-cases/event/CreateEventUseCase');
const UpdateEventUseCase = require('../../application/use-cases/event/UpdateEventUseCase');
const CloseEventUseCase = require('../../application/use-cases/event/CloseEventUseCase');
const AddChecklistItemUseCase = require('../../application/use-cases/event/AddChecklistItemUseCase');
const UpdateChecklistItemUseCase = require('../../application/use-cases/event/UpdateChecklistItemUseCase');
const ListLeadsUseCase = require('../../application/use-cases/lead/ListLeadsUseCase');
const {
  createEventSchema, updateEventSchema, closeEventSchema,
  addChecklistItemSchema, updateChecklistItemSchema, listEventQuerySchema, handleZodError,
} = require('../validators/eventValidators');
const { ValidationError } = require('../../../../errors');

const eventRepository = new SequelizeEventRepository();
const campaignRepository = new SequelizeCampaignRepository();
const leadRepository = new SequelizeLeadRepository();

/** `GET /api/marketing/events` — lista paginada, com filtros opcionais (status/tipo/campanha/período). */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listEventQuerySchema.parse(req.query);
    const useCase = new ListEventsUseCase(eventRepository);
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

/** `GET /api/marketing/events/:id` — detalhe, com `leads_count`/`cost_per_lead` calculados e checklist (RF-MKT-023/024). */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetEventByIdUseCase(eventRepository, leadRepository);
    const event = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: event });
  } catch (error) { next(error); }
};

/** `POST /api/marketing/events` — cria um evento/feira (RF-MKT-020). */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createEventSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateEventUseCase(eventRepository, campaignRepository);
    const event = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'MarketingEvent',
      entityId: event?.id,
      entityDescription: event?.name,
      newValues: { name: event?.name, event_type: event?.event_type },
      description: `Evento "${event?.name}" criado`,
    });

    res.status(201).json({ success: true, data: event });
  } catch (error) { next(error); }
};

/** `PUT /api/marketing/events/:id` — atualiza o evento (bloqueado quando `completed`/`canceled`). */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateEventSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateEventUseCase(eventRepository);
    const event = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'MarketingEvent',
      entityId: event?.id,
      entityDescription: event?.name,
      newValues: parsed.data,
      description: `Evento "${event?.name}" atualizado`,
    });

    res.json({ success: true, data: event });
  } catch (error) { next(error); }
};

/** `POST /api/marketing/events/:id/close` — encerra o evento, exige `actual_cost` (RF-MKT-025). */
exports.close = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = closeEventSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CloseEventUseCase(eventRepository);
    const event = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'MarketingEvent',
      entityId: event?.id,
      entityDescription: event?.name,
      newValues: { status: 'completed', actual_cost: event?.actual_cost },
      description: `Evento "${event?.name}" encerrado`,
    });

    res.json({ success: true, data: event });
  } catch (error) { next(error); }
};

/** `POST /api/marketing/events/:id/checklist` — adiciona item de checklist (RF-MKT-021). */
exports.addChecklistItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = addChecklistItemSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new AddChecklistItemUseCase(eventRepository);
    const item = await useCase.execute({ eventId: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'create',
      entityType: 'MarketingEventChecklistItem',
      entityId: item?.id,
      entityDescription: item?.description,
      newValues: { event_id: Number(req.params.id), description: item?.description },
      description: `Item de checklist "${item?.description}" adicionado ao evento #${req.params.id}`,
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) { next(error); }
};

/** `PUT /api/marketing/events/:id/checklist/:itemId` — atualiza item de checklist (status/responsável). */
exports.updateChecklistItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateChecklistItemSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateChecklistItemUseCase(eventRepository);
    const item = await useCase.execute({
      eventId: Number(req.params.id),
      itemId: Number(req.params.itemId),
      ...parsed.data,
    });

    logAction(req, {
      action: 'update',
      entityType: 'MarketingEventChecklistItem',
      entityId: item?.id,
      entityDescription: item?.description,
      newValues: parsed.data,
      description: `Item de checklist #${item?.id} atualizado`,
    });

    res.json({ success: true, data: item });
  } catch (error) { next(error); }
};

/** `GET /api/marketing/events/:id/leads` — atalho de `GET /leads?event_id=:id`. */
exports.getLeads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new ListLeadsUseCase(leadRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({
      event_id: Number(req.params.id),
      page: 1,
      limit: 100,
      offset: 0,
    });
    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error) { next(error); }
};
