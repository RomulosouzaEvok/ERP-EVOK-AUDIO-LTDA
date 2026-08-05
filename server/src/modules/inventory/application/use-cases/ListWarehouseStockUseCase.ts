/**
 * Use case: listar saldos por par produto×depósito com filtros e paginação.
 *
 * @module modules/inventory/application/use-cases/ListWarehouseStockUseCase
 *
 * Cobre `GET /api/inventory/warehouse-stock?product_id=&warehouse_code=&page=&limit=`.
 */

import UseCase from '../../../../shared/application/UseCase';
import InventoryRepository = require('../../domain/repositories/InventoryRepository');
import { ValidationError } from '../../../../errors';

interface ListWarehouseStockInput {
  product_id?: string | number;
  warehouse_code?: string;
  page?: string | number;
  limit?: string | number;
}

interface ListWarehouseStockOutput {
  rows: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class ListWarehouseStockUseCase extends UseCase<ListWarehouseStockInput, ListWarehouseStockOutput> {
  private readonly inventoryRepository: InventoryRepository;

  /** @param inventoryRepository - Repositório de estoque. */
  constructor(inventoryRepository: InventoryRepository) {
    super();
    this.inventoryRepository = inventoryRepository;
  }

  /**
   * @param input - Filtros (`product_id`, `warehouse_code`) e paginação.
   * @returns Linhas produto×depósito, com `product` e `warehouse` incluídos, e dados de paginação.
   * @throws {ValidationError} Se `product_id` informado não for numérico.
   */
  public async execute(input: ListWarehouseStockInput): Promise<ListWarehouseStockOutput> {
    const page = parseInt(String(input.page ?? '1'), 10) || 1;
    const limit = parseInt(String(input.limit ?? '20'), 10) || 20;
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (input.product_id !== undefined) {
      const parsedProductId = Number(input.product_id);
      if (Number.isNaN(parsedProductId)) {
        throw new ValidationError('product_id deve ser numérico.');
      }
      where.product_id = parsedProductId;
    }

    const warehouseWhere: Record<string, unknown> = {};
    if (input.warehouse_code) {
      warehouseWhere.code = String(input.warehouse_code).trim().toUpperCase();
    }

    const { count, rows } = await this.inventoryRepository.listWarehouseStock(where, warehouseWhere, { limit, offset });

    return { rows, total: count, page, limit, totalPages: Math.ceil(count / limit) || 0 };
  }
}

export = ListWarehouseStockUseCase;
