import type { Transaction } from 'sequelize';

/**
 * Caso de uso: cancelamento de uma operação financeira (`active ->
 * canceled`), cobrindo o fluxo do endpoint
 * `PATCH /api/treasury/financial-operations/:id/cancel`. Diferente de
 * `settle` (encerramento natural do contrato), `cancel` registra que a
 * operação foi encerrada ANTES do previsto/sem cumprir o ciclo normal
 * (ex.: contrato cancelado por erro de cadastro ou distrato) — ambos são
 * estados finais, nunca reabertos.
 *
 * @module modules/treasury/application/use-cases/operation/CancelOperationUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import TreasuryRepository from '../../../domain/repositories/TreasuryRepository';

type CancelOperationInput = { id: number; transaction: Transaction };

class CancelOperationUseCase extends UseCase<CancelOperationInput, any> {
  private readonly treasuryRepository: TreasuryRepository;

  constructor(treasuryRepository: TreasuryRepository) {
    super();
    this.treasuryRepository = treasuryRepository;
  }

  /**
   * @throws {NotFoundError} Se a operação não existir.
   * @throws {BusinessRuleError} Se a operação não estiver `active`.
   */
  async execute({ id, transaction }: CancelOperationInput) {
    const operation = await this.treasuryRepository.findOperationByIdForUpdate(id, transaction);
    if (!operation) {
      throw new NotFoundError(`Operação financeira ${id} não encontrada.`);
    }
    if (operation.status !== 'active') {
      throw new BusinessRuleError(`Operação "${operation.contract_number}" está "${operation.status}" — apenas operações ativas podem ser canceladas.`);
    }

    return this.treasuryRepository.updateOperation(id, { status: 'canceled' }, transaction);
  }
}

export = CancelOperationUseCase;
