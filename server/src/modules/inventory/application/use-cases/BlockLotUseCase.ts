/**
 * Use case: bloquear um lote (`LotControl`) para consumo.
 *
 * @module modules/inventory/application/use-cases/BlockLotUseCase
 *
 * Cobre `POST /api/inventory/lots/:id/block`. Aceita as transições
 * `quarantine|available -> blocked`, sempre com `reason` obrigatório
 * (rastreabilidade de qualidade). Usado tanto pela inspeção de recebimento
 * quanto internamente por `CreateNonConformityUseCase` quando uma RNC
 * referencia um lote existente.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { LotControl } = require('../../../../models/index');

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError, ValidationError } from '../../../../errors';

const BLOCKABLE_STATUSES = ['quarantine', 'available'];

interface BlockLotInput {
  id: number | string;
  reason: string;
}

class BlockLotUseCase extends UseCase<BlockLotInput, any> {
  /**
   * @param input - Id do lote e motivo do bloqueio (mínimo 3 caracteres).
   * @returns Lote atualizado (`status = 'blocked'`).
   * @throws {ValidationError} Se `reason` estiver ausente ou muito curto.
   * @throws {NotFoundError} Se o lote não existir.
   * @throws {BusinessRuleError} Se o lote não estiver em `quarantine` nem `available`.
   */
  public async execute({ id, reason }: BlockLotInput): Promise<any> {
    const trimmedReason = String(reason ?? '').trim();
    if (trimmedReason.length < 3) {
      throw new ValidationError('reason é obrigatório e deve ter no mínimo 3 caracteres.');
    }

    const lot = await LotControl.findByPk(id);
    if (!lot) {
      throw new NotFoundError('Lote não encontrado.');
    }
    if (!BLOCKABLE_STATUSES.includes(lot.status)) {
      throw new BusinessRuleError(
        `Apenas lotes em 'quarantine' ou 'available' podem ser bloqueados. Status atual: '${lot.status}'.`
      );
    }

    await lot.update({
      status: 'blocked',
      notes: `${lot.notes ? `${lot.notes} | ` : ''}Bloqueado: ${trimmedReason}`
    });

    return lot;
  }
}

export = BlockLotUseCase;
