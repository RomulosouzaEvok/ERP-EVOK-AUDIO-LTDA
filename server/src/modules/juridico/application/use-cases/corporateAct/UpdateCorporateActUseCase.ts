/**
 * `PUT /api/jur/corporate-acts/:id` — edita ato societário (RF-JUR-030).
 * Só permite editar enquanto `status='draft'` — mesmo espírito de
 * imutabilidade pós-registro já usado em outras entidades do módulo (ex.
 * `jur_legal_cases.status='closed'`, `jur_proxies.status='revoked'`).
 *
 * Transição `draft → registered`: acontece nesta mesma chamada quando
 * `registration_protocol` e `registered_at` são informados JUNTOS (o
 * registro na Junta Comercial pode ficar pendente por um tempo após
 * `act_date`, então informar apenas um dos dois não fecha o registro).
 *
 * @module modules/juridico/application/use-cases/corporateAct/UpdateCorporateActUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import CorporateActRepository from '../../../domain/repositories/CorporateActRepository';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import type { UpdateCorporateActInput } from '../../../domain/entities/CorporateActTypes';

class UpdateCorporateActUseCase extends UseCase<UpdateCorporateActInput, any> {
  private readonly repository: CorporateActRepository;

  public constructor(repository: CorporateActRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} Ato societário não encontrado (404).
   * @throws {BusinessRuleError} Ato já `registered` — imutável (422).
   */
  public async execute(input: UpdateCorporateActInput): Promise<any> {
    const { id, ...rest } = input;
    const act = await this.repository.findById(id);
    if (!act) throw new NotFoundError(`Ato societário ${id} não encontrado.`);

    if (act.status === 'registered') {
      throw new BusinessRuleError(
        'Ato societário já registrado — não pode mais ser editado.',
        { rule: 'RF-JUR-030' },
      );
    }

    const registrationProtocol = rest.registration_protocol ?? act.registration_protocol;
    const registeredAt = rest.registered_at ?? act.registered_at;
    const willRegister = !!registrationProtocol && !!registeredAt;

    return this.repository.update(id, {
      ...rest,
      status: willRegister ? 'registered' : act.status,
    });
  }
}

export = UpdateCorporateActUseCase;
