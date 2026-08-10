/**
 * `POST /api/rh/termination-processes/:id/conclude` — RF-RH-022,
 * transacional (§6.2 do contrato de API, UC-70).
 *
 * Transação: (1) valida checklist de ativos (`AssetService.listByResponsible`,
 * RF-RH-023, UC-70 E2) e ASO demissional (`hasValidAso`, RF-RH-020/030);
 * (2) grava `employees.status='fired'`+`dismissal_date`; (3)
 * `UserAccountService.deactivate` (pula sem erro se `user_id` for `null`);
 * (4) grava `HrTerminationProcess.status='concluido'`,
 * `concluded_by`/`concluded_at`.
 *
 * @module modules/rh/application/use-cases/termination/ConcludeTerminationProcessUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import TerminationProcessRepository from '../../../domain/repositories/TerminationProcessRepository';
import EmployeeDocumentRepository from '../../../domain/repositories/EmployeeDocumentRepository';
import AssetService from '../../../application/services/AssetService';
import UserAccountService from '../../../application/services/UserAccountService';
import EmployeeDirectoryService from '../../services/EmployeeDirectoryService';
import { hasValidAso } from '../../../domain/services/asoGate';

class ConcludeTerminationProcessUseCase extends UseCase<{ id: number | string; concludedBy: number }, any> {
  private readonly terminationRepository: TerminationProcessRepository;
  private readonly employeeDocumentRepository: EmployeeDocumentRepository;
  private readonly assetService: AssetService;
  private readonly userAccountService: UserAccountService;
  private readonly employeeDirectoryService: EmployeeDirectoryService;
  private readonly runInTransaction: <T>(fn: (transaction: unknown) => Promise<T>) => Promise<T>;

  public constructor(
    terminationRepository: TerminationProcessRepository,
    employeeDocumentRepository: EmployeeDocumentRepository,
    assetService: AssetService,
    userAccountService: UserAccountService,
    employeeDirectoryService: EmployeeDirectoryService,
    runInTransaction?: <T>(fn: (transaction: unknown) => Promise<T>) => Promise<T>,
  ) {
    super();
    this.terminationRepository = terminationRepository;
    this.employeeDocumentRepository = employeeDocumentRepository;
    this.assetService = assetService;
    this.userAccountService = userAccountService;
    this.employeeDirectoryService = employeeDirectoryService;
    this.runInTransaction = runInTransaction ?? (async (fn) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { sequelize } = require('../../../../../config/database');
      return sequelize.transaction(fn);
    });
  }

  /**
   * @throws {NotFoundError} Processo não existe (404).
   * @throws {BusinessRuleError} Checklist de ativos pendente (RF-RH-023); ASO demissional pendente (RF-RH-020); processo já `concluido`/`cancelado` (422).
   */
  public async execute({ id, concludedBy }: { id: number | string; concludedBy: number }): Promise<any> {
    const process = await this.terminationRepository.findById(id);
    if (!process) throw new NotFoundError('Processo de demissão não encontrado.');
    if (['concluido', 'cancelado'].includes(process.status)) {
      throw new BusinessRuleError('Processo de demissão já está concluído/cancelado.');
    }

    const assets = await this.assetService.listByResponsible(Number(process.employee_id));
    if (assets.some((asset) => !asset.returned)) {
      throw new BusinessRuleError(
        'Checklist de devolução de ativos/EPI pendente — nenhum ativo pode continuar vinculado ao funcionário para concluir a demissão.',
        { rule: 'RF-RH-023' },
      );
    }

    const hasAso = await hasValidAso(this.employeeDocumentRepository, process.employee_id, 'aso_demissional');
    if (!hasAso) {
      throw new BusinessRuleError('ASO demissional pendente, vencido ou inapto — anexe o documento antes de concluir a demissão.', { rule: 'RF-RH-020' });
    }

    return this.runInTransaction(async (transaction) => {
      const employee = await this.employeeDirectoryService.findById(process.employee_id, transaction);
      if (!employee) throw new NotFoundError('Funcionário do processo de demissão não encontrado.');

      // `'fired'` é literal do ENUM `employees.status`
      // (`active|inactive|fired|vacation|license`) — RF-RH-022.
      await this.employeeDirectoryService.markAsTerminated(
        employee.id,
        process.termination_date ?? new Date().toISOString().slice(0, 10),
        transaction,
      );

      if (employee.user_id) {
        await this.userAccountService.deactivate(employee.user_id, transaction);
      }

      const updatedProcess = await this.terminationRepository.update(
        id,
        { status: 'concluido', checklist_assets_returned: true, concluded_by: concludedBy, concluded_at: new Date() },
        transaction,
      );

      return { termination_process: updatedProcess, employee };
    });
  }
}

export = ConcludeTerminationProcessUseCase;
