/**
 * `POST /api/rh/vacation-schedules` — RF-RH-035/036/037/039, §8.3 do
 * contrato de API, UC-67. Validações em cadeia (ordem do contrato,
 * preservada — cada uma cita o artigo da CLT correspondente):
 * 1. `EXCEEDS_ACCRUAL_DAYS` — soma de dias das frações > 30.
 * 2. `MAX_FRACTIONS_REACHED` — mais de 3 frações (Art. 134 §1º CLT).
 * 3. `INVALID_FRACTION_SIZE` — distribuição de tamanhos inválida (Art. 134 §1º CLT).
 * 3.1. `VACATION_START_BEFORE_WEEKLY_REST` — início nos 2 dias antes do DSR (Art. 134 §2º CLT — GAP LEGAL parcial, ver `vacationRules.ts`).
 * 4. `aviso_em` com menos de 30 dias de antecedência — aceito com warning (Art. 134, caput c/c uso corrente, não bloqueante).
 * 5. `ABONO_LIMIT_EXCEEDED`/`ABONO_DEADLINE_EXPIRED` (Art. 143 CLT).
 * 6. `TEAM_LIMIT_EXCEEDED` — soft-block com override obrigatório (RF-RH-039, política interna, não lei).
 *
 * @module modules/rh/application/use-cases/vacation/CreateVacationScheduleUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../../errors';
import VacationAccrualPeriodRepository from '../../../domain/repositories/VacationAccrualPeriodRepository';
import VacationScheduleRepository from '../../../domain/repositories/VacationScheduleRepository';
import EmployeeDirectoryService from '../../services/EmployeeDirectoryService';
import {
  validateFractionSizes,
  validateNoStartBeforeWeeklyRest,
  validateAbonoLimit,
  validateAbonoDeadline,
  VACATION_NOTICE_MIN_DAYS,
} from '../../../domain/services/vacationRules';
import { DEFAULT_VACATION_TEAM_LIMIT_PERCENT } from '../../../domain/constants';

// Este arquivo usa `export =` (convenção do projeto para use cases), que o
// TypeScript proíbe combinar com qualquer outro `export`. Por isso a
// constante de negócio vive em `domain/constants.ts` e a interface de
// entrada é local.
interface CreateVacationScheduleInput {
  accrual_period_id: number;
  start_date: string;
  days: number;
  abono?: boolean;
  abono_days?: number;
  abono_requested_at?: string;
  aviso_em?: string;
  employee_agreement_confirmed?: boolean;
  override_team_limit_justification?: string | null;
  createdBy: number;
}

class CreateVacationScheduleUseCase extends UseCase<CreateVacationScheduleInput, any> {
  private readonly accrualRepository: VacationAccrualPeriodRepository;
  private readonly scheduleRepository: VacationScheduleRepository;
  private readonly employeeDirectoryService: EmployeeDirectoryService;

  public constructor(
    accrualRepository: VacationAccrualPeriodRepository,
    scheduleRepository: VacationScheduleRepository,
    employeeDirectoryService: EmployeeDirectoryService,
  ) {
    super();
    this.accrualRepository = accrualRepository;
    this.scheduleRepository = scheduleRepository;
    this.employeeDirectoryService = employeeDirectoryService;
  }

  public async execute(input: CreateVacationScheduleInput): Promise<any> {
    if (!input.accrual_period_id || !input.start_date || !input.days) {
      throw new ValidationError('accrual_period_id, start_date e days são obrigatórios.');
    }

    const period = await this.accrualRepository.findById(input.accrual_period_id);
    if (!period) throw new NotFoundError('Período aquisitivo não encontrado.');

    const existingFractions = await this.scheduleRepository.listActiveByAccrualPeriod(input.accrual_period_id);
    const totalDaysExisting = existingFractions.reduce((sum, f) => sum + f.days, 0);

    // 1. EXCEEDS_ACCRUAL_DAYS — soma de TODAS as frações (dias corridos, `days` já inclui a eventual porção de abono) não pode superar o direito do período.
    if (totalDaysExisting + input.days > period.entitled_days) {
      throw new BusinessRuleError('Soma dos dias das frações excede os dias de direito do período aquisitivo.', { code: 'EXCEEDS_ACCRUAL_DAYS' });
    }

    // 2/3. MAX_FRACTIONS_REACHED / INVALID_FRACTION_SIZE (Art. 134 §1º CLT)
    try {
      validateFractionSizes([...existingFractions.map((f) => ({ days: f.days })), { days: input.days }]);
    } catch (error: any) {
      const code = error.message.startsWith('MAX_FRACTIONS_REACHED') ? 'MAX_FRACTIONS_REACHED' : 'INVALID_FRACTION_SIZE';
      throw new BusinessRuleError(error.message, { code });
    }

    // 3.1. VACATION_START_BEFORE_WEEKLY_REST (Art. 134 §2º CLT — cobertura parcial, ver vacationRules.ts)
    try {
      validateNoStartBeforeWeeklyRest(input.start_date);
    } catch (error: any) {
      throw new BusinessRuleError(error.message, { code: 'VACATION_START_BEFORE_WEEKLY_REST' });
    }

    // 4. Antecedência de aviso — Art. 135, caput, CLT (mínimo LEGAL de 30
    // dias, conferido na fonte). Aceito com warning e NÃO bloqueia por
    // determinação explícita de RF-RH-037/§8.3 do contrato de API — ver a
    // divergência lei × requisito documentada em `vacationRules.ts`
    // (`VACATION_NOTICE_MIN_DAYS`).
    let warning: string | null = null;
    if (input.aviso_em) {
      const start = new Date(`${input.start_date}T00:00:00Z`);
      const avisoLimit = new Date(start);
      avisoLimit.setUTCDate(avisoLimit.getUTCDate() - VACATION_NOTICE_MIN_DAYS);
      if (new Date(`${input.aviso_em}T00:00:00Z`).getTime() > avisoLimit.getTime()) {
        warning = `Aviso com antecedência menor que o mínimo legal de ${VACATION_NOTICE_MIN_DAYS} dias (Art. 135, caput, CLT) — registre a justificativa e o aviso formal ao empregado.`;
      }
    }

    // 5. Abono (Art. 143 CLT)
    if (input.abono) {
      try {
        validateAbonoLimit(input.abono_days ?? 0, period.entitled_days);
        if (input.abono_requested_at) validateAbonoDeadline(input.abono_requested_at, period.period_end);
      } catch (error: any) {
        const code = error.message.startsWith('ABONO_LIMIT_EXCEEDED') ? 'ABONO_LIMIT_EXCEEDED' : 'ABONO_DEADLINE_EXPIRED';
        throw new BusinessRuleError(error.message, { code });
      }
    }

    // 6. TEAM_LIMIT_EXCEEDED — soft-block com override obrigatório (RF-RH-039, política interna).
    const employee = await this.employeeDirectoryService.findById(period.employee_id);
    if (employee) {
      const endDateExclusive = new Date(`${input.start_date}T00:00:00Z`);
      endDateExclusive.setUTCDate(endDateExclusive.getUTCDate() + input.days);
      const overlapping = await this.scheduleRepository.listOverlappingByDepartment(
        employee.department_id,
        input.start_date,
        endDateExclusive.toISOString().slice(0, 10),
      );
      const departmentHeadcount = await this.employeeDirectoryService.countActiveByDepartment(employee.department_id);
      const simultaneousPercent = departmentHeadcount > 0 ? (overlapping.length + 1) / departmentHeadcount : 0;
      if (simultaneousPercent > DEFAULT_VACATION_TEAM_LIMIT_PERCENT) {
        if (!input.override_team_limit_justification) {
          throw new ValidationError('Percentual máximo de equipe simultaneamente em férias excedido — informe override_team_limit_justification para prosseguir.', {
            code: 'TEAM_LIMIT_EXCEEDED',
          });
        }
        warning = warning ?? 'TEAM_LIMIT_EXCEEDED';
      }
    }

    const fractionNumber = existingFractions.length + 1;
    const created = await this.scheduleRepository.create({
      accrual_period_id: input.accrual_period_id,
      fraction_number: fractionNumber,
      start_date: input.start_date,
      days: input.days,
      abono: Boolean(input.abono),
      abono_days: input.abono ? (input.abono_days ?? null) : null,
      abono_requested_at: input.abono_requested_at ?? null,
      notice_sent_at: input.aviso_em ?? null,
      employee_agreement_confirmed: Boolean(input.employee_agreement_confirmed),
      fractioning_justification: input.override_team_limit_justification ?? null,
      status: 'planejado',
      created_by: input.createdBy,
    });

    const plain = typeof created?.toJSON === 'function' ? created.toJSON() : created;
    return warning ? { ...plain, warning } : plain;
  }
}

export = CreateVacationScheduleUseCase;
