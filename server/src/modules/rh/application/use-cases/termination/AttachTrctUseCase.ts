/**
 * `POST /api/rh/termination-processes/:id/trct` — RF-RH-021, anexa TRCT
 * (arquivo) e/ou marca `trct_paid_at` (`{ paid: true }` opcional, RF-RH-018).
 *
 * @module modules/rh/application/use-cases/termination/AttachTrctUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import TerminationProcessRepository from '../../../domain/repositories/TerminationProcessRepository';

class AttachTrctUseCase extends UseCase<{ id: number | string; filePath?: string; paid?: boolean }, any> {
  private readonly repository: TerminationProcessRepository;

  public constructor(repository: TerminationProcessRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ id, filePath, paid }: { id: number | string; filePath?: string; paid?: boolean }): Promise<any> {
    const process = await this.repository.findById(id);
    if (!process) throw new NotFoundError('Processo de demissão não encontrado.');
    if (['concluido', 'cancelado'].includes(process.status)) {
      throw new BusinessRuleError('Processo de demissão já está concluído/cancelado.');
    }

    const updateData: Record<string, unknown> = {};
    if (filePath) updateData.trct_file_path = filePath;
    if (paid) updateData.trct_paid_at = new Date();
    if (!filePath && paid === undefined) updateData.status = 'aguardando_trct';

    return this.repository.update(id, updateData);
  }
}

export = AttachTrctUseCase;
