/**
 * Caso de uso: listagem paginada de ativos de propriedade intelectual,
 * cobrindo o fluxo do endpoint `GET /api/legal/intellectual-property`.
 *
 * @module modules/legal/application/use-cases/intellectualProperty/ListIntellectualPropertyUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import IntellectualPropertyRepository from '../../../domain/repositories/IntellectualPropertyRepository';

type ListIntellectualPropertyInput = { ip_type?: string; status?: string; page?: number; limit?: number; offset?: number };

class ListIntellectualPropertyUseCase extends UseCase<ListIntellectualPropertyInput, any> {
  private readonly ipRepository: IntellectualPropertyRepository;

  constructor(ipRepository: IntellectualPropertyRepository) {
    super();
    this.ipRepository = ipRepository;
  }

  async execute({ ip_type, status, page = 1, limit = 20, offset = 0 }: ListIntellectualPropertyInput = {}) {
    const { rows, count } = await this.ipRepository.listIntellectualProperty({ ip_type, status }, { limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListIntellectualPropertyUseCase;
