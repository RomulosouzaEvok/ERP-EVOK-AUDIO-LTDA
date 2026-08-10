/**
 * `POST /api/rh/termination-processes/:id/request-aso` — RF-RH-020.
 * Mesmo padrão informativo de `RequestAdmissionAsoUseCase` (§2 do contrato
 * de API): consulta `SstAsoService.getStatus` só a título de conveniência,
 * o gate real de conclusão usa o snapshot em `HrEmployeeDocument`.
 *
 * @module modules/rh/application/use-cases/termination/RequestTerminationAsoUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import TerminationProcessRepository from '../../../domain/repositories/TerminationProcessRepository';
import SstAsoService from '../../../application/services/SstAsoService';

class RequestTerminationAsoUseCase extends UseCase<{ id: number | string }, any> {
  private readonly repository: TerminationProcessRepository;
  private readonly sstAsoService?: SstAsoService;

  public constructor(repository: TerminationProcessRepository, sstAsoService?: SstAsoService) {
    super();
    this.repository = repository;
    this.sstAsoService = sstAsoService;
  }

  /**
   * @throws {NotFoundError} Processo não existe (404).
   * @throws {BusinessRuleError} Processo já `concluido`/`cancelado` (422).
   */
  public async execute({ id }: { id: number | string }): Promise<any> {
    const process = await this.repository.findById(id);
    if (!process) throw new NotFoundError('Processo de demissão não encontrado.');
    if (['concluido', 'cancelado'].includes(process.status)) {
      throw new BusinessRuleError('Processo de demissão já está concluído/cancelado.');
    }

    const updated = await this.repository.update(id, { status: 'aguardando_aso' });

    let sstStatus: unknown = null;
    if (this.sstAsoService) {
      try {
        sstStatus = await this.sstAsoService.getStatus(Number(process.employee_id));
      } catch {
        sstStatus = null; // Valor informativo — falha na consulta não bloqueia a solicitação.
      }
    }

    const plain = typeof updated?.toJSON === 'function' ? updated.toJSON() : updated;
    return { ...plain, sst_status: sstStatus };
  }
}

export = RequestTerminationAsoUseCase;
