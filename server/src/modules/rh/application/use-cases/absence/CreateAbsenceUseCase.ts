/**
 * `POST /api/rh/absences` — RF-RH-044/045/047/049, §9.1 do contrato de API,
 * UC-71. Transação única: (1) cria o afastamento; (2)
 * `employees.status='license'`; (3) suspende benefícios VT/VR ativos do
 * funcionário (`suspended_days` — RF-RH-047, nunca cancela a adesão); (4)
 * recalcula o impacto no período aquisitivo em curso e, se o acumulado de
 * afastamento previdenciário (`auxilio_doenca_inss`/`acidente_trabalho`)
 * ultrapassar 6 meses no período em curso, zera-o (RF-RH-041/049, Art. 133,
 * IV, CLT) — reaproveita `ResetVacationAccrualPeriodUseCase`/
 * `OpenVacationAccrualPeriodUseCase` já existentes do Grupo 6 (Férias).
 *
 * @module modules/rh/application/use-cases/absence/CreateAbsenceUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError, ConflictError } from '../../../../../errors';
import AbsenceRepository from '../../../domain/repositories/AbsenceRepository';
import EmployeeDocumentRepository from '../../../domain/repositories/EmployeeDocumentRepository';
import EmployeeBenefitRepository from '../../../domain/repositories/EmployeeBenefitRepository';
import VacationAccrualPeriodRepository from '../../../domain/repositories/VacationAccrualPeriodRepository';
import EmployeeDirectoryService from '../../services/EmployeeDirectoryService';
import ResetVacationAccrualPeriodUseCase from '../vacation/ResetVacationAccrualPeriodUseCase';
import {
  calculateDefaultExpectedEndDate,
  shouldWarnMissingCid,
  durationInDays,
  INSS_ABSENCE_TYPES,
  SUSPENDABLE_BENEFIT_CATEGORIES,
} from '../../../domain/services/absenceRules';
import { shouldZeroAccrualPeriod } from '../../../domain/services/vacationRules';

// ⚠️ Interface LOCAL (sem `export`): este arquivo usa `export =` e o
// transpilador CJS/ESM do runtime (tsx/esbuild) quebra em tempo de EXECUÇÃO
// se um `export =` convive com qualquer outro `export` — inclusive um
// `export interface`, que o `tsc --noEmit` e o Jest (ts-jest, CJS) aceitam
// sem reclamar. Ver `docs/business/BLOCO_6_RH_API.md` §2 e o HANDOFF.
interface CreateAbsenceInput {
  employee_id: number;
  type: string;
  start_date: string;
  expected_end_date?: string | null;
  extended_program?: boolean;
  cid?: string | null;
  document_id?: number | null;
  createdBy: number;
}

class CreateAbsenceUseCase extends UseCase<CreateAbsenceInput, any> {
  private readonly absenceRepository: AbsenceRepository;
  private readonly employeeDocumentRepository: EmployeeDocumentRepository;
  private readonly employeeBenefitRepository: EmployeeBenefitRepository;
  private readonly accrualRepository: VacationAccrualPeriodRepository;
  private readonly employeeDirectoryService: EmployeeDirectoryService;
  private readonly resetVacationAccrualPeriodUseCase: ResetVacationAccrualPeriodUseCase;
  private readonly runInTransaction: <T>(fn: (transaction: unknown) => Promise<T>) => Promise<T>;

  public constructor(
    absenceRepository: AbsenceRepository,
    employeeDocumentRepository: EmployeeDocumentRepository,
    employeeBenefitRepository: EmployeeBenefitRepository,
    accrualRepository: VacationAccrualPeriodRepository,
    employeeDirectoryService: EmployeeDirectoryService,
    resetVacationAccrualPeriodUseCase: ResetVacationAccrualPeriodUseCase,
    runInTransaction?: <T>(fn: (transaction: unknown) => Promise<T>) => Promise<T>,
  ) {
    super();
    this.absenceRepository = absenceRepository;
    this.employeeDocumentRepository = employeeDocumentRepository;
    this.employeeBenefitRepository = employeeBenefitRepository;
    this.accrualRepository = accrualRepository;
    this.employeeDirectoryService = employeeDirectoryService;
    this.resetVacationAccrualPeriodUseCase = resetVacationAccrualPeriodUseCase;
    this.runInTransaction = runInTransaction ?? (async (fn) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { sequelize } = require('../../../../../config/database');
      return sequelize.transaction(fn);
    });
  }

  /**
   * @throws {ValidationError} `employee_id`/`type`/`start_date` ausentes (400).
   * @throws {NotFoundError} `employee_id`/`document_id` não existe (404).
   * @throws {ConflictError} Já existe afastamento em aberto para o funcionário (409).
   */
  public async execute(input: CreateAbsenceInput): Promise<any> {
    if (!input.employee_id || !input.type || !input.start_date) {
      throw new ValidationError('employee_id, type e start_date são obrigatórios.');
    }

    const employee = await this.employeeDirectoryService.findById(input.employee_id);
    if (!employee) throw new NotFoundError('Funcionário não encontrado.');

    if (input.document_id) {
      const document = await this.employeeDocumentRepository.findById(input.document_id);
      if (!document) throw new NotFoundError('Documento (document_id) não encontrado.');
    }

    const openAbsence = await this.absenceRepository.findOpenByEmployeeId(input.employee_id);
    if (openAbsence) {
      throw new ConflictError('Já existe um afastamento em aberto para este funcionário.');
    }

    const extendedProgram = Boolean(input.extended_program);
    const expectedEndDate = input.expected_end_date
      ?? calculateDefaultExpectedEndDate(input.type, input.start_date, extendedProgram);

    const warning = shouldWarnMissingCid(input.type, input.cid)
      ? 'CID não informado — registre assim que disponível (nem todo tipo de afastamento tem CID de imediato).'
      : null;

    return this.runInTransaction(async (transaction) => {
      // RF-RH-049 — vincula ao período aquisitivo em curso (se existir) ANTES
      // de qualquer zeramento, para registrar o período efetivamente
      // impactado por este afastamento.
      const openPeriod = await this.accrualRepository.findOpenByEmployeeId(input.employee_id);
      const impactDays = expectedEndDate ? durationInDays(input.start_date, expectedEndDate) : null;

      const absence = await this.absenceRepository.create({
        employee_id: input.employee_id,
        type: input.type,
        start_date: input.start_date,
        expected_end_date: expectedEndDate,
        extended_program: extendedProgram,
        cid: input.cid ?? null,
        document_id: input.document_id ?? null,
        accrual_period_impact_id: openPeriod ? openPeriod.id : null,
        accrual_impact_days: impactDays,
        created_by: input.createdBy,
      }, transaction);

      // (1) employees.status='license' (RF-RH-045).
      await this.employeeDirectoryService.updateStatus(input.employee_id, 'license', transaction);

      // (2) Suspensão de VT/VR (RF-RH-047) — grava suspended_days, nunca cancela a adesão.
      const activeBenefits = await this.employeeBenefitRepository.listActiveByEmployee(input.employee_id, transaction);
      const suspensionDays = impactDays ?? 0;
      for (const benefit of activeBenefits) {
        const category = benefit.benefitType?.category ?? benefit.category;
        if (SUSPENDABLE_BENEFIT_CATEGORIES.includes(category)) {
          const currentSuspended = benefit.suspended_days ?? 0;
          await this.employeeBenefitRepository.update(
            benefit.id,
            { suspended_days: currentSuspended + suspensionDays },
            transaction,
          );
        }
      }

      // (3) Zeramento por acúmulo previdenciário >6 meses (RF-RH-041/049, Art. 133, IV, CLT).
      let accrualPeriodZeroed = false;
      if (INSS_ABSENCE_TYPES.includes(input.type) && openPeriod) {
        const accumulated = await this.absenceRepository.sumAccumulatedDaysByEmployee(
          input.employee_id,
          INSS_ABSENCE_TYPES,
          openPeriod.period_start,
          transaction,
        );
        // A soma já inclui este afastamento recém-criado (mesma transação).
        if (shouldZeroAccrualPeriod(accumulated)) {
          await this.resetVacationAccrualPeriodUseCase.execute({
            periodId: openPeriod.id,
            accumulatedInssAbsenceDays: accumulated,
            returnDate: input.start_date,
            reason: `Zeramento automático — afastamento previdenciário acumulado de ${accumulated} dias (Absence #${(absence as any).id}).`,
            transaction,
          });
          accrualPeriodZeroed = true;
        }
      }

      const plain = typeof (absence as any)?.toJSON === 'function' ? (absence as any).toJSON() : absence;
      const result: Record<string, unknown> = { ...plain, accrual_period_zeroed: accrualPeriodZeroed };
      if (warning) result.warning = warning;
      return result;
    });
  }
}

export = CreateAbsenceUseCase;
