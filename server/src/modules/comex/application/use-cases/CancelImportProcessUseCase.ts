/**
 * Caso de uso para cancelar um processo de importacao ainda nao recebido.
 *
 * Nao faz parte do fluxo principal literal do UC-19, mas e o
 * fluxo-alternativo minimo necessario para qualquer processo com ciclo de
 * vida multi-etapas deste tipo (mesmo padrao de `Rfq.status = 'cancelled'`).
 *
 * @module modules/comex/application/use-cases/CancelImportProcessUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../errors';
import ComexRepository from '../../domain/repositories/ComexRepository';

interface CancelImportProcessInput {
  id: number;
  reason: string;
  transaction: any;
}

class CancelImportProcessUseCase extends UseCase<CancelImportProcessInput, any> {
  private readonly comexRepository: ComexRepository;

  public constructor(comexRepository: ComexRepository) {
    super();
    this.comexRepository = comexRepository;
  }

  /**
   * @param input - Id do processo, motivo do cancelamento e a transacao ativa.
   * @returns O processo cancelado.
   * @throws {NotFoundError} Se o processo nao existir.
   * @throws {BusinessRuleError} Se o processo ja estiver `received` ou `cancelled` (422).
   */
  public async execute(input: CancelImportProcessInput): Promise<any> {
    const importProcess = await this.comexRepository.findImportProcessByIdForUpdate(input.id, input.transaction);
    if (!importProcess) {
      throw new NotFoundError('Processo de importacao nao encontrado.');
    }

    if (['received', 'cancelled'].includes(importProcess.status)) {
      throw new BusinessRuleError(
        `Nao e possivel cancelar um processo com status "${importProcess.status}".`,
        { current_status: importProcess.status },
      );
    }

    const existingNotes = importProcess.notes ? `${importProcess.notes}\n` : '';
    await this.comexRepository.updateImportProcess(input.id, {
      status: 'cancelled',
      notes: `${existingNotes}Cancelado: ${input.reason}`,
    }, input.transaction);

    return this.comexRepository.findImportProcessById(input.id, input.transaction);
  }
}

export = CancelImportProcessUseCase;
