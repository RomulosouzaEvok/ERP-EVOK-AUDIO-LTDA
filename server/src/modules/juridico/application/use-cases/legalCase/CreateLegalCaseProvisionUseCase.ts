/**
 * `POST /api/jur/legal-cases/:id/provisions` — nova avaliação de risco/
 * provisão (append-only, CPC 25, RF-JUR-015/016). `risk_class=probable`
 * exige `provisioned_amount>0` e `rationale`, e nível `approve`
 * (RF-JUR-015, E1 de UC-53).
 *
 * @module modules/juridico/application/use-cases/legalCase/CreateLegalCaseProvisionUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LegalCaseRepository from '../../../domain/repositories/LegalCaseRepository';
import { ValidationError, NotFoundError, BusinessRuleError, ForbiddenError } from '../../../../../errors';
import type { CreateLegalCaseProvisionInput } from '../../../domain/entities/LegalCaseTypes';

class CreateLegalCaseProvisionUseCase extends UseCase<CreateLegalCaseProvisionInput, any> {
  private readonly repository: LegalCaseRepository;

  public constructor(repository: LegalCaseRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {ValidationError} `risk_class` ausente (400).
   * @throws {NotFoundError} Processo não encontrado (404).
   * @throws {BusinessRuleError} `probable` sem `provisioned_amount>0`/`rationale` (422).
   * @throws {ForbiddenError} Nível `operate` tentando registrar `probable` (403).
   */
  public async execute(input: CreateLegalCaseProvisionInput): Promise<any> {
    if (!input.risk_class) throw new ValidationError('risk_class é obrigatório.');

    const legalCase = await this.repository.findById(input.legalCaseId);
    if (!legalCase) throw new NotFoundError(`Processo ${input.legalCaseId} não encontrado.`);

    const provisionedAmount = Number(input.provisioned_amount ?? 0);

    if (input.risk_class === 'probable') {
      if (!input.hasApprove) {
        throw new ForbiddenError('Registrar avaliação de risco "probable" exige nível approve.', { rule: 'RF-JUR-015' });
      }
      if (!(provisionedAmount > 0) || !input.rationale) {
        throw new BusinessRuleError(
          'risk_class=probable exige provisioned_amount > 0 e rationale.',
          { rule: 'BR-JUR-015' },
        );
      }
    }

    return this.repository.addProvision({
      legal_case_id: input.legalCaseId,
      risk_class: input.risk_class,
      claim_amount: input.claim_amount ?? null,
      provisioned_amount: provisionedAmount,
      rationale: input.rationale ?? null,
      assessed_by: input.assessedBy,
      assessed_at: new Date(),
    });
  }
}

export = CreateLegalCaseProvisionUseCase;
