/**
 * `GET /api/jur/reports/financeiro` — exceção de campo do perfil
 * `financeiro` (§8.2, RF-JUR-042/BR-JUR-050). Payload sanitizado: apenas a
 * série de provisão vigente e custos lançados — NUNCA `parte_contraria`,
 * `object`/`description`/andamentos, `rationale`, `case_number_cnj`
 * (usa `legal_case_reference` interno) nem qualquer dado de
 * LGPD/procuração/PI.
 *
 * Reconciliação de schema: `jur_legal_case_provisions` não tem coluna
 * `cost_center_id` (só `accounts_payable` tem) — o campo `cost_center_id`
 * do exemplo de contrato (§8.2) é retornado como `null` para provisões
 * (limitação de schema desta passada, documentada no handoff) e como o
 * valor real para custos (`accounts_payable.cost_center_id`).
 *
 * @module modules/juridico/application/use-cases/report/FinancialReportUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LegalCaseRepository from '../../../domain/repositories/LegalCaseRepository';
import AccountPayableService from '../../services/AccountPayableService';

class FinancialReportUseCase extends UseCase<void, any> {
  private readonly legalCaseRepository: LegalCaseRepository;
  private readonly accountPayableService: AccountPayableService;

  public constructor(legalCaseRepository: LegalCaseRepository, accountPayableService: AccountPayableService) {
    super();
    this.legalCaseRepository = legalCaseRepository;
    this.accountPayableService = accountPayableService;
  }

  public async execute(): Promise<any> {
    const [currentProvisions, references, payables] = await Promise.all([
      this.legalCaseRepository.listAllCurrentProvisions(),
      this.legalCaseRepository.listAllReferences(),
      this.accountPayableService.listByLegalCase(),
    ]);

    const referenceById = new Map(references.map((row: any) => [row.id, row]));

    const provisions = currentProvisions.map((row: any) => ({
      legal_case_reference: row.case_number,
      case_type: row.case_type,
      risk_class: row.risk_class,
      provisioned_amount: row.provisioned_amount,
      cost_center_id: null,
    }));

    const costs = payables.map((row: any) => {
      const json = row.toJSON ? row.toJSON() : row;
      const reference = referenceById.get(json.legal_case_id);
      return {
        legal_case_reference: reference ? reference.case_number : null,
        entry_type: json.legal_expense_type,
        amount: json.amount,
        due_date: json.due_date,
        status: json.status,
        cost_center_id: json.cost_center_id ?? null,
      };
    });

    const provisionedTotal = currentProvisions.reduce((sum: number, row: any) => sum + Number(row.provisioned_amount ?? 0), 0);
    const possibleExposureTotal = currentProvisions
      .filter((row: any) => row.risk_class === 'possible')
      .reduce((sum: number, row: any) => sum + Number(row.claim_amount ?? 0), 0);
    const costsTotalPending = payables
      .filter((row: any) => (row.toJSON ? row.toJSON() : row).status === 'pending')
      .reduce((sum: number, row: any) => sum + Number((row.toJSON ? row.toJSON() : row).amount ?? 0), 0);

    return {
      generated_at: new Date().toISOString(),
      provisions,
      costs,
      totals: {
        provisioned_total: provisionedTotal.toFixed(2),
        possible_exposure_total: possibleExposureTotal.toFixed(2),
        costs_total_pending: costsTotalPending.toFixed(2),
      },
    };
  }
}

export = FinancialReportUseCase;
