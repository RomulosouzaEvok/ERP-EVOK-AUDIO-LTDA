/**
 * `POST /api/ti/licenses/:assetId/seats` — aloca assento a `employee_id`
 * (RF-TI-025/026/BR-TI-015).
 *
 * @module modules/ti/application/use-cases/license/AllocateSeatUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LicenseRepository from '../../../domain/repositories/LicenseRepository';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../../errors';
import type { AllocateSeatInput } from '../../../domain/entities/LicenseTypes';
import { toSeatDTO } from '../../../infrastructure/mappers/LicenseMapper';

class AllocateSeatUseCase extends UseCase<AllocateSeatInput, any> {
  private readonly repository: LicenseRepository;

  public constructor(repository: LicenseRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {ValidationError} `employee_id` ausente.
   * @throws {NotFoundError} Licença não encontrada.
   * @throws {BusinessRuleError} Assentos ativos já atingiram `seats` contratado (RF-TI-026). HTTP 422.
   */
  public async execute({ assetId, employee_id }: AllocateSeatInput): Promise<any> {
    if (!employee_id) throw new ValidationError('employee_id é obrigatório.');

    const detail = await this.repository.findByAssetId(assetId);
    if (!detail) throw new NotFoundError(`Licença do ativo ${assetId} não encontrada.`);

    const seatsAllocated = await this.repository.countActiveSeats(detail.id);
    if (seatsAllocated >= detail.seats) {
      throw new BusinessRuleError(
        `Todos os ${detail.seats} assentos contratados desta licença já estão alocados.`,
        { seats_allocated: seatsAllocated, seats: detail.seats },
      );
    }

    const seat = await this.repository.createSeat({ license_detail_id: detail.id, employee_id, assigned_at: new Date() });
    return toSeatDTO(seat);
  }
}

export = AllocateSeatUseCase;
