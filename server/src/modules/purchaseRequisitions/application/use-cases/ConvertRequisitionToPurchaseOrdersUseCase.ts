/**
 * Caso de uso para converter uma Requisicao de Compra APROVADA em um ou
 * mais Pedidos de Compra (`purchase_orders`), fechando o ciclo
 * requisicao -> compra -> recebimento -> estoque.
 *
 * Regras:
 * - A requisicao deve existir (404) e estar em status `approved` (422
 *   `BusinessRuleError` caso contrario).
 * - Cada item da requisicao tem seu fornecedor resolvido, nesta ordem de
 *   prioridade: (1) `suggested_supplier_id` do item; (2) fornecedor
 *   preferencial ativo em `item_suppliers` (`findPreferredByItem`);
 *   (3) `fallback_supplier_id` informado no body. Se nenhum resolver,
 *   `BusinessRuleError` (422) listando os `item_id` sem fornecedor.
 * - Cada item da requisicao referencia um `Item` (UUID, modelo canonico);
 *   `purchase_order_items` exige `product_id` (INTEGER, tabela legada
 *   `products`). O produto correspondente e resolvido por
 *   `products.code = items.codigo`. Se algum `codigo` nao tiver produto
 *   correspondente, `BusinessRuleError` (422) listando os codigos ausentes.
 * - Os itens sao agrupados por fornecedor resolvido; um `Purchase` (pedido
 *   de compra) e criado por fornecedor, com todos os itens daquele grupo.
 * - `unit_price` de cada item do pedido: preco do vinculo `item_suppliers`
 *   para AQUELE fornecedor resolvido, senao `unit_price_estimated` do item
 *   da requisicao, senao `0`.
 * - Ao final, a requisicao e marcada `ordered` e todos os seus itens
 *   tambem sao marcados `ordered`.
 * - Bloco 2 (UC-39, BUSINESS_RULES.md §9): se `requisition.origin ===
 *   'engenharia_amostra'`, o(s) pedido(s) de compra gerado(s) recebem uma
 *   marcacao automatica em `notes` ("AMOSTRA ENGENHARIA — receber no
 *   Depósito do Laboratório"), concatenada com a nota informada/padrao.
 *   Nao ha coluna nova em `purchase_orders` para isso — o roteamento REAL
 *   de deposito no recebimento e resolvido separadamente por
 *   `ReceivePurchaseItemsUseCase`, via join `purchase_orders.requisition_id
 *   -> purchase_requisitions.origin` (a nota e apenas informativa/auditavel
 *   para quem le a tela de Recebimento).
 *
 * Toda a operacao roda em uma unica transacao, com a requisicao e seus
 * itens travados via `SELECT ... FOR UPDATE` (repositorio) para impedir
 * conversoes concorrentes duplicadas.
 *
 * @module modules/purchaseRequisitions/application/use-cases/ConvertRequisitionToPurchaseOrdersUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { BusinessRuleError, NotFoundError } from '../../../../errors';
import { generatePurchaseOrderNumber } from '../../../../shared/utils/strings';
import PurchaseRequisitionRepository from '../../domain/repositories/PurchaseRequisitionRepository';

const PurchaseRepository = require('../../../purchases/domain/repositories/PurchaseRepository');
const ItemSupplierRepository = require('../../../items/domain/repositories/ItemSupplierRepository');

interface ConvertRequisitionInput {
  id: number;
  fallback_supplier_id?: number;
  notes?: string;
  userId: number;
  transaction: any;
}

class ConvertRequisitionToPurchaseOrdersUseCase extends UseCase<ConvertRequisitionInput, any> {
  private readonly requisitionRepository: PurchaseRequisitionRepository;
  private readonly purchaseRepository: typeof PurchaseRepository;
  private readonly itemSupplierRepository: typeof ItemSupplierRepository;

  public constructor(
    requisitionRepository: PurchaseRequisitionRepository,
    purchaseRepository: typeof PurchaseRepository,
    itemSupplierRepository: typeof ItemSupplierRepository,
  ) {
    super();
    this.requisitionRepository = requisitionRepository;
    this.purchaseRepository = purchaseRepository;
    this.itemSupplierRepository = itemSupplierRepository;
  }

  /**
   * Executa a conversao da requisicao em um ou mais pedidos de compra.
   *
   * @param input - Id da requisicao, fornecedor de fallback opcional, notas
   *   opcionais, id do usuario logado (`requester_id` dos pedidos criados) e
   *   a transacao Sequelize ativa (aberta pelo controller, com lock).
   * @returns `{ purchase_orders, requisition_id, requisition_status }`.
   * @throws NotFoundError se a requisicao nao existir.
   * @throws BusinessRuleError se a requisicao nao estiver `approved`, se
   *   algum item nao tiver fornecedor resolvivel, ou se algum item nao
   *   tiver produto legado correspondente.
   */
  public async execute(input: ConvertRequisitionInput): Promise<any> {
    const { id, fallback_supplier_id, notes, userId, transaction } = input;

    const requisition = await this.requisitionRepository.findRequisitionByIdForUpdate(id, transaction);
    if (!requisition) {
      throw new NotFoundError('Requisicao nao encontrada.');
    }

    if (requisition.status !== 'approved') {
      throw new BusinessRuleError(
        `Requisicao precisa estar aprovada para ser convertida em pedido de compra (status atual: ${requisition.status}).`,
        { current_status: requisition.status },
      );
    }

    const items: any[] = requisition.items ?? [];
    if (items.length === 0) {
      throw new BusinessRuleError('Requisicao nao possui itens para converter.');
    }

    // 1) Resolve fornecedor de cada item.
    const itemsWithoutSupplier: (number | string)[] = [];
    const resolvedItems: Array<{ item: any; supplierId: number; supplierUnitPrice: number | null }> = [];

    for (const item of items) {
      let supplierId: number | null = item.suggested_supplier_id ?? null;
      let supplierUnitPrice: number | null = null;

      if (!supplierId) {
        const preferred = await this.itemSupplierRepository.findPreferredByItem(String(item.item_id));
        if (preferred) {
          supplierId = preferred.supplier_id;
          supplierUnitPrice = preferred.unit_price != null ? parseFloat(preferred.unit_price) : null;
        }
      }

      if (!supplierId && fallback_supplier_id) {
        supplierId = fallback_supplier_id;
      }

      if (!supplierId) {
        itemsWithoutSupplier.push(item.id);
        continue;
      }

      // Se o fornecedor foi resolvido por sugestao/fallback (nao pelo
      // preferencial ja consultado acima), busca o preco de catalogo
      // especifico para AQUELE fornecedor.
      if (supplierUnitPrice === null) {
        const link = await this.itemSupplierRepository.findByItemAndSupplier(String(item.item_id), supplierId);
        if (link?.unit_price != null) {
          supplierUnitPrice = parseFloat(link.unit_price);
        }
      }

      resolvedItems.push({ item, supplierId, supplierUnitPrice });
    }

    if (itemsWithoutSupplier.length > 0) {
      throw new BusinessRuleError(
        `Nao foi possivel resolver fornecedor para os itens da requisicao: ${itemsWithoutSupplier.join(', ')}. Informe fallback_supplier_id ou cadastre um fornecedor preferencial.`,
        { item_ids_without_supplier: itemsWithoutSupplier },
      );
    }

    // 2) Resolve product_id legado (products.code = items.codigo) para cada item.
    const missingProductCodes: string[] = [];
    const codeToProduct = new Map<string, any>();

    for (const { item } of resolvedItems) {
      const codigo = item.item?.codigo;
      if (!codigo) {
        missingProductCodes.push(String(item.item_id));
        continue;
      }
      if (codeToProduct.has(codigo)) continue;

      const product = await this.purchaseRepository.findProductByCode(codigo, transaction);
      if (!product) {
        missingProductCodes.push(codigo);
        continue;
      }
      codeToProduct.set(codigo, product);
    }

    if (missingProductCodes.length > 0) {
      throw new BusinessRuleError(
        `Cadastre o produto correspondente para os codigos ausentes em products: ${missingProductCodes.join(', ')}.`,
        { missing_product_codes: missingProductCodes },
      );
    }

    // 3) Agrupa itens por fornecedor resolvido.
    const groupsBySupplier = new Map<number, typeof resolvedItems>();
    for (const resolved of resolvedItems) {
      const group = groupsBySupplier.get(resolved.supplierId) ?? [];
      group.push(resolved);
      groupsBySupplier.set(resolved.supplierId, group);
    }

    // 4) Cria um Purchase por fornecedor.
    const createdPurchases: any[] = [];
    let orderSuffix = 0;

    for (const [supplierId, group] of groupsBySupplier.entries()) {
      orderSuffix += 1;
      const orderNumber = groupsBySupplier.size > 1
        ? `${generatePurchaseOrderNumber()}-${orderSuffix}`
        : generatePurchaseOrderNumber();

      let totalAmount = 0;
      const itemPayloads = group.map(({ item, supplierUnitPrice }) => {
        const product = codeToProduct.get(item.item.codigo);
        const quantity = parseFloat(item.quantity);
        const unitPrice = supplierUnitPrice ?? (item.unit_price_estimated != null ? parseFloat(item.unit_price_estimated) : 0);
        const totalPrice = quantity * unitPrice;
        totalAmount += totalPrice;
        return {
          product_id: product.id,
          item_id: item.item_id,
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          status: 'pending',
        };
      });

      // Bloco 2 (UC-39, BUSINESS_RULES.md §9): requisicao de amostra da
      // engenharia carrega uma marcacao automatica em `notes` do pedido
      // gerado, para o Recebimento identificar a origem sem precisar de
      // coluna nova em `purchase_orders` (nao existe campo dedicado —
      // decisao explicita desta entrega). O roteamento REAL de deposito no
      // recebimento e resolvido por `ReceivePurchaseItemsUseCase` via join
      // com `requisition_id` -> `purchase_requisitions.origin`, nao pelo
      // texto desta nota (que e apenas informativo/auditavel).
      const isEngineeringSample = requisition.origin === 'engenharia_amostra';
      const autoNote = isEngineeringSample
        ? 'AMOSTRA ENGENHARIA — receber no Depósito do Laboratório'
        : null;
      const baseNote = notes ?? `Gerado automaticamente da requisicao ${requisition.requisition_number}`;
      const finalNotes = autoNote ? `${autoNote} | ${baseNote}` : baseNote;

      const purchase = await this.purchaseRepository.createPurchase({
        order_number: orderNumber,
        supplier_id: supplierId,
        requester_id: userId,
        requisition_id: requisition.id,
        total_amount: totalAmount,
        order_date: new Date(),
        expected_date: null,
        delivery_date: null,
        freight_type: null,
        freight_value: 0,
        status: 'pending',
        notes: finalNotes,
        invoice_number: null,
        invoice_date: null,
      }, transaction);

      const createdItems: any[] = [];
      for (const payload of itemPayloads) {
        const createdItem = await this.purchaseRepository.createPurchaseItem({
          purchase_id: purchase.id,
          ...payload,
        }, transaction);
        createdItems.push(createdItem);
      }

      createdPurchases.push({ ...purchase.toJSON(), items: createdItems.map((i: any) => i.toJSON ? i.toJSON() : i) });
    }

    // 5) Atualiza requisicao e itens para `ordered`.
    for (const { item } of resolvedItems) {
      await this.requisitionRepository.updateRequisitionItem(item.id, { status: 'ordered' }, transaction);
    }
    await this.requisitionRepository.updateRequisition(requisition.id, { status: 'ordered' }, transaction);

    return {
      purchase_orders: createdPurchases,
      requisition_id: requisition.id,
      requisition_status: 'ordered',
    };
  }
}

export = ConvertRequisitionToPurchaseOrdersUseCase;
