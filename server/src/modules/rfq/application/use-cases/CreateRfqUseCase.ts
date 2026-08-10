/**
 * Caso de uso para criar uma Cotacao/RFQ (Request for Quotation)
 * multi-fornecedor.
 *
 * A RFQ pode nascer de duas formas:
 * - **A partir de uma requisicao** (`requisition_id` informado): os itens
 *   sao puxados automaticamente de `purchase_requisition_items` (nao aceita
 *   `items` no payload nesse caso — validado no schema Zod, `.refine`).
 *   Somente itens com SALDO (status `pending`) sao puxados, e a requisicao
 *   precisa estar num estado que ainda admita compra — ver G12 em
 *   {@link CreateRfqUseCase.execute}.
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

/**
 * Estados de requisicao que NAO admitem mais uma cotacao: a compra daqueles
 * itens ja aconteceu (`ordered`/`partial`/`received`) ou a requisicao morreu
 * (`canceled`). Cotar aqui e o primeiro passo do caminho que gerava pedido
 * de compra em duplicidade (gap G12).
 *
 * `draft`/`pending`/`approved` continuam permitidos de proposito: cotar
 * ANTES de aprovar e pratica normal de compras (o preco cotado e justamente
 * o que embasa a aprovacao). O que a cotacao nao pode e virar pedido sem
 * aprovacao — esse gate fica na adjudicacao (`AwardRfqUseCase`).
 */
const NON_QUOTABLE_REQUISITION_STATUSES = ['ordered', 'partial', 'received', 'canceled'];

/** Status de item de requisicao que ainda tem saldo a comprar. */
const PENDING_REQUISITION_ITEM_STATUS = 'pending';

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
   * Gap G12 (auditoria da cadeia do produto, 2026-08-09): a criacao puxava
   * os itens da requisicao sem olhar NEM o status da requisicao NEM o status
   * de cada item. Dava para cotar uma requisicao ja convertida em pedido de
   * compra (ou cancelada) e, adjudicando a cotacao, gerar um SEGUNDO pedido
   * dos mesmos itens. Agora a requisicao precisa estar num estado que ainda
   * admita compra e so os itens com saldo (`pending`) sao cotados.
   *
   * @param input - Payload validado pelo controller + `created_by`/`transaction` injetados.
   * @returns A cotacao criada, com itens/fornecedores/cotacoes carregados (vazios na criacao).
   * @throws {NotFoundError} Se `requisition_id` nao corresponder a uma requisicao existente, ou se algum `item_id` nao existir.
   * @throws {BusinessRuleError} Se a requisicao estiver em estado que nao admite mais cotacao, ou se nao houver item com saldo a cotar.
   */
  public async execute(input: CreateRfqInput): Promise<any> {
    let itemsToCreate: RfqItemInput[];
    let requisitionId: number | null = null;

    if (input.requisition_id) {
      const requisition = await this.rfqRepository.findRequisitionWithItems(input.requisition_id, input.transaction);
      if (!requisition) {
        throw new NotFoundError(`Requisicao ${input.requisition_id} nao encontrada.`);
      }

      if (NON_QUOTABLE_REQUISITION_STATUSES.includes(requisition.status)) {
        throw new BusinessRuleError(
          `A requisicao ${requisition.requisition_number ?? requisition.id} esta com status "${requisition.status}" e nao pode mais ser cotada. `
          + 'Cotar e adjudicar uma requisicao ja atendida geraria um segundo pedido de compra dos mesmos itens.',
          { requisition_id: requisition.id, current_status: requisition.status },
        );
      }

      const requisitionItems: any[] = requisition.items ?? [];
      if (requisitionItems.length === 0) {
        throw new BusinessRuleError('A requisicao informada nao possui itens para cotar.');
      }

      // G12: so entram na cotacao os itens com saldo. Itens ja convertidos
      // em pedido (`ordered`) ou cancelados nao podem ser cotados de novo.
      const pendingItems = requisitionItems.filter(
        (item: any) => item.status === PENDING_REQUISITION_ITEM_STATUS
      );
      if (pendingItems.length === 0) {
        throw new BusinessRuleError(
          `Todos os itens da requisicao ${requisition.requisition_number ?? requisition.id} ja foram pedidos ou cancelados — nao ha saldo a cotar.`,
          { requisition_id: requisition.id },
        );
      }

      requisitionId = requisition.id;
      itemsToCreate = pendingItems.map((item: any) => ({
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
