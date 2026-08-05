/**
 * Use case: liberar um lote (`LotControl`) para consumo.
 *
 * @module modules/inventory/application/use-cases/ReleaseLotUseCase
 *
 * Cobre `POST /api/inventory/lots/:id/release`. Aceita as transições:
 * - `quarantine` -> `available`: liberação pós-inspeção de recebimento;
 * - `blocked` -> `available`: liberação manual pós-tratativa de RNC (o
 *   fechamento da RNC como `effective` NÃO desbloqueia automaticamente o
 *   lote — a decisão de liberar é sempre manual, via este endpoint).
 */

import UseCase from '../../../../shared/application/UseCase';
import InventoryRepository = require('../../domain/repositories/InventoryRepository');
import { NotFoundError, BusinessRuleError } from '../../../../errors';

const RELEASABLE_STATUSES = ['quarantine', 'blocked'];

interface ReleaseLotInput {
  id: number | string;
  notes?: string;
}

class ReleaseLotUseCase extends UseCase<ReleaseLotInput, any> {
  private readonly inventoryRepository: InventoryRepository;

  /** @param inventoryRepository - Repositório de estoque. */
  constructor(inventoryRepository: InventoryRepository) {
    super();
    this.inventoryRepository = inventoryRepository;
  }

  /**
   * @param input - Id do lote e observação opcional da liberação.
   * @returns Lote atualizado (`status = 'available'`).
   * @throws {NotFoundError} Se o lote não existir.
   * @throws {BusinessRuleError} Se o lote não estiver em `quarantine` nem `blocked`.
   *   `details: { lot_id, current_status, allowed_statuses }`.
   */
  public async execute({ id, notes }: ReleaseLotInput): Promise<any> {
    const lot = await this.inventoryRepository.findLotById(id);
    if (!lot) {
      throw new NotFoundError('Lote não encontrado.');
    }
    if (!RELEASABLE_STATUSES.includes(lot.status)) {
      throw new BusinessRuleError(
        `Apenas lotes em 'quarantine' ou 'blocked' podem ser liberados. Status atual: '${lot.status}'.`,
        {
          lot_id: lot.id,
          current_status: lot.status,
          allowed_statuses: RELEASABLE_STATUSES
        }
      );
    }

    const releaseNote = notes ? String(notes).trim() : '';
    await lot.update({
      status: 'available',
      notes: releaseNote
        ? `${lot.notes ? `${lot.notes} | ` : ''}Liberado: ${releaseNote}`
        : lot.notes
    });

    return lot;
  }
}

export = ReleaseLotUseCase;
