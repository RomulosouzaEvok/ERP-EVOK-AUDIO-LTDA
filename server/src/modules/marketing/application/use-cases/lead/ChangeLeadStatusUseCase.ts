/**
 * Caso de uso: avanço do lead no funil de marketing, cobrindo o fluxo do
 * endpoint dedicado `POST /api/marketing/leads/:id/status` (não um `PUT`
 * genérico irrestrito — mesmo espírito de `ChangeSaleStatusUseCase`, porém
 * bem mais simples: é só um funil, sem efeitos colaterais de estoque/
 * financeiro).
 *
 * BLOCO 5 MKT (correção):
 * - Funil corrigido (RF-MKT-005): `new -> contacted -> qualified ->
 *   in_sales_attendance -> converted`, `lost` de qualquer etapa aberta.
 * - `converted` NÃO é mais uma transição aceita por este endpoint
 *   (RF-MKT-001) — redireciona para `POST /leads/:id/convert`
 *   (`ConvertLeadUseCase`, conversão atômica com cliente obrigatório).
 * - `sales_owner_user_id` só é aceito quando `status='qualified'`
 *   (atribuição simultânea à qualificação, UC-64 A1): grava
 *   `qualified_at=now()` e, se informado, também `handoff_at=now()`
 *   (RF-MKT-011/012/013).
 * - Transição para `in_sales_attendance` EXIGE que o lead já tenha
 *   `sales_owner_user_id` preenchido (de handoff anterior ou desta mesma
 *   chamada de qualificação) — RF-MKT-012.
 *
 * @module modules/marketing/application/use-cases/lead/ChangeLeadStatusUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../../errors';
import LeadRepository from '../../../domain/repositories/LeadRepository';
import CampaignRepository from '../../../domain/repositories/CampaignRepository';
import UserLookupService from '../../services/UserLookupService';

/**
 * Funil de leads: `new -> contacted -> qualified -> in_sales_attendance ->
 * lost`. `converted` NÃO consta aqui — é transição exclusiva de
 * `ConvertLeadUseCase` (RF-MKT-001). `lost` pode ser atingido a partir de
 * qualquer etapa aberta. Transições não listadas são bloqueadas com 422.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  new: ['contacted', 'lost'],
  contacted: ['qualified', 'lost'],
  qualified: ['in_sales_attendance', 'lost'],
  in_sales_attendance: ['lost'],
  converted: [],
  lost: [],
};

type ChangeLeadStatusInput = {
  id: number;
  status: string;
  sales_owner_user_id?: number;
};

class ChangeLeadStatusUseCase extends UseCase<ChangeLeadStatusInput, any> {
  private readonly leadRepository: LeadRepository;
  private readonly campaignRepository: CampaignRepository;
  private readonly userLookupService?: UserLookupService;

  constructor(leadRepository: LeadRepository, campaignRepository: CampaignRepository, userLookupService?: UserLookupService) {
    super();
    this.leadRepository = leadRepository;
    this.campaignRepository = campaignRepository;
    this.userLookupService = userLookupService;
  }

  /**
   * @throws {NotFoundError} Se o lead (ou `sales_owner_user_id`) não existir.
   * @throws {ValidationError} Se `status` não for informado.
   * @throws {BusinessRuleError} Se a transição não for permitida pelo funil, se `status='converted'`, ou se `in_sales_attendance` for solicitado sem `sales_owner_user_id` prévio.
   */
  async execute({ id, status, sales_owner_user_id }: ChangeLeadStatusInput) {
    if (!status) {
      throw new ValidationError('status é obrigatório.');
    }

    if (status === 'converted') {
      throw new BusinessRuleError('Use POST /leads/:id/convert para converter um lead.');
    }

    const lead = await this.leadRepository.findLeadById(id);
    if (!lead) {
      throw new NotFoundError('Lead não encontrado.');
    }

    if (lead.status === status) {
      throw new ValidationError(`Lead já está com status '${status}'.`);
    }

    const allowed = VALID_TRANSITIONS[lead.status] || [];
    if (!allowed.includes(status)) {
      throw new BusinessRuleError(
        `Transição de status inválida: ${lead.status} -> ${status}. Permitidas: ${allowed.join(', ') || 'nenhuma'}`
      );
    }

    const updateData: Record<string, unknown> = { status };

    if (status === 'qualified') {
      updateData.qualified_at = new Date();

      if (sales_owner_user_id) {
        if (this.userLookupService) {
          const user = await this.userLookupService.findActiveById(sales_owner_user_id);
          if (!user) {
            throw new NotFoundError('Usuário de vendas não encontrado ou inativo.');
          }
        }
        updateData.sales_owner_user_id = sales_owner_user_id;
        updateData.handoff_at = new Date();
      }
    }

    if (status === 'in_sales_attendance') {
      const hasSalesOwner = sales_owner_user_id || lead.sales_owner_user_id;
      if (!hasSalesOwner) {
        throw new BusinessRuleError('Lead precisa de um responsável de vendas (handoff) antes de avançar para in_sales_attendance.');
      }
      if (sales_owner_user_id && sales_owner_user_id !== lead.sales_owner_user_id) {
        if (this.userLookupService) {
          const user = await this.userLookupService.findActiveById(sales_owner_user_id);
          if (!user) {
            throw new NotFoundError('Usuário de vendas não encontrado ou inativo.');
          }
        }
        updateData.sales_owner_user_id = sales_owner_user_id;
        updateData.handoff_at = new Date();
      }
    }

    return this.leadRepository.updateLead(id, updateData);
  }
}

export = ChangeLeadStatusUseCase;
