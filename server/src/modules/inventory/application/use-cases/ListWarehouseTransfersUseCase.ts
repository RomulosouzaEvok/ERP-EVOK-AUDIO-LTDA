/**
 * Use case: listar transferências entre depósitos com filtro de status.
 *
 * @module modules/inventory/application/use-cases/ListWarehouseTransfersUseCase
 *
 * Cobre `GET /api/inventory/transfers?status=`.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { WarehouseTransfer, Product, Warehouse, User } = require('../../../../models/index');

import UseCase from '../../../../shared/application/UseCase';
import { ValidationError } from '../../../../errors';

interface ListWarehouseTransfersInput {
  status?: string;
}

const VALID_STATUSES = ['pending', 'approved', 'rejected'];

class ListWarehouseTransfersUseCase extends UseCase<ListWarehouseTransfersInput, any[]> {
  /**
   * @param input - Filtro opcional de `status`.
   * @returns Lista de transferências com `product`, `fromWarehouse`, `toWarehouse`, `requestedBy` e `approvedBy` incluídos.
   * @throws {ValidationError} Se `status` informado não for um valor válido do enum.
   */
  public async execute(input: ListWarehouseTransfersInput): Promise<any[]> {
    const where: Record<string, unknown> = {};
    if (input.status) {
      if (!VALID_STATUSES.includes(input.status)) {
        throw new ValidationError(`status inválido. Valores aceitos: ${VALID_STATUSES.join(', ')}.`);
      }
      where.status = input.status;
    }

    return WarehouseTransfer.findAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
        { model: Warehouse, as: 'fromWarehouse', attributes: ['id', 'code', 'name'] },
        { model: Warehouse, as: 'toWarehouse', attributes: ['id', 'code', 'name'] },
        { model: User, as: 'requestedBy', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'approvedBy', attributes: ['id', 'name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });
  }
}

export = ListWarehouseTransfersUseCase;
