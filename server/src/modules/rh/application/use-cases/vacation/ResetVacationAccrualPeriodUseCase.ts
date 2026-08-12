/**
 * `POST /api/rh/vacation-accrual-periods/:id/reset` — RF-RH-041, Art. 133,
 * IV, CLT. Uso interno (§8.3 do contrato de API: "não é um endpoint chamado
 * diretamente pelo cliente HTTP nesta rodada — efeito colateral automático
 * de `POST /absences`").
 *
 * ⚠️ Escopo desta passada P0: `Absence` (RF-RH-044 a 049, Grupo 7) é P1 e
 * não foi implementado — portanto este use case existe, é testado
 * isoladamente (a regra de zeramento em si é P0, RF-RH-041, dentro do
 * escopo de Férias), mas NÃO está conectado a nenhum gatilho automático
 * ainda (não há `POST /absences` para disparar). Fica pronto para a
 * passada 2 conectar assim que `Absence` existir. Não exposto por rota
 * própria nesta passada (consistente com o contrato, que já não previa
 * rota pública para ele).
 *
 * @module modules/rh/application/use-cases/vacation/ResetVacationAccrualPeriodUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import VacationAccrualPeriodRepository from '../../../domain/repositories/VacationAccrualPeriodRepository';
import OpenVacationAccrualPeriodUseCase from './OpenVacationAccrualPeriodUseCase';
import { shouldZeroAccrualPeriod } from '../../../domain/services/vacationRules';

// ⚠️ Interface LOCAL (sem `export`): este arquivo usa `export =` e o
// transpilador CJS/ESM do runtime (tsx/esbuild) quebra em tempo de EXECUÇÃO
// se um `export =` convive com qualquer outro `export` — inclusive um
// `export interface`, que o `tsc --noEmit` e o Jest (ts-jest, CJS) aceitam
// sem reclamar. Ver `docs/business/BLOCO_6_RH_API.md` §2 e o HANDOFF.
interface ResetVacationAccrualPeriodInput {
  periodId: number | string;
  accumulatedInssAbsenceDays: number;
  returnDate: string;
  reason: string;
  /** Transação do chamador (ex.: `CreateAbsenceUseCase`) — quando informada, zeramento + abertura do novo período ficam atômicos com o restante da operação. */
  transaction?: unknown;
}

class ResetVacationAccrualPeriodUseCase extends UseCase<ResetVacationAccrualPeriodInput, any> {
  private readonly repository: VacationAccrualPeriodRepository;
  private readonly openVacationAccrualPeriodUseCase: OpenVacationAccrualPeriodUseCase;

  public constructor(repository: VacationAccrualPeriodRepository, openVacationAccrualPeriodUseCase: OpenVacationAccrualPeriodUseCase) {
    super();
    this.repository = repository;
    this.openVacationAccrualPeriodUseCase = openVacationAccrualPeriodUseCase;
  }

  /**
   * @throws {NotFoundError} Período não existe (404).
   * @throws {BusinessRuleError} Afastamento acumulado ainda não ultrapassa 6 meses — nada a zerar (422).
   */
  public async execute(input: ResetVacationAccrualPeriodInput): Promise<{ zeroedPeriod: any; newPeriod: any }> {
    if (!shouldZeroAccrualPeriod(input.accumulatedInssAbsenceDays)) {
      throw new BusinessRuleError('Afastamento previdenciário acumulado ainda não ultrapassa 6 meses — período não deve ser zerado.', { rule: 'RF-RH-041' });
    }
    const period = await this.repository.findById(input.periodId);
    if (!period) throw new NotFoundError('Período aquisitivo não encontrado.');

    const zeroedPeriod = await this.repository.update(input.periodId, { status: 'zerado', zeroed_reason: input.reason }, input.transaction);
    const newPeriod = await this.openVacationAccrualPeriodUseCase.execute({
      employeeId: period.employee_id,
      periodStart: input.returnDate,
      zeroedFromPeriodId: Number(input.periodId),
      zeroedReason: input.reason,
      transaction: input.transaction,
    });

    return { zeroedPeriod, newPeriod };
  }
}

export = ResetVacationAccrualPeriodUseCase;
