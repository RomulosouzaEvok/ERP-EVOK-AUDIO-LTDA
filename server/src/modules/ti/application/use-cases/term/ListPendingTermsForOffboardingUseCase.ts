/**
 * Lista termos `active` pendentes de um funcionário — usada tanto pela
 * rota REST `GET /api/ti/responsibility-terms/pending-for-offboarding/:employeeId`
 * (consulta manual do RH) quanto internamente por
 * `CheckOffboardingBlockersUseCase` (RF-TI-023/§2.4 da API).
 *
 * @module modules/ti/application/use-cases/term/ListPendingTermsForOffboardingUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ResponsibilityTermRepository from '../../../domain/repositories/ResponsibilityTermRepository';

interface Output {
  employee_id: number;
  has_pending_terms: boolean;
  terms: { id: number; asset: { id: number; tag: string; name: string }; delivered_at: Date; status: string }[];
}

class ListPendingTermsForOffboardingUseCase extends UseCase<{ employeeId: number }, Output> {
  private readonly repository: ResponsibilityTermRepository;

  public constructor(repository: ResponsibilityTermRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ employeeId }: { employeeId: number }): Promise<Output> {
    const activeTerms = await this.repository.findActiveByEmployee(employeeId);
    const terms = activeTerms.map((t: any) => ({
      id: t.id,
      asset: t.asset ? { id: t.asset.id, tag: t.asset.tag, name: t.asset.name } : { id: t.asset_id, tag: '', name: '' },
      delivered_at: t.delivered_at,
      status: t.status,
    }));

    return { employee_id: employeeId, has_pending_terms: terms.length > 0, terms };
  }
}

export = ListPendingTermsForOffboardingUseCase;
