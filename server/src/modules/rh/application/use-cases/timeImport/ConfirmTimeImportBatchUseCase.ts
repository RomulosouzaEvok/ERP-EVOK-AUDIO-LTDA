/**
 * `POST /api/rh/time-imports/:id/confirm` — confirma um lote de importação
 * de ponto (`hr_time_import_batches.status: 'validated' → 'confirmed'`).
 *
 * Só confirma lote em `status='validated'` — o RH precisa ter visto o
 * relatório de não-casados (retornado por `CreateTimeImportBatchUseCase` e
 * por `GetTimeImportBatchUseCase`) antes deste passo. Recusa (422)
 * confirmar lote `rejected` (erro estrutural) ou já `confirmed`.
 *
 * @module modules/rh/application/use-cases/timeImport/ConfirmTimeImportBatchUseCase
 */
import type { Transaction } from 'sequelize';
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import TimeImportRepository from '../../../domain/repositories/TimeImportRepository';

interface ConfirmTimeImportBatchInput {
  id: number | string;
  confirmedBy: number;
  transaction: Transaction;
}

class ConfirmTimeImportBatchUseCase extends UseCase<ConfirmTimeImportBatchInput, any> {
  private readonly repository: TimeImportRepository;

  public constructor(repository: TimeImportRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} lote inexistente (404).
   * @throws {BusinessRuleError} lote `rejected` (erro estrutural) ou já `confirmed` (422).
   */
  public async execute(input: ConfirmTimeImportBatchInput): Promise<any> {
    const batch = await this.repository.findBatchByIdForUpdate(input.id, input.transaction);
    if (!batch) throw new NotFoundError('Lote de importação de ponto não encontrado.');

    if (batch.status === 'confirmed') {
      throw new BusinessRuleError('Este lote já foi confirmado.');
    }
    if (batch.status === 'rejected') {
      throw new BusinessRuleError(
        'Lote com erro estrutural (nenhum registro de jornada reconhecido) não pode ser confirmado. '
        + `Motivo registrado: ${batch.rejection_reason ?? 'não informado'}.`,
      );
    }
    if (batch.status !== 'validated') {
      throw new BusinessRuleError(`Lote em status "${batch.status}" não pode ser confirmado.`);
    }

    return this.repository.updateBatch(batch.id, {
      status: 'confirmed',
      confirmed_by: input.confirmedBy,
      confirmed_at: new Date(),
    }, input.transaction);
  }
}

export = ConfirmTimeImportBatchUseCase;
