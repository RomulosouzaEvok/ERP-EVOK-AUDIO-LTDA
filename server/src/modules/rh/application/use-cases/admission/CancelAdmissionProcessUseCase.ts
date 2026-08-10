/**
 * `POST /api/rh/admission-processes/:id/cancel` — RF-RH-012 (nunca exclusão física).
 * @module modules/rh/application/use-cases/admission/CancelAdmissionProcessUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../../errors';
import AdmissionProcessRepository from '../../../domain/repositories/AdmissionProcessRepository';

class CancelAdmissionProcessUseCase extends UseCase<{ id: number | string; reason: string }, any> {
  private readonly repository: AdmissionProcessRepository;

  public constructor(repository: AdmissionProcessRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {ValidationError} `reason` ausente (400).
   * @throws {NotFoundError} Processo não existe (404).
   * @throws {BusinessRuleError} Processo já `concluida`/`cancelada` (422).
   */
  public async execute({ id, reason }: { id: number | string; reason: string }): Promise<any> {
    if (!reason || !reason.trim()) throw new ValidationError('reason é obrigatório para cancelar.');
    const process = await this.repository.findById(id);
    if (!process) throw new NotFoundError('Processo de admissão não encontrado.');
    if (['concluida', 'cancelada'].includes(process.status)) {
      throw new BusinessRuleError('Processo de admissão já está concluído/cancelado.');
    }
    return this.repository.update(id, { status: 'cancelada', cancel_reason: reason });
  }
}

export = CancelAdmissionProcessUseCase;
