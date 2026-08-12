import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP de Atas de Reunião (`/api/directorate/meeting-minutes`).
 *
 * ⚠️ Propositalmente SEM `update`/`remove`: ata é registro de governança
 * imutável após criação (ver `docs/administrativo/01-DIRETORIA.md`). Se a
 * ata está errada, registra-se uma ata retificadora nova via `create`.
 *
 * @module modules/directorate/presentation/controllers/meetingMinuteController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeDirectorateRepository = require('../../infrastructure/sequelize/SequelizeDirectorateRepository');
const CreateMeetingMinuteUseCase = require('../../application/use-cases/meeting-minute/CreateMeetingMinuteUseCase');
const ListMeetingMinutesUseCase = require('../../application/use-cases/meeting-minute/ListMeetingMinutesUseCase');
const GetMeetingMinuteByIdUseCase = require('../../application/use-cases/meeting-minute/GetMeetingMinuteByIdUseCase');
const {
  createMeetingMinuteSchema, listMeetingMinuteQuerySchema, handleZodError,
} = require('../validators/directorateValidators');
const { ValidationError } = require('../../../../errors');

const directorateRepository = new SequelizeDirectorateRepository();

/** `GET /api/directorate/meeting-minutes` — lista paginada, filtros `meeting_type`/`from`/`to`. */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listMeetingMinuteQuerySchema.parse(req.query);
    const useCase = new ListMeetingMinutesUseCase(directorateRepository);
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

/** `GET /api/directorate/meeting-minutes/:id` — busca por id. */
exports.getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const useCase = new GetMeetingMinuteByIdUseCase(directorateRepository);
    const minute = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: minute });
  } catch (error) { next(error); }
};

/** `POST /api/directorate/meeting-minutes` — registra uma ata (imutável a partir daqui). */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createMeetingMinuteSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateMeetingMinuteUseCase(directorateRepository);
    const minute = await useCase.execute({ ...parsed.data, createdBy: (req as any).user.id });

    logAction(req, {
      action: 'create',
      entityType: 'MeetingMinute',
      entityId: minute?.id,
      entityDescription: `${minute?.meeting_date} - ${minute?.title}`,
      newValues: { meeting_date: minute?.meeting_date, meeting_type: minute?.meeting_type, title: minute?.title },
      description: `Ata de reunião "${minute?.title}" registrada (${minute?.meeting_date})`,
    });

    res.status(201).json({ success: true, data: minute });
  } catch (error) { next(error); }
};
