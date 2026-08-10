/**
 * `PATCH /api/rh/admission-processes/:id/esocial-confirmation` — RF-RH-010.
 * @module modules/rh/application/use-cases/admission/ConfirmAdmissionEsocialUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import AdmissionProcessRepository from '../../../domain/repositories/AdmissionProcessRepository';

class ConfirmAdmissionEsocialUseCase extends UseCase<{ id: number | string; confirmedBy: number }, any> {
  private readonly repository: AdmissionProcessRepository;

  public constructor(repository: AdmissionProcessRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} Processo não existe (404).
   * @throws {BusinessRuleError} Processo ainda não `concluida` (422).
   */
  public async execute({ id, confirmedBy }: { id: number | string; confirmedBy: number }): Promise<any> {
    const process = await this.repository.findById(id);
    if (!process) throw new NotFoundError('Processo de admissão não encontrado.');
    if (process.status !== 'concluida') {
      throw new BusinessRuleError('Confirmação do S-2200 só é aceita com o processo já concluído.', { rule: 'RF-RH-010' });
    }
    return this.repository.update(id, { esocial_s2200_confirmed_at: new Date(), esocial_s2200_confirmed_by: confirmedBy });
  }
}

export = ConfirmAdmissionEsocialUseCase;
