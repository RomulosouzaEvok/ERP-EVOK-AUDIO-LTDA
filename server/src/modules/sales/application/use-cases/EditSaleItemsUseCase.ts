import type { Transaction } from 'sequelize';

const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../../../../errors');
const { toCents, fromCents } = require('../../../../shared/utils/money');
const InventoryService = require('../../../../services/inventoryService');
const WarehouseStockService = require('../../../../services/warehouseStockService');

interface EditItemInput {
  sale_item_id?: number;
  product_id: number;
  quantity: number;
  unit_price: number;
}

/**
 * Substitui o conjunto de itens de uma venda (gap 2/3 do módulo `sales` —
 * `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`, linha `sales`: "Alteração de
 * pedido"), cobrindo `PUT /api/sales/:id/items`.
 *
 * Regra de negócio: uma venda `quote` pode ser editada livremente (nada foi
 * debitado do estoque ainda — mesma premissa de `CreateSaleUseCase`/
 * `ChangeSaleStatusUseCase`). Uma venda `confirmed` também pode ter seus
 * itens/quantidades alterados, mas enquanto isso o estoque já debitado na
 * confirmação precisa ser ajustado na MESMA transação (delta de
 * quantidade por produto, ou restauração/débito completo quando o produto
 * de uma linha muda). A partir de `partially_invoiced`/`invoiced`/
 * `shipped`/`canceled` a edição é bloqueada com 422 didático
 * (`details.status`) — a venda já tem NF-e emitida (total ou parcial) ou
 * já foi encerrada, e a EVOK não pode alterar itens de um pedido já
 * faturado.
 *
 * Cada item do payload pode trazer `sale_item_id` (atualiza a linha
 * existente) ou omiti-lo (nova linha). Toda linha existente cujo
 * `sale_item_id` NÃO aparece no payload é removida (com restauração de
 * estoque, se aplicável). Isso corresponde a uma substituição completa do
 * conjunto de itens, não um PATCH incremental.
 */
class EditSaleItemsUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/SaleRepository')} saleRepository
   */
  constructor(saleRepository: any) {
    super();
    this.saleRepository = saleRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id da venda.
   * @param {EditItemInput[]} input.items - Novo conjunto de itens (substitui o atual).
   * @param {number} input.userId
   * @param {import('sequelize').Transaction} input.transaction
   * @returns {Promise<{ sale: Object, oldItems: Object[] }>} A venda atualizada e uma cópia dos itens anteriores (para auditoria).
   * @throws {NotFoundError} Se a venda, algum `sale_item_id` referenciado ou algum `product_id` não existir.
   * @throws {ValidationError} Se `sale_item_id` não pertencer à venda, houver `product_id` duplicado no payload, ou o desconto exceder o novo total.
   * @throws {BusinessRuleError} Se o status da venda não permitir edição, ou (para `confirmed`) não houver estoque suficiente para o aumento de quantidade.
   */
  async execute({ id, items, userId, transaction }: { id: number; items: EditItemInput[]; userId: number; transaction: Transaction }) {
    const sale = await this.saleRepository.findSaleWithItemsForUpdate(id, transaction);
    if (!sale) {
      throw new NotFoundError('Venda não encontrada');
    }

    const editableStatuses = ['quote', 'confirmed'];
    if (!editableStatuses.includes(sale.status)) {
      throw new BusinessRuleError(
        `Itens da venda não podem ser alterados: status atual '${sale.status}' não permite edição. ` +
        'Só é possível alterar itens em orçamento (quote) ou confirmada e ainda não faturada (confirmed).',
        { status: sale.status }
      );
    }

    const isQuote = sale.status === 'quote';
    const oldItemsById = new Map<number, any>(sale.items.map((item: any) => [item.id, item]));

    // Valida a forma do payload: sale_item_id (quando informado) precisa
    // pertencer a esta venda, e não pode haver product_id duplicado (o
    // conjunto final teria duas linhas indistinguíveis para o mesmo produto).
    const seenProductIds = new Set<number>();
    const referencedItemIds = new Set<number>();
    for (const item of items) {
      if (item.sale_item_id !== undefined) {
        if (!oldItemsById.has(item.sale_item_id)) {
          throw new ValidationError(`Item #${item.sale_item_id} não pertence a esta venda`);
        }
        referencedItemIds.add(item.sale_item_id);
      }
      if (seenProductIds.has(item.product_id)) {
        throw new ValidationError(`Produto ${item.product_id} informado mais de uma vez no payload`);
      }
      seenProductIds.add(item.product_id);
    }

    const acabadosWarehouse = isQuote
      ? null
      : await WarehouseStockService.getWarehouseByCode('ACABADOS', transaction);

    // 1) Remove linhas que não aparecem mais no payload, restaurando estoque.
    for (const [itemId, oldItem] of oldItemsById) {
      if (referencedItemIds.has(itemId)) continue;

      if (!isQuote) {
        if (Number(oldItem.invoiced_quantity) > 0) {
          throw new BusinessRuleError(
            `Item #${itemId} já possui quantidade faturada e não pode ser removido.`,
            { sale_item_id: itemId, invoiced_quantity: oldItem.invoiced_quantity }
          );
        }
        await InventoryService.receive(oldItem.product_id, oldItem.quantity, userId, transaction, {
          description: `Alteração de itens - Venda #${sale.id} (item removido)`,
          referenceId: sale.id,
          referenceType: 'adjustment'
        });
        await WarehouseStockService.addToWarehouse(oldItem.product_id, acabadosWarehouse.id, oldItem.quantity, transaction);
      }

      await this.saleRepository.deleteSaleItem(itemId, transaction);
    }

    // 2) Cria/atualiza as linhas do payload, calculando o novo total.
    let totalCents = 0;
    for (const item of items) {
      const qty = parseFloat(String(item.quantity));
      if (Number.isNaN(qty) || qty <= 0) {
        throw new ValidationError('Quantidade deve ser maior que zero');
      }
      const unitPrice = parseFloat(String(item.unit_price));
      if (Number.isNaN(unitPrice) || unitPrice <= 0) {
        throw new ValidationError('Preço unitário deve ser maior que zero');
      }
      const unitPriceCents = toCents(unitPrice);

      const product = await this.saleRepository.findProductById(item.product_id, transaction);
      if (!product) {
        throw new NotFoundError(`Produto ID ${item.product_id} não encontrado`);
      }
      if (product.status !== 'active') {
        throw new BusinessRuleError(`Produto ${product.name} está inativo`);
      }

      const totalPriceCents = qty * unitPriceCents;
      totalCents += totalPriceCents;

      const oldItem = item.sale_item_id !== undefined ? oldItemsById.get(item.sale_item_id) : null;

      if (!isQuote) {
        if (oldItem && oldItem.product_id === item.product_id) {
          // Mesmo produto: ajusta só o delta de quantidade.
          const delta = qty - Number(oldItem.quantity);
          if (Number(oldItem.invoiced_quantity) > qty) {
            throw new BusinessRuleError(
              `Item #${oldItem.id} já possui ${oldItem.invoiced_quantity} faturado(s) — a nova quantidade (${qty}) não pode ser menor que isso.`,
              { sale_item_id: oldItem.id, invoiced_quantity: oldItem.invoiced_quantity }
            );
          }
          if (delta > 0) {
            await InventoryService.consume(item.product_id, delta, userId, transaction, {
              description: `Alteração de itens - Venda #${sale.id} (aumento de quantidade)`,
              referenceId: sale.id,
              referenceType: 'sale'
            });
            await WarehouseStockService.removeFromWarehouse(item.product_id, acabadosWarehouse.id, delta, transaction);
          } else if (delta < 0) {
            await InventoryService.receive(item.product_id, -delta, userId, transaction, {
              description: `Alteração de itens - Venda #${sale.id} (redução de quantidade)`,
              referenceId: sale.id,
              referenceType: 'adjustment'
            });
            await WarehouseStockService.addToWarehouse(item.product_id, acabadosWarehouse.id, -delta, transaction);
          }
        } else {
          if (oldItem) {
            // Produto da linha mudou: restaura o produto antigo por completo.
            if (Number(oldItem.invoiced_quantity) > 0) {
              throw new BusinessRuleError(
                `Item #${oldItem.id} já possui quantidade faturada e não pode trocar de produto.`,
                { sale_item_id: oldItem.id, invoiced_quantity: oldItem.invoiced_quantity }
              );
            }
            await InventoryService.receive(oldItem.product_id, oldItem.quantity, userId, transaction, {
              description: `Alteração de itens - Venda #${sale.id} (produto trocado)`,
              referenceId: sale.id,
              referenceType: 'adjustment'
            });
            await WarehouseStockService.addToWarehouse(oldItem.product_id, acabadosWarehouse.id, oldItem.quantity, transaction);
          }
          // Item novo (ou produto trocado): debita a quantidade nova por completo.
          await InventoryService.consume(item.product_id, qty, userId, transaction, {
            description: `Alteração de itens - Venda #${sale.id} (item ${oldItem ? 'trocado' : 'adicionado'})`,
            referenceId: sale.id,
            referenceType: 'sale'
          });
          await WarehouseStockService.removeFromWarehouse(item.product_id, acabadosWarehouse.id, qty, transaction);
        }
      }

      const rowData = {
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: qty,
        unit_price: fromCents(unitPriceCents),
        total_price: fromCents(totalPriceCents)
      };

      if (oldItem) {
        await this.saleRepository.updateSaleItem(oldItem.id, rowData, transaction);
      } else {
        await this.saleRepository.createSaleItem(rowData, transaction);
      }
    }

    const discountCents = toCents(parseFloat(sale.discount) || 0);
    if (discountCents > totalCents) {
      throw new ValidationError('Desconto não pode ser maior que o novo valor total da venda');
    }

    sale.total_amount = fromCents(totalCents - discountCents);
    await sale.save({ transaction });

    return { sale, oldItems: Array.from(oldItemsById.values()) };
  }
}

module.exports = EditSaleItemsUseCase;
