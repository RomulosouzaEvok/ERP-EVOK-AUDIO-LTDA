/**
 * Use case: ASOs a vencer em N dias (dashboard, RF-SST-017/020).
 *
 * @module modules/sst/application/use-cases/aso/GetUpcomingAsoUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AsoRepository from '../../../domain/repositories/AsoRepository';
import { toAsoSummaryDTO } from '../../../infrastructure/mappers/AsoMapper';

class GetUpcomingAsoUseCase extends UseCase<{ dias?: string | number }, any[]> {
  private readonly asoRepository: AsoRepository;

  public constructor(asoRepository: AsoRepository) {
    super();
    this.asoRepository = asoRepository;
  }

  /** @param input - `{ dias }` — default 30 dias. */
  public async execute({ dias = 30 }: { dias?: string | number }): Promise<any[]> {
    const { rows } = await this.asoRepository.findAsosAndCount({ vencendo_em_dias: dias }, { limit: 500, offset: 0 });
    return rows.map(toAsoSummaryDTO);
  }
}

export = GetUpcomingAsoUseCase;
