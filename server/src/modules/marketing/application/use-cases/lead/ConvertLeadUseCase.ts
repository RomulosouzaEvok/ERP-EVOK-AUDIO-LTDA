/**
 * Caso de uso: conversão ATÔMICA de lead em cliente, cobrindo o fluxo do
 * endpoint dedicado `POST /api/marketing/leads/:id/convert`
 * (RF-MKT-001/002/003, UC-63). Único caminho que grava
 * `status='converted'` — `POST .../status` rejeita explicitamente essa
 * transição (`ChangeLeadStatusUseCase`).
 *
 * Duas opções, mutuamente exclusivas (validadas na camada de rota via Zod
 * `.refine()`, reforçado aqui):
 * - (A) `client_id` de um cliente EXISTENTE — validado via
 *   `ClientService.findById`, `404 NotFoundError` se não existir.
 * - (B) `new_client` com dados de cliente NOVO — criado via
 *   `ClientService.create()` (reaproveita `CreateClientUseCase`) NA MESMA
 *   TRANSAÇÃO que a atualização do lead (RF-MKT-002): se a criação falhar
 *   (ex. `ConflictError` de CPF/CNPJ duplicado), a transação inteira é
 *   revertida — o lead permanece no status anterior, nenhum cliente é
 *   criado.
 *
 * Fora da transação (efeito colateral não crítico, não deve reverter a
 * conversão se falhar): se o lead tiver `campaign_id`, dispara
 * `RecalculateCampaignMetricsUseCase` para manter o cache de métricas
 * consistente (RF-MKT-009).
 *
 * @module modules/marketing/application/use-cases/lead/ConvertLeadUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../../errors';
import LeadRepository from '../../../domain/repositories/LeadRepository';
import ClientService from '../../services/ClientService';
import RecalculateCampaignMetricsUseCase from '../campaign/RecalculateCampaignMetricsUseCase';

const LEAD_CONVERTIBLE_STATUSES = ['qualified', 'in_sales_attendance'];

type ConvertLeadInput = {
  id: number;
  client_id?: number;
  new_client?: Record<string, unknown>;
};

class ConvertLeadUseCase extends UseCase<ConvertLeadInput, any> {
  private readonly leadRepository: LeadRepository;
  private readonly clientService: ClientService;
  private readonly recalculateCampaignMetricsUseCase?: RecalculateCampaignMetricsUseCase;
  private readonly runInTransaction: <T>(fn: (transaction: unknown) => Promise<T>) => Promise<T>;

  /**
   * @param leadRepository - Repositório de leads.
   * @param clientService - Serviço de clientes (adapter para o módulo `clients`).
   * @param recalculateCampaignMetricsUseCase - Use case de recálculo de métricas de campanha (efeito colateral não crítico).
   * @param runInTransaction - Função que executa o callback dentro de uma transação Sequelize (injetável para teste unitário sem banco real).
   */
  constructor(
    leadRepository: LeadRepository,
    clientService: ClientService,
    recalculateCampaignMetricsUseCase?: RecalculateCampaignMetricsUseCase,
    runInTransaction?: <T>(fn: (transaction: unknown) => Promise<T>) => Promise<T>,
  ) {
    super();
    this.leadRepository = leadRepository;
    this.clientService = clientService;
    this.recalculateCampaignMetricsUseCase = recalculateCampaignMetricsUseCase;
    this.runInTransaction = runInTransaction ?? (async (fn) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { sequelize } = require('../../../../../config/database');
      return sequelize.transaction(fn);
    });
  }

  /**
   * @throws {ValidationError} Se nem `client_id` nem `new_client` forem informados, ou se ambos forem.
   * @throws {NotFoundError} Se o lead não existir, ou `client_id` não corresponder a um cliente existente.
   * @throws {BusinessRuleError} Se o lead não estiver em `qualified`/`in_sales_attendance`.
   */
  async execute({ id, client_id, new_client }: ConvertLeadInput) {
    if ((!client_id && !new_client) || (client_id && new_client)) {
      throw new ValidationError('Informe exatamente um de client_id ou new_client.');
    }

    const lead = await this.leadRepository.findLeadById(id);
    if (!lead) {
      throw new NotFoundError('Lead não encontrado.');
    }

    if (!LEAD_CONVERTIBLE_STATUSES.includes(lead.status)) {
      throw new BusinessRuleError(
        `Lead em status '${lead.status}' não pode ser convertido. Elegível apenas a partir de 'qualified'/'in_sales_attendance'.`
      );
    }

    const result = await this.runInTransaction(async (transaction) => {
      let client: any;
      if (client_id) {
        client = await this.clientService.findById(client_id);
        if (!client) {
          throw new NotFoundError('Cliente não encontrado.');
        }
      } else {
        client = await this.clientService.create(new_client as Record<string, unknown>, transaction);
      }

      const convertedAt = new Date();
      const updatedLead = await this.leadRepository.updateLead(id, {
        status: 'converted',
        converted_to_customer_id: client.id,
        converted_at: convertedAt,
      }, transaction);

      return { lead: updatedLead, client };
    });

    if (lead.campaign_id && this.recalculateCampaignMetricsUseCase) {
      try {
        await this.recalculateCampaignMetricsUseCase.execute({ id: lead.campaign_id });
      } catch {
        // Efeito colateral não crítico (RF-MKT-002/009) — não deve reverter
        // nem falhar a resposta da conversão, que já foi persistida com
        // sucesso na transação acima.
      }
    }

    return result;
  }
}

export = ConvertLeadUseCase;
