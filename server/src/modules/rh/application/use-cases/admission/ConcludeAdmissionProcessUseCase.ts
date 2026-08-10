/**
 * `POST /api/rh/admission-processes/:id/conclude` — RF-RH-009, transacional
 * (§4.3 do contrato de API, UC-69).
 *
 * Transação: (1) valida gate de ASO admissional (RF-RH-008/030, UC-69 E1);
 * (2) cria `employees` via `EmployeeDirectoryService` (porta injetada —
 * `EmployeesRepository.create` do módulo `employees` não aceita
 * `transaction` nesta versão do projeto, e RF-RH-009 exige transação
 * única; a validação de CPF continua sendo a mesma de
 * `CreateEmployeeUseCase`, reaproveitada de `utils/validators`, sem
 * duplicar regra); (3) cria
 * `HrEmployeeContract` inicial (RF-RH-013); (4) cria `HrEmployeeJobHistory`
 * inicial (RF-RH-064); (5) grava `AdmissionProcess.status='concluida'`.
 *
 * ⚠️ Divergência de schema encontrada e resolvida nesta implementação: o
 * exemplo de payload do contrato de API (§4.3) inclui
 * `"work_regime": "experiencia"`, mas `employees.work_regime` (ENUM já em
 * produção) só aceita `clt`/`pj`/`estagiario`/`aprendiz` — "experiência" é
 * um TIPO DE CONTRATO (`HrEmployeeContract.type`), não um REGIME de
 * trabalho. Este use case NUNCA grava `work_regime='experiencia']` (isso
 * quebraria o ENUM do banco); usa o `work_regime` informado (ou `'clt'` por
 * padrão) e delega o controle do prazo de experiência inteiramente a
 * `HrEmployeeContract.type='experiencia'`. Reportado no HANDOFF_CODEX.
 *
 * @module modules/rh/application/use-cases/admission/ConcludeAdmissionProcessUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError, ConflictError, BusinessRuleError } from '../../../../../errors';
import AdmissionProcessRepository from '../../../domain/repositories/AdmissionProcessRepository';
import EmployeeContractRepository from '../../../domain/repositories/EmployeeContractRepository';
import EmployeeJobHistoryRepository from '../../../domain/repositories/EmployeeJobHistoryRepository';
import EmployeeDirectoryService from '../../services/EmployeeDirectoryService';
import { validateMaxDuration } from '../../../domain/services/experienceContractRules';
import OpenVacationAccrualPeriodUseCase from '../vacation/OpenVacationAccrualPeriodUseCase';

const Validators: any = require('../../../../../utils/validators');

// ⚠️ Interface LOCAL (sem `export`): este arquivo usa `export =` e o
// transpilador CJS/ESM do runtime (tsx/esbuild) quebra em tempo de EXECUÇÃO
// se um `export =` convive com qualquer outro `export` — inclusive um
// `export interface`, que o `tsc --noEmit` e o Jest (ts-jest, CJS) aceitam
// sem reclamar. Ver `docs/business/BLOCO_6_RH_API.md` §2 e o HANDOFF.
interface ConcludeAdmissionProcessInput {
  id: number | string;
  employee: {
    name: string;
    cpf: string;
    hire_date: string;
    salary?: number;
    work_regime?: 'clt' | 'pj' | 'estagiario' | 'aprendiz';
    shift?: string;
  };
  contract_type: 'indeterminado' | 'experiencia' | 'aprendiz' | 'estagio';
  period_1_end_date?: string | null;
  createdBy: number;
}

class ConcludeAdmissionProcessUseCase extends UseCase<ConcludeAdmissionProcessInput, any> {
  private readonly admissionRepository: AdmissionProcessRepository;
  private readonly contractRepository: EmployeeContractRepository;
  private readonly jobHistoryRepository: EmployeeJobHistoryRepository;
  private readonly employeeDirectoryService: EmployeeDirectoryService;
  private readonly openVacationAccrualPeriodUseCase?: OpenVacationAccrualPeriodUseCase;
  private readonly runInTransaction: <T>(fn: (transaction: unknown) => Promise<T>) => Promise<T>;

  public constructor(
    admissionRepository: AdmissionProcessRepository,
    contractRepository: EmployeeContractRepository,
    jobHistoryRepository: EmployeeJobHistoryRepository,
    employeeDirectoryService: EmployeeDirectoryService,
    openVacationAccrualPeriodUseCase?: OpenVacationAccrualPeriodUseCase,
    runInTransaction?: <T>(fn: (transaction: unknown) => Promise<T>) => Promise<T>,
  ) {
    super();
    this.admissionRepository = admissionRepository;
    this.contractRepository = contractRepository;
    this.jobHistoryRepository = jobHistoryRepository;
    this.employeeDirectoryService = employeeDirectoryService;
    this.openVacationAccrualPeriodUseCase = openVacationAccrualPeriodUseCase;
    this.runInTransaction = runInTransaction ?? (async (fn) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { sequelize } = require('../../../../../config/database');
      return sequelize.transaction(fn);
    });
  }

  /**
   * @throws {ValidationError} Campos obrigatórios de `employee` ausentes; `contract_type` fora do enum (400).
   * @throws {NotFoundError} Processo não existe (404).
   * @throws {ConflictError} CPF já cadastrado (409).
   * @throws {BusinessRuleError} ASO admissional pendente/vencido/inapto; processo já `concluida`/`cancelada`; experiência excede 90 dias (422).
   */
  public async execute(input: ConcludeAdmissionProcessInput): Promise<any> {
    const process = await this.admissionRepository.findById(input.id);
    if (!process) throw new NotFoundError('Processo de admissão não encontrado.');
    if (['concluida', 'cancelada'].includes(process.status)) {
      throw new BusinessRuleError('Processo de admissão já está concluído/cancelado.');
    }

    if (!input.employee?.name || !input.employee?.cpf || !input.employee?.hire_date) {
      throw new ValidationError('employee.name, employee.cpf e employee.hire_date são obrigatórios.');
    }
    if (!Validators.isValidCPF(input.employee.cpf)) {
      throw new ValidationError('CPF inválido.');
    }
    const validContractTypes = ['indeterminado', 'experiencia', 'aprendiz', 'estagio'];
    if (!validContractTypes.includes(input.contract_type)) {
      throw new ValidationError(`contract_type deve ser um de: ${validContractTypes.join(', ')}.`);
    }

    // RF-RH-008/030, UC-69 E1 — gate de ASO admissional. Como `employeeId`
    // ainda não existe neste ponto (funcionário só nasce nesta transação),
    // o gate usa o snapshot já registrado no PRÓPRIO `AdmissionProcess`
    // (`aso_result`/`aso_valid_until`), NÃO `HrEmployeeDocument` (que exige
    // `employee_id NOT NULL`) — consistente com a nota da migration
    // `20260808-000015`. `HrEmployeeDocument`/`hasValidAso` (função
    // compartilhada, `domain/services/asoGate.ts`) é o gate usado por
    // `ConcludeTerminationProcessUseCase`, onde o funcionário já existe.
    if (process.aso_result !== 'apto' && process.aso_result !== 'apto_com_restricao') {
      throw new BusinessRuleError(
        'ASO admissional pendente, vencido ou inapto — registre a confirmação (aso_result/aso_confirmed_at) antes de concluir a admissão.',
        { rule: 'RF-RH-008' },
      );
    }
    if (process.aso_valid_until && process.aso_valid_until < input.employee.hire_date) {
      throw new BusinessRuleError('ASO admissional está vencido.', { rule: 'RF-RH-008' });
    }

    if (input.contract_type === 'experiencia' && input.period_1_end_date) {
      try {
        validateMaxDuration(input.employee.hire_date, input.period_1_end_date);
      } catch (error: any) {
        throw new BusinessRuleError(error.message, { rule: 'RF-RH-014' });
      }
    }

    return this.runInTransaction(async (transaction) => {
      let employee: any;
      try {
        employee = await this.employeeDirectoryService.create({
          name: input.employee.name,
          cpf: input.employee.cpf.replace(/[^\d]/g, ''),
          department_id: process.department_id,
          job_position_id: process.job_position_id ?? null,
          salary: input.employee.salary ?? 0,
          hire_date: input.employee.hire_date,
          work_regime: input.employee.work_regime ?? 'clt',
          shift: input.employee.shift ?? 'commercial',
        }, transaction);
      } catch (error: any) {
        if (error?.name === 'SequelizeUniqueConstraintError') {
          throw new ConflictError('CPF já cadastrado.');
        }
        throw error;
      }

      const contract = await this.contractRepository.create({
        employee_id: employee.id,
        type: input.contract_type,
        start_date: input.employee.hire_date,
        period_1_end_date: input.contract_type === 'experiencia' ? (input.period_1_end_date ?? null) : null,
        status: 'ativo',
        created_by: input.createdBy,
      }, transaction);

      const jobHistory = await this.jobHistoryRepository.create({
        employee_id: employee.id,
        job_position_id: process.job_position_id ?? null,
        department_id: process.department_id,
        salary: input.employee.salary ?? 0,
        effective_from: input.employee.hire_date,
        reason: 'admissao',
        created_by: input.createdBy,
      }, transaction);

      const updatedProcess = await this.admissionRepository.update(
        input.id,
        { status: 'concluida', employee_id: employee.id, contract_id: contract.id, job_history_id: jobHistory.id },
        transaction,
      );

      // RF-RH-031 — abertura automática do primeiro período aquisitivo de
      // férias, na MESMA transação da admissão (Art. 130 caput CLT).
      let vacationAccrualPeriod: any = null;
      if (this.openVacationAccrualPeriodUseCase) {
        vacationAccrualPeriod = await this.openVacationAccrualPeriodUseCase.execute({
          employeeId: employee.id,
          periodStart: input.employee.hire_date,
          transaction,
        });
      }

      return { admission_process: updatedProcess, employee, contract, job_history: jobHistory, vacation_accrual_period: vacationAccrualPeriod };
    });
  }
}

export = ConcludeAdmissionProcessUseCase;
