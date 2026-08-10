/**
 * Caso de uso para adjudicar (award) uma RFQ `quoted`: escolhe, por item, o
 * fornecedor vencedor entre os que cotaram (podendo dividir itens entre
 * fornecedores diferentes), gera um Pedido de Compra por fornecedor vencedor
 * (mesmo padrao de `ConvertRequisitionToPurchaseOrdersUseCase`, agrupando
 * por fornecedor e resolvendo `product_id` legado via `items.codigo`), marca
 * a RFQ `awarded` e REALIMENTA o catalogo `item_suppliers` com o preco/prazo
 * cotado do vencedor (upsert — e assim que o historico de cotacao atualiza
 * o catalogo item x fornecedor para as proximas requisicoes/conversoes).
 *
 * Quando a RFQ nasceu de uma Requisicao de Compra, a adjudicacao tambem
 * consome o SALDO daquela requisicao (gap G12) — ver {@link AwardRfqUseCase.execute}.
 *
 * Toda a operacao roda em uma unica transacao, com a RFQ travada via
 * `SELECT ... FOR UPDATE` (repositorio) para impedir adjudicacoes
 * concorrentes duplicadas.
 *
 * @module modules/rfq/application/use-cases/AwardRfqUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../errors';
import { generatePurchaseOrderNumber } from '../../../../shared/utils/strings';
import RfqRepository from '../../domain/repositories/RfqRepository';
import PurchaseRequisitionRepository from '../../../purchaseRequisitions/domain/repositories/PurchaseRequisitionRepository';

/**
 * Unico status de requisicao que autoriza virar pedido de compra — mesma
 * regra de `ConvertRequisitionToPurchaseOrdersUseCase` (gap G12: adjudicar
 * era um caminho paralelo que gerava pedido sem passar por essa porta).
 */
const REQUISITION_STATUS_READY_TO_ORDER = 'approved';

/** Status de item de requisicao que ainda tem saldo a comprar. */
const PENDING_REQUISITION_ITEM_STATUS = 'pending';

interface AwardEntryInput {
  rfq_item_id: number;
  supplier_id: number;
}

interface AwardRfqInput {
  id: number;
  awards: AwardEntryInput[];
  notes?: string;
  userId: number;
  transaction: any;
}

class AwardRfqUseCase extends UseCase<AwardRfqInput, any> {
  private readonly rfqRepository: RfqRepository;
  private readonly purchaseRepository: any;
  private readonly itemSupplierRepository: any;
  private readonly requisitionRepository: PurchaseRequisitionRepository;

  /**
   * @param rfqRepository - Repositorio de cotacoes.
   * @param purchaseRepository - Repositorio de pedidos de compra (modulo `purchases`).
   * @param itemSupplierRepository - Repositorio do catalogo item x fornecedor (modulo `items`).
   * @param requisitionRepository - Repositorio de requisicoes (modulo `purchaseRequisitions`), usado para consumir o saldo da requisicao de origem (G12).
   */
  public constructor(
    rfqRepository: RfqRepository,
    purchaseRepository: any,
    itemSupplierRepository: any,
    requisitionRepository: PurchaseRequisitionRepository,
  ) {
    super();
    this.rfqRepository = rfqRepository;
    this.purchaseRepository = purchaseRepository;
    this.itemSupplierRepository = itemSupplierRepository;
    this.requisitionRepository = requisitionRepository;
  }

  /**
   * Adjudica a cotacao e gera o(s) pedido(s) de compra.
   *
   * Gap G12 (auditoria da cadeia do produto, 2026-08-09): a adjudicacao
   * criava pedidos de compra sem NUNCA olhar a requisicao de origem, embora
   * gravasse `requisition_id` neles. Como `ConvertRequisitionToPurchaseOrdersUseCase`
   * tambem cria pedidos da mesma requisicao e so ele mexia no status dela,
   * os mesmos itens viravam DOIS pedidos de compra — pelos dois caminhos, em
   * qualquer ordem. Agora, quando a RFQ vem de requisicao, a adjudicacao:
   *
   * 1. trava a requisicao (`FOR UPDATE`) na mesma transacao;
   * 2. exige que ela esteja `approved` — mesma porta da conversao direta,
   *    o que tambem impede o pulo `draft/pending -> ordered` (adjudicar uma
   *    requisicao nao aprovada era um desvio do gate de aprovacao);
   * 3. exige que os itens adjudicados ainda tenham saldo (`pending`);
   * 4. consome o saldo: os itens adjudicados viram `ordered` e, so quando
   *    NAO sobra nenhum item pendente, a requisicao inteira vira `ordered`.
   *    Sobrando saldo, ela permanece `approved` (aberta), e o restante pode
   *    ser comprado por outra cotacao ou pela conversao direta.
   *
   * O status `partial` de `purchase_requisitions` NAO e usado aqui de
   * proposito: o enum da tabela (`...ordered, partial, received...`) espelha
   * o de `purchase_orders`, onde `partial` significa "parcialmente
   * RECEBIDO". Reaproveita-lo para "parcialmente pedido" colidiria com a
   * rotina de recebimento (gap G15, fora do escopo desta correcao). O saldo
   * por item ja vive em `purchase_requisition_items.status`, cujo enum
   * (`pending|ordered|canceled`) e inequivoco.
   *
   * @param input - Id da RFQ, lista de adjudicacoes `{ rfq_item_id, supplier_id }`, notas opcionais, id do usuario logado e a transacao ativa (com lock).
   * @returns `{ purchase_orders, rfq_id, rfq_status, requisition_id, requisition_status }`.
   * @throws {NotFoundError} Se a RFQ nao existir, ou se a requisicao de origem nao existir mais.
   * @throws {BusinessRuleError} Se a RFQ nao estiver `quoted` (422), se algum `rfq_item_id` for duplicado/nao pertencer a RFQ, se nao houver cotacao registrada para o par item/fornecedor informado, se algum item nao tiver produto legado correspondente (`items.codigo` sem `products.code`), se a requisicao de origem nao estiver `approved` ou se algum item adjudicado nao tiver mais saldo nela.
   */
  public async execute(input: AwardRfqInput): Promise<any> {
    const rfq = await this.rfqRepository.findRfqByIdForUpdate(input.id, input.transaction);
    if (!rfq) {
      throw new NotFoundError('Cotacao (RFQ) nao encontrada.');
    }

    if (rfq.status !== 'quoted') {
      throw new BusinessRuleError(
        `Cotacao precisa estar com status "quoted" para ser adjudicada (status atual: ${rfq.status}).`,
        { current_status: rfq.status },
      );
    }

    const duplicateItemIds = input.awards
      .map((award) => award.rfq_item_id)
      .filter((id, index, all) => all.indexOf(id) !== index);
    if (duplicateItemIds.length > 0) {
      throw new BusinessRuleError(
        `Cada item so pode ser adjudicado a um fornecedor: itens duplicados na adjudicacao: ${[...new Set(duplicateItemIds)].join(', ')}.`,
        { duplicate_rfq_item_ids: [...new Set(duplicateItemIds)] },
      );
    }

    const rfqDetail = await this.rfqRepository.findRfqById(input.id, input.transaction);
    const rfqDetailJson = rfqDetail.toJSON ? rfqDetail.toJSON() : rfqDetail;
    const rfqItemsById = new Map<number, any>((rfqDetailJson.items ?? []).map((item: any) => [item.id, item]));

    const invalidItemIds: number[] = [];
    const itemsWithoutQuote: Array<{ rfq_item_id: number; supplier_id: number }> = [];

    type ResolvedAward = { rfqItemId: number; supplierId: number; itemId: string; codigo: string; quantity: number; unitPrice: number; leadTimeDays: number | null; moq: number | null };
    const resolvedAwards: ResolvedAward[] = [];

    for (const award of input.awards) {
      const rfqItem = rfqItemsById.get(award.rfq_item_id);
      if (!rfqItem) {
        invalidItemIds.push(award.rfq_item_id);
        continue;
      }

      const quote = (rfqItem.quotes ?? []).find((q: any) => q.supplier_id === award.supplier_id);
      if (!quote) {
        itemsWithoutQuote.push({ rfq_item_id: award.rfq_item_id, supplier_id: award.supplier_id });
        continue;
      }

      resolvedAwards.push({
        rfqItemId: rfqItem.id,
        supplierId: award.supplier_id,
        itemId: String(rfqItem.item_id),
        codigo: rfqItem.item?.codigo,
        quantity: parseFloat(rfqItem.quantity),
        unitPrice: parseFloat(quote.unit_price),
        leadTimeDays: quote.lead_time_days ?? null,
        moq: quote.moq != null ? parseFloat(quote.moq) : null,
      });
    }

    if (invalidItemIds.length > 0) {
      throw new BusinessRuleError(
        `Os itens informados nao pertencem a esta RFQ: ${invalidItemIds.join(', ')}.`,
        { invalid_rfq_item_ids: invalidItemIds },
      );
    }
    if (itemsWithoutQuote.length > 0) {
      throw new BusinessRuleError(
        'Nao ha cotacao registrada para um ou mais pares item/fornecedor informados na adjudicacao.',
        { items_without_quote: itemsWithoutQuote },
      );
    }

    // Resolve product_id legado (products.code = items.codigo) para cada item.
    const missingProductCodes: string[] = [];
    const codeToProduct = new Map<string, any>();
    for (const award of resolvedAwards) {
      if (!award.codigo) {
        missingProductCodes.push(award.itemId);
        continue;
      }
      if (codeToProduct.has(award.codigo)) continue;

      const product = await this.purchaseRepository.findProductByCode(award.codigo, input.transaction);
      if (!product) {
        missingProductCodes.push(award.codigo);
        continue;
      }
      codeToProduct.set(award.codigo, product);
    }
    if (missingProductCodes.length > 0) {
      throw new BusinessRuleError(
        `Cadastre o produto correspondente para os codigos ausentes em products: ${missingProductCodes.join(', ')}.`,
        { missing_product_codes: missingProductCodes },
      );
    }

    // G12: consome o saldo da requisicao de origem, se houver. Trava a
    // requisicao ANTES de criar qualquer pedido — se ela nao admitir mais
    // compra, nada e criado.
    const requisitionId: number | null = rfqDetailJson.requisition_id ?? null;
    const awardedItemIds = new Set(resolvedAwards.map((award) => String(award.itemId)));
    let requisition: any = null;
    let requisitionItemsToOrder: any[] = [];

    if (requisitionId) {
      requisition = await this.requisitionRepository.findRequisitionByIdForUpdate(requisitionId, input.transaction);
      if (!requisition) {
        throw new NotFoundError(`Requisicao ${requisitionId} (origem desta cotacao) nao encontrada.`);
      }

      if (requisition.status !== REQUISITION_STATUS_READY_TO_ORDER) {
        throw new BusinessRuleError(
          `A requisicao ${requisition.requisition_number ?? requisitionId} precisa estar aprovada para virar pedido de compra `
          + `(status atual: ${requisition.status}). Adjudicar aqui geraria pedido sem passar pela aprovacao da requisicao, `
          + 'ou um segundo pedido dos itens que ja foram pedidos.',
          { requisition_id: requisitionId, current_status: requisition.status },
        );
      }

      const requisitionItems: any[] = requisition.items ?? [];
      requisitionItemsToOrder = requisitionItems.filter((item: any) => awardedItemIds.has(String(item.item_id)));

      const withoutBalance = requisitionItemsToOrder.filter(
        (item: any) => item.status !== PENDING_REQUISITION_ITEM_STATUS
      );
      if (withoutBalance.length > 0) {
        throw new BusinessRuleError(
          'Um ou mais itens adjudicados ja foram pedidos (ou cancelados) na requisicao de origem — nao ha saldo para gerar outro pedido de compra.',
          {
            requisition_id: requisitionId,
            requisition_item_ids_without_balance: withoutBalance.map((item: any) => item.id),
          },
        );
      }
    }

    // Agrupa adjudicacoes por fornecedor vencedor.
    const groupsBySupplier = new Map<number, ResolvedAward[]>();
    for (const award of resolvedAwards) {
      const group = groupsBySupplier.get(award.supplierId) ?? [];
      group.push(award);
      groupsBySupplier.set(award.supplierId, group);
    }

    const createdPurchases: any[] = [];
    let orderSuffix = 0;

    for (const [supplierId, group] of groupsBySupplier.entries()) {
      orderSuffix += 1;
      const orderNumber = groupsBySupplier.size > 1
        ? `${generatePurchaseOrderNumber()}-${orderSuffix}`
        : generatePurchaseOrderNumber();

      let totalAmount = 0;
      const itemPayloads = group.map((award) => {
        const product = codeToProduct.get(award.codigo);
        const totalPrice = award.quantity * award.unitPrice;
        totalAmount += totalPrice;
        return {
          product_id: product.id,
          item_id: award.itemId,
          quantity: award.quantity,
          unit_price: award.unitPrice,
          total_price: totalPrice,
          status: 'pending',
        };
      });

      const baseNote = input.notes ?? `Gerado automaticamente da cotacao ${rfqDetailJson.rfq_number}`;

      const purchase = await this.purchaseRepository.createPurchase({
        order_number: orderNumber,
        supplier_id: supplierId,
        requester_id: input.userId,
        requisition_id: requisitionId,
        total_amount: totalAmount,
        order_date: new Date(),
        expected_date: null,
        delivery_date: null,
        freight_type: null,
        freight_value: 0,
        status: 'pending',
        notes: baseNote,
        invoice_number: null,
        invoice_date: null,
      }, input.transaction);

      const createdItems: any[] = [];
      for (const payload of itemPayloads) {
        const createdItem = await this.purchaseRepository.createPurchaseItem({
          purchase_id: purchase.id,
          ...payload,
        }, input.transaction);
        createdItems.push(createdItem);
      }

      createdPurchases.push({ ...purchase.toJSON(), items: createdItems.map((i: any) => (i.toJSON ? i.toJSON() : i)) });
    }

    // Congela o vencedor em cada rfq_item e realimenta o catalogo item_suppliers.
    for (const award of resolvedAwards) {
      await this.rfqRepository.updateRfqItem(award.rfqItemId, {
        awarded_supplier_id: award.supplierId,
        awarded_unit_price: award.unitPrice,
      }, input.transaction);

      const existingLink = await this.itemSupplierRepository.findByItemAndSupplier(
        award.itemId,
        award.supplierId,
        input.transaction,
      );
      const catalogData = {
        unit_price: award.unitPrice,
        lead_time_days: award.leadTimeDays,
        moq: award.moq,
      };
      if (existingLink) {
        await this.itemSupplierRepository.update(existingLink.id, catalogData, input.transaction);
      } else {
        await this.itemSupplierRepository.create({
          item_id: award.itemId,
          supplier_id: award.supplierId,
          currency: 'BRL',
          preferred: false,
          active: true,
          notes: null,
          supplier_item_code: null,
          ...catalogData,
        }, input.transaction);
      }
    }

    await this.rfqRepository.updateRfq(input.id, { status: 'awarded' }, input.transaction);

    // G12: baixa o saldo da requisicao de origem na MESMA transacao dos
    // pedidos. Sem isso, os mesmos itens podiam ser pedidos de novo — por
    // outra cotacao ou pela conversao direta da requisicao.
    let requisitionStatus: string | null = null;
    if (requisition) {
      for (const item of requisitionItemsToOrder) {
        await this.requisitionRepository.updateRequisitionItem(
          item.id,
          { status: 'ordered' },
          input.transaction,
        );
      }

      const orderedItemIds = new Set(requisitionItemsToOrder.map((item: any) => item.id));
      const remainingPending = (requisition.items ?? []).filter(
        (item: any) => item.status === PENDING_REQUISITION_ITEM_STATUS && !orderedItemIds.has(item.id)
      );

      // So fecha a requisicao quando nao sobra saldo. Sobrando, ela continua
      // `approved` (aberta) — ver na doc de `execute` por que `partial` NAO e
      // usado aqui.
      requisitionStatus = remainingPending.length === 0 ? 'ordered' : requisition.status;
      if (requisitionStatus !== requisition.status) {
        await this.requisitionRepository.updateRequisition(
          requisition.id,
          { status: requisitionStatus },
          input.transaction,
        );
      }
    }

    return {
      purchase_orders: createdPurchases,
      rfq_id: input.id,
      rfq_status: 'awarded',
      requisition_id: requisitionId,
      requisition_status: requisitionStatus,
    };
  }
}

export = AwardRfqUseCase;
