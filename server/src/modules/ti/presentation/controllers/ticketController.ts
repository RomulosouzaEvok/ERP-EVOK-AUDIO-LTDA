/**
 * Controller do cluster Helpdesk de TI — ItTicketCategory/ItTicket/
 * ItTicketComment (UC-49, `docs/business/BLOCO_2_TI_API.md` §1).
 *
 * @module modules/ti/presentation/controllers/ticketController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeTicketRepository = require('../../infrastructure/sequelize/SequelizeTicketRepository');
const SequelizeTiSettingsRepository = require('../../infrastructure/sequelize/SequelizeTiSettingsRepository');
const AssetLookupServiceAdapter = require('../../infrastructure/adapters/AssetLookupServiceAdapter');
const MaintenanceOrderServiceAdapter = require('../../infrastructure/adapters/MaintenanceOrderServiceAdapter');

const CreateTicketUseCase = require('../../application/use-cases/ticket/CreateTicketUseCase');
const AssignTicketUseCase = require('../../application/use-cases/ticket/AssignTicketUseCase');
const ChangeTicketPriorityUseCase = require('../../application/use-cases/ticket/ChangeTicketPriorityUseCase');
const WaitTicketUseCase = require('../../application/use-cases/ticket/WaitTicketUseCase');
const ResumeTicketUseCase = require('../../application/use-cases/ticket/ResumeTicketUseCase');
const LinkMaintenanceOrderUseCase = require('../../application/use-cases/ticket/LinkMaintenanceOrderUseCase');
const ResolveTicketUseCase = require('../../application/use-cases/ticket/ResolveTicketUseCase');
const ConfirmTicketUseCase = require('../../application/use-cases/ticket/ConfirmTicketUseCase');
const ReopenTicketUseCase = require('../../application/use-cases/ticket/ReopenTicketUseCase');
const CancelTicketUseCase = require('../../application/use-cases/ticket/CancelTicketUseCase');
const AddTicketCommentUseCase = require('../../application/use-cases/ticket/AddTicketCommentUseCase');
const ListTicketCommentsUseCase = require('../../application/use-cases/ticket/ListTicketCommentsUseCase');
const ListMyTicketsUseCase = require('../../application/use-cases/ticket/ListMyTicketsUseCase');
const ListTicketsUseCase = require('../../application/use-cases/ticket/ListTicketsUseCase');
const GetTicketByIdUseCase = require('../../application/use-cases/ticket/GetTicketByIdUseCase');
const ListTicketCategoriesUseCase = require('../../application/use-cases/ticket/ListTicketCategoriesUseCase');
const ListActiveTicketCategoriesUseCase = require('../../application/use-cases/ticket/ListActiveTicketCategoriesUseCase');
const CreateTicketCategoryUseCase = require('../../application/use-cases/ticket/CreateTicketCategoryUseCase');
const UpdateTicketCategoryUseCase = require('../../application/use-cases/ticket/UpdateTicketCategoryUseCase');
const { createTicketCategorySchema, updateTicketCategorySchema, changeTicketPrioritySchema, handleZodError } = require('../validators/ticketValidators');

const ticketRepository = new SequelizeTicketRepository();
const settingsRepository = new SequelizeTiSettingsRepository();
const assetLookupService = new AssetLookupServiceAdapter();
const maintenanceOrderService = new MaintenanceOrderServiceAdapter();

function hasTiModule(req: Request): boolean {
  const user = (req as any).user;
  return user?.role === 'admin' || Boolean(user?.permissions?.ti);
}
function hasTiOperate(req: Request): boolean {
  const user = (req as any).user;
  return user?.role === 'admin' || ['operate', 'approve'].includes(user?.permissions?.ti);
}

/** Resolve o dono de um `ItTicket` a partir de `:id` — usado por `authorizeSelfOrModule`. */
exports.ticketOwnershipCheck = async (req: Request): Promise<boolean> => {
  const ticket = await ticketRepository.findById(req.params.id);
  if (!ticket) return false;
  return ticket.requester_id === (req as any).user?.id;
};

/** `GET /api/ti/ticket-categories` */
exports.listCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, active } = req.query as any;
    const result = await new ListTicketCategoriesUseCase(ticketRepository).execute({ active, page: Number(page), limit: Number(limit) });
    res.json({ success: true, data: result.rows, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

/** `GET /api/ti/ticket-categories/active` */
exports.listActiveCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new ListActiveTicketCategoriesUseCase(ticketRepository).execute();
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/ti/ticket-categories` */
exports.createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createTicketCategorySchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const category = await new CreateTicketCategoryUseCase(ticketRepository).execute(parsed.data);
    res.status(201).json({ success: true, data: category });
  } catch (error) { next(error); }
};

/** `PUT /api/ti/ticket-categories/:id` */
exports.updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateTicketCategorySchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const category = await new UpdateTicketCategoryUseCase(ticketRepository).execute({ id: Number(req.params.id), ...parsed.data });
    res.json({ success: true, data: category });
  } catch (error) { next(error); }
};

/** `POST /api/ti/tickets` */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await new CreateTicketUseCase(ticketRepository, settingsRepository, assetLookupService).execute({
      ...req.body,
      requesterId: (req as any).user.id,
      requesterHasTiOperate: hasTiOperate(req),
    });
    res.status(201).json({ success: true, data: ticket });
  } catch (error) { next(error); }
};

/** `GET /api/ti/tickets/mine` */
exports.mine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, status } = req.query as any;
    const result = await new ListMyTicketsUseCase(ticketRepository).execute({ requesterId: (req as any).user.id, status, page: Number(page), limit: Number(limit) });
    res.json({ success: true, data: result.rows, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

/** `GET /api/ti/tickets/:id` — self-or-module. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetTicketByIdUseCase(ticketRepository).execute({ id: Number(req.params.id), viewerHasTiModule: hasTiModule(req) });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `GET /api/ti/tickets` — fila completa. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, ...filters } = req.query as any;
    const result = await new ListTicketsUseCase(ticketRepository).execute({ filters, page: Number(page), limit: Number(limit) });
    res.json({ success: true, data: result.rows, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

/** `POST /api/ti/tickets/:id/assign` */
exports.assign = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await new AssignTicketUseCase(ticketRepository).execute({
      id: Number(req.params.id),
      assignedTo: (req as any).user.id,
      ...req.body,
    });
    res.json({ success: true, data: ticket });
  } catch (error) { next(error); }
};

/** `PUT /api/ti/tickets/:id/priority` */
exports.changePriority = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = changeTicketPrioritySchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const ticket = await new ChangeTicketPriorityUseCase(ticketRepository).execute({
      id: Number(req.params.id),
      changedBy: (req as any).user.id,
      ...parsed.data,
    });
    res.json({ success: true, data: ticket });
  } catch (error) { next(error); }
};

/** `POST /api/ti/tickets/:id/wait` */
exports.wait = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await new WaitTicketUseCase(ticketRepository).execute({ id: Number(req.params.id) });
    res.json({ success: true, data: ticket });
  } catch (error) { next(error); }
};

/** `POST /api/ti/tickets/:id/resume` */
exports.resume = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await new ResumeTicketUseCase(ticketRepository).execute({ id: Number(req.params.id) });
    res.json({ success: true, data: ticket });
  } catch (error) { next(error); }
};

/** `POST /api/ti/tickets/:id/link-maintenance-order` */
exports.linkMaintenanceOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await new LinkMaintenanceOrderUseCase(ticketRepository, maintenanceOrderService).execute({
      id: Number(req.params.id),
      reportedBy: (req as any).user.id,
      priority: req.body?.priority,
    });
    res.json({ success: true, data: ticket });
  } catch (error) { next(error); }
};

/** `POST /api/ti/tickets/:id/resolve` */
exports.resolve = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await new ResolveTicketUseCase(ticketRepository).execute({ id: Number(req.params.id), solution: req.body?.solution });
    res.json({ success: true, data: ticket });
  } catch (error) { next(error); }
};

/** `POST /api/ti/tickets/:id/confirm` — self-or-module. */
exports.confirm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await new ConfirmTicketUseCase(ticketRepository).execute({ id: Number(req.params.id), ...req.body });
    res.json({ success: true, data: ticket });
  } catch (error) { next(error); }
};

/** `POST /api/ti/tickets/:id/reopen` — self-or-module. */
exports.reopen = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await new ReopenTicketUseCase(ticketRepository, settingsRepository).execute({ id: Number(req.params.id) });
    res.json({ success: true, data: ticket });
  } catch (error) { next(error); }
};

/** `POST /api/ti/tickets/:id/cancel` */
exports.cancel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await new CancelTicketUseCase(ticketRepository).execute({ id: Number(req.params.id) });
    res.json({ success: true, data: ticket });
  } catch (error) { next(error); }
};

/** `GET /api/ti/tickets/:id/comments` — self-or-module. */
exports.listComments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new ListTicketCommentsUseCase(ticketRepository).execute({ ticketId: Number(req.params.id), viewerHasTiModule: hasTiModule(req) });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/** `POST /api/ti/tickets/:id/comments` — self-or-module. */
exports.addComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comment = await new AddTicketCommentUseCase(ticketRepository).execute({
      ticketId: Number(req.params.id),
      authorId: (req as any).user.id,
      body: req.body?.body,
      isInternal: Boolean(req.body?.is_internal),
      authorHasTiModule: hasTiModule(req),
    });
    res.status(201).json({ success: true, data: comment });
  } catch (error) { next(error); }
};
