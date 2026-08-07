/**
 * Caso de uso: aprovação/rejeição de orçamento de campanha, cobrindo o
 * fluxo do endpoint `POST /api/marketing/campaigns/:id/budget-decision`
 * (RF-MKT-030/031, nível RBAC `approve`).
 *
 * Grava `budget_approval_status`, `budget_approved_by` (SEMPRE de
 * `req.user.id`, nunca do body — mesma diretriz anti-spoofing do restante
 * do projeto), `budget_approved_at`. Quando `decision='approved'`,
 * `budget_approved` é obrigatório. Quando `decision='rejected'`, `reason`
 * é opcional e, se informado e a campanha ainda não tiver `notes`, é
 * gravado em `notes`.
 *
 * @module modules/marketing/application/use-cases/campaign/BudgetDecisionUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../../errors';
import CampaignRepository from '../../../domain/repositories/CampaignRepository';

type BudgetDecisionInput = {
  id: number;
  decision: 'approved' | 'rejected';
  budget_approved?: number;
  reason?: string;
  decidedByUserId: number;
};

class BudgetDecisionUseCase extends UseCase<BudgetDecisionInput, any> {
  private readonly campaignRepository: CampaignRepository;

  constructor(campaignRepository: CampaignRepository) {
    super();
    this.campaignRepository = campaignRepository;
  }

  /**
   * @throws {NotFoundError} Se a campanha não existir.
   * @throws {ValidationError} Se `budget_approved` não for informado quando `decision='approved'`.
   * @throws {BusinessRuleError} Se a campanha já estiver `completed`/`canceled`.
   */
  async execute({ id, decision, budget_approved, reason, decidedByUserId }: BudgetDecisionInput) {
    const campaign = await this.campaignRepository.findCampaignById(id);
    if (!campaign) {
      throw new NotFoundError('Campanha não encontrada.');
    }

    if (['completed', 'canceled'].includes(campaign.status)) {
      throw new BusinessRuleError('Campanha já encerrada — decisão de orçamento não se aplica mais.');
    }

    if (decision === 'approved' && (budget_approved === undefined || budget_approved === null)) {
      throw new ValidationError('budget_approved é obrigatório quando decision="approved".');
    }

    const updateData: Record<string, unknown> = {
      budget_approval_status: decision,
      budget_approved_by: decidedByUserId,
      budget_approved_at: new Date(),
    };

    if (decision === 'approved') {
      updateData.budget_approved = budget_approved;
    }

    if (decision === 'rejected' && reason && !campaign.notes) {
      updateData.notes = reason;
    }

    return this.campaignRepository.updateCampaign(id, updateData);
  }
}

export = BudgetDecisionUseCase;
