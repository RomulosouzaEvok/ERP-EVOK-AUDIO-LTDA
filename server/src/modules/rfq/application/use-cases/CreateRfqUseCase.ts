/**
 * Caso de uso para criar uma Cotacao/RFQ (Request for Quotation)
 * multi-fornecedor.
 *
 * A RFQ pode nascer de duas formas:
 * - **A partir de uma requisicao** (`requisition_id` informado): os itens
 *   sao puxados automaticamente de `purchase_requisition_items` (nao aceita
 *   `items` no payload nesse caso — validado no schema Zod, `.refine`).
 * - **Avulsa** (`requisition_id` ausente): os itens vem diretamente do
 *   payload (`items`, obrigatorio e nao vazio nesse caso).
 *
 * O numero da cotacao segue o padrao `RFQ-<ano>-XXXX` (sequencial por ano,
 * calculado por contagem — ver limitacao de concorrencia documentada em
 * {@link RfqRepository.countRfqsInYear}).
 *
 * @module modules/rfq/application/use-cases/CreateRfqUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../errors';
import RfqRepository from '../../domain/repositories/RfqRepository';
import ItemRepository from '../../../items/domain/repositories/ItemRepository';

interface RfqItemInput {
  item_id: string;
  quantity: number;
  unit?: string;
}

interface CreateRfqInput {
  requisition_id?: number;
  items?: RfqItemInput[];
  response_deadline?: string;
  notes?: string;
  created_by: number;
  transaction: any;
}

class CreateRfqUseCase extends UseCase<CreateRfqInput, any> {
  private readonly rfqRepository: RfqRepository;
  private readonly itemRepository: ItemRepository;

  public constructor(rfqRepository: RfqRepository, itemRepository: ItemRepository) {
    super();
    this.rfqRepository = rfqRepository;
    this.itemRepository = itemRepository;
  }

  /**
   * Cria a cotacao com seus itens.
   *
   * @param input - Payload validado pelo controller + `created_by`/`transaction` injetados.
   * @returns A cotacao criada, com itens/fornecedores/cotacoes carregados (vazios na criacao).
   * @throws {NotFoundError} Se `requisition_id` nao corresponder a uma requisicao existente, ou se algum `item_id` nao existir.
   * @throws {BusinessRuleError} Se a requisicao informada nao tiver itens.
   */
  public async execute(input: CreateRfqInput): Promise<any> {
    let itemsToCreate: RfqItemInput[];
    let requisitionId: number | null = null;

    if (input.requisition_id) {
      const requisition = await this.rfqRepository.findRequisitionWithItems(input.requisition_id, input.transaction);
      if (!requisition) {
        throw new NotFoundError(`Requisicao ${input.requisition_id} nao encontrada.`);
      }

      const requisitionItems: any[] = requisition.items ?? [];
      if (requisitionItems.length === 0) {
        throw new BusinessRuleError('A requisicao informada nao possui itens para cotar.');
      }

      requisitionId = requisition.id;
      itemsToCreate = requisitionItems.map((item: any) => ({
        item_id: String(item.item_id),
        quantity: parseFloat(item.quantity),
        unit: item.unit ?? undefined,
      }));
    } else {
      itemsToCreate = input.items ?? [];
    }

    if (itemsToCreate.length === 0) {
      throw new BusinessRuleError('Informe ao menos um item (diretamente ou via requisition_id).');
    }

    for (const item of itemsToCreate) {
      const existingItem = await this.itemRepository.findById(String(item.item_id));
      if (!existingItem) {
        throw new NotFoundError(`Item ${item.item_id} nao encontrado.`);
      }
    }

    const year = new Date().getFullYear();
    const sequential = (await this.rfqRepository.countRfqsInYear(year, input.transaction)) + 1;
    const rfqNumber = `RFQ-${year}-${String(sequential).padStart(4, '0')}`;

    const rfq = await this.rfqRepository.createRfq({
      rfq_number: rfqNumber,
      requisition_id: requisitionId,
      status: 'draft',
      created_by: input.created_by,
      response_deadline: input.response_deadline ?? null,
      notes: input.notes ?? null,
    }, input.transaction);

    for (const item of itemsToCreate) {
      await this.rfqRepository.createRfqItem({
        rfq_id: rfq.id,
        item_id: item.item_id,
        quantity: item.quantity,
        unit: item.unit ?? null,
      }, input.transaction);
    }

    return this.rfqRepository.findRfqById(rfq.id, input.transaction);
  }
}

export = CreateRfqUseCase;
