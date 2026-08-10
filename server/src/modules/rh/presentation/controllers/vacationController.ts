import type { Request, Response, NextFunction } from 'express';

/**
 * Controller HTTP do Grupo 6 — Férias
 * (`/api/rh/vacation-accrual-periods`, `/api/rh/vacation-schedules`, §8 do
 * contrato de API, UC-67, RF-RH-031 a 043, **P0 — maior risco legal do
 * bloco**).
 *
 * Alertas "nunca esquecidos silenciosamente" (RF-RH-076, RNF-RH-02): a
 * dobra do período concessivo (Art. 137, caput, CLT) é aplicada por
 * **verificação ativa na leitura** (`applyDobraIfNeeded`, dentro dos use
 * cases de listagem/detalhe), sem depender de cron — o `GET` grava
 * `status='vencido_dobra'` de forma idempotente e devolve
 * `alert_level: 'critical'` no payload.
 *
 * @module modules/rh/presentation/controllers/vacationController
 */

const { logAction } = require('../../../../services/auditLogService');
const { ValidationError } = require('../../../../errors');

const SequelizeVacationAccrualPeriodRepository = require('../../infrastructure/sequelize/SequelizeVacationAccrualPeriodRepository');
const SequelizeVacationScheduleRepository = require('../../infrastructure/sequelize/SequelizeVacationScheduleRepository');
const EmployeeDirectoryServiceAdapter = require('../../infrastructure/adapters/EmployeeDirectoryServiceAdapter');

const ListVacationAccrualPeriodsUseCase = require('../../application/use-cases/vacation/ListVacationAccrualPeriodsUseCase');
const GetVacationAccrualPeriodByIdUseCase = require('../../application/use-cases/vacation/GetVacationAccrualPeriodByIdUseCase');
const RecalculateVacationAccrualPeriodUseCase = require('../../application/use-cases/vacation/RecalculateVacationAccrualPeriodUseCase');
const CreateVacationScheduleUseCase = require('../../application/use-cases/vacation/CreateVacationScheduleUseCase');
const ListVacationSchedulesUseCase = require('../../application/use-cases/vacation/ListVacationSchedulesUseCase');
const ConfirmVacationTakenUseCase = require('../../application/use-cases/vacation/ConfirmVacationTakenUseCase');
const GetVacationCalendarUseCase = require('../../application/use-cases/vacation/GetVacationCalendarUseCase');
const ReviseVacationScheduleUseCase = require('../../application/use-cases/vacation/ReviseVacationScheduleUseCase');

const {
  listAccrualPeriodQuerySchema, recalculateAccrualPeriodSchema, createVacationScheduleSchema,
  reviseVacationScheduleSchema, confirmVacationTakenSchema, listVacationScheduleQuerySchema,
  vacationCalendarQuerySchema,
} = require('../validators/vacationValidators');

const accrualRepository = new SequelizeVacationAccrualPeriodRepository();
const scheduleRepository = new SequelizeVacationScheduleRepository();
const employeeDirectoryService = new EmployeeDirectoryServiceAdapter();

function toValidationError(error: any) {
  return error?.issues ? new ValidationError('Payload inválido.', error.issues) : error;
}

/** Anexa `alert_level` ao período — `critical` quando já está em dobra (Art. 137, caput, CLT). */
function withAlertLevel(period: any) {
  const plain = typeof period?.toJSON === 'function' ? period.toJSON() : period;
  if (!plain) return plain;
  return { ...plain, alert_level: plain.status === 'vencido_dobra' ? 'critical' : 'none' };
}

/** `GET /api/rh/vacation-accrual-periods` — RF-RH-034/042 (verificação ativa de dobra em cada linha). */
exports.listAccrualPeriods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listAccrualPeriodQuerySchema.parse(req.query);
    const result = await new ListVacationAccrualPeriodsUseCase(accrualRepository).execute(query);
    res.json({
      success: true,
      data: result.rows.map(withAlertLevel),
      pagination: { total: result.count, page: result.page, limit: result.limit, totalPages: result.totalPages },
    });
  } catch (error) { next(toValidationError(error)); }
};

/** `GET /api/rh/vacation-accrual-periods/:id` — detalhe (`dias_direito`, `fim_concessivo`, alerta). */
exports.getAccrualPeriodById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await new GetVacationAccrualPeriodByIdUseCase(accrualRepository).execute({ id: req.params.id });
    res.json({ success: true, data: withAlertLevel(data) });
  } catch (error) { next(toValidationError(error)); }
};

/** `POST /api/rh/vacation-accrual-periods/:id/recalculate` — RF-RH-032 (Art. 130, CLT; idempotente). */
exports.recalculateAccrualPeriod = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = recalculateAccrualPeriodSchema.parse(req.body ?? {});
    const data = await new RecalculateVacationAccrualPeriodUseCase(accrualRepository)
      .execute({ id: req.params.id, unexcusedAbsencesOverride: parsed.unexcused_absences });
    logAction(req, {
      action: 'update', entityType: 'HrVacationAccrualPeriod', entityId: Number(req.params.id),
      newValues: { entitled_days: data?.entitled_days, unexcused_absences: data?.unexcused_absences },
      description: 'Dias de direito recalculados (Art. 130, CLT)',
    });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `GET /api/rh/vacation-schedules` — filtros `employee_id`/`accrual_period_id`/`department_id`. */
exports.listSchedules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listVacationScheduleQuerySchema.parse(req.query);
    const result = await new ListVacationSchedulesUseCase(scheduleRepository).execute(query);
    res.json({
      success: true,
      data: result.rows,
      pagination: { total: result.count, page: result.page, limit: result.limit, totalPages: result.totalPages },
    });
  } catch (error) { next(toValidationError(error)); }
};

/** `GET /api/rh/vacation-schedules/calendar` — RF-RH-039 (montado ANTES de `/:id` no router). */
exports.calendar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = vacationCalendarQuerySchema.parse(req.query);
    const data = await new GetVacationCalendarUseCase(scheduleRepository, employeeDirectoryService).execute(query);
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `POST /api/rh/vacation-schedules` — RF-RH-035/036/037/039 (Arts. 134 §1º/§3º, 135, 143, CLT). */
exports.createSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createVacationScheduleSchema.parse(req.body);
    const useCase = new CreateVacationScheduleUseCase(accrualRepository, scheduleRepository, employeeDirectoryService);
    const data = await useCase.execute({ ...parsed, createdBy: (req as any).user.id });
    logAction(req, {
      action: 'create', entityType: 'HrVacationSchedule', entityId: data?.id,
      newValues: parsed, description: `Fração de férias programada a partir de ${parsed.start_date} (${parsed.days} dias)`,
    });
    res.status(201).json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `POST /api/rh/vacation-schedules/:id/revise` — RF-RH-040 (novo registro + `superseded_by_id`, nunca `UPDATE` destrutivo). */
exports.reviseSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = reviseVacationScheduleSchema.parse(req.body);
    const createUseCase = new CreateVacationScheduleUseCase(accrualRepository, scheduleRepository, employeeDirectoryService);
    const data = await new ReviseVacationScheduleUseCase(scheduleRepository, createUseCase)
      .execute({ id: req.params.id, ...parsed, createdBy: (req as any).user.id });
    logAction(req, {
      action: 'update', entityType: 'HrVacationSchedule', entityId: Number(req.params.id),
      newValues: parsed, description: `Programação de férias revisada (novo registro #${data?.schedule?.id}): ${parsed.reason}`,
    });
    res.status(201).json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};

/** `POST /api/rh/vacation-schedules/:id/confirm-taken` — registra o gozo efetivo (UC-67, passo 6). */
exports.confirmTaken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = confirmVacationTakenSchema.parse(req.body ?? {});
    const data = await new ConfirmVacationTakenUseCase(scheduleRepository, accrualRepository)
      .execute({ id: req.params.id, days_taken: parsed.days_taken });
    logAction(req, {
      action: 'update', entityType: 'HrVacationSchedule', entityId: Number(req.params.id),
      newValues: parsed, description: 'Gozo de férias confirmado pelo RH',
    });
    res.json({ success: true, data });
  } catch (error) { next(toValidationError(error)); }
};
