/**
 * Caso de uso: atualização de um registro de abastecimento, cobrindo o
 * fluxo do endpoint `PUT /api/facilities/fuel-records/:id`.
 *
 * @module modules/facilities/application/use-cases/fuelRecord/UpdateFuelRecordUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import FuelRecordRepository from '../../../domain/repositories/FuelRecordRepository';

type UpdateFuelRecordInput = { id: number } & Record<string, any>;

class UpdateFuelRecordUseCase extends UseCase<UpdateFuelRecordInput, any> {
  private readonly fuelRecordRepository: FuelRecordRepository;

  constructor(fuelRecordRepository: FuelRecordRepository) {
    super();
    this.fuelRecordRepository = fuelRecordRepository;
  }

  /**
   * @throws {NotFoundError} Se o registro não existir.
   */
  async execute({ id, ...rest }: UpdateFuelRecordInput) {
    const current = await this.fuelRecordRepository.findFuelRecordById(id);
    if (!current) {
      throw new NotFoundError('Registro de abastecimento não encontrado.');
    }

    return this.fuelRecordRepository.updateFuelRecord(id, rest);
  }
}

export = UpdateFuelRecordUseCase;
