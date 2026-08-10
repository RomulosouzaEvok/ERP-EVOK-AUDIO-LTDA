/**
 * Abertura de `HrVacationAccrualPeriod` (RF-RH-031, Art. 130 caput CLT —
 * "após cada período de 12 (doze) meses de vigência do contrato de
 * trabalho"). NÃO é um endpoint HTTP direto (§8.1 do contrato de API: "nunca
 * nasce por POST manual") — é chamado internamente por
 * `ConcludeAdmissionProcessUseCase` (abertura do primeiro período, na mesma
 * transação da admissão) e, futuramente, por um job de aniversário de 12
 * meses (mecanismo de agendamento NÃO implementado nesta passada P0 — ver
 * nota no HANDOFF_CODEX; o contrato de API já delega essa decisão ao
 * programador, §8.1).
 *
 * @module modules/rh/application/use-cases/vacation/OpenVacationAccrualPeriodUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import VacationAccrualPeriodRepository from '../../../domain/repositories/VacationAccrualPeriodRepository';
import { calculateConcessiveEnd } from '../../../domain/services/vacationRules';

// ⚠️ Interface LOCAL (sem `export`): este arquivo usa `export =` e o
// transpilador CJS/ESM do runtime (tsx/esbuild) quebra em tempo de EXECUÇÃO
// se um `export =` convive com qualquer outro `export` — inclusive um
// `export interface`, que o `tsc --noEmit` e o Jest (ts-jest, CJS) aceitam
// sem reclamar. Ver `docs/business/BLOCO_6_RH_API.md` §2 e o HANDOFF.
interface OpenVacationAccrualPeriodInput {
  employeeId: number;
  periodStart: string;
  zeroedFromPeriodId?: number | null;
  zeroedReason?: string | null;
  transaction?: unknown;
}

class OpenVacationAccrualPeriodUseCase extends UseCase<OpenVacationAccrualPeriodInput, any> {
  private readonly repository: VacationAccrualPeriodRepository;

  public constructor(repository: VacationAccrualPeriodRepository) {
    super();
    this.repository = repository;
  }

  /** Art. 129/130 caput, CLT — período aquisitivo de 12 meses a partir de `periodStart` (`hire_date` ou aniversário de contrato). */
  public async execute(input: OpenVacationAccrualPeriodInput): Promise<any> {
    const periodEnd = calculateConcessiveEnd(input.periodStart); // +12 meses = fim do aquisitivo
    const concessiveEnd = calculateConcessiveEnd(periodEnd); // +12 meses = fim do concessivo

    return this.repository.create({
      employee_id: input.employeeId,
      period_start: input.periodStart,
      period_end: periodEnd,
      concessive_end: concessiveEnd,
      unexcused_absences: 0,
      entitled_days: 30,
      days_taken: 0,
      status: 'em_curso',
      zeroed_from_period_id: input.zeroedFromPeriodId ?? null,
      zeroed_reason: input.zeroedReason ?? null,
    }, input.transaction);
  }
}

export = OpenVacationAccrualPeriodUseCase;
