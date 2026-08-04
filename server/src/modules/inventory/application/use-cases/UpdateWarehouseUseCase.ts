/**
 * Use case: editar um depósito existente.
 *
 * @module modules/inventory/application/use-cases/UpdateWarehouseUseCase
 *
 * Cobre `PUT /api/inventory/warehouses/:id` (docs/governance/TODO.md, Bloco
 * 4.2/4.3). Permite alterar apenas `name`, `description` e `active` — o
 * `code` NUNCA é editável por este use case, pois é a chave usada pelo
 * roteamento automático do dual-write (`WarehouseStockService.getWarehouseByCode`)
 * em todo o sistema (recebimento, produção, vendas, laboratório, transferências).
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Warehouse } = require('../../../../models/index');

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';

interface UpdateWarehouseInput {
  id: number | string;
  name?: string;
  description?: string | null;
  active?: boolean;
}

class UpdateWarehouseUseCase extends UseCase<UpdateWarehouseInput, any> {
  /**
   * @param input - Id do depósito e campos a atualizar (`name`, `description`, `active`).
   * @returns Objeto com `before` (valores antes da edição) e `warehouse` (registro atualizado).
   * @throws {NotFoundError} Se o depósito não existir.
   */
  public async execute(input: UpdateWarehouseInput): Promise<{ before: any; warehouse: any }> {
    const warehouse = await Warehouse.findByPk(input.id);
    if (!warehouse) {
      throw new NotFoundError(`Depósito ID ${input.id} não encontrado.`);
    }

    const before = {
      name: warehouse.name,
      description: warehouse.description,
      active: warehouse.active,
    };

    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = String(input.name).trim();
    if (input.description !== undefined) updates.description = input.description;
    if (input.active !== undefined) updates.active = input.active;

    await warehouse.update(updates);

    return { before, warehouse };
  }
}

export = UpdateWarehouseUseCase;
