import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Lembretes de Prazo Contratual
 * (`/api/legal/contract-reminders`).
 *
 * @module modules/legal/presentation/controllers/contractReminderController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeContractReminderRepository = require('../../infrastructure/sequelize/SequelizeContractReminderRepository');
const SequelizeContractRepository = require('../../infrastructure/sequelize/SequelizeContractRepository');
const ListRemindersUseCase = require('../../application/use-cases/reminder/ListRemindersUseCase');
const GetReminderByIdUseCase = require('../../application/use-cases/reminder/GetReminderByIdUseCase');
const CreateReminderUseCase = require('../../application/use-cases/reminder/CreateReminderUseCase');
const UpdateReminderUseCase = require('../../application/use-cases/reminder/UpdateReminderUseCase');
const {
  createReminderSchema, updateReminderSchema, listReminderQuerySchema, handleZodError,
} = require('../validators/contractReminderValidators');
const { ValidationError } = require('../../../../errors');

const reminderRepository = new SequelizeContractReminderRepository();
const contractRepository = new SequelizeContractRepository();

/** `GET /api/legal/contract-reminders` — lista paginada, com filtro opcional de `contract_id`. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listReminderQuerySchema.parse(req.query);
    const useCase = new ListRemindersUseCase(reminderRepository);
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

/** `GET /api/legal/contract-reminders/:id` — busca por id. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetReminderByIdUseCase(reminderRepository);
    const reminder = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: reminder });
  } catch (error) { next(error); }
};

/** `POST /api/legal/contract-reminders` — cria um lembrete (404 se `contract_id` inexistente). */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createReminderSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateReminderUseCase(reminderRepository, contractRepository);
    const reminder = await useCase.execute(parsed.data);

    logAction(req, {
      action: 'create',
      entityType: 'LegalContractReminder',
      entityId: reminder?.id,
      entityDescription: `Lembrete ${reminder?.reminder_type} do contrato ${reminder?.contract_id}`,
      newValues: { contract_id: reminder?.contract_id, reminder_type: reminder?.reminder_type, reminder_date: reminder?.reminder_date },
      description: `Lembrete ${reminder?.reminder_type} criado para o contrato ${reminder?.contract_id}`,
    });

    res.status(201).json({ success: true, data: reminder });
  } catch (error) { next(error); }
};

/** `PUT /api/legal/contract-reminders/:id` — atualiza campos do lembrete (ex.: marcar `notified`). */
exports.update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateReminderSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateReminderUseCase(reminderRepository);
    const reminder = await useCase.execute({ id: Number(req.params.id), ...parsed.data });

    logAction(req, {
      action: 'update',
      entityType: 'LegalContractReminder',
      entityId: reminder?.id,
      entityDescription: `Lembrete ${reminder?.reminder_type} do contrato ${reminder?.contract_id}`,
      newValues: parsed.data,
      description: `Lembrete ${reminder?.reminder_type} atualizado`,
    });

    res.json({ success: true, data: reminder });
  } catch (error) { next(error); }
};
