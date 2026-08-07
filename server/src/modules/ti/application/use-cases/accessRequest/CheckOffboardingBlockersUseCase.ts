/**
 * Verifica se um funcionário tem `ItResponsibilityTerm` `active` sem
 * tratamento antes de concluir um `revoke` (RF-TI-023/037/BR-TI-011).
 * Reaproveita o MESMO repositório de
 * `GET /api/ti/responsibility-terms/pending-for-offboarding/:employeeId`
 * (§2.4 da API) — chamada de use case a use case, sem HTTP loopback.
 *
 * @module modules/ti/application/use-cases/accessRequest/CheckOffboardingBlockersUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ListPendingTermsForOffboardingUseCase from '../term/ListPendingTermsForOffboardingUseCase';

interface Output {
  blocked: boolean;
  pendingTerms: { id: number; asset: { id: number; tag: string; name: string } }[];
}

class CheckOffboardingBlockersUseCase extends UseCase<{ employeeId: number }, Output> {
  private readonly listPendingTermsUseCase: ListPendingTermsForOffboardingUseCase;

  public constructor(listPendingTermsUseCase: ListPendingTermsForOffboardingUseCase) {
    super();
    this.listPendingTermsUseCase = listPendingTermsUseCase;
  }

  public async execute({ employeeId }: { employeeId: number }): Promise<Output> {
    const result = await this.listPendingTermsUseCase.execute({ employeeId });
    return {
      blocked: result.has_pending_terms,
      pendingTerms: result.terms.map((t) => ({ id: t.id, asset: t.asset })),
    };
  }
}

export = CheckOffboardingBlockersUseCase;
