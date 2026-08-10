/**
 * Use case: consultar se um lote está apto a ser liberado, e por quê (G7).
 *
 * @module modules/quality/application/use-cases/GetLotReleaseEligibilityUseCase
 *
 * Cobre `GET /api/quality/lots/:lotId/release-eligibility`. **Leitura pura,
 * sem nenhum efeito colateral** — mesmo padrão do endpoint de leitura de
 * alçada do G11 (`GET /api/purchases/:id/approvals`): a tela precisa saber
 * se o botão "Liberar" vai funcionar ANTES de o usuário clicar, e descobrir
 * isso provocando um 422 seria um efeito colateral disfarçado de consulta.
 *
 * Responde exatamente à mesma decisão que `ReleaseLotUseCase` aplica
 * (`decideLotRelease`), então não existe risco de a tela dizer "pode liberar"
 * e o POST recusar: a regra mora num único lugar.
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import QualityRepository = require('../../domain/repositories/QualityRepository');
import { decideLotRelease, QUALITY_INSPECTION_RULE, RELEASING_VERDICTS } from '../../domain/constants';

/** Status de lote a partir dos quais a liberação faz sentido (espelha `ReleaseLotUseCase`). */
const RELEASABLE_STATUSES = ['quarantine', 'blocked'];

interface GetLotReleaseEligibilityInput {
  lotId: number | string;
}

class GetLotReleaseEligibilityUseCase extends UseCase<GetLotReleaseEligibilityInput, any> {
  private readonly qualityRepository: QualityRepository;

  /** @param qualityRepository - Repositório de qualidade. */
  public constructor(qualityRepository: QualityRepository) {
    super();
    this.qualityRepository = qualityRepository;
  }

  /**
   * @param input - Id do lote.
   * @returns Diagnóstico do gate: `{ rule, lot_id, lot_status, status_allows_release, can_release, reason, latest_inspection, releasing_verdicts }`.
   * @throws {NotFoundError} Se o lote não existir.
   */
  public async execute({ lotId }: GetLotReleaseEligibilityInput): Promise<any> {
    const lot = await this.qualityRepository.findLotById(lotId);
    if (!lot) {
      throw new NotFoundError('Lote não encontrado.', { rule: QUALITY_INSPECTION_RULE, lot_id: lotId });
    }

    const latestInspection = await this.qualityRepository.findLatestInspectionForLot(lot.id);
    const decision = decideLotRelease(latestInspection);
    const statusAllowsRelease = RELEASABLE_STATUSES.includes(lot.status);

    return {
      rule: QUALITY_INSPECTION_RULE,
      lot_id: lot.id,
      lot_number: lot.lot_number,
      lot_status: lot.status,
      status_allows_release: statusAllowsRelease,
      quality_gate_passed: decision.allowed,
      can_release: statusAllowsRelease && decision.allowed,
      reason: decision.allowed ? null : decision.reason,
      releasing_verdicts: RELEASING_VERDICTS,
      latest_inspection: latestInspection
        ? {
          id: latestInspection.id,
          inspection_number: latestInspection.inspection_number,
          stage: latestInspection.stage,
          verdict: latestInspection.verdict,
          acceptance_criteria: latestInspection.acceptance_criteria,
          inspector_id: latestInspection.inspector_id,
          inspected_at: latestInspection.inspected_at,
          non_conformity_id: latestInspection.non_conformity_id,
        }
        : null,
    };
  }
}

export = GetLotReleaseEligibilityUseCase;
