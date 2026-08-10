/**
 * `POST /api/rh/vacation-schedules/:id/revise` — **RF-RH-040 (P0)**.
 *
 * ⚠️ **Endpoint ADICIONADO nesta implementação.** §8.3 do contrato de API
 * determina, em prosa, que "não há `PUT`; uma mudança gera **novo
 * registro** com `superseded_schedule_id` apontando para o anterior e
 * `reason` obrigatório", e a migration `20260808-000019` modela as colunas
 * (`superseded_by_id`, `revision_reason`) e um trigger que bloqueia
 * `DELETE` — mas a tabela de endpoints de §8.1 **não lista nenhuma rota**
 * capaz de executar essa revisão. Sem ela, RF-RH-040 (P0) ficaria sem
 * implementação possível. Reportado no HANDOFF_CODEX como lacuna do
 * contrato de API (mesma classe dos gaps de `aso-confirmation` já
 * registrados na passada 1).
 *
 * Semântica de nomes (achado 9 da auditoria cruzada — divergência
 * payload × coluna, mapeada linha a linha, sem assumir 1:1):
 * `superseded_schedule_id` (payload) → `superseded_by_id` (coluna, e o
 * sentido é invertido: a coluna vive no registro ANTIGO e aponta para o
 * NOVO); `reason` (payload) → `revision_reason` (coluna).
 *
 * Regras legais preservadas: a nova fração passa exatamente pelas mesmas
 * validações de `CreateVacationScheduleUseCase` (Art. 134 §1º/§3º, Art.
 * 143), pois é ele quem cria o novo registro — este use case apenas
 * cancela a versão anterior e a encadeia.
 *
 * @module modules/rh/application/use-cases/vacation/ReviseVacationScheduleUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../../errors';
import VacationScheduleRepository from '../../../domain/repositories/VacationScheduleRepository';
import CreateVacationScheduleUseCase from './CreateVacationScheduleUseCase';

/** Status de `hr_vacation_schedules` que ainda admitem revisão (gozo já concluído não se revisa). */
const REVISABLE_SCHEDULE_STATUSES = ['planejado', 'confirmado'];

interface ReviseVacationScheduleInput {
  id: number | string;
  reason: string;
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

class ReviseVacationScheduleUseCase extends UseCase<ReviseVacationScheduleInput, any> {
  private readonly scheduleRepository: VacationScheduleRepository;
  private readonly createVacationScheduleUseCase: CreateVacationScheduleUseCase;

  public constructor(scheduleRepository: VacationScheduleRepository, createVacationScheduleUseCase: CreateVacationScheduleUseCase) {
    super();
    this.scheduleRepository = scheduleRepository;
    this.createVacationScheduleUseCase = createVacationScheduleUseCase;
  }

  /**
   * @throws {ValidationError} `reason` ausente (400).
   * @throws {NotFoundError} Programação não existe (404).
   * @throws {BusinessRuleError} Programação já em gozo/concluída/cancelada (422).
   */
  public async execute(input: ReviseVacationScheduleInput): Promise<any> {
    if (!input.reason || !input.reason.trim()) {
      throw new ValidationError('reason é obrigatório para revisar uma programação de férias (RF-RH-040).');
    }

    const previous = await this.scheduleRepository.findById(input.id);
    if (!previous) throw new NotFoundError('Programação de férias não encontrada.');
    if (!REVISABLE_SCHEDULE_STATUSES.includes(previous.status)) {
      throw new BusinessRuleError(
        'Somente programações em planejado/confirmado podem ser revisadas — férias já em gozo, concluídas ou canceladas não são alteráveis.',
        { rule: 'RF-RH-040' },
      );
    }

    // 1. Cancela a versão anterior ANTES de criar a nova: `days` da versão
    // antiga precisa sair da soma agregada do período aquisitivo, senão a
    // revisão bateria em `EXCEEDS_ACCRUAL_DAYS`/`MAX_FRACTIONS_REACHED`
    // contra a própria versão que está sendo substituída.
    await this.scheduleRepository.update(input.id, { status: 'cancelado', revision_reason: input.reason });

    const created = await this.createVacationScheduleUseCase.execute({
      accrual_period_id: previous.accrual_period_id,
      start_date: input.start_date,
      days: input.days,
      abono: input.abono,
      abono_days: input.abono_days,
      abono_requested_at: input.abono_requested_at,
      aviso_em: input.aviso_em,
      employee_agreement_confirmed: input.employee_agreement_confirmed,
      override_team_limit_justification: input.override_team_limit_justification,
      createdBy: input.createdBy,
    });

    // 2. Encadeia o histórico: o registro ANTIGO aponta para o novo
    // (`superseded_by_id`), nunca o contrário — o antigo nunca é apagado
    // (trigger `hr_block_delete_vacation_schedule`).
    const superseded = await this.scheduleRepository.update(input.id, { superseded_by_id: created.id });

    return { superseded_schedule: superseded, schedule: created };
  }
}

export = ReviseVacationScheduleUseCase;
