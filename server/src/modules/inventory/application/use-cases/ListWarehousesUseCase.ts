/**
 * Use case: listar depósitos ativos.
 *
 * @module modules/inventory/application/use-cases/ListWarehousesUseCase
 *
 * Cobre `GET /api/inventory/warehouses`.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Warehouse } = require('../../../../models/index');

import UseCase from '../../../../shared/application/UseCase';

class ListWarehousesUseCase extends UseCase<void, any[]> {
  /**
   * @returns Lista de depósitos ativos, ordenados por código.
   */
  public async execute(): Promise<any[]> {
    return Warehouse.findAll({
      where: { active: true },
      order: [['code', 'ASC']],
    });
  }
}

export = ListWarehousesUseCase;
