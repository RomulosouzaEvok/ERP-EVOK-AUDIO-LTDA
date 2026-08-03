/**
 * Caso de uso: listagem paginada de resultados de testes de laboratorio.
 *
 * @module modules/laboratory/application/use-cases/ListAcousticTestsUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import LaboratoryRepository from '../../domain/repositories/LaboratoryRepository';

type ListAcousticTestsInput = {
  product_id?: number;
  test_type?: string;
  passed?: boolean;
  serial_number?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
  offset?: number;
};

type ListAcousticTestsOutput = {
  rows: any[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
};

class ListAcousticTestsUseCase extends UseCase<ListAcousticTestsInput, ListAcousticTestsOutput> {
  private readonly laboratoryRepository: LaboratoryRepository;

  constructor(laboratoryRepository: LaboratoryRepository) {
    super();
    this.laboratoryRepository = laboratoryRepository;
  }

  async execute({
    product_id,
    test_type,
    passed,
    serial_number,
    start_date,
    end_date,
    page = 1,
    limit = 20,
    offset = 0,
  }: ListAcousticTestsInput = {}) {
    const { rows, count } = await this.laboratoryRepository.listTests(
      { product_id, test_type, passed, serial_number, start_date, end_date },
      { limit, offset }
    );
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListAcousticTestsUseCase;
