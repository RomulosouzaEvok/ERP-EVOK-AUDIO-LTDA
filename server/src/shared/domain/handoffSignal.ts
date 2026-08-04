/**
 * 🚦 Semáforo de Handoff Entre Departamentos (UC-40, BUSINESS_RULES.md §10).
 *
 * Utilitário compartilhado que calcula, SEMPRE no momento da consulta (nunca
 * armazenado como coluna redundante — §10), a cor (`green|yellow|red`) que
 * representa o estado de um documento na fila do departamento destino
 * (Recebimento, Qualidade/Almoxarifado, Expedição, RNC).
 *
 * Implementa EXATAMENTE a tabela normativa de `BUSINESS_RULES.md` §10:
 *
 * | Cadeia                        | Verde                          | Amarelo                      | Vermelho                                    |
 * |--------------------------------|--------------------------------|-------------------------------|----------------------------------------------|
 * | Compras → Recebimento          | sent/approved/partial, no prazo| —                             | expected_date vencida sem delivery_date       |
 * | Recebimento → Qualidade        | —                               | quarantine (aguardando inspeção) | blocked                                    |
 * | Qualidade → Almoxarifado       | available                      | quarantine                    | blocked                                       |
 * | Vendas → Expedição             | invoiced                       | processing (NF-e em emissão)  | denied/cancelled                              |
 * | Recebimento/Qualidade → RNC    | —                               | open/in_analysis              | closed não efetivo (reincidência)             |
 *
 * Regra transversal (§10): um documento NUNCA desaparece da fila do
 * departamento destino por estar atrasado (vermelho) — este utilitário
 * apenas calcula a COR; a decisão de incluir/excluir da fila continua sendo
 * do filtro de `status` de cada listagem (não deste módulo).
 *
 * @module shared/domain/handoffSignal
 */

/** Cor resultante do semáforo. */
export type HandoffSignal = 'green' | 'yellow' | 'red';

/** Discriminador da cadeia de handoff a calcular (uma por listagem enriquecida no Bloco 3). */
export type HandoffKind = 'purchase' | 'purchase_requisition' | 'lot' | 'sale' | 'non_conformity';

/** Campos mínimos de `Purchase` (pedido de compra) necessários para a cadeia Compras → Recebimento. */
export interface PurchaseHandoffEntity {
  status: 'pending' | 'approved' | 'sent' | 'partial' | 'received' | 'canceled';
  expected_date: string | Date | null;
  delivery_date: string | Date | null;
}

/**
 * Campos mínimos de `PurchaseRequisition` necessários para a fila de
 * aprovação (Solicitante → Gestor de Requisições).
 *
 * Cadeia aditiva, não tabulada explicitamente em `BUSINESS_RULES.md` §10
 * (que cobre Compras→Recebimento a partir do PEDIDO já enviado, não da
 * requisição em si) — solicitada nominalmente no enunciado desta tarefa
 * (`docs/governance/TODO.md` Bloco 3.2 "`GET /api/purchase-requisitions`"),
 * usando a mesma semântica de semáforo: `pending` é o único estado que
 * representa handoff aberto aguardando ação de terceiro (o gestor).
 */
export interface PurchaseRequisitionHandoffEntity {
  status: 'draft' | 'pending' | 'approved' | 'ordered' | 'partial' | 'received' | 'canceled';
}

/** Campos mínimos de `LotControl` necessários para as cadeias Recebimento → Qualidade e Qualidade → Almoxarifado. */
export interface LotHandoffEntity {
  status: 'available' | 'reserved' | 'consumed' | 'blocked' | 'expired' | 'quarantine';
}

/** Campos mínimos de `Sale` necessários para a cadeia Vendas → Expedição. */
export interface SaleHandoffEntity {
  status: 'quote' | 'confirmed' | 'invoiced' | 'shipped' | 'canceled';
  nfe_status?: 'pending' | 'processing' | 'authorized' | 'denied' | 'cancelled' | null;
}

/** Campos mínimos de `NonConformity` necessários para a cadeia Recebimento/Qualidade → RNC. */
export interface NonConformityHandoffEntity {
  status: 'open' | 'analysis' | 'corrective_action' | 'effectiveness_check' | 'closed' | 'canceled';
  /**
   * Resultado da verificação de eficácia (`AcousticTestResult`/campo já
   * existente no modelo `NonConformity`). Usado como o sinal de
   * "reincidência"/"fechamento não efetivo" da tabela §10:
   * `effectiveness_result === 'ineffective'` em um RNC `closed` é tratado
   * como vermelho (a ação corretiva não resolveu, mesmo já "fechado").
   */
  effectiveness_result?: 'effective' | 'partially_effective' | 'ineffective' | null;
}

/**
 * Calcula o semáforo de handoff de um pedido de compra na fila de
 * Recebimento (Compras → Recebimento, §10 linha 1).
 *
 * - Vermelho: `expected_date` vencida (< hoje) e `delivery_date` ainda nula
 *   — atraso sem entrega registrada, independente do `status` atual (exceto
 *   estados terminais `received`/`canceled`, que saem da régua de prazo).
 * - Verde: `status` em `sent`/`approved`/`partial`, dentro do prazo (sem
 *   vencimento, ou `expected_date` ainda não vencida).
 * - Amarelo: não definido para esta cadeia na tabela normativa — pedidos
 *   `pending` (ainda nem enviados ao fornecedor) recebem verde por
 *   ausência de critério amarelo explícito no §10 (mesma semântica de
 *   "sem alerta ainda").
 *
 * @param entity - Pedido de compra com `status`, `expected_date`, `delivery_date`.
 * @param now - Data de referência para comparação com `expected_date` (default: `new Date()`, injetável para testes).
 * @returns Cor do semáforo.
 */
function calculatePurchaseSignal(entity: PurchaseHandoffEntity, now: Date): HandoffSignal {
  const isTerminal = entity.status === 'received' || entity.status === 'canceled';
  const isOverdue =
    !isTerminal &&
    !entity.delivery_date &&
    !!entity.expected_date &&
    new Date(entity.expected_date) < now;

  if (isOverdue) {
    return 'red';
  }

  return 'green';
}

/**
 * Calcula o semáforo de handoff de uma requisição de compra na fila de
 * aprovação do gestor da área de Requisições.
 *
 * - Amarelo: `pending` — aguardando aprovação (handoff aberto).
 * - Verde: demais status (`draft` ainda não é handoff para terceiro;
 *   `approved`/`ordered`/`partial`/`received` já avançaram no fluxo;
 *   `canceled` é terminal) — nenhum estado desta cadeia tem cor vermelha
 *   definida (não há SLA de vencimento modelado para aprovação de
 *   requisição nesta entrega).
 *
 * @param entity - Requisição de compra com `status`.
 * @returns Cor do semáforo.
 */
function calculatePurchaseRequisitionSignal(entity: PurchaseRequisitionHandoffEntity): HandoffSignal {
  if (entity.status === 'pending') {
    return 'yellow';
  }
  return 'green';
}

/**
 * Calcula o semáforo de handoff de um lote (`LotControl`) nas cadeias
 * Recebimento → Qualidade e Qualidade → Almoxarifado (§10 linhas 2 e 3,
 * unificadas — o lote tem um único `status` que serve às duas filas).
 *
 * - Verde: `available` (liberado, pronto para consumo/almoxarifado).
 * - Amarelo: `quarantine` (aguardando inspeção de recebimento/qualidade).
 * - Vermelho: `blocked` (bloqueado pela Qualidade).
 * - Demais status (`reserved`, `consumed`, `expired`) não têm cor definida
 *   na tabela normativa — tratados como verde (fora da régua de alerta,
 *   mesma semântica de "sem pendência de handoff").
 *
 * @param entity - Lote com `status`.
 * @returns Cor do semáforo.
 */
function calculateLotSignal(entity: LotHandoffEntity): HandoffSignal {
  if (entity.status === 'blocked') {
    return 'red';
  }
  if (entity.status === 'quarantine') {
    return 'yellow';
  }
  return 'green';
}

/**
 * Calcula o semáforo de handoff de uma venda na fila de Expedição
 * (Vendas → Expedição, §10 linha 4).
 *
 * - Verde: `status === 'invoiced'` (NF-e autorizada, pronta para embarque —
 *   UC-41).
 * - Amarelo: `nfe_status === 'processing'` (NF-e em emissão) — cobre o
 *   intervalo em que a venda ainda não é `invoiced` mas já iniciou a
 *   emissão fiscal.
 * - Vermelho: `status` em `denied`/`cancelled`. Note que `denied`/
 *   `cancelled` são valores de `nfe_status`, não de `sale.status` (que só
 *   tem `quote|confirmed|invoiced|shipped|canceled`) — a tabela §10 usa
 *   esses termos para descrever "a NF-e foi negada/cancelada", portanto
 *   verificamos `nfe_status` primeiro; `sale.status === 'canceled'`
 *   também é tratado como vermelho (venda cancelada não embarca).
 *
 * @param entity - Venda com `status` e `nfe_status`.
 * @returns Cor do semáforo.
 */
function calculateSaleSignal(entity: SaleHandoffEntity): HandoffSignal {
  if (entity.nfe_status === 'denied' || entity.nfe_status === 'cancelled' || entity.status === 'canceled') {
    return 'red';
  }
  if (entity.status === 'invoiced') {
    return 'green';
  }
  if (entity.nfe_status === 'processing') {
    return 'yellow';
  }
  return 'green';
}

/**
 * Calcula o semáforo de handoff de uma não conformidade na fila de
 * tratativa (Recebimento/Qualidade → RNC, §10 linha 5).
 *
 * - Amarelo: `open`/`analysis` (equivalente a `in_analysis` da tabela
 *   normativa — nome do enum real do modelo é `analysis`).
 * - Vermelho: `closed` com `effectiveness_result != 'effective'`
 *   (reincidente — inclui `ineffective`, `partially_effective` e `closed`
 *   sem nenhum resultado de eficácia registrado, redação literal de
 *   `01-USE_CASES.md` UC-40: "closed com effectiveness_result !=
 *   effective — Reincidente").
 * - `closed` com `effectiveness_result === 'effective'`,
 *   `corrective_action`, `effectiveness_check` e `canceled` não têm cor
 *   definida na tabela normativa — tratados como verde (RNC em tratativa
 *   avançada ou já resolvida com sucesso, fora da régua de alerta).
 *
 * @param entity - Não conformidade com `status` e `effectiveness_result` opcional.
 * @returns Cor do semáforo.
 */
function calculateNonConformitySignal(entity: NonConformityHandoffEntity): HandoffSignal {
  if (entity.status === 'closed' && entity.effectiveness_result !== 'effective') {
    return 'red';
  }
  if (entity.status === 'open' || entity.status === 'analysis') {
    return 'yellow';
  }
  return 'green';
}

/**
 * Ponto único de cálculo do semáforo de handoff — despacha para a função
 * específica da cadeia conforme `kind`. Não duplicar esta lógica em
 * controllers/use cases: toda listagem enriquecida com `handoff_signal`
 * (Bloco 3) deve chamar esta função.
 *
 * @param kind - Cadeia de handoff (`purchase`, `lot`, `sale`, `non_conformity`).
 * @param entity - Entidade com os campos mínimos exigidos pela cadeia (ver tipos específicos).
 * @param now - Data de referência para comparações de prazo (default: `new Date()`, injetável para testes determinísticos).
 * @returns Cor do semáforo (`green|yellow|red`).
 */
export function calculateHandoffSignal(
  kind: 'purchase',
  entity: PurchaseHandoffEntity,
  now?: Date
): HandoffSignal;
export function calculateHandoffSignal(
  kind: 'purchase_requisition',
  entity: PurchaseRequisitionHandoffEntity,
  now?: Date
): HandoffSignal;
export function calculateHandoffSignal(kind: 'lot', entity: LotHandoffEntity, now?: Date): HandoffSignal;
export function calculateHandoffSignal(kind: 'sale', entity: SaleHandoffEntity, now?: Date): HandoffSignal;
export function calculateHandoffSignal(
  kind: 'non_conformity',
  entity: NonConformityHandoffEntity,
  now?: Date
): HandoffSignal;
export function calculateHandoffSignal(kind: HandoffKind, entity: any, now: Date = new Date()): HandoffSignal {
  switch (kind) {
    case 'purchase':
      return calculatePurchaseSignal(entity, now);
    case 'purchase_requisition':
      return calculatePurchaseRequisitionSignal(entity);
    case 'lot':
      return calculateLotSignal(entity);
    case 'sale':
      return calculateSaleSignal(entity);
    case 'non_conformity':
      return calculateNonConformitySignal(entity);
    default:
      throw new Error(`calculateHandoffSignal: kind desconhecido "${kind}".`);
  }
}

export default calculateHandoffSignal;

// Compatibilidade com imports CommonJS legados (`require(...)`) usados no projeto.
module.exports = { calculateHandoffSignal, default: calculateHandoffSignal };
