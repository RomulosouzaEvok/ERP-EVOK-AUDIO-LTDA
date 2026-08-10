/**
 * `POST /api/rh/admission-processes/:id/checklist` — marca item de
 * documento como recebido (RF-RH-007).
 * @module modules/rh/application/use-cases/admission/UpdateAdmissionChecklistUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../../errors';
import AdmissionProcessRepository from '../../../domain/repositories/AdmissionProcessRepository';

const CHECKLIST_MAP: Record<string, string> = {
  rg: 'checklist_rg',
  cpf: 'checklist_cpf',
  ctps_digital: 'checklist_ctps',
  pis: 'checklist_pis',
  comprovante_residencia: 'checklist_proof_of_address',
  foto: 'checklist_photo',
};

class UpdateAdmissionChecklistUseCase extends UseCase<{ id: number | string; document: string; received: boolean }, any> {
  private readonly repository: AdmissionProcessRepository;

  public constructor(repository: AdmissionProcessRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ id, document, received }: { id: number | string; document: string; received: boolean }): Promise<any> {
    const column = CHECKLIST_MAP[document];
    if (!column) throw new ValidationError(`document deve ser um de: ${Object.keys(CHECKLIST_MAP).join(', ')}.`);

    const process = await this.repository.findById(id);
    if (!process) throw new NotFoundError('Processo de admissão não encontrado.');
    if (['concluida', 'cancelada'].includes(process.status)) {
      throw new BusinessRuleError('Processo de admissão já está concluído/cancelado.');
    }

    return this.repository.update(id, { [column]: Boolean(received) });
  }
}

export = UpdateAdmissionChecklistUseCase;
