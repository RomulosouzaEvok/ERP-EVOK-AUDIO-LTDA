/**
 * `PUT /api/jur/contracts/:id` — atualiza campos ainda não travados por
 * assinatura (UC-52, §2 da API). Bloqueado a partir de `signed`, exceto
 * `responsible_user_id`/`alert_advance_days`.
 *
 * @module modules/juridico/application/use-cases/contract/UpdateContractUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ContractRepository from '../../../domain/repositories/ContractRepository';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import type { UpdateContractInput } from '../../../domain/entities/ContractTypes';

const LOCKED_STATUSES = ['signed', 'active', 'expired', 'terminated', 'canceled'];
const ALWAYS_EDITABLE_FIELDS = ['responsible_user_id', 'alert_advance_days'];

class UpdateContractUseCase extends UseCase<UpdateContractInput, any> {
  private readonly repository: ContractRepository;

  public constructor(repository: ContractRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} Contrato não encontrado (404).
   * @throws {BusinessRuleError} Contrato assinado/ativo e a alteração inclui campo travado (422).
   */
  public async execute(input: UpdateContractInput): Promise<any> {
    const { id, ...rest } = input;
    const contract = await this.repository.findById(id);
    if (!contract) throw new NotFoundError(`Contrato ${id} não encontrado.`);

    if (LOCKED_STATUSES.includes(contract.status)) {
      const hasLockedField = Object.keys(rest).some((key) => !ALWAYS_EDITABLE_FIELDS.includes(key));
      if (hasLockedField) {
        throw new BusinessRuleError(
          'Contrato já assinado/ativo — apenas responsible_user_id e alert_advance_days podem ser alterados.',
          { rule: 'BR-JUR-007', status: contract.status },
        );
      }
    }

    return this.repository.update(id, rest);
  }
}

export = UpdateContractUseCase;
