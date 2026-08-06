/**
 * Caso de uso para registrar a resposta de cotacao de um fornecedor
 * (preco/prazo/MOQ/validade por item).
 *
 * O comprador digita a cotacao recebida por email/telefone — nao ha portal
 * do fornecedor nesta v1. Cada par (rfq_item, fornecedor) e um upsert:
 * registrar novamente atualiza a cotacao existente (permite corrigir um
 * preco digitado errado sem endpoint de exclusao).
 *
 * Transiciona a RFQ `sent -> quoted` na primeira resposta recebida (fica
 * `quoted` para as respostas seguintes).
 *
 * @module modules/rfq/application/use-cases/RegisterRfqQuoteUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../errors';
import RfqRepository from '../../domain/repositories/RfqRepository';

/** Status que ainda aceitam registro de cotacao. */
const QUOTABLE_STATUSES = ['sent', 'quoted'];

interface RfqQuoteItemInput {
  rfq_item_id: number;
  unit_price: number;
  lead_time_days?: number;
  moq?: number;
  validity_date?: string;
  notes?: string;
}

interface RegisterRfqQuoteInput {
  id: number;
  supplier_id: number;
  items: RfqQuoteItemInput[];
  transaction: any;
}

class RegisterRfqQuoteUseCase extends UseCase<RegisterRfqQuoteInput, any> {
  private readonly rfqRepository: RfqRepository;

  public constructor(rfqRepository: RfqRepository) {
    super();
    this.rfqRepository = rfqRepository;
  }

  /**
   * @param input - Id da RFQ, fornecedor que respondeu, itens cotados (preco por item) e a transacao ativa.
   * @returns A RFQ atualizada, com as cotacoes registradas carregadas.
   * @throws {NotFoundError} Se a RFQ nao existir.
   * @throws {BusinessRuleError} Se a RFQ nao estiver `sent`/`quoted` (422), se o fornecedor nao tiver sido convidado (422), ou se algum `rfq_item_id` nao pertencer a esta RFQ (422, `details.invalid_rfq_item_ids`).
   */
  public async execute(input: RegisterRfqQuoteInput): Promise<any> {
    const rfq = await this.rfqRepository.findRfqByIdForUpdate(input.id, input.transaction);
    if (!rfq) {
      throw new NotFoundError('Cotacao (RFQ) nao encontrada.');
    }

    if (!QUOTABLE_STATUSES.includes(rfq.status)) {
      throw new BusinessRuleError(
        `Nao e possivel registrar cotacao para uma RFQ com status "${rfq.status}". Convide o fornecedor primeiro.`,
        { current_status: rfq.status },
      );
    }

    const rfqSupplier = await this.rfqRepository.findRfqSupplier(input.id, input.supplier_id, input.transaction);
    if (!rfqSupplier) {
      throw new BusinessRuleError('Este fornecedor nao foi convidado para esta cotacao.', { supplier_id: input.supplier_id });
    }

    const rfqItems: any[] = await this.rfqRepository.findRfqItems(input.id, input.transaction);
    const validRfqItemIds = new Set(rfqItems.map((row) => row.id));

    const invalidIds = input.items
      .map((item) => item.rfq_item_id)
      .filter((id) => !validRfqItemIds.has(id));
    if (invalidIds.length > 0) {
      throw new BusinessRuleError(
        `Os itens informados nao pertencem a esta RFQ: ${invalidIds.join(', ')}.`,
        { invalid_rfq_item_ids: invalidIds },
      );
    }

    for (const item of input.items) {
      const existingQuote = await this.rfqRepository.findRfqQuote(item.rfq_item_id, input.supplier_id, input.transaction);
      const payload = {
        rfq_item_id: item.rfq_item_id,
        supplier_id: input.supplier_id,
        unit_price: item.unit_price,
        lead_time_days: item.lead_time_days ?? null,
        moq: item.moq ?? null,
        validity_date: item.validity_date ?? null,
        notes: item.notes ?? null,
      };

      if (existingQuote) {
        await this.rfqRepository.updateRfqQuote(existingQuote.id, payload, input.transaction);
      } else {
        await this.rfqRepository.createRfqQuote(payload, input.transaction);
      }
    }

    await this.rfqRepository.updateRfqSupplier(rfqSupplier.id, {
      status: 'responded',
      responded_at: new Date(),
    }, input.transaction);

    if (rfq.status === 'sent') {
      await this.rfqRepository.updateRfq(input.id, { status: 'quoted' }, input.transaction);
    }

    return this.rfqRepository.findRfqById(input.id, input.transaction);
  }
}

export = RegisterRfqQuoteUseCase;
