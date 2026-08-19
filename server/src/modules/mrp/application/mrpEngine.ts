/**
 * Motor MRP puro em TypeScript para explosao recursiva de BOM e calculo de
 * necessidades liquidas. Nao acessa ERP anterior nem banco diretamente.
 *
 * @module modules/mrp/application/mrpEngine
 */

import { BusinessRuleError } from '../../../errors';
import { roundQuantity as sharedRoundQuantity } from '../../../shared/utils/decimal';

export type ItemType = 'MATERIA_PRIMA' | 'SUBCONJUNTO' | 'PRODUTO_ACABADO';

/**
 * Representa um item industrial unico do ERP.
 */
export interface MrpItem {
  /** Identificador unico do item. */
  id: string;
  /** Codigo fabril/SKU do item. */
  code: string;
  /** Descricao operacional do item. */
  name: string;
  /** Classificacao industrial do item. */
  type: ItemType;
  /** Unidade de medida, como UN, KG, G, M. */
  unit: string;
}

/**
 * Relacionamento recursivo N:M entre item pai e componente.
 */
export interface MrpBomEdge {
  /** Item pai da estrutura. */
  parentItemId: string;
  /** Componente consumido pelo item pai. */
  componentItemId: string;
  /** Quantidade do componente por unidade do pai. */
  quantityPer: number;
  /** Percentual tecnico de perda/refugo. */
  scrapPercentage?: number;
  /** Indica se a ligacao esta ativa para calculos MRP. */
  active?: boolean;
}

/**
 * Posicao de estoque usada pelo calculo MRP.
 */
export interface MrpInventoryPosition {
  /** Item avaliado. */
  itemId: string;
  /** Quantidade fisica em estoque. */
  onHand: number;
  /** Quantidade fisica bruta antes de descontar retencao de qualidade. */
  physicalStock?: number;
  /** Quantidade retida por qualidade/quarentena, ja descontada de `onHand`. */
  qualityWithheldStock?: number;
  /** Quantidade ja reservada. */
  reserved?: number;
  /** Estoque minimo de seguranca. */
  safetyStock?: number;
  /** Lote minimo de compra/producao. */
  minimumLotSize?: number;
  /** Lead time em dias corridos. */
  leadTimeDays?: number;
}

/**
 * Origem operacional de uma demanda de MRP.
 *
 * Aceita as DUAS grafias que circulam no ERP: o enum do banco
 * (`mrp_ordens_planejadas.origem`, em portugues — e o que o endpoint
 * `POST /api/mrp/plan` realmente recebe) e o formato legado em ingles desta
 * camada. O motor nao usa este campo em nenhuma conta; quem traduz para o
 * enum do banco e `normalizeOrigem`, no rateio por origem. A uniao antiga
 * (so o formato em ingles) descrevia um contrato que o unico chamador real
 * nunca cumpriu.
 */
export type MrpDemandSourceType =
  | 'sales_order' | 'forecast' | 'production_order' | 'manual'
  | 'PEDIDO_VENDA' | 'PREVISAO' | 'ORDEM_PRODUCAO' | 'MANUAL';

/**
 * Demanda independente ou dependente que inicia o MRP.
 */
export interface MrpDemand {
  /** Item demandado. */
  itemId: string;
  /** Quantidade bruta demandada. */
  quantity: number;
  /** Data em que o item precisa estar disponivel. */
  dueDate: Date;
  /** Origem operacional da demanda. */
  sourceType: MrpDemandSourceType;
  /** Identificador da origem, quando existir. */
  sourceId?: string;
}

/**
 * Linha explodida da BOM.
 */
export interface MrpRequirement {
  /** Item componente final ou intermediario. */
  itemId: string;
  /** Quantidade bruta acumulada. */
  grossRequirement: number;
  /** Data de necessidade. */
  dueDate: Date;
  /** Nivel mais profundo encontrado na arvore. */
  level: number;
}

/**
 * Ordem planejada sugerida pelo MRP.
 */
export interface MrpPlannedOrder {
  /** Item a comprar ou produzir. */
  itemId: string;
  /** Quantidade bruta necessaria antes do estoque. */
  grossRequirement: number;
  /** Estoque fisico bruto, antes de descontar retencao de qualidade. */
  physicalStock: number;
  /** Estoque retido por qualidade/quarentena. */
  qualityWithheldStock: number;
  /** Estoque disponivel considerado. */
  availableStock: number;
  /** Quantidade liquida antes de arredondar lote. */
  netRequirement: number;
  /** Quantidade final planejada respeitando lote minimo. */
  plannedQuantity: number;
  /** Data em que o item deve estar disponivel. */
  dueDate: Date;
  /** Data sugerida de liberacao considerando lead time. */
  releaseDate: Date;
}

const DECIMAL_SCALE = 6;
const roundQuantity = sharedRoundQuantity;

/**
 * Subtrai dias corridos de uma data.
 *
 * @param date - Data base.
 * @param days - Quantidade de dias a subtrair.
 * @returns Nova data com o lead time aplicado.
 */
function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

/**
 * Explode recursivamente uma BOM multinivel e agrega necessidades por item/data.
 *
 * @param rootItemId - Item raiz da estrutura.
 * @param quantity - Quantidade demandada do item raiz.
 * @param dueDate - Data de necessidade da demanda.
 * @param edges - Relacionamentos ativos da BOM.
 * @returns Lista agregada de requisitos por componente.
 * @throws {Error} Quando houver quantidade invalida ou ciclo na arvore.
 */
export function explodeBomRequirements(
  rootItemId: string,
  quantity: number,
  dueDate: Date,
  edges: MrpBomEdge[],
): MrpRequirement[] {
  if (quantity <= 0) {
    throw new Error('A quantidade da demanda deve ser maior que zero.');
  }

  const activeEdges = edges.filter((edge) => edge.active !== false);
  const childrenByParent = new Map<string, MrpBomEdge[]>();
  const requirements = new Map<string, MrpRequirement>();

  for (const edge of activeEdges) {
    const children = childrenByParent.get(edge.parentItemId) ?? [];
    children.push(edge);
    childrenByParent.set(edge.parentItemId, children);
  }

  /**
   * Percorre a arvore da BOM em profundidade.
   *
   * @param itemId - Item atual.
   * @param parentQuantity - Quantidade demandada do item atual.
   * @param level - Nivel da arvore.
   * @param path - Caminho de ancestrais para detectar ciclos.
   * @returns Void.
   * @throws {Error} Quando um item referencia um ancestral.
   */
  function visit(itemId: string, parentQuantity: number, level: number, path: string[]): void {
    const children = childrenByParent.get(itemId) ?? [];

    for (const edge of children) {
      if (path.includes(edge.componentItemId)) {
        throw new BusinessRuleError(`Ciclo detectado na BOM: ${[...path, edge.componentItemId].join(' -> ')}`);
      }

      const scrapMultiplier = 1 + ((edge.scrapPercentage ?? 0) / 100);
      const grossRequirement = roundQuantity(parentQuantity * edge.quantityPer * scrapMultiplier);
      const key = `${edge.componentItemId}|${dueDate.toISOString()}`;
      const previous = requirements.get(key);

      requirements.set(key, {
        itemId: edge.componentItemId,
        grossRequirement: roundQuantity((previous?.grossRequirement ?? 0) + grossRequirement),
        dueDate,
        level: Math.max(previous?.level ?? 0, level),
      });

      visit(edge.componentItemId, grossRequirement, level + 1, [...path, edge.componentItemId]);
    }
  }

  visit(rootItemId, quantity, 1, [rootItemId]);
  return Array.from(requirements.values());
}

/**
 * Calcula ordens planejadas MRP sem duplicidade para as demandas informadas.
 *
 * @param demands - Demandas que iniciam o calculo.
 * @param edges - Relacionamentos ativos da BOM.
 * @param inventoryPositions - Posicoes de estoque por item.
 * @returns Ordens planejadas agregadas por item e data.
 * @throws {Error} Quando houver ciclo na BOM ou demanda invalida.
 */
export function calculateMrpPlan(
  demands: MrpDemand[],
  edges: MrpBomEdge[],
  inventoryPositions: MrpInventoryPosition[],
): MrpPlannedOrder[] {
  const aggregated = new Map<string, MrpRequirement>();
  const stockByItem = new Map(inventoryPositions.map((position) => [position.itemId, position]));

  for (const demand of demands) {
    const requirements = explodeBomRequirements(demand.itemId, demand.quantity, demand.dueDate, edges);

    for (const requirement of requirements) {
      const key = `${requirement.itemId}|${requirement.dueDate.toISOString()}`;
      const previous = aggregated.get(key);
      aggregated.set(key, {
        ...requirement,
        grossRequirement: roundQuantity((previous?.grossRequirement ?? 0) + requirement.grossRequirement),
        level: Math.max(previous?.level ?? 0, requirement.level),
      });
    }
  }

  return Array.from(aggregated.values())
    .map((requirement) => {
      const stock = stockByItem.get(requirement.itemId);
      const onHand = stock?.onHand ?? 0;
      const qualityWithheldStock = Math.max(0, stock?.qualityWithheldStock ?? 0);
      const physicalStock = Math.max(0, stock?.physicalStock ?? onHand);
      const availableStock = Math.max(
        0,
        onHand - (stock?.reserved ?? 0) - (stock?.safetyStock ?? 0),
      );
      const netRequirement = Math.max(0, roundQuantity(requirement.grossRequirement - availableStock));
      const lotSize = stock?.minimumLotSize && stock.minimumLotSize > 0 ? stock.minimumLotSize : 0;
      const plannedQuantity = lotSize > 0 && netRequirement > 0
        ? roundQuantity(Math.ceil(netRequirement / lotSize) * lotSize)
        : netRequirement;

      return {
        itemId: requirement.itemId,
        grossRequirement: requirement.grossRequirement,
        physicalStock: roundQuantity(physicalStock),
        qualityWithheldStock: roundQuantity(qualityWithheldStock),
        availableStock: roundQuantity(availableStock),
        netRequirement,
        plannedQuantity,
        dueDate: requirement.dueDate,
        releaseDate: subtractDays(requirement.dueDate, stock?.leadTimeDays ?? 0),
      };
    })
    .filter((order) => order.plannedQuantity > 0)
    .sort((a, b) => a.releaseDate.getTime() - b.releaseDate.getTime() || a.itemId.localeCompare(b.itemId));
}
