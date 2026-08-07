/**
 * Caso de uso: atualização de um registro de abastecimento, cobrindo o
 * fluxo do endpoint `PUT /api/facilities/fuel-records/:id`. Corrige apenas
 * campos não recalculáveis (`invoice_ref`, `fuel_station`, `notes`) —
 * NUNCA `km_at_refuel`/`liters` após criado (RNF-FAC-01).
 *
 * @module modules/facilities/application/use-cases/fuelRecord/UpdateFuelRecordUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError } from '../../../../../errors';
import FuelRecordRepository from '../../../domain/repositories/FuelRecordRepository';

type UpdateFuelRecordInput = { id: number } & Record<string, any>;

const IMMUTABLE_FIELDS = ['km_at_refuel', 'liters', 'asset_id'];
const ALLOWED_FIELDS = ['invoice_ref', 'fuel_station', 'unit_price', 'total_cost', 'full_tank'];

class UpdateFuelRecordUseCase extends UseCase<UpdateFuelRecordInput, any> {
  private readonly fuelRecordRepository: FuelRecordRepository;

  constructor(fuelRecordRepository: FuelRecordRepository) {
    super();
    this.fuelRecordRepository = fuelRecordRepository;
  }

  /**
   * @throws {NotFoundError} Se o registro não existir.
   * @throws {ValidationError} Se o payload tentar alterar `km_at_refuel`/`liters`/`asset_id`.
   */
  async execute({ id, ...rest }: UpdateFuelRecordInput) {
    const current = await this.fuelRecordRepository.findFuelRecordById(id);
    if (!current) {
      throw new NotFoundError('Registro de abastecimento não encontrado.');
    }

    for (const field of IMMUTABLE_FIELDS) {
      if (rest[field] !== undefined) {
        throw new ValidationError(`${field} não pode ser alterado após criado (RNF-FAC-01).`);
      }
    }

    const updateData: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (rest[field] !== undefined) updateData[field === 'unit_price' ? 'price_per_liter' : field] = rest[field];
    }

    return this.fuelRecordRepository.updateFuelRecord(id, updateData);
  }
}

export = UpdateFuelRecordUseCase;
