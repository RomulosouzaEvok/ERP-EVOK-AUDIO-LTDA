/**
 * Caso de uso: captação de leads em lote, cobrindo o fluxo do endpoint
 * `POST /api/marketing/leads/bulk` (RF-MKT-019, UC-65 fluxo alternativo).
 *
 * Aplica as mesmas validações de `CreateLeadUseCase` (contato obrigatório,
 * `lead_source`, deduplicação) item a item — processamento parcial, NÃO
 * tudo-ou-nada (UC-65 E2): itens válidos são criados, itens inválidos são
 * reportados com o motivo da rejeição, sem interromper o lote.
 *
 * @module modules/marketing/application/use-cases/lead/BulkCreateLeadsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { AppError } from '../../../../../errors';
import CreateLeadUseCase from './CreateLeadUseCase';

type BulkCreateLeadsInput = {
  event_id?: number;
  leads: Array<Record<string, any>>;
};

class BulkCreateLeadsUseCase extends UseCase<BulkCreateLeadsInput, any> {
  private readonly createLeadUseCase: CreateLeadUseCase;

  constructor(createLeadUseCase: CreateLeadUseCase) {
    super();
    this.createLeadUseCase = createLeadUseCase;
  }

  async execute({ event_id, leads }: BulkCreateLeadsInput) {
    const created: Array<{ index: number; lead: any }> = [];
    const rejected: Array<{ index: number; error: { code: string; message: string; details?: unknown } }> = [];

    for (let index = 0; index < leads.length; index += 1) {
      const item = leads[index];
      const payload = { ...item, event_id: item.event_id ?? event_id ?? null };

      try {
        const lead = await this.createLeadUseCase.execute(payload);
        created.push({ index, lead });
      } catch (error: any) {
        if (error instanceof AppError) {
          rejected.push({ index, error: { code: error.code, message: error.message, details: error.details } });
        } else {
          rejected.push({ index, error: { code: 'INTERNAL_ERROR', message: 'Erro inesperado ao criar o lead.' } });
        }
      }
    }

    return { created, rejected };
  }
}

export = BulkCreateLeadsUseCase;
