/**
 * Use case: listar saldos por par produto×depósito com filtros e paginação.
 *
 * @module modules/inventory/application/use-cases/ListWarehouseStockUseCase
 *
 * Cobre `GET /api/inventory/warehouse-stock?product_id=&warehouse_code=&page=&limit=`.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ProductWarehouseStock, Product, Warehouse } = require('../../../../models/index');

import UseCase from '../../../../shared/application/UseCase';
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

    const { count, rows } = await ProductWarehouseStock.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
        { model: Warehouse, as: 'warehouse', attributes: ['id', 'code', 'name'], where: warehouseWhere },
      ],
      limit,
      offset,
      order: [['product_id', 'ASC']],
    });

    return { rows, total: count, page, limit, totalPages: Math.ceil(count / limit) || 0 };
  }
}

export = ListWarehouseStockUseCase;
