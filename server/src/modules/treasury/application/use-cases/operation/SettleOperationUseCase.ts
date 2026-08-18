import type { Transaction } from 'sequelize';

/**
 * Caso de uso: liquidação de uma operação financeira (`active -> settled`),
 * cobrindo o fluxo do endpoint
 * `PATCH /api/treasury/financial-operations/:id/settle`. Preenche
 * `settled_at` com a data informada (ou hoje, se omitida).
 *
 * @module modules/treasury/application/use-cases/operation/SettleOperationUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import TreasuryRepository from '../../../domain/repositories/TreasuryRepository';

type SettleOperationInput = { id: number; settled_at?: string; userId: number; transaction: Transaction };

class SettleOperationUseCase extends UseCase<SettleOperationInput, any> {
  private readonly treasuryRepository: TreasuryRepository;

  constructor(treasuryRepository: TreasuryRepository) {
    super();
    this.treasuryRepository = treasuryRepository;
  }

  /**
   * @throws {NotFoundError} Se a operação não existir.
   * @throws {BusinessRuleError} Se a operação não estiver `active`.
   */
  async execute({ id, settled_at, userId, transaction }: SettleOperationInput) {
    const operation = await this.treasuryRepository.findOperationByIdForUpdate(id, transaction);
    if (!operation) {
      throw new NotFoundError(`Operação financeira ${id} não encontrada.`);
    }
    if (operation.status !== 'active') {
      throw new BusinessRuleError(`Operação "${operation.contract_number}" está "${operation.status}" — apenas operações ativas podem ser liquidadas.`);
    }

    return this.treasuryRepository.updateOperation(
      id,
      { status: 'settled', settled_at: settled_at ?? new Date().toISOString().slice(0, 10), settled_by: userId },
      transaction,
    );
  }
}

export = SettleOperationUseCase;
