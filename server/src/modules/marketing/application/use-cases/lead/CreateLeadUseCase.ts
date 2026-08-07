/**
 * Caso de uso: criação de lead de marketing, cobrindo o fluxo do endpoint
 * `POST /api/marketing/leads`.
 *
 * Se `campaign_id` for informado, valida que a campanha existe e incrementa
 * `MarketingCampaign.leads_generated` na mesma operação (contador simples,
 * um dos 3 gatilhos de cache descritos em RF-MKT-007). Se `event_id` for
 * informado, valida que o evento existe e força `lead_source='event'`
 * (RF-MKT-022 — Zod já valida a consistência cruzada, este use case só
 * confirma a existência do evento e normaliza o valor).
 *
 * Deduplicação (RF-MKT-018, BR-MKT-006), executada ANTES de criar:
 * 1. Lead aberto (status não `converted`/`lost`) com o mesmo e-mail/telefone
 *    normalizado → `409 DUPLICATE_LEAD`, sem criar.
 * 2. Cliente já cadastrado (`clients`) com o mesmo documento/contato →
 *    `409 CLIENT_ALREADY_EXISTS`, sem criar o lead (o operador registra a
 *    interação como comercial direta).
 *
 * @module modules/marketing/application/use-cases/lead/CreateLeadUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { AppError, NotFoundError, ValidationError } from '../../../../../errors';
import LeadRepository from '../../../domain/repositories/LeadRepository';
import CampaignRepository from '../../../domain/repositories/CampaignRepository';
import EventRepository from '../../../domain/repositories/EventRepository';
import ClientService from '../../services/ClientService';

type CreateLeadInput = Record<string, any>;

class CreateLeadUseCase extends UseCase<CreateLeadInput, any> {
  private readonly leadRepository: LeadRepository;
  private readonly campaignRepository: CampaignRepository;
  private readonly eventRepository?: EventRepository;
  private readonly clientService?: ClientService;

  constructor(
    leadRepository: LeadRepository,
    campaignRepository: CampaignRepository,
    eventRepository?: EventRepository,
    clientService?: ClientService,
  ) {
    super();
    this.leadRepository = leadRepository;
    this.campaignRepository = campaignRepository;
    this.eventRepository = eventRepository;
    this.clientService = clientService;
  }

  /**
   * @throws {ValidationError} Se nem `email` nem `phone` forem informados.
   * @throws {NotFoundError} Se `campaign_id`/`event_id` informado não existir.
   * @throws {AppError} `DUPLICATE_LEAD` (409) ou `CLIENT_ALREADY_EXISTS` (409) em caso de duplicidade.
   */
  async execute(input: CreateLeadInput) {
    if (!input.email && !input.phone) {
      throw new ValidationError('É necessário informar email ou phone.');
    }

    let campaign: any = null;
    if (input.campaign_id) {
      campaign = await this.campaignRepository.findCampaignById(input.campaign_id);
      if (!campaign) {
        throw new NotFoundError('Campanha não encontrada.');
      }
    }

    if (input.event_id && this.eventRepository) {
      const event = await this.eventRepository.findEventById(input.event_id);
      if (!event) {
        throw new NotFoundError('Evento não encontrado.');
      }
    }

    const dataToCreate = { ...input };
    if (dataToCreate.event_id) {
      dataToCreate.lead_source = 'event';
    }

    if (this.leadRepository.findOpenLeadByContact) {
      const duplicateLead = await this.leadRepository.findOpenLeadByContact(input.email ?? null, input.phone ?? null);
      if (duplicateLead) {
        throw new AppError(
          'Já existe um lead aberto com este contato.',
          409,
          'DUPLICATE_LEAD',
          { existing_lead_id: duplicateLead.id },
        );
      }
    }

    if (this.clientService) {
      const matches = await this.clientService.search({
        email: input.email || undefined,
        phone: input.phone || undefined,
      });
      const activeMatch = matches.find((c: any) => c.status !== 'inactive');
      if (activeMatch) {
        throw new AppError(
          'Já existe um cliente cadastrado com este contato.',
          409,
          'CLIENT_ALREADY_EXISTS',
          { matched_client: { id: activeMatch.id, name: activeMatch.name, cpf_cnpj: activeMatch.cpf_cnpj } },
        );
      }
    }

    if (campaign) {
      const lead = await this.leadRepository.createLead(dataToCreate);
      await this.campaignRepository.updateCampaign(campaign.id, {
        leads_generated: (campaign.leads_generated || 0) + 1,
      });
      return lead;
    }

    return this.leadRepository.createLead(dataToCreate);
  }
}

export = CreateLeadUseCase;
