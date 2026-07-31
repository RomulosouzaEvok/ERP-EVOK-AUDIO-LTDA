/**
 * Use case: listar movimentações de estoque (visão do coletor mobile), com paginacao.
 *
 * @module modules/mobileInventory/application/use-cases/ListMobileInventoryMovementsUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import MobileInventoryRepository from '../../domain/repositories/MobileInventoryRepository';

interface ListMobileInventoryMovementsInput {
  page?: string | number;
  limit?: string | number;
}

interface ListMobileInventoryMovementsOutput {
  rows: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class ListMobileInventoryMovementsUseCase extends UseCase<
  ListMobileInventoryMovementsInput,
  ListMobileInventoryMovementsOutput
> {
  private readonly mobileInventoryRepository: MobileInventoryRepository;

  /** @param mobileInventoryRepository - Repositorio de inventário mobile. */
  public constructor(mobileInventoryRepository: MobileInventoryRepository) {
    super();
    this.mobileInventoryRepository = mobileInventoryRepository;
  }

  /**
   * @param input - Paginacao da listagem.
   * @returns Linhas encontradas, total e dados de paginacao.
   */
  public async execute(input: ListMobileInventoryMovementsInput): Promise<ListMobileInventoryMovementsOutput> {
    const { page = '1', limit = '10' } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const o = (p - 1) * l;

    const { count, rows } = await this.mobileInventoryRepository.listMovements({ limit: l, offset: o });

    return { rows, total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListMobileInventoryMovementsUseCase;
