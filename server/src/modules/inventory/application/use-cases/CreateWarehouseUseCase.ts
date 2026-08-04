/**
 * Use case: criar um novo depósito.
 *
 * @module modules/inventory/application/use-cases/CreateWarehouseUseCase
 *
 * Cobre `POST /api/inventory/warehouses` (docs/governance/TODO.md, Bloco
 * 4.2/4.3). `code` é a chave usada pelo dual-write de todo o sistema
 * (`WarehouseStockService.getWarehouseByCode`) — deve ser único e é
 * normalizado para uppercase antes de persistir.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Warehouse } = require('../../../../models/index');

import UseCase from '../../../../shared/application/UseCase';
import { ValidationError, ConflictError } from '../../../../errors';

interface CreateWarehouseInput {
  code: string;
  name: string;
  description?: string | null;
  active?: boolean;
}

class CreateWarehouseUseCase extends UseCase<CreateWarehouseInput, any> {
  /**
   * @param input - Dados do novo depósito.
   * @returns Depósito criado.
   * @throws {ValidationError} Se `code` ou `name` estiverem ausentes/vazios.
   * @throws {ConflictError} Se já existir um depósito com o mesmo `code` (case-insensitive).
   */
  public async execute(input: CreateWarehouseInput): Promise<any> {
    const code = String(input.code || '').trim().toUpperCase();
    const name = String(input.name || '').trim();

    if (!code) {
      throw new ValidationError('code é obrigatório para criar um depósito.');
    }
    if (!name) {
      throw new ValidationError('name é obrigatório para criar um depósito.');
    }

    const existing = await Warehouse.findOne({ where: { code } });
    if (existing) {
      throw new ConflictError(`Já existe um depósito com o código "${code}".`);
    }

    const warehouse = await Warehouse.create({
      code,
      name,
      description: input.description ?? null,
      active: input.active ?? true,
    });

    return warehouse;
  }
}

export = CreateWarehouseUseCase;
