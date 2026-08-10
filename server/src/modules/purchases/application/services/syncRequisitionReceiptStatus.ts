/**
 * Regra pura que decide o novo status de uma REQUISICAO de compra depois de
 * um recebimento de pedido (gap G15).
 *
 * ## O problema
 *
 * `purchase_requisitions.status` tem os valores `partial` e `received` no
 * ENUM desde o schema baseline e, ate 2026-08-09, **nenhuma rotina do sistema
 * jamais os atingia**: `ChangePurchaseRequisitionStatusUseCase` so implementa
 * `draft -> pending|canceled` e `pending -> approved|canceled`, e a conversao
 * em pedido para em `ordered`. Resultado: a requisicao morria em `ordered` e
 * ninguem conseguia responder "esta requisicao foi atendida?" — justamente o
 * elo que fecha o rastro requisicao -> pedido -> recebimento -> estoque,
 * exigido pela rastreabilidade 100% (CLAUDE.md §7, "Requisicao de Compra como
 * Origem").
 *
 * Optou-se por **acionar** os estados (e nao remove-los do ENUM) porque a
 * pergunta "foi atendida?" e requisito de auditoria fiscal, nao enfeite: sem
 * ela, o unico jeito de saber e abrir cada pedido gerado, um a um.
 *
 * ## Semantica adotada (herdada de `purchase_orders`, de proposito)
 *
 * O ENUM de `purchase_requisitions` espelha o de `purchase_orders`
 * (`...ordered, partial, received...`), onde `partial` significa
 * "parcialmente **RECEBIDO**" — foi exatamente por isso que o G12 recusou
 * usar `partial` para "parcialmente **pedido**" e colocou o saldo de compra
 * em `purchase_requisition_items.status`. Aqui a semantica original e
 * honrada:
 *
 * - `partial`  = parte do que foi requisitado ja chegou fisicamente;
 * - `received` = tudo que foi requisitado chegou (requisicao atendida).
 *
 * ## Por que a requisicao `approved` NAO e tocada
 *
 * Uma requisicao com saldo de compra em aberto permanece `approved` (regra do
 * G12) porque `approved` e o estado que autoriza cotar/converter o restante:
 * `CreateRfqUseCase` e `AwardRfqUseCase` bloqueiam `partial`/`received`
 * (`NON_QUOTABLE_REQUISITION_STATUSES`). Se um recebimento parcial a
 * empurrasse para `partial`, o saldo remanescente ficaria **impossivel de
 * comprar** — trocariamos um estado morto por um travamento real de processo.
 *
 * Isso nao abre buraco: quando o ultimo saldo vira pedido, a requisicao passa
 * a `ordered`, e o recebimento desse ultimo pedido recalcula tudo do zero
 * (esta funcao nunca e incremental) e chega em `received` corretamente.
 *
 * @module modules/purchases/application/services/syncRequisitionReceiptStatus
 */

/**
 * Estados da requisicao em que o recebimento pode refleti-la. Fora deles a
 * requisicao ou ainda tem saldo a comprar (`draft`/`pending`/`approved`) ou
 * morreu (`canceled`) — ver secao "Por que a requisicao `approved` NAO e
 * tocada" no cabecalho deste modulo.
 */
export const SYNCABLE_REQUISITION_STATUSES = ['ordered', 'partial'];

/** Status de item de requisicao que ainda tem saldo a comprar (mesma constante do G12). */
const PENDING_REQUISITION_ITEM_STATUS = 'pending';

/** Status de pedido de compra que nao conta para o atendimento da requisicao. */
const CANCELED_PURCHASE_STATUS = 'canceled';

/** Entrada da regra. */
interface ResolveRequisitionStatusInput {
  /** Status atual de `purchase_requisitions.status`. */
  currentStatus: string;
  /** Status de TODOS os pedidos de compra gerados por esta requisicao. */
  purchaseStatuses: string[];
  /** Status de TODOS os itens da requisicao (`purchase_requisition_items.status`). */
  requisitionItemStatuses: string[];
}

/**
 * Decide o novo status da requisicao a partir do quadro completo (recalculo
 * total, nunca incremental).
 *
 * @param input - Ver {@link ResolveRequisitionStatusInput}.
 * @returns `'received'`, `'partial'`, ou `null` quando nada deve mudar
 *   (requisicao fora do ciclo de recebimento, sem pedido ativo, nenhum
 *   recebimento ainda, ou o status ja e o correto).
 */
export function resolveRequisitionStatusAfterReceipt(input: ResolveRequisitionStatusInput): 'partial' | 'received' | null {
  const { currentStatus, purchaseStatuses, requisitionItemStatuses } = input;

  if (!SYNCABLE_REQUISITION_STATUSES.includes(currentStatus)) return null;

  // Pedido cancelado nao representa material a receber: ignorado no calculo,
  // senao uma requisicao com um pedido cancelado nunca fecharia.
  const activePurchaseStatuses = purchaseStatuses.filter((status) => status !== CANCELED_PURCHASE_STATUS);
  if (activePurchaseStatuses.length === 0) return null;

  const anyReceipt = activePurchaseStatuses.some((status) => status === 'received' || status === 'partial');
  if (!anyReceipt) return null;

  const allPurchasesReceived = activePurchaseStatuses.every((status) => status === 'received');
  // Item ainda `pending` = saldo requisitado que nunca virou pedido. Existe
  // quando a conversao/adjudicacao foi parcial: nesse caso a requisicao NAO
  // esta atendida, por mais que todos os pedidos emitidos tenham chegado.
  const hasUnorderedBalance = requisitionItemStatuses.includes(PENDING_REQUISITION_ITEM_STATUS);

  const nextStatus: 'partial' | 'received' = allPurchasesReceived && !hasUnorderedBalance ? 'received' : 'partial';

  return nextStatus === currentStatus ? null : nextStatus;
}
