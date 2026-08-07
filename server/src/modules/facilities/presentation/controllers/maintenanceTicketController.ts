import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Manutenção Predial (`/api/facilities/maintenance-tickets`, D-1).
 *
 * @module modules/facilities/presentation/controllers/maintenanceTicketController
 */

const { logAction } = require('../../../../services/auditLogService');
const MaintenanceOrderServiceAdapter = require('../../infrastructure/adapters/MaintenanceOrderServiceAdapter');
const InventoryServiceAdapter = require('../../infrastructure/adapters/InventoryServiceAdapter');
const {
  ListMaintenanceTicketsUseCase, GetMaintenanceTicketByIdUseCase, CreateMaintenanceTicketUseCase,
  TriageMaintenanceTicketUseCase, ExecuteMaintenanceTicketUseCase, CloseMaintenanceTicketUseCase, GeneratePreventiveMaintenanceTicketUseCase,
} = require('../../application/use-cases/maintenanceTicket/MaintenanceTicketUseCases');
const {
  createMaintenanceTicketSchema, triageMaintenanceTicketSchema, executeMaintenanceTicketSchema,
  generatePreventiveMaintenanceTicketSchema, listMaintenanceTicketQuerySchema, handleZodError,
} = require('../validators/maintenanceTicketValidators');
const { ValidationError } = require('../../../../errors');

const maintenanceOrderService = new MaintenanceOrderServiceAdapter();
const inventoryService = new InventoryServiceAdapter();

exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listMaintenanceTicketQuerySchema.parse(req.query);
    const useCase = new ListMaintenanceTicketsUseCase(maintenanceOrderService);
    const { rows, count, page, limit, totalPages } = await useCase.execute({ ...query, offset: (query.page - 1) * query.limit });
    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error: any) {
    if (error?.issues) return next(new ValidationError('Payload inválido.', error.issues));
    next(error);
  }
};

exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetMaintenanceTicketByIdUseCase(maintenanceOrderService);
    const ticket = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: ticket });
  } catch (error) { next(error); }
};

/** `POST /api/facilities/maintenance-tickets` — auto-serviço, apenas `authenticate` (RF-FAC-040). */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createMaintenanceTicketSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateMaintenanceTicketUseCase(maintenanceOrderService);
    const ticket = await useCase.execute({ ...parsed.data, reportedBy: (req as any).user.id });

    logAction(req, {
      action: 'create',
      entityType: 'MaintenanceOrder',
      entityId: ticket?.id,
      newValues: parsed.data,
      description: `Chamado predial aberto na área #${parsed.data.facility_area_id}`,
    });

    res.status(201).json({ success: true, data: ticket });
  } catch (error) { next(error); }
};

exports.triage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = triageMaintenanceTicketSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new TriageMaintenanceTicketUseCase(maintenanceOrderService);
    const ticket = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'MaintenanceOrder',
      entityId: ticket?.id,
      description: `Chamado predial #${ticket?.id} triado — prioridade ${parsed.data.priority}`,
    });

    res.json({ success: true, data: ticket });
  } catch (error) { next(error); }
};

exports.execute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = executeMaintenanceTicketSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new ExecuteMaintenanceTicketUseCase(maintenanceOrderService, inventoryService);
    const ticket = await useCase.execute({ id: Number(req.params.id), ...parsed.data, userId: (req as any).user.id });

    logAction(req, {
      action: 'update',
      entityType: 'MaintenanceOrder',
      entityId: ticket?.id,
      description: `Execução registrada para o chamado predial #${ticket?.id}`,
    });

    res.json({ success: true, data: ticket });
  } catch (error) { next(error); }
};

exports.close = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new CloseMaintenanceTicketUseCase(maintenanceOrderService);
    const ticket = await useCase.execute({ id: Number(req.params.id) });

    logAction(req, {
      action: 'update',
      entityType: 'MaintenanceOrder',
      entityId: ticket?.id,
      description: `Chamado predial #${ticket?.id} encerrado`,
    });

    res.json({ success: true, data: ticket });
  } catch (error) { next(error); }
};

exports.generatePreventive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = generatePreventiveMaintenanceTicketSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new GeneratePreventiveMaintenanceTicketUseCase(maintenanceOrderService);
    const ticket = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'create',
      entityType: 'MaintenanceOrder',
      entityId: ticket?.id,
      description: `Rotina preventiva gerada a partir do chamado #${req.params.id}`,
    });

    res.status(201).json({ success: true, data: ticket });
  } catch (error) { next(error); }
};
