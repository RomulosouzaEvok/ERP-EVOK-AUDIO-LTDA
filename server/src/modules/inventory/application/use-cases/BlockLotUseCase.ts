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
 *
 * ## `blocked_at` — o bloqueio passou a ter data (2026-08-11)
 *
 * O bloqueio só deixava um texto em `notes`. Sem o instante gravado, o gate
 * de liberação (`decideLotRelease`) não tinha como exigir uma inspeção
 * **posterior** ao bloqueio — e a sequência `aprovada → liberada → bloqueada
 * → liberada de novo` era concedida com a inspeção antiga, tornando o
 * bloqueio decorativo (ISO 9001:2015 §8.7). Gravar `blocked_at` aqui é o que
 * dá dente à recusa do lado da liberação.
 */

import UseCase from '../../../../shared/application/UseCase';
import InventoryRepository = require('../../domain/repositories/InventoryRepository');
import { NotFoundError, BusinessRuleError, ValidationError } from '../../../../errors';

const BLOCKABLE_STATUSES = ['quarantine', 'available'];

interface BlockLotInput {
  id: number | string;
  reason: string;
}

class BlockLotUseCase extends UseCase<BlockLotInput, any> {
  private readonly inventoryRepository: InventoryRepository;

  /** @param inventoryRepository - Repositório de estoque. */
  constructor(inventoryRepository: InventoryRepository) {
    super();
    this.inventoryRepository = inventoryRepository;
  }

  /**
   * @param input - Id do lote e motivo do bloqueio (mínimo 3 caracteres).
   * @returns Lote atualizado (`status = 'blocked'`, `blocked_at` preenchido).
   * @throws {ValidationError} Se `reason` estiver ausente ou muito curto.
   * @throws {NotFoundError} Se o lote não existir.
   * @throws {BusinessRuleError} Se o lote não estiver em `quarantine` nem `available`.
   *   `details: { lot_id, current_status, allowed_statuses }`.
   */
  public async execute({ id, reason }: BlockLotInput): Promise<any> {
    const trimmedReason = String(reason ?? '').trim();
    if (trimmedReason.length < 3) {
      throw new ValidationError('reason é obrigatório e deve ter no mínimo 3 caracteres.');
    }

    const lot = await this.inventoryRepository.findLotById(id);
    if (!lot) {
      throw new NotFoundError('Lote não encontrado.');
    }
    if (!BLOCKABLE_STATUSES.includes(lot.status)) {
      throw new BusinessRuleError(
        `Apenas lotes em 'quarantine' ou 'available' podem ser bloqueados. Status atual: '${lot.status}'.`,
        {
          lot_id: lot.id,
          current_status: lot.status,
          allowed_statuses: BLOCKABLE_STATUSES
        }
      );
    }

    await lot.update({
      status: 'blocked',
      // G7 (2026-08-11): o instante do bloqueio é o que a re-liberação passa
      // a ter de superar com uma inspeção nova.
      blocked_at: new Date(),
      notes: `${lot.notes ? `${lot.notes} | ` : ''}Bloqueado: ${trimmedReason}`
    });

    return lot;
  }
}

export = BlockLotUseCase;
