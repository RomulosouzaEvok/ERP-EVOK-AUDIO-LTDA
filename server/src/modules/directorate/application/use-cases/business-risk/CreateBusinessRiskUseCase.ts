/**
 * Caso de uso: registro de um risco corporativo, cobrindo
 * `POST /api/directorate/business-risks`.
 *
 * `risk_score` NUNCA é aceito do payload — é sempre calculado aqui a partir
 * de `probability`/`impact` (ver {@link calculateRiskScore}). O `input` nem
 * declara o campo, então qualquer `risk_score` enviado pelo cliente HTTP é
 * silenciosamente ignorado (o controller já não repassa nada além dos
 * campos conhecidos ao use case).
 *
 * @module modules/directorate/application/use-cases/business-risk/CreateBusinessRiskUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import DirectorateRepository from '../../../domain/repositories/DirectorateRepository';
import { calculateRiskScore, RiskLevel } from '../../../domain/services/riskScore';

type RiskCategory = 'operational' | 'financial' | 'market' | 'regulatory' | 'reputation' | 'supply';
type RiskStatus = 'active' | 'mitigated' | 'accepted' | 'closed';

type CreateBusinessRiskInput = {
  risk_category: RiskCategory;
  description: string;
  probability: RiskLevel;
  impact: RiskLevel;
  mitigation_actions?: string | null;
  contingency_plan?: string | null;
  responsible_id?: number | null;
  review_date?: string | null;
  status?: RiskStatus;
  createdBy: number;
};

class CreateBusinessRiskUseCase extends UseCase<CreateBusinessRiskInput, any> {
  private readonly directorateRepository: DirectorateRepository;

  constructor(directorateRepository: DirectorateRepository) {
    super();
    this.directorateRepository = directorateRepository;
  }

  async execute(input: CreateBusinessRiskInput) {
    const riskScore = calculateRiskScore(input.probability, input.impact);

    return this.directorateRepository.createBusinessRisk({
      risk_category: input.risk_category,
      description: input.description,
      probability: input.probability,
      impact: input.impact,
      risk_score: riskScore,
      mitigation_actions: input.mitigation_actions ?? null,
      contingency_plan: input.contingency_plan ?? null,
      responsible_id: input.responsible_id ?? null,
      review_date: input.review_date ?? null,
      status: input.status ?? 'active',
      created_by: input.createdBy,
    });
  }
}

export = CreateBusinessRiskUseCase;
