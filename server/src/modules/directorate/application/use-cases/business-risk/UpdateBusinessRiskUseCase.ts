/**
 * Caso de uso: atualização de um risco corporativo, cobrindo
 * `PUT /api/directorate/business-risks/:id`.
 *
 * Se `probability` OU `impact` mudam, `risk_score` é RECALCULADO no
 * servidor — nunca aceito do payload (mesma regra de
 * {@link module:modules/directorate/application/use-cases/business-risk/CreateBusinessRiskUseCase}).
 *
 * @module modules/directorate/application/use-cases/business-risk/UpdateBusinessRiskUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import DirectorateRepository from '../../../domain/repositories/DirectorateRepository';
import { calculateRiskScore, RiskLevel } from '../../../domain/services/riskScore';

type RiskCategory = 'operational' | 'financial' | 'market' | 'regulatory' | 'reputation' | 'supply';
type RiskStatus = 'active' | 'mitigated' | 'accepted' | 'closed';

type UpdateBusinessRiskInput = {
  id: number;
  risk_category?: RiskCategory;
  description?: string;
  probability?: RiskLevel;
  impact?: RiskLevel;
  mitigation_actions?: string | null;
  contingency_plan?: string | null;
  responsible_id?: number | null;
  review_date?: string | null;
  status?: RiskStatus;
};

class UpdateBusinessRiskUseCase extends UseCase<UpdateBusinessRiskInput, any> {
  private readonly directorateRepository: DirectorateRepository;

  constructor(directorateRepository: DirectorateRepository) {
    super();
    this.directorateRepository = directorateRepository;
  }

  /** @throws {NotFoundError} Risco inexistente. */
  async execute(input: UpdateBusinessRiskInput) {
    const { id, ...data } = input;

    const existing = await this.directorateRepository.findBusinessRiskById(id);
    if (!existing) {
      throw new NotFoundError(`Risco corporativo #${id} não encontrado.`);
    }

    const patch: Record<string, unknown> = { ...data };

    if (data.probability !== undefined || data.impact !== undefined) {
      const probability = (data.probability ?? existing.probability) as RiskLevel;
      const impact = (data.impact ?? existing.impact) as RiskLevel;
      patch.risk_score = calculateRiskScore(probability, impact);
    }

    return this.directorateRepository.updateBusinessRisk(id, patch);
  }
}

export = UpdateBusinessRiskUseCase;
