/**
 * `GET /api/jur/reports/provisions` — relatório completo "provisão vigente
 * por processo/total + exposição possível" (versão `juridico`, com todos
 * os campos, RF-JUR-020). Processos `active` sem `provisions/current`
 * aparecem destacados como `risco_nao_avaliado: true`, nunca omitidos
 * silenciosamente (E3 de UC-53).
 *
 * @module modules/juridico/application/use-cases/legalCase/ProvisionsReportUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LegalCaseRepository from '../../../domain/repositories/LegalCaseRepository';

interface ProvisionsReportRow {
  legal_case_id: number;
  case_number: string;
  case_type: string;
  risk_class: string | null;
  provisioned_amount: string | null;
  claim_amount: string | null;
  risco_nao_avaliado: boolean;
}

class ProvisionsReportUseCase extends UseCase<void, any> {
  private readonly repository: LegalCaseRepository;

  public constructor(repository: LegalCaseRepository) {
    super();
    this.repository = repository;
  }

  public async execute(): Promise<any> {
    const currentProvisions = await this.repository.listAllCurrentProvisions();
    const activeCases = await this.repository.listActiveWithoutCurrentProvision();

    const provisionedCaseIds = new Set(currentProvisions.map((row: any) => row.legal_case_id));

    const rows: ProvisionsReportRow[] = currentProvisions.map((row: any) => ({
      legal_case_id: row.legal_case_id,
      case_number: row.case_number,
      case_type: row.case_type,
      risk_class: row.risk_class,
      provisioned_amount: row.provisioned_amount,
      claim_amount: row.claim_amount,
      risco_nao_avaliado: false,
    }));

    for (const legalCase of activeCases) {
      if (!provisionedCaseIds.has(legalCase.id)) {
        rows.push({
          legal_case_id: legalCase.id,
          case_number: legalCase.case_number,
          case_type: legalCase.case_type,
          risk_class: null,
          provisioned_amount: null,
          claim_amount: legalCase.claim_value,
          risco_nao_avaliado: true,
        });
      }
    }

    const provisionedTotal = currentProvisions.reduce((sum: number, row: any) => sum + Number(row.provisioned_amount ?? 0), 0);
    const possibleExposureTotal = currentProvisions
      .filter((row: any) => row.risk_class === 'possible')
      .reduce((sum: number, row: any) => sum + Number(row.claim_amount ?? 0), 0);

    return {
      generated_at: new Date().toISOString(),
      rows,
      totals: {
        provisioned_total: provisionedTotal.toFixed(2),
        possible_exposure_total: possibleExposureTotal.toFixed(2),
      },
    };
  }
}

export = ProvisionsReportUseCase;
