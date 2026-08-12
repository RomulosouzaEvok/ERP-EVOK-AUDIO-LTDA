/**
 * `PATCH /api/rh/absences/:id/return` — RF-RH-048, §9.2 do contrato de API,
 * UC-71 E1. Afastamento com duração > 30 dias exige ASO de retorno
 * (`hasValidAso`, gate compartilhado com Admissão/Demissão) antes de
 * reverter `employees.status` para `active`.
 *
 * RF-RH-047-A (decisão do dono, 2026-08-12): o retorno também REATIVA, na
 * mesma transação, os benefícios VT/VR que este afastamento suspendeu
 * (`hr_employee_benefits.suspended_days`, RF-RH-047). `suspended_days` é um
 * contador acumulado (não um link explícito afastamento→benefício); a
 * reativação é segura porque `hr_absences` garante NO MÁXIMO um afastamento
 * aberto por funcionário por vez (`findOpenByEmployeeId`,
 * `CreateAbsenceUseCase`) — logo qualquer `suspended_days` > 0 sobre um
 * benefício ainda `ativo` do funcionário só pode ter vindo DESTE
 * afastamento, e o número exato de dias somado na suspensão é o mesmo já
 * gravado em `hr_absences.accrual_impact_days` (mesma variável usada nas
 * duas contas em `CreateAbsenceUseCase`). Benefícios cancelados durante o
 * afastamento (`enrollment_status='cancelado'`) não voltam — já saem de
 * `listActiveByEmployee`.
 *
 * @module modules/rh/application/use-cases/absence/ReturnFromAbsenceUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../../errors';
import AbsenceRepository from '../../../domain/repositories/AbsenceRepository';
import EmployeeDocumentRepository from '../../../domain/repositories/EmployeeDocumentRepository';
import EmployeeBenefitRepository from '../../../domain/repositories/EmployeeBenefitRepository';
import EmployeeDirectoryService from '../../services/EmployeeDirectoryService';
import { hasValidAso } from '../../../domain/services/asoGate';
import { requiresReturnAso, SUSPENDABLE_BENEFIT_CATEGORIES } from '../../../domain/services/absenceRules';

// ⚠️ Interface LOCAL (sem `export`): este arquivo usa `export =` e o
// transpilador CJS/ESM do runtime (tsx/esbuild) quebra em tempo de EXECUÇÃO
// se um `export =` convive com qualquer outro `export` — inclusive um
// `export interface`, que o `tsc --noEmit` e o Jest (ts-jest, CJS) aceitam
// sem reclamar. Ver `docs/business/BLOCO_6_RH_API.md` §2 e o HANDOFF.
interface ReturnFromAbsenceInput {
  id: number | string;
  actual_end_date: string;
}

/** Item de `reactivated_benefits` na resposta do use case (RF-RH-047-A). */
interface ReactivatedBenefit {
  id: number;
  benefit_type_id: number;
  category: string;
  suspended_days: number;
}

class ReturnFromAbsenceUseCase extends UseCase<ReturnFromAbsenceInput, any> {
  private readonly absenceRepository: AbsenceRepository;
  private readonly employeeDocumentRepository: EmployeeDocumentRepository;
  private readonly employeeDirectoryService: EmployeeDirectoryService;
  private readonly employeeBenefitRepository: EmployeeBenefitRepository | undefined;
  private readonly runInTransaction: <T>(fn: (transaction: unknown) => Promise<T>) => Promise<T>;

  public constructor(
    absenceRepository: AbsenceRepository,
    employeeDocumentRepository: EmployeeDocumentRepository,
    employeeDirectoryService: EmployeeDirectoryService,
    employeeBenefitRepository?: EmployeeBenefitRepository,
    runInTransaction?: <T>(fn: (transaction: unknown) => Promise<T>) => Promise<T>,
  ) {
    super();
    this.absenceRepository = absenceRepository;
    this.employeeDocumentRepository = employeeDocumentRepository;
    this.employeeDirectoryService = employeeDirectoryService;
    this.employeeBenefitRepository = employeeBenefitRepository;
    this.runInTransaction = runInTransaction ?? (async (fn) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { sequelize } = require('../../../../../config/database');
      return sequelize.transaction(fn);
    });
  }

  /**
   * @throws {ValidationError} `actual_end_date` ausente ou anterior a `start_date` (400).
   * @throws {NotFoundError} Afastamento não existe (404).
   * @throws {BusinessRuleError} `RETURN_ASO_REQUIRED`; afastamento já encerrado (422).
   */
  public async execute(input: ReturnFromAbsenceInput): Promise<any> {
    if (!input.actual_end_date) {
      throw new ValidationError('actual_end_date é obrigatório.');
    }

    const absence = await this.absenceRepository.findById(input.id);
    if (!absence) throw new NotFoundError('Afastamento não encontrado.');
    if (absence.actual_end_date) {
      throw new BusinessRuleError('Afastamento já encerrado.');
    }
    if (input.actual_end_date < absence.start_date) {
      throw new ValidationError('actual_end_date não pode ser anterior a start_date.');
    }

    if (requiresReturnAso(absence.start_date, input.actual_end_date)) {
      const valid = await hasValidAso(this.employeeDocumentRepository, absence.employee_id, 'aso_retorno', input.actual_end_date);
      if (!valid) {
        throw new BusinessRuleError(
          'Afastamento com mais de 30 dias exige ASO de retorno válido antes de encerrar (RF-RH-048).',
          { code: 'RETURN_ASO_REQUIRED' },
        );
      }
    }

    return this.runInTransaction(async (transaction) => {
      const updated = await this.absenceRepository.update(
        input.id,
        { actual_end_date: input.actual_end_date },
        transaction,
      );
      await this.employeeDirectoryService.updateStatus(absence.employee_id, 'active', transaction);

      const reactivatedBenefits = await this.reactivateSuspendedBenefits(absence, transaction);

      const plain = typeof (updated as any)?.toJSON === 'function' ? (updated as any).toJSON() : updated;
      return { ...plain, reactivated_benefits: reactivatedBenefits };
    });
  }

  /**
   * RF-RH-047-A — reverte, para os benefícios VT/VR ainda `ativo` do
   * funcionário, os dias de suspensão gravados por ESTE afastamento
   * (`absence.accrual_impact_days`, mesmo valor somado em
   * `CreateAbsenceUseCase`). Nunca deixa `suspended_days` negativo. Não
   * requer `employeeBenefitRepository` (compatibilidade retroativa de quem
   * ainda instancia sem o 4º argumento) — sem ele, não reativa nada.
   *
   * @param absence - Afastamento sendo encerrado (já validado).
   * @param transaction - Transação Sequelize da operação de retorno.
   * @returns Benefícios efetivamente reativados (delta > 0).
   */
  private async reactivateSuspendedBenefits(absence: any, transaction: unknown): Promise<ReactivatedBenefit[]> {
    if (!this.employeeBenefitRepository) return [];

    const suspensionDays = absence.accrual_impact_days ?? 0;
    if (suspensionDays <= 0) return [];

    const activeBenefits = await this.employeeBenefitRepository.listActiveByEmployee(absence.employee_id, transaction);
    const reactivated: ReactivatedBenefit[] = [];

    for (const benefit of activeBenefits) {
      const category = benefit.benefitType?.category ?? benefit.category;
      if (!SUSPENDABLE_BENEFIT_CATEGORIES.includes(category)) continue;

      const currentSuspended = benefit.suspended_days ?? 0;
      if (currentSuspended <= 0) continue;

      const newSuspended = Math.max(0, currentSuspended - suspensionDays);
      await this.employeeBenefitRepository.update(benefit.id, { suspended_days: newSuspended }, transaction);
      reactivated.push({
        id: benefit.id,
        benefit_type_id: benefit.benefit_type_id,
        category,
        suspended_days: newSuspended,
      });
    }

    return reactivated;
  }
}

export = ReturnFromAbsenceUseCase;
