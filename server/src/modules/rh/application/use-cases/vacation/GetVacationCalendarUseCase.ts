/**
 * `GET /api/rh/vacation-schedules/calendar` — RF-RH-039, §8.1 do contrato
 * de API. Visão de calendário de férias por departamento em um intervalo,
 * com o percentual de equipe simultaneamente ausente e o sinalizador de
 * estouro do limite.
 *
 * ⚠️ O limite de equipe (`DEFAULT_VACATION_TEAM_LIMIT_PERCENT`) é **política
 * interna, NÃO regra legal** — a CLT não define percentual máximo de equipe
 * em férias. Ver `domain/constants.ts` (`[VERIFICAR COM RH DA EMPRESA]`).
 *
 * @module modules/rh/application/use-cases/vacation/GetVacationCalendarUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { ValidationError } from '../../../../../errors';
import VacationScheduleRepository from '../../../domain/repositories/VacationScheduleRepository';
import EmployeeDirectoryService from '../../services/EmployeeDirectoryService';
import { DEFAULT_VACATION_TEAM_LIMIT_PERCENT } from '../../../domain/constants';

interface GetVacationCalendarInput {
  department_id?: number | string | null;
  from: string;
  to: string;
}

class GetVacationCalendarUseCase extends UseCase<GetVacationCalendarInput, any> {
  private readonly scheduleRepository: VacationScheduleRepository;
  private readonly employeeDirectoryService: EmployeeDirectoryService;

  public constructor(scheduleRepository: VacationScheduleRepository, employeeDirectoryService: EmployeeDirectoryService) {
    super();
    this.scheduleRepository = scheduleRepository;
    this.employeeDirectoryService = employeeDirectoryService;
  }

  /** @throws {ValidationError} `from`/`to` ausentes ou invertidos (400). */
  public async execute(input: GetVacationCalendarInput): Promise<any> {
    if (!input.from || !input.to) throw new ValidationError('from e to são obrigatórios (YYYY-MM-DD).');
    if (input.from > input.to) throw new ValidationError('from deve ser anterior ou igual a to.');

    const departmentId = input.department_id ?? null;
    const schedules = await this.scheduleRepository.listOverlappingByDepartment(departmentId, input.from, input.to);

    let headcount: number | null = null;
    let simultaneousPercent: number | null = null;
    let teamLimitExceeded = false;
    if (departmentId !== null) {
      headcount = await this.employeeDirectoryService.countActiveByDepartment(departmentId);
      simultaneousPercent = headcount > 0 ? schedules.length / headcount : 0;
      teamLimitExceeded = simultaneousPercent > DEFAULT_VACATION_TEAM_LIMIT_PERCENT;
    }

    return {
      from: input.from,
      to: input.to,
      department_id: departmentId,
      department_active_headcount: headcount,
      simultaneous_percent: simultaneousPercent,
      team_limit_percent: DEFAULT_VACATION_TEAM_LIMIT_PERCENT,
      team_limit_exceeded: teamLimitExceeded,
      schedules: schedules.map((schedule: any) => (typeof schedule?.toJSON === 'function' ? schedule.toJSON() : schedule)),
    };
  }
}

export = GetVacationCalendarUseCase;
