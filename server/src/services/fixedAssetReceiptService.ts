/**
 * 🏷️ Service: FixedAssetReceiptService
 *
 * F3 do diagnóstico do catálogo duplo (2026-08-12): o recebimento de compra
 * de um item cujo item mestre é `ATIVO_IMOBILIZADO` cria os registros
 * patrimoniais em `assets` na MESMA transação do recebimento — um ativo por
 * unidade recebida (patrimônio é 1 plaqueta por bem), com
 * `purchase_item_id` apontando para a linha do pedido (a FK que existia no
 * schema desde o início e nunca era populada) e valor/data de aquisição do
 * recebimento.
 *
 * Fecha o buraco em que o usuário tinha que ADIVINHAR que, além de receber
 * a compra, precisava cadastrar o bem manualmente em Patrimônio → Ativos —
 * exatamente a confusão do achado de UAT de 2026-08-12 (mesa cadastrada
 * como item mestre achando que era o cadastro patrimonial).
 *
 * O registro nasce incompleto de propósito (`department_id`,
 * `responsible_id`, `useful_life_months` são dados que a NF não carrega) —
 * o Patrimônio completa depois na tela de Ativos. Quantidade fracionária
 * não vira plaqueta: gera 1 ativo com a quantidade anotada em `notes`.
 *
 * Vive em serviço separado (e não inline no use case) para os testes de
 * dublê do recebimento poderem substituí-lo sem tocar PostgreSQL — o
 * comportamento real é provado em
 * `tests/integration/item-product-mirror.test.ts`.
 */

import type { Transaction } from 'sequelize';

const { Item, Product, Asset } = require('../models/index');

interface ReceivedLineDetail {
  purchaseItemId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
}

class FixedAssetReceiptService {
  /**
   * Cria os ativos patrimoniais das linhas recebidas que forem imobilizado.
   *
   * @param {Object} input.purchase - Pedido já travado na transação.
   * @param {Array} input.receivedLineDetails - Linhas desta entrega.
   * @param {Date} input.receivedAt - Momento do recebimento (vira `purchase_date`).
   * @param {Object} input.transaction - Mesma transação do recebimento.
   * @returns {Promise<any[]>} Ativos criados (vazio quando nenhuma linha é imobilizado).
   */
  static async createAssetsForReceivedLines({ purchase, receivedLineDetails, receivedAt, transaction }: {
    purchase: any;
    receivedLineDetails: ReceivedLineDetail[];
    receivedAt: Date;
    transaction: Transaction;
  }): Promise<any[]> {
    const created: any[] = [];

    for (const line of receivedLineDetails) {
      if (!line.productId) continue;
      const product = await Product.findByPk(line.productId, { transaction });
      if (!product?.code) continue;

      const masterItem = await Item.findOne({ where: { codigo: product.code }, transaction });
      if (masterItem?.tipo !== 'ATIVO_IMOBILIZADO') continue;

      const wholeUnits = Number.isInteger(line.quantity) ? line.quantity : 1;
      // Recebimentos parciais anteriores já podem ter gerado plaquetas desta
      // mesma linha do pedido — a numeração continua de onde parou.
      const existingCount = await Asset.count({ where: { purchase_item_id: line.purchaseItemId }, transaction });

      for (let unit = 1; unit <= wholeUnits; unit += 1) {
        const asset = await Asset.create({
          tag: `AT-${line.purchaseItemId}-${existingCount + unit}`,
          name: masterItem.descricao || product.name,
          description: 'Criado automaticamente no recebimento da compra — completar departamento, responsável e vida útil no Patrimônio.',
          product_id: product.id,
          purchase_item_id: line.purchaseItemId,
          purchase_date: receivedAt,
          purchase_value: line.unitPrice,
          current_value: line.unitPrice,
          notes: Number.isInteger(line.quantity)
            ? `Recebimento PO ${purchase.order_number}`
            : `Recebimento PO ${purchase.order_number} — quantidade recebida ${line.quantity} (fracionária; 1 plaqueta gerada)`,
        }, { transaction });
        created.push(asset);
      }
    }

    return created;
  }
}

export = FixedAssetReceiptService;
