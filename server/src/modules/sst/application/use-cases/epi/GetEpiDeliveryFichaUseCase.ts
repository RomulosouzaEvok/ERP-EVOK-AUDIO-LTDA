/**
 * Use case: Ficha de EPI consolidada de um funcionário (RF-SST-007),
 * inclusive de desligados (nenhum filtro por `employees.status`).
 *
 * @module modules/sst/application/use-cases/epi/GetEpiDeliveryFichaUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import EpiRepository from '../../../domain/repositories/EpiRepository';
import { toEntregaDTO } from '../../../infrastructure/mappers/EpiMapper';

class GetEpiDeliveryFichaUseCase extends UseCase<{ employeeId: number | string }, any> {
  private readonly epiRepository: EpiRepository;

  public constructor(epiRepository: EpiRepository) {
    super();
    this.epiRepository = epiRepository;
  }

  /**
   * @param input - `{ employeeId }`.
   * @returns Ficha consolidada com todas as entregas (+ devolução, quando houver).
   */
  public async execute({ employeeId }: { employeeId: number | string }): Promise<any> {
    const entregas = await this.epiRepository.findFichaByEmployeeId(Number(employeeId));
    return {
      employee_id: Number(employeeId),
      entregas: entregas.map(toEntregaDTO),
      gerado_em: new Date().toISOString()
    };
  }
}

export = GetEpiDeliveryFichaUseCase;
