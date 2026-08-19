/**
 * Rateio, por origem de demanda, de um plano MRP **ja netado em conjunto**.
 *
 * ## Por que este modulo existe (auditoria de 2026-08-11, CRITICO 1)
 *
 * `GenerateMrpPlanUseCase` precisa de duas coisas ao mesmo tempo:
 *
 * 1. **netar certo** — o estoque de um item e UM so e tem que ser abatido
 *    UMA vez, por mais demandas que existam;
 * 2. **rastrear a origem** — `mrp_ordens_planejadas` guarda `origem`/
 *    `origem_id` justamente para o planejador saber de qual pedido de venda
 *    (ou previsao, ou OP) veio a necessidade.
 *
 * A versao anterior tentou resolver (2) rodando o motor uma vez por demanda —
 * e com isso destruiu (1): cada demanda netava contra o estoque integro, e o
 * plano **comprava a menos** (duas demandas de 100 contra 100 em estoque
 * davam necessidade liquida ZERO, nao 100). O motor
 * (`calculateMrpPlan`) sempre soube agregar varias demandas; era o chamador
 * que nao o deixava.
 *
 * A saida e inverter a ordem: **neta uma vez, rateia depois.** O motor recebe
 * TODAS as demandas e devolve a necessidade agregada por item/data; este
 * modulo divide essa necessidade entre as origens, proporcionalmente ao que
 * cada uma pediu (necessidade bruta). Nenhuma decisao de compra sai do rateio
 * — ele so distribui um numero que ja esta correto.
 *
 * ## Decisoes de desenho (e o que elas custam)
 *
 * - **Base do rateio = necessidade bruta da origem.** E a unica medida que
 *   existe por origem antes da netagem. Alternativa descartada: ratear por
 *   data (quem precisa antes leva o estoque). Isso e alocacao por prioridade,
 *   nao rateio, e mudaria a decisao de compra — assunto do dono do processo,
 *   nao de uma correcao de defeito. Como o motor ja agrega por (item, data),
 *   linhas de datas diferentes nunca se misturam.
 * - **O estoque disponivel tambem e rateado.** Repetir o saldo inteiro em
 *   cada linha (comportamento antigo) produz linha que nao fecha na tela:
 *   "bruta 100 - disponivel 100 = liquida 50". Rateado, cada linha fecha
 *   sozinha e a soma continua sendo o saldo real.
 * - **A soma bate exatamente.** A ultima parcela de cada medida e o RESTO
 *   (total - parcelas ja distribuidas), nunca um arredondamento independente;
 *   assim a soma das linhas e identica ao numero agregado, sem centavo
 *   sobrando.
 * - **Lote minimo vive no agregado.** O motor arredonda a quantidade
 *   planejada para o lote minimo ANTES do rateio, entao a linha individual
 *   pode nao ser multipla do lote — o pedido que a fabrica coloca (a soma) e.
 *   Ratear com arredondamento por linha compraria a mais a cada rodada.
 *
 * @module modules/mrp/application/use-cases/support/allocatePlanByOrigin
 */

import {
  explodeBomRequirements, MrpBomEdge, MrpDemandSourceType, MrpPlannedOrder,
} from '../../mrpEngine';
import { roundQuantity } from '../../../../../shared/utils/decimal';

/**
 * Demanda ja normalizada pelo use case (formato de entrada do motor, com
 * `sourceType` livre porque o payload aceita tanto o enum do banco quanto o
 * formato legado em ingles — ver {@link normalizeOrigem}).
 */
export interface NormalizedDemand {
  itemId: string;
  quantity: number;
  dueDate: Date;
  sourceType: MrpDemandSourceType;
  sourceId?: string;
}

/** Quanto uma origem pediu, em necessidade bruta, de um item numa data. */
export interface OriginShare {
  /** Valor normalizado para o enum `mrp_ordens_planejadas.origem`. */
  origem: string;
  /** Documento de origem (`origem_id`), quando houver. */
  origemId: string | null;
  /** Necessidade bruta atribuivel a esta origem. */
  grossRequirement: number;
}

/** Linha de ordem planejada ja atribuida a uma origem. */
export interface AllocatedPlanLine {
  origem: string;
  origemId: string | null;
  grossRequirement: number;
  physicalStock: number;
  qualityWithheldStock: number;
  availableStock: number;
  netRequirement: number;
  plannedQuantity: number;
}

/** Menor quantidade aceita por `mrp_ordens_planejadas.quantidade_planejada` (validate.min). */
const MIN_PLANNED_QUANTITY = 0.000001;

/**
 * Chave de agregacao identica a do motor (`calculateMrpPlan`): item + data de
 * necessidade em ISO completo. Manter a MESMA chave e o que garante que cada
 * ordem agregada encontre exatamente as origens que a produziram.
 *
 * @param itemId - Item da necessidade.
 * @param dueDate - Data de necessidade.
 * @returns Chave de agregacao.
 */
function requirementKey(itemId: string, dueDate: Date): string {
  return `${itemId}|${dueDate.toISOString()}`;
}

/**
 * Normaliza o tipo de origem para o enum do banco.
 * Aceita tanto o enum do Zod quanto o formato legado em ingles.
 *
 * @param sourceType - Tipo de origem da demanda.
 * @returns Valor normalizado para o enum `mrp_ordens_planejadas.origem`.
 */
export function normalizeOrigem(sourceType: string): string {
  switch (sourceType) {
    case 'PEDIDO_VENDA':
    case 'sales_order':
      return 'PEDIDO_VENDA';
    case 'PREVISAO':
    case 'forecast':
      return 'PREVISAO';
    case 'ORDEM_PRODUCAO':
    case 'production_order':
      return 'ORDEM_PRODUCAO';
    default:
      return 'MANUAL';
  }
}

/**
 * Calcula, por (item, data de necessidade), quanto cada origem pediu.
 *
 * Explode a BOM demanda a demanda — a MESMA explosao que o motor faz para
 * agregar — para saber a participacao de cada origem. Duas demandas da mesma
 * origem (mesmo `origem`/`origem_id`) sao somadas numa participacao so.
 *
 * @param demands - Demandas normalizadas do plano.
 * @param edges - Arestas ativas da BOM.
 * @returns Participacoes por chave `itemId|dataISO`, em ordem decrescente de bruta.
 */
export function buildOriginSharesByRequirement(
  demands: NormalizedDemand[],
  edges: MrpBomEdge[],
): Map<string, OriginShare[]> {
  const sharesByRequirement = new Map<string, Map<string, OriginShare>>();

  for (const demand of demands) {
    const origem = normalizeOrigem(demand.sourceType);
    const origemId = demand.sourceId ?? null;
    const originKey = `${origem}|${origemId ?? ''}`;
    const requirements = explodeBomRequirements(demand.itemId, demand.quantity, demand.dueDate, edges);

    for (const requirement of requirements) {
      const key = requirementKey(requirement.itemId, requirement.dueDate);
      const byOrigin = sharesByRequirement.get(key) ?? new Map<string, OriginShare>();
      const previous = byOrigin.get(originKey);

      byOrigin.set(originKey, {
        origem,
        origemId,
        grossRequirement: roundQuantity((previous?.grossRequirement ?? 0) + requirement.grossRequirement),
      });
      sharesByRequirement.set(key, byOrigin);
    }
  }

  const result = new Map<string, OriginShare[]>();
  for (const [key, byOrigin] of sharesByRequirement) {
    // Ordem decrescente de bruta (desempate estavel pelo identificador da
    // origem): a MAIOR participacao e quem recebe o resto do rateio, entao a
    // ordenacao precisa ser deterministica para o plano ser reproduzivel.
    const shares = Array.from(byOrigin.entries())
      .sort((a, b) => b[1].grossRequirement - a[1].grossRequirement || a[0].localeCompare(b[0]))
      .map(([, share]) => share);
    result.set(key, shares);
  }

  return result;
}

/**
 * Distribui uma ordem planejada agregada entre as origens que a motivaram.
 *
 * Todas as quatro medidas (bruta, disponivel, liquida, planejada) sao
 * rateadas pela MESMA participacao, e a origem de maior participacao recebe o
 * resto de cada uma — a soma das linhas e sempre exatamente igual ao
 * agregado. Origens cuja fatia planejada arredondaria para zero sao
 * absorvidas pela maior (uma linha com `quantidade_planejada = 0` seria
 * rejeitada pelo model e nao significa nada para quem compra).
 *
 * @param order - Ordem planejada agregada devolvida pelo motor.
 * @param shares - Participacoes por origem (ver {@link buildOriginSharesByRequirement}).
 * @returns Linhas por origem; uma unica linha `MANUAL` se nao houver origem conhecida.
 */
export function allocateOrderToOrigins(
  order: MrpPlannedOrder,
  shares: OriginShare[],
): AllocatedPlanLine[] {
  const fullLine = (origem: string, origemId: string | null): AllocatedPlanLine => ({
    origem,
    origemId,
    grossRequirement: order.grossRequirement,
    physicalStock: order.physicalStock,
    qualityWithheldStock: order.qualityWithheldStock,
    availableStock: order.availableStock,
    netRequirement: order.netRequirement,
    plannedQuantity: order.plannedQuantity,
  });

  // Defesa: o motor e este modulo explodem a MESMA BOM com as MESMAS
  // demandas, entao toda ordem agregada tem origem. Se um dia deixar de ter,
  // e melhor o plano nascer marcado `MANUAL` do que a necessidade sumir.
  if (!shares.length) {
    return [fullLine('MANUAL', null)];
  }
  if (shares.length === 1) {
    return [fullLine(shares[0].origem, shares[0].origemId)];
  }

  const totalGross = shares.reduce((total, share) => total + share.grossRequirement, 0);
  if (totalGross <= 0) {
    return [fullLine(shares[0].origem, shares[0].origemId)];
  }

  const kept = shares.filter(
    (share, index) => index === 0
      || roundQuantity(order.plannedQuantity * (share.grossRequirement / totalGross)) >= MIN_PLANNED_QUANTITY,
  );
  const keptGross = kept.reduce((total, share) => total + share.grossRequirement, 0);

  const lines: AllocatedPlanLine[] = [];
  const distributed = { gross: 0, physical: 0, withheld: 0, available: 0, net: 0, planned: 0 };

  // A primeira participacao (a maior) fica para o fim: ela recebe o RESTO de
  // cada medida, o que faz a soma fechar sem residuo de arredondamento.
  for (const share of kept.slice(1)) {
    const ratio = share.grossRequirement / keptGross;
    const line: AllocatedPlanLine = {
      origem: share.origem,
      origemId: share.origemId,
      grossRequirement: roundQuantity(order.grossRequirement * ratio),
      physicalStock: roundQuantity(order.physicalStock * ratio),
      qualityWithheldStock: roundQuantity(order.qualityWithheldStock * ratio),
      availableStock: roundQuantity(order.availableStock * ratio),
      netRequirement: roundQuantity(order.netRequirement * ratio),
      plannedQuantity: roundQuantity(order.plannedQuantity * ratio),
    };

    distributed.gross += line.grossRequirement;
    distributed.physical += line.physicalStock;
    distributed.withheld += line.qualityWithheldStock;
    distributed.available += line.availableStock;
    distributed.net += line.netRequirement;
    distributed.planned += line.plannedQuantity;
    lines.push(line);
  }

  lines.unshift({
    origem: kept[0].origem,
    origemId: kept[0].origemId,
    grossRequirement: roundQuantity(order.grossRequirement - distributed.gross),
    physicalStock: roundQuantity(order.physicalStock - distributed.physical),
    qualityWithheldStock: roundQuantity(order.qualityWithheldStock - distributed.withheld),
    availableStock: roundQuantity(order.availableStock - distributed.available),
    netRequirement: roundQuantity(order.netRequirement - distributed.net),
    plannedQuantity: roundQuantity(order.plannedQuantity - distributed.planned),
  });

  return lines;
}

/**
 * Chave de agregacao do motor, exposta para o use case casar ordem x origens.
 *
 * @param order - Ordem planejada agregada.
 * @returns Chave `itemId|dataISO`.
 */
export function keyOfPlannedOrder(order: MrpPlannedOrder): string {
  return requirementKey(order.itemId, order.dueDate);
}
