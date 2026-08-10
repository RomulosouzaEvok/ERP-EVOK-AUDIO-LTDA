/**
 * Constantes e regras puras do **Plano Mestre de Produção (MPS) — G17**.
 *
 * Decisão D-F do dono do produto (`docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md`
 * §4): *existe PCP formal — há quem planeje*. Isso confirma a recomendação
 * registrada na linha do G17 do mesmo plano: a ponte entre a carteira de
 * pedidos e a fábrica **não** é "gerar OP automática no pedido", é uma camada
 * de plano mestre onde o sistema fornece a informação e **uma pessoa decide**.
 *
 * Mesmo padrão já aprovado em `modules/quality/domain/constants.ts` (G7),
 * `modules/purchases/domain/constants.ts` (G11) e
 * `modules/juridico/domain/constants.ts` (RF-JUR-003): a regra mora numa
 * função pura, testável sem banco, e o identificador da regra viaja em
 * `details.rule` de todo erro para que o teste (e a tela) saibam que a recusa
 * veio da regra certa, e não de um mock incompleto.
 *
 * ## A conta do plano, em uma frase
 *
 * `necessidade líquida = max(0, (carteira + estoque mínimo + previsão) −
 * (saldo de planejamento + o que já está em produção))`.
 *
 * ## O que NÃO está aqui, e por quê
 *
 * Três políticas de PCP que o dono **não** decidiu e que este módulo se recusa
 * a inventar (ver `docs/governance/TODO.md`, entrada 2026-08-10 G17):
 *
 * 1. **Horizonte de planejamento** — não há default; o planejador declara
 *    `horizon_start`/`horizon_end` a cada plano.
 * 2. **Política de lote mínimo/múltiplo de produção** — `suggested_quantity` é
 *    a necessidade líquida crua. O motor MRP arredonda por `lote_minimo` de
 *    `items`; aqui, que opera sobre `products` (a chave da OP), não existe
 *    campo equivalente e inventá-lo seria criar política.
 * 3. **Pedido que chega depois do plano fechado** — não há replanejamento
 *    automático. O plano é uma fotografia datada (`consolidated_at`); demanda
 *    nova entra no próximo plano.
 *
 * @module modules/masterProduction/domain/constants
 */

/**
 * Identificador da regra, propagado em `details.rule` de todo erro de negócio
 * do plano mestre.
 */
export const MASTER_PLAN_RULE = 'G17';

/** Status válidos do plano (espelham o ENUM `master_production_plans.status`). */
export const PLAN_STATUSES = ['draft', 'firm', 'released', 'canceled'] as const;

/** Status válidos da linha (espelham o ENUM `master_production_plan_lines.status`). */
export const PLAN_LINE_STATUSES = ['pending', 'planned', 'dismissed', 'released'] as const;

/** Status do plano. */
export type MasterPlanStatus = (typeof PLAN_STATUSES)[number];

/** Status da linha do plano. */
export type MasterPlanLineStatus = (typeof PLAN_LINE_STATUSES)[number];

/**
 * Status de venda cujo saldo não faturado é **carteira de pedidos** para o
 * planejamento.
 *
 * ⚠️ Conferido literal a literal contra o ENUM `enum_sales_status` do banco
 * (`quote, confirmed, invoiced, canceled, shipped, partially_invoiced`).
 * Literal inexistente aqui passaria por typecheck E pela suíte inteira (o
 * `where` do Sequelize é `any` e os testes usam repositório dublê) e só
 * explodiria como 500 do Postgres — a classe de defeito catalogada em
 * `docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`.
 *
 * - `quote` **fora**: orçamento não é pedido; produzir contra orçamento é
 *   produzir contra intenção.
 * - `invoiced`/`shipped` **fora**: desde o G9 a NF-e já baixou o estoque —
 *   contá-los seria demanda em duplicidade.
 * - `canceled` **fora**, evidentemente.
 */
export const BACKLOG_SALE_STATUSES = ['confirmed', 'partially_invoiced'] as const;

/**
 * Status de OP que representam produção **em aberto** (ainda vai entregar
 * saldo ao estoque).
 *
 * ⚠️ Conferido contra `enum_production_orders_status`
 * (`planned, released, in_progress, completed, paused, canceled`).
 * `completed` fora (já entrou em estoque, e o saldo aparece em
 * `products.quantity`); `canceled` fora (não entrega nada).
 */
export const OPEN_PRODUCTION_ORDER_STATUSES = ['planned', 'released', 'in_progress', 'paused'] as const;

/**
 * Tipos de produto que o plano mestre planeja.
 *
 * ⚠️ Conferido contra `enum_products_product_type`
 * (`finished, semi_finished, component, raw_material`). Componente e
 * matéria-prima são necessidade de **compra** — quem os atende é o MRP →
 * Requisição de Compra, não a OP.
 */
export const PLANNABLE_PRODUCT_TYPES = ['finished', 'semi_finished'] as const;

/** Números de entrada da consolidação de uma linha do plano. */
export interface MasterPlanLineInput {
  /** Saldo aberto da carteira de pedidos (venda confirmada, ainda não faturada). */
  salesBacklog?: number;
  /** `products.min_quantity` — o estoque mínimo tratado como demanda. */
  safetyStock?: number;
  /** Previsão informada manualmente pelo planejador (não existe forecast no ERP). */
  forecast?: number;
  /** `products.quantity` — saldo FÍSICO, antes de qualquer desconto. */
  physicalOnHand?: number;
  /** Retido em `lot_controls` `quarantine`/`blocked` (G7). */
  withheld?: number;
  /** `products.reserved_quantity` — reservas vivas por OP e por venda (G3/G9). */
  reserved?: number;
  /** Saldo a produzir das OPs abertas. */
  inProduction?: number;
}

/** Números consolidados de uma linha do plano (o que é persistido). */
export interface MasterPlanLineFigures {
  demand_sales_orders: number;
  demand_safety_stock: number;
  demand_forecast: number;
  gross_requirement: number;
  supply_on_hand: number;
  supply_withheld: number;
  supply_reserved: number;
  supply_in_production: number;
  net_requirement: number;
  suggested_quantity: number;
}

/** Casas decimais das quantidades (`DECIMAL(18,6)` no banco). */
const DECIMAL_SCALE = 6;

/**
 * Arredonda uma quantidade para a escala do banco, evitando que o ruído de
 * ponto flutuante vire `0.0000000001` de necessidade líquida — que geraria uma
 * OP de quantidade absurda.
 *
 * @param value - Valor bruto.
 * @returns Valor arredondado para 6 casas; `0` quando não numérico.
 */
export function roundQuantity(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(DECIMAL_SCALE));
}

/**
 * Normaliza uma quantidade recebida de fora, recusando negativo e não numérico.
 *
 * @param value - Valor recebido.
 * @returns Quantidade >= 0 arredondada; `0` quando ausente/negativa/inválida.
 */
function toNonNegative(value: unknown): number {
  const parsed = roundQuantity(value);
  return parsed > 0 ? parsed : 0;
}

/**
 * Consolida a demanda e o suprimento de **um** produto e devolve os números do
 * plano (função pura — não toca banco, não lança).
 *
 * O saldo de planejamento usado é `max(0, físico − retido − reservado)`. O
 * clamp em zero é defensivo pelo mesmo motivo documentado em
 * `services/quarantineBalanceService`: um desvio entre `lot_controls` e
 * `products.quantity` (drift conhecido neste banco) produziria disponibilidade
 * negativa e o plano sugeriria quantidades absurdas.
 *
 * `net_requirement` desconta também `inProduction`: sem isso o plano mandaria
 * produzir de novo o que já está na fábrica — o erro clássico de MPS sem
 * confronto com ordens abertas.
 *
 * @param input - Números de demanda e suprimento do produto.
 * @returns Números consolidados prontos para persistir na linha.
 */
export function consolidateLineFigures(input: MasterPlanLineInput): MasterPlanLineFigures {
  const demandSales = toNonNegative(input.salesBacklog);
  const demandSafety = toNonNegative(input.safetyStock);
  const demandForecast = toNonNegative(input.forecast);
  const gross = roundQuantity(demandSales + demandSafety + demandForecast);

  const physical = toNonNegative(input.physicalOnHand);
  const withheld = toNonNegative(input.withheld);
  const reserved = toNonNegative(input.reserved);
  const inProduction = toNonNegative(input.inProduction);

  const onHand = Math.max(0, roundQuantity(physical - withheld - reserved));
  const net = Math.max(0, roundQuantity(gross - onHand - inProduction));

  return {
    demand_sales_orders: demandSales,
    demand_safety_stock: demandSafety,
    demand_forecast: demandForecast,
    gross_requirement: gross,
    supply_on_hand: onHand,
    supply_withheld: withheld,
    supply_reserved: reserved,
    supply_in_production: inProduction,
    net_requirement: net,
    // Sem arredondamento de lote: política não decidida pelo dono (ver §
    // "O que NÃO está aqui" no cabeçalho deste módulo).
    suggested_quantity: net,
  };
}

/** Transições permitidas do plano — a máquina de estados em uma constante. */
const PLAN_TRANSITIONS: Record<MasterPlanStatus, readonly MasterPlanStatus[]> = {
  draft: ['firm', 'canceled'],
  firm: ['released', 'canceled'],
  released: [],
  canceled: [],
};

/**
 * Diz se uma transição de status do plano é permitida.
 *
 * @param from - Status atual.
 * @param to - Status alvo.
 * @returns `true` se a transição existe na máquina de estados.
 */
export function canTransitionPlan(from: string, to: string): boolean {
  const allowed = PLAN_TRANSITIONS[from as MasterPlanStatus];
  return Array.isArray(allowed) && (allowed as readonly string[]).includes(to);
}

/**
 * Diz se as linhas do plano ainda podem ser editadas pelo planejador.
 *
 * Só em `draft`. Depois de firmado, a decisão está congelada — é isso que
 * torna o plano uma decisão registrada, e não um rascunho eterno.
 *
 * @param status - Status atual do plano.
 * @returns `true` apenas para `draft`.
 */
export function isPlanEditable(status: string): boolean {
  return status === 'draft';
}
