/**
 * Use case: listar lotes (`LotControl`) com filtros e paginação.
 *
 * @module modules/inventory/application/use-cases/ListLotsUseCase
 *
 * Endpoint aditivo `GET /api/inventory/lots` usado pela inspeção de
 * recebimento (quarentena) e pela seleção manual de lotes na conclusão de OP.
 * Mantém compatibilidade com o uso legado (`?product_id=X`, sem `status`, que
 * assumia implicitamente `status='available'` e não paginava).
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Op } = require('sequelize');

import UseCase from '../../../../shared/application/UseCase';
import InventoryRepository = require('../../domain/repositories/InventoryRepository');
import { ValidationError } from '../../../../errors';
import { calculateHandoffSignal } from '../../../../shared/domain/handoffSignal';

interface ListLotsInput {
  product_id?: string | number;
  status?: string;
  page?: string | number;
  limit?: string | number;
}

interface ListLotsOutput {
  rows: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const VALID_STATUSES = ['available', 'reserved', 'consumed', 'blocked', 'expired', 'quarantine'];

class ListLotsUseCase extends UseCase<ListLotsInput, ListLotsOutput> {
  private readonly inventoryRepository: InventoryRepository;

  /** @param inventoryRepository - Repositório de estoque. */
  constructor(inventoryRepository: InventoryRepository) {
    super();
    this.inventoryRepository = inventoryRepository;
  }

  /**
   * @param input - Filtros (`status`, `product_id`) e paginação.
   * @returns Lotes encontrados, com `product` e `supplier` incluídos, e dados de paginação.
   * @throws {ValidationError} Se `status` informado não for um valor válido do enum.
   */
  public async execute(input: ListLotsInput): Promise<ListLotsOutput> {
    const { product_id, status } = input;
    const page = parseInt(String(input.page ?? '1'), 10) || 1;
    const limit = parseInt(String(input.limit ?? '20'), 10) || 20;
    const offset = (page - 1) * limit;

    if (status && !VALID_STATUSES.includes(status)) {
      throw new ValidationError(`status inválido. Valores aceitos: ${VALID_STATUSES.join(', ')}.`);
    }

    const where: Record<string, unknown> = {};
    if (product_id !== undefined) {
      const parsedProductId = Number(product_id);
      if (Number.isNaN(parsedProductId)) {
        throw new ValidationError('product_id deve ser numérico.');
      }
      where.product_id = parsedProductId;
    }
    if (status) {
      where.status = status;
    } else if (product_id !== undefined) {
      // Compatibilidade retroativa: quando somente `product_id` é informado
      // (uso legado, ex.: seleção de lotes na conclusão de OP), mantém o
      // comportamento anterior de restringir a lotes com saldo disponível.
      where.status = 'available';
      where.quantity_available = { [Op.gt]: 0 };
    }

    const { count, rows } = await this.inventoryRepository.listLots(where, { limit, offset });

    // Bloco 3 (UC-40, BUSINESS_RULES.md §10): `handoff_signal` aditivo —
    // fila de Qualidade (Recebimento → Qualidade → Almoxarifado), calculado
    // on-the-fly via `calculateHandoffSignal('lot', ...)`.
    const rowsWithSignal = rows.map((row: any) => {
      const json = row.toJSON ? row.toJSON() : row;
      return {
        ...json,
        handoff_signal: calculateHandoffSignal('lot', { status: json.status }),
      };
    });

    return { rows: rowsWithSignal, total: count, page, limit, totalPages: Math.ceil(count / limit) || 0 };
  }
}

export = ListLotsUseCase;
