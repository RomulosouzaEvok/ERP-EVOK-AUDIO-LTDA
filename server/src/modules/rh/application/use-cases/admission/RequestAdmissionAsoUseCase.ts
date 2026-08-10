/**
 * `POST /api/rh/admission-processes/:id/request-aso` — RF-RH-008.
 *
 * Grava `status='aso_pendente'`, `aso_requested_at=now()`. Consulta
 * `SstAsoService.getStatus` apenas como valor informativo (o funcionário
 * ainda não existe em `employees` neste ponto — RF-RH-009 — então o
 * `employeeId` não é aplicável; a checagem retorna `null` sem erro,
 * conforme §4.2 do contrato de API).
 *
 * @module modules/rh/application/use-cases/admission/RequestAdmissionAsoUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import AdmissionProcessRepository from '../../../domain/repositories/AdmissionProcessRepository';

class RequestAdmissionAsoUseCase extends UseCase<{ id: number | string }, any> {
  private readonly repository: AdmissionProcessRepository;

  public constructor(repository: AdmissionProcessRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} Processo não existe (404).
   * @throws {BusinessRuleError} Processo já `concluida`/`cancelada` (422).
   */
  public async execute({ id }: { id: number | string }): Promise<any> {
    const process = await this.repository.findById(id);
    if (!process) throw new NotFoundError('Processo de admissão não encontrado.');
    if (['concluida', 'cancelada'].includes(process.status)) {
      throw new BusinessRuleError('Processo de admissão já está concluído/cancelado.');
    }

    return this.repository.update(id, { status: 'aso_pendente', aso_requested_at: new Date() });
  }
}

export = RequestAdmissionAsoUseCase;
