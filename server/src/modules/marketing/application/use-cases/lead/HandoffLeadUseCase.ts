/**
 * Caso de uso: handoff (atribuição/reatribuição) de responsável de Vendas a
 * um lead, cobrindo o fluxo do endpoint dedicado
 * `POST /api/marketing/leads/:id/handoff` (RF-MKT-011/012/013/015, UC-64).
 *
 * NÃO muda `status` — grava/atualiza `sales_owner_user_id` e `handoff_at`.
 * Aplicável a partir de `status='qualified'` (reatribuição também permitida
 * em `in_sales_attendance`, ex. troca de vendedor). Endpoint acessível tanto
 * por `marketing` quanto por `vendas` (RBAC dupla via `authorizeAnyModule`,
 * na camada de rota) — o vendedor pode aceitar/reatribuir o próprio
 * handoff sem depender de Marketing operar por ele.
 *
 * @module modules/marketing/application/use-cases/lead/HandoffLeadUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../../errors';
import LeadRepository from '../../../domain/repositories/LeadRepository';
import UserLookupService from '../../services/UserLookupService';

const HANDOFF_ELIGIBLE_STATUSES = ['qualified', 'in_sales_attendance'];

type HandoffLeadInput = {
  id: number;
  sales_owner_user_id: number;
};

class HandoffLeadUseCase extends UseCase<HandoffLeadInput, any> {
  private readonly leadRepository: LeadRepository;
  private readonly userLookupService?: UserLookupService;

  constructor(leadRepository: LeadRepository, userLookupService?: UserLookupService) {
    super();
    this.leadRepository = leadRepository;
    this.userLookupService = userLookupService;
  }

  /**
   * @throws {ValidationError} Se `sales_owner_user_id` não for informado.
   * @throws {NotFoundError} Se o lead ou o usuário não existirem.
   * @throws {BusinessRuleError} Se o usuário estiver inativo ou o lead estiver em `new`/`contacted`/`converted`/`lost`.
   */
  async execute({ id, sales_owner_user_id }: HandoffLeadInput) {
    if (!sales_owner_user_id) {
      throw new ValidationError('sales_owner_user_id é obrigatório.');
    }

    const lead = await this.leadRepository.findLeadById(id);
    if (!lead) {
      throw new NotFoundError('Lead não encontrado.');
    }

    if (!HANDOFF_ELIGIBLE_STATUSES.includes(lead.status)) {
      throw new BusinessRuleError(
        `Handoff não permitido para leads em status '${lead.status}'. Elegível apenas a partir de 'qualified'.`
      );
    }

    if (this.userLookupService) {
      const user = await this.userLookupService.findActiveById(sales_owner_user_id);
      if (!user) {
        throw new NotFoundError('Usuário de vendas não encontrado ou inativo.');
      }
    }

    return this.leadRepository.updateLead(id, {
      sales_owner_user_id,
      handoff_at: new Date(),
    });
  }
}

export = HandoffLeadUseCase;
