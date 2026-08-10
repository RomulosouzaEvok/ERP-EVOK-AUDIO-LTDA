/**
 * Service: CostingService
 *
 * @module services/costingService
 *
 * Centraliza o custeio real por produto com historico em ledger e atualizacao
 * de `Product.cost_price` por media ponderada.
 */

import ProductCostLedger = require('../models/ProductCostLedger');

/**
 * Origens de custo real de ENTRADA de material/produto.
 * `'import'` (gap G14, migration `20260809-000027`) e o custo nacionalizado
 * de um processo de importacao — antes era gravado como `'purchase'`, o que
 * fazia `source_id` apontar para `import_processes.id` sob um rotulo que
 * significa `purchase_orders.id`.
 */
type CostSourceType = 'purchase' | 'production' | 'adjustment' | 'import';
type AdditionalProductionCostSourceType = 'production_labor' | 'production_overhead';

interface RegisterWeightedAverageCostInput {
  product: any;
  quantity: number;
  unitCost: number;
  sourceType: CostSourceType;
  sourceId?: number | null;
  userId?: number | null;
  notes?: string | null;
}

interface RegisterAdditionalProductionCostInput {
  product: any;
  quantity: number;
  unitCost: number;
  sourceType: AdditionalProductionCostSourceType;
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

  /**
   * Registra um componente adicional de custo real de producao (mao-de-obra
   * ou overhead) sobre uma OP ja custeada por material na mesma conclusao
   * (ver `registerWeightedAverageCost` chamado antes, com `sourceType:
   * 'production'`).
   *
   * Diferenca deliberada em relacao a `registerWeightedAverageCost`: aquele
   * metodo recalcula a media ponderada completa contra
   * `previousQuantity = product.quantity - quantity`, o que e correto
   * apenas na PRIMEIRA chamada de uma mesma producao (material). Reaplicar
   * essa formula numa segunda/terceira chamada para o mesmo lote recebido
   * (mao-de-obra, overhead) rediluiria o custo ja incorporado na chamada
   * anterior — na pratica, descartando parte do custo de material quando o
   * estoque anterior era pequeno ou zero. Este metodo evita o bug somando a
   * contribuicao marginal deste componente (quantity * unitCost / quantidade
   * atual em estoque) sobre o `cost_price` ja atualizado pela chamada
   * anterior, preservando o resultado correto de
   * `(materialCost + laborCost + overheadCost) / producedQty` acumulado ao
   * final da sequencia de chamadas da mesma OP.
   *
   * @param input - Dados do componente de custo adicional.
   * @param transaction - Transacao Sequelize ativa.
   * @returns Ledger criado e resumo do custo anterior/novo.
   * @throws {Error} Se quantidade/custo forem invalidos ou se transacao estiver ausente.
   */
  static async registerAdditionalProductionCost(input: RegisterAdditionalProductionCostInput, transaction: any): Promise<{
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
    const previousCost = assertFiniteNumber(input.product.cost_price || 0, 'product.cost_price');
    const totalCost = roundCost(quantity * unitCost);
    const marginalContribution = currentQuantity > 0 ? totalCost / currentQuantity : unitCost;
    const newCost = roundCost(previousCost + marginalContribution);

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
