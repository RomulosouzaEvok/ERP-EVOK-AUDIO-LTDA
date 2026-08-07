/**
 * Caso de uso: listagem de ativos de propriedade intelectual com vencimento
 * próximo (ou já vencidos, ainda não `expired`/`abandoned`), cobrindo o
 * fluxo do endpoint `GET /api/legal/intellectual-property/expiring`. É o
 * caso de uso central do spec de PI
 * (`docs/juridico/02-PROPRIEDADE_INTELECTUAL.md`): gestão de prazos de
 * registro/renovação.
 *
 * @module modules/legal/application/use-cases/intellectualProperty/ListExpiringIntellectualPropertyUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import IntellectualPropertyRepository from '../../../domain/repositories/IntellectualPropertyRepository';

type ListExpiringIntellectualPropertyInput = { days?: number };

class ListExpiringIntellectualPropertyUseCase extends UseCase<ListExpiringIntellectualPropertyInput, any> {
  private readonly ipRepository: IntellectualPropertyRepository;

  constructor(ipRepository: IntellectualPropertyRepository) {
    super();
    this.ipRepository = ipRepository;
  }

  async execute({ days = 30 }: ListExpiringIntellectualPropertyInput = {}) {
    return this.ipRepository.listExpiringIntellectualProperty(days);
  }
}

export = ListExpiringIntellectualPropertyUseCase;
