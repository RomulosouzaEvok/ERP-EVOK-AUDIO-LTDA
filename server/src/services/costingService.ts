/**
 * Service: CostingService
 *
 * @module services/costingService
 *
 * Centraliza o custeio real por produto com historico em ledger e atualizacao
 * de `Product.cost_price` por media ponderada.
 */

import ProductCostLedger = require('../models/ProductCostLedger');

export type CostSourceType = 'purchase' | 'production' | 'adjustment';

export interface RegisterWeightedAverageCostInput {
  product: any;
  quantity: number;
  unitCost: number;
  sourceType: CostSourceType;
  sourceId?: number | null;
  userId?: number | null;
  notes?: string | null;
}

/**
 * Converte um valor numerico para decimal finito.
 *
 * @param value - Valor recebido do chamador.
 * @param fieldName - Nome do campo usado na mensagem de erro.
 * @returns Valor convertido.
 * @throws {Error} Se o valor nao for numerico.
 */
function assertFiniteNumber(value: unknown, fieldName: string): number {
  const numberValue = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(numberValue)) {
    throw Object.assign(new Error(`${fieldName} deve ser numerico`), { statusCode: 400 });
  }
  return numberValue;
}

/**
 * Arredonda valores monetarios para quatro casas decimais.
 *
 * @param value - Valor monetario.
 * @returns Valor arredondado.
 */
function roundCost(value: number): number {
  return Math.round(value * 10000) / 10000;
}

class CostingService {
  /**
   * Registra custo real de entrada e atualiza o custo medio ponderado.
   *
   * @param input - Dados da origem do custo.
   * @param transaction - Transacao Sequelize ativa.
   * @returns Ledger criado e resumo do custo anterior/novo.
   * @throws {Error} Se quantidade/custo forem invalidos ou se transacao estiver ausente.
   */
  static async registerWeightedAverageCost(input: RegisterWeightedAverageCostInput, transaction: any): Promise<{
    ledger: any;
    previousCost: number;
    newCost: number;
    totalCost: number;
  }> {
    if (!transaction) {
      throw Object.assign(new Error('CostingService: transaction e obrigatoria'), { statusCode: 500 });
    }

    const quantity = assertFiniteNumber(input.quantity, 'quantity');
    const unitCost = assertFiniteNumber(input.unitCost, 'unitCost');
    if (quantity <= 0) {
      throw Object.assign(new Error('quantity deve ser maior que zero'), { statusCode: 400 });
    }
    if (unitCost < 0) {
      throw Object.assign(new Error('unitCost nao pode ser negativo'), { statusCode: 400 });
    }

    const currentQuantity = assertFiniteNumber(input.product.quantity || 0, 'product.quantity');
    const previousQuantity = Math.max(currentQuantity - quantity, 0);
    const previousCost = assertFiniteNumber(input.product.cost_price || 0, 'product.cost_price');
    const totalCost = roundCost(quantity * unitCost);
    const newCost = currentQuantity > 0
      ? roundCost(((previousQuantity * previousCost) + totalCost) / currentQuantity)
      : roundCost(unitCost);

    await input.product.update({ cost_price: newCost }, { transaction });

    const ledger = await ProductCostLedger.create({
      product_id: input.product.id,
      source_type: input.sourceType,
      source_id: input.sourceId || null,
      quantity,
      unit_cost: roundCost(unitCost),
      total_cost: totalCost,
      previous_cost: roundCost(previousCost),
      new_cost: newCost,
      created_by: input.userId || null,
      notes: input.notes || null
    }, { transaction });

    return { ledger, previousCost, newCost, totalCost };
  }
}

export = CostingService;
