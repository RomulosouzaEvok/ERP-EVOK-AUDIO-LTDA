/**
 * Use case: listar paradas de máquina/centro de trabalho (downtime).
 *
 * @module modules/production/application/use-cases/ListProductionDowntimesUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ValidationError } from '../../../../errors';

interface ListProductionDowntimesInput {
  work_center_id?: string | number;
  from?: string;
  to?: string;
  open?: string | boolean;
  page?: string | number;
  limit?: string | number;
}

class ListProductionDowntimesUseCase extends UseCase<ListProductionDowntimesInput, Promise<any>> {
  private readonly downtimeRepository: any;

  /** @param downtimeRepository - Repositório de paradas. */
  public constructor(downtimeRepository: any) {
    super();
    this.downtimeRepository = downtimeRepository;
  }

  /**
   * Lista paradas com filtros de centro de trabalho, período e abertura.
   *
   * @param input - `{ work_center_id?, from?, to?, open?, page?, limit? }`.
   * @returns Linhas e paginação.
   * @throws {ValidationError} Se `work_center_id` for informado e inválido.
   */
  public async execute(input: ListProductionDowntimesInput = {}): Promise<any> {
    let workCenterId: number | undefined;
    if (input.work_center_id !== undefined && input.work_center_id !== null && input.work_center_id !== '') {
      const parsed = Number(input.work_center_id);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new ValidationError('work_center_id invalido: informe um inteiro positivo.');
      }
      workCenterId = parsed;
    }

    const page = Math.max(parseInt(String(input.page ?? 1), 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(input.limit ?? 50), 10) || 50, 1), 200);
    const open = input.open === true || input.open === 'true';

    const { rows, count } = await this.downtimeRepository.list({
      work_center_id: workCenterId,
      from: input.from,
      to: input.to,
      open,
      limit,
      offset: (page - 1) * limit,
    });

    return {
      rows,
      count,
      page,
      limit,
      totalPages: Math.max(Math.ceil(count / limit), 1),
    };
  }
}

export = ListProductionDowntimesUseCase;
