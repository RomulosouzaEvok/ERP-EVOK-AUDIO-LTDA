/**
 * 🛡️ SaleLotService — o gate de qualidade na SAÍDA (D-L) e a devolução ao
 * mesmo lote no cancelamento da nota (D-M).
 *
 * Decisões do dono em 2026-08-10,
 * `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4.
 *
 * ## O que estava aberto
 *
 * O **G7** (`9e061ea`) fechou o gate de qualidade na **entrada**: lote de
 * compra nasce em `quarantine` e só sai de lá com inspeção aprovada
 * registrada. Na **saída** não havia gate nenhum —
 * `services/saleStockService.ts`, que baixa o estoque na autorização da NF-e
 * (G9, `ed47e10`), **nunca consultava `lot_controls`**. Produto acabado com
 * lote `quarantine`/`blocked` era faturado normalmente.
 *
 * Era o último item em aberto do critério de pronto do dono ("nenhum produto
 * sai sem liberação de qualidade registrada, com evidência", §5 do plano) e é
 * exigência da **ISO 9001:2015 §8.6** (a liberação para o cliente só ocorre
 * depois de verificada a conformidade com os critérios de aceitação) e
 * **§8.7** (impedir uso ou entrega não pretendidos de saída não conforme).
 * A empresa pretende se certificar (decisão D-H).
 *
 * ## A regra, exatamente
 *
 * Para cada produto de **uma emissão** (não do pedido inteiro — o G9 fatura
 * proporcional, ver `saleStockService.ts`):
 *
 * | Situação dos lotes do produto | Decisão |
 * |---|---|
 * | Nenhum lote cadastrado | **passa** — produto não governado por lote (estoque legado); bloquear aqui pararia a empresa inteira, e não é o risco que o dono aceitou |
 * | Saldo liberado cobre a emissão | **passa**, consumindo FEFO e gravando `sale_lot_shipments` |
 * | Saldo liberado NÃO cobre **e existe lote retido** (`quarantine`/`blocked`/vencido) | **BLOQUEIA** (`details.rule = 'D-L'`) |
 * | Saldo liberado NÃO cobre e **não há lote retido** | passa pelo que falta (cobertura de lote incompleta, dado legado) e registra o que dá |
 *
 * A terceira linha é a decisão conservadora que a §8.7 pede: havendo material
 * retido daquele produto, o sistema **não tem como provar** que a mercadoria
 * que está saindo não é justamente a retida — e "não consigo provar" não pode
 * virar "pode sair". Vale para lote `blocked` por RNC (G10) e para lote ainda
 * em `quarantine` esperando inspeção (G7).
 *
 * ⚠️ **Risco que o dono conheceu e aceitou:** se a Qualidade não inspecionar
 * no mesmo dia, a venda trava. Por isso a mensagem de erro é prescritiva —
 * diz qual lote, de qual produto, em que estado, e o caminho exato para
 * destravar. Quem esbarra nisso é um vendedor com o cliente esperando.
 *
 * ## D-M — cancelar a nota devolve ao MESMO lote
 *
 * `sale_lot_shipments` guarda de qual lote cada emissão tirou. O
 * cancelamento devolve a quantidade **daquela emissão**, **àqueles lotes** —
 * nada de "devolve ao primeiro lote disponível", que zeraria a
 * rastreabilidade do que efetivamente saiu.
 *
 * Lote que estiver `blocked` no momento da devolução **continua blocked**:
 * devolver mercadoria não é liberar qualidade. Só o `consumed` (que ficou
 * assim porque zerou) volta a `available`.
 *
 * @module services/saleLotService
 */

import type { Transaction } from 'sequelize';

import { BusinessRuleError } from '../errors';

/**
 * Modelos via CommonJS (hybrid mode, mesmo padrão de `inventoryService.ts`).
 *
 * Resolvidos a CADA chamada, e não uma vez no carregamento do módulo. A
 * desestruturação no topo (`const { LotControl } = require(...)`) congela as
 * referências no instante em que o módulo é importado — antes de qualquer
 * `jest.doMock('src/models/index')` das suítes unitárias. Como este serviço
 * entrou no caminho de `IssueSaleNfeUseCase`/`ChangeSaleStatusUseCase`, o
 * congelamento derrubou 9 suítes de uma vez em 2026-08-10 (`SaleLotShipment`
 * indefinido, ou o `models/index` real chamando `sequelize.define` contra um
 * `database` dublê). O acesso tardio elimina a classe inteira.
 *
 * @returns Registro de models do Sequelize (ou o dublê ativo, em teste).
 */
function models(): any {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../models/index');
}

/** Abaixo disso, diferença de quantidade é ruído de DECIMAL(12,4). */
export const LOT_EPSILON = 0.0001;

/**
 * Único status de lote que autoriza saída para o cliente.
 *
 * Conferido literal a literal contra `enum_lot_controls_status`
 * (`available | reserved | consumed | blocked | expired | quarantine`).
 * `reserved` NÃO entra: é alocação de material, não liberação — e nenhum
 * caminho do ERP grava esse status hoje.
 */
export const SHIPPABLE_LOT_STATUS = 'available';

/**
 * Status que caracterizam material **retido pela qualidade**. Mesma dupla de
 * `services/quarantineBalanceService.ts` (`WITHHELD_LOT_STATUSES`), de
 * propósito: duas definições de "retido" no mesmo ERP seria o erro que o G17
 * evitou ao reusar o serviço de quarentena em vez de recalcular.
 */
export const QUALITY_WITHHELD_LOT_STATUSES = ['quarantine', 'blocked'] as const;

/** Uma linha de lote candidata (subconjunto dos campos de `lot_controls`). */
export interface LotCandidate {
  id: number;
  lot_number: string;
  status: string;
  quantity_available: number | string;
  expires_at?: string | null;
}

/** Uma alocação FEFO: quanto sai de qual lote. */
export interface LotAllocation {
  lotId: number;
  lotNumber: string;
  quantity: number;
}

/** Motivo pelo qual um lote não pode ser expedido. */
export interface BlockingLot {
  lot_id: number;
  lot_number: string;
  lot_status: string;
  quantity_available: number;
  expired: boolean;
}

/** Veredito do gate para UM produto de UMA emissão. */
export interface LotGateVerdict {
  /** `false` quando o produto não tem lote nenhum (estoque legado). */
  governed: boolean;
  /** `true` quando o faturamento deve ser recusado (D-L). */
  blocked: boolean;
  /** Alocação FEFO proposta (vazia quando bloqueado ou não governado). */
  allocations: LotAllocation[];
  /** Saldo liberado disponível no momento da avaliação. */
  releasedBalance: number;
  /** Lotes retidos com saldo — o que a mensagem de erro precisa citar. */
  blockingLots: BlockingLot[];
  /** Quanto da quantidade pedida NÃO tem lastro em lote liberado. */
  uncovered: number;
}

/**
 * `true` quando o lote está vencido na data de referência.
 *
 * @param lot - Lote candidato.
 * @param today - Data de referência (`YYYY-MM-DD`).
 * @returns Se a validade já passou.
 */
function isExpired(lot: LotCandidate, today: string): boolean {
  if (!lot.expires_at) return false;
  return String(lot.expires_at).slice(0, 10) < today;
}

/**
 * Ordena os lotes por FEFO (First-Expired-First-Out), com os sem validade por
 * último — mesma ordem usada no consumo de produção
 * (`ChangeProductionOrderStatusUseCase`), para que entrada e saída não usem
 * critérios diferentes de escolha de lote.
 *
 * A ordenação é feita em memória sobre a lista já lida do banco (a query
 * traz todos os lotes do produto), o que mantém a regra pura e testável sem
 * PostgreSQL.
 *
 * @param lots - Lotes candidatos.
 * @returns Nova lista ordenada (não muta a original).
 */
function sortFefo(lots: LotCandidate[]): LotCandidate[] {
  return [...lots].sort((a, b) => {
    const aExp = a.expires_at ? String(a.expires_at).slice(0, 10) : null;
    const bExp = b.expires_at ? String(b.expires_at).slice(0, 10) : null;
    if (aExp && bExp && aExp !== bExp) return aExp < bExp ? -1 : 1;
    if (aExp && !bExp) return -1;
    if (!aExp && bExp) return 1;
    return Number(a.id) - Number(b.id);
  });
}

/**
 * Avalia o gate de qualidade na saída para UM produto — **função pura**, sem
 * banco, que é onde a regra de fato mora (ver tabela no JSDoc do módulo).
 *
 * @param lots - Todos os lotes do produto (qualquer status), já lidos do banco.
 * @param quantity - Quantidade que ESTA emissão consome do produto.
 * @param today - Data de referência para vencimento (`YYYY-MM-DD`).
 * @returns Veredito com alocação FEFO ou motivo do bloqueio.
 */
export function evaluateLotGate(lots: LotCandidate[], quantity: number, today: string): LotGateVerdict {
  const needed = Number(quantity) || 0;
  const withBalance = (lots ?? []).filter((lot) => Number(lot.quantity_available ?? 0) > LOT_EPSILON);

  if (withBalance.length === 0) {
    // Produto sem lote nenhum com saldo: estoque não governado por lote.
    // Bloquear aqui não é o gate de qualidade que o dono pediu — seria
    // parar a empresa inteira por ausência de cadastro.
    return { governed: false, blocked: false, allocations: [], releasedBalance: 0, blockingLots: [], uncovered: needed };
  }

  const shippable = sortFefo(
    withBalance.filter((lot) => lot.status === SHIPPABLE_LOT_STATUS && !isExpired(lot, today))
  );
  const releasedBalance = shippable.reduce((sum, lot) => sum + Number(lot.quantity_available ?? 0), 0);

  const blockingLots: BlockingLot[] = withBalance
    .filter((lot) => (QUALITY_WITHHELD_LOT_STATUSES as readonly string[]).includes(lot.status)
      || lot.status === 'expired'
      || isExpired(lot, today))
    .map((lot) => ({
      lot_id: Number(lot.id),
      lot_number: String(lot.lot_number),
      lot_status: String(lot.status),
      quantity_available: Number(lot.quantity_available ?? 0),
      expired: isExpired(lot, today) || lot.status === 'expired',
    }));

  const allocations: LotAllocation[] = [];
  let remaining = needed;
  for (const lot of shippable) {
    if (remaining <= LOT_EPSILON) break;
    const available = Number(lot.quantity_available ?? 0);
    const take = Math.min(available, remaining);
    if (take <= LOT_EPSILON) continue;
    allocations.push({ lotId: Number(lot.id), lotNumber: String(lot.lot_number), quantity: take });
    remaining -= take;
  }

  const uncovered = remaining > LOT_EPSILON ? remaining : 0;
  const blocked = uncovered > 0 && blockingLots.length > 0;

  return {
    governed: true,
    blocked,
    allocations: blocked ? [] : allocations,
    releasedBalance,
    blockingLots,
    uncovered,
  };
}

/**
 * Traduz um status de lote para o vocabulário do vendedor.
 *
 * @param status - Status cru de `lot_controls`.
 * @param expired - Se o lote está vencido.
 * @returns Texto curto, em português.
 */
function describeLotStatus(status: string, expired: boolean): string {
  if (expired) return 'vencido';
  if (status === 'quarantine') return 'em quarentena, aguardando inspecao';
  if (status === 'blocked') return 'bloqueado pela Qualidade';
  return `com status '${status}'`;
}

/**
 * Monta o erro 422 do gate — **prescritivo por exigência do dono**: quem
 * esbarra nele é um vendedor com o cliente esperando, então a mensagem diz o
 * lote, o produto, o estado e o caminho exato para destravar.
 *
 * @param product - Produto travado (`{ id, code, name }`).
 * @param needed - Quantidade desta emissão.
 * @param verdict - Veredito do gate.
 * @returns `BusinessRuleError` (HTTP 422) com `details.rule = 'D-L'`.
 */
function buildGateError(product: any, needed: number, verdict: LotGateVerdict): InstanceType<typeof BusinessRuleError> {
  const lotList = verdict.blockingLots
    .map((lot) => `${lot.lot_number} (${describeLotStatus(lot.lot_status, lot.expired)}, saldo ${lot.quantity_available})`)
    .join('; ');

  const productLabel = `${product?.name ?? 'produto'} (codigo ${product?.code ?? product?.id})`;

  return new BusinessRuleError(
    `Faturamento bloqueado pela Qualidade: o produto ${productLabel} nao tem saldo LIBERADO suficiente para esta emissao `
    + `(necessario ${needed}, liberado ${verdict.releasedBalance}). Retido: ${lotList}. `
    + 'Enquanto o lote nao for liberado, a mercadoria nao pode ser expedida (ISO 9001:2015 8.6/8.7).',
    {
      rule: 'D-L',
      product_id: Number(product?.id) || null,
      product_code: product?.code ?? null,
      required_quantity: needed,
      released_quantity: verdict.releasedBalance,
      missing_quantity: verdict.uncovered,
      blocking_lots: verdict.blockingLots,
      what_to_do:
        'Qualidade > Lotes: registre a inspecao do lote (POST /api/quality/inspections com verdict aprovado) e libere-o '
        + '(POST /api/inventory/lots/:id/release). Se o lote estiver bloqueado por nao conformidade, trate a RNC antes. '
        + 'Alternativa imediata: fature apenas a quantidade coberta por lote liberado (faturamento parcial, '
        + 'POST /api/sales/:id/nfe com items[].quantity).',
    }
  );
}

/**
 * Lê os lotes de um produto.
 *
 * @param productId - `products.id`.
 * @param transaction - Transação Sequelize ativa.
 * @param lock - `true` para `FOR UPDATE` (caminho de escrita); `false` na pré-checagem só-leitura.
 * @returns Lotes do produto (qualquer status).
 */
async function loadLots(productId: number, transaction: Transaction, lock: boolean): Promise<any[]> {
  return models().LotControl.findAll({
    where: { product_id: productId },
    order: [['id', 'ASC']],
    transaction,
    ...(lock ? { lock: (transaction as any).LOCK.UPDATE } : {}),
  });
}

/** Uma linha de faturamento: produto e quantidade **desta emissão**. */
export interface InvoiceLotLine {
  productId: number;
  quantity: number;
}

/**
 * Data de hoje em `YYYY-MM-DD` (referência de vencimento).
 *
 * @returns Data ISO curta.
 */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * **D-L — pré-checagem, sem escrever nada.**
 *
 * Roda na PRIMEIRA transação da emissão (`IssueSaleNfeUseCase`), antes de
 * reservar número de NF-e, marcar `nfe_status = 'processing'` e criar o
 * registro em `sale_invoices`. Se o gate reprovasse só na transação final, a
 * venda ficaria travada em `processing` com um número de nota queimado — o
 * oposto de "nada é gravado".
 *
 * @param lines - Produto × quantidade desta emissão.
 * @param transaction - Transação Sequelize ativa (só leitura aqui).
 * @throws {BusinessRuleError} 422 `details.rule = 'D-L'` quando algum produto depende de lote não liberado.
 */
export async function assertLotsReleasedForInvoice(
  lines: InvoiceLotLine[],
  transaction: Transaction
): Promise<void> {
  const today = todayIso();

  for (const line of lines ?? []) {
    const productId = Number(line.productId);
    const quantity = Number(line.quantity);
    if (!Number.isFinite(productId) || !Number.isFinite(quantity) || quantity <= LOT_EPSILON) continue;

    const lots = await loadLots(productId, transaction, false);
    const verdict = evaluateLotGate(lots as LotCandidate[], quantity, today);
    if (!verdict.blocked) continue;

    const product = await models().Product.findByPk(productId, { transaction });
    throw buildGateError(product ?? { id: productId }, quantity, verdict);
  }
}

/**
 * **D-L + rastro de expedição** — aplica a saída por lote de UM produto:
 * revalida o gate sob `FOR UPDATE`, baixa o saldo dos lotes escolhidos (FEFO)
 * e grava `sale_lot_shipments`.
 *
 * Roda na MESMA transação que baixa `products.quantity` e incrementa
 * `SaleItem.invoiced_quantity` — se qualquer parte falhar, nada acontece.
 *
 * @param params.saleId - Venda dona da saída.
 * @param params.saleInvoiceId - Emissão dona da saída (`sale_invoices.id`); `undefined` só em saída sem registro de emissão.
 * @param params.productId - Produto expedido.
 * @param params.quantity - Quantidade DESTA emissão.
 * @param params.userId - Responsável (do JWT).
 * @param params.transaction - Transação ativa.
 * @param params.notes - Texto gravado em `sale_lot_shipments.notes`.
 * @returns Alocações efetivadas (vazio quando o produto não é governado por lote).
 * @throws {BusinessRuleError} 422 `details.rule = 'D-L'`.
 */
export async function shipLotsForInvoice(params: {
  saleId: number;
  saleInvoiceId?: number | null;
  productId: number;
  quantity: number;
  userId?: number | null;
  transaction: Transaction;
  notes?: string;
}): Promise<LotAllocation[]> {
  const { saleId, productId, quantity, transaction } = params;
  const today = todayIso();

  const lots = await loadLots(productId, transaction, true);
  const verdict = evaluateLotGate(lots as LotCandidate[], quantity, today);

  if (verdict.blocked) {
    const product = await models().Product.findByPk(productId, { transaction });
    throw buildGateError(product ?? { id: productId }, quantity, verdict);
  }
  if (!verdict.governed || verdict.allocations.length === 0) return [];

  const lotById = new Map<number, any>((lots ?? []).map((lot: any) => [Number(lot.id), lot]));

  for (const allocation of verdict.allocations) {
    const lot = lotById.get(allocation.lotId);
    const available = Number(lot.quantity_available ?? 0);
    const nextAvailable = available - allocation.quantity;

    await lot.update({
      quantity_available: nextAvailable <= LOT_EPSILON ? 0 : nextAvailable,
      // Lote zerado vira 'consumed', igual ao consumo de produção — é o que
      // permite a devolução (D-M) reconhecer o lote que zerou por causa da
      // expedição e devolvê-lo a 'available'.
      status: nextAvailable <= LOT_EPSILON ? 'consumed' : lot.status,
    }, { transaction });

    await models().SaleLotShipment.create({
      sale_id: saleId,
      // `?? undefined` (nunca `?? null`): passar NULL explícito para uma
      // coluna com default anula o default do Postgres — a classe de defeito
      // que já apareceu 5 vezes neste ERP.
      sale_invoice_id: params.saleInvoiceId ?? undefined,
      product_id: productId,
      lot_control_id: allocation.lotId,
      quantity: allocation.quantity,
      quantity_returned: 0,
      status: 'shipped',
      shipped_at: new Date(),
      user_id: params.userId ?? undefined,
      notes: params.notes ?? `Expedicao da venda #${saleId}`,
    }, { transaction });
  }

  return verdict.allocations;
}

/** Resultado de uma devolução ao lote (D-M). */
export interface LotReturnResult {
  shipmentId: number;
  lotId: number;
  lotNumber: string;
  productId: number;
  quantity: number;
  /** `true` quando o lote estava `consumed` e voltou a `available`. */
  lotReopened: boolean;
}

/**
 * **D-M — devolve ao MESMO lote de onde saiu.**
 *
 * Usada em dois pontos:
 *  - cancelamento da NF-e (`CancelSaleNfeUseCase`), filtrando pela emissão
 *    (`saleInvoiceId`) — devolve a quantidade **daquela nota**, nunca a do
 *    pedido inteiro (faturamento parcial);
 *  - cancelamento da venda (`ChangeSaleStatusUseCase`), sem filtro de
 *    emissão — devolve tudo que ainda estiver expedido, para o saldo do lote
 *    não ficar preso quando o pedido morre.
 *
 * Idempotente: linha já `returned` é ignorada, então cancelar a nota e depois
 * a venda não devolve duas vezes.
 *
 * @param params.saleId - Venda dona das saídas.
 * @param params.saleInvoiceId - Emissão específica; omitido = todas as saídas vivas da venda.
 * @param params.transaction - Transação ativa (a mesma que devolve `products.quantity`).
 * @param params.notes - Motivo, gravado na linha devolvida.
 * @returns Uma entrada por linha devolvida.
 */
export async function returnLotShipments(params: {
  saleId: number;
  saleInvoiceId?: number | null;
  transaction: Transaction;
  notes?: string;
}): Promise<LotReturnResult[]> {
  const where: Record<string, unknown> = { sale_id: params.saleId, status: 'shipped' };
  if (params.saleInvoiceId) where.sale_invoice_id = params.saleInvoiceId;

  const shipments = await models().SaleLotShipment.findAll({
    where,
    order: [['id', 'ASC']],
    transaction: params.transaction,
    lock: (params.transaction as any).LOCK.UPDATE,
  });

  const results: LotReturnResult[] = [];

  for (const shipment of shipments) {
    const outstanding = Number(shipment.quantity ?? 0) - Number(shipment.quantity_returned ?? 0);
    if (outstanding <= LOT_EPSILON) continue;

    const lot = await models().LotControl.findByPk(shipment.lot_control_id, {
      transaction: params.transaction,
      lock: (params.transaction as any).LOCK.UPDATE,
    });
    if (!lot) continue;

    const reopened = lot.status === 'consumed';
    await lot.update({
      quantity_available: Number(lot.quantity_available ?? 0) + outstanding,
      // Só o lote que zerou POR CAUSA da expedição volta a 'available'.
      // Lote 'blocked' (RNC aberta depois do embarque) continua bloqueado:
      // devolver mercadoria não é liberar qualidade.
      status: reopened ? 'available' : lot.status,
    }, { transaction: params.transaction });

    await shipment.update({
      quantity_returned: Number(shipment.quantity ?? 0),
      status: 'returned',
      returned_at: new Date(),
      notes: params.notes ?? shipment.notes,
    }, { transaction: params.transaction });

    results.push({
      shipmentId: Number(shipment.id),
      lotId: Number(lot.id),
      lotNumber: String(lot.lot_number),
      productId: Number(shipment.product_id),
      quantity: outstanding,
      lotReopened: reopened,
    });
  }

  return results;
}

// CommonJS compatibility (mesmo padrão de `saleStockService.ts`).
// ATENÇÃO: este objeto SUBSTITUI os named exports acima em tempo de execução
// (`require`) — toda função nova precisa aparecer aqui também.
module.exports = {
  LOT_EPSILON,
  SHIPPABLE_LOT_STATUS,
  QUALITY_WITHHELD_LOT_STATUSES,
  evaluateLotGate,
  assertLotsReleasedForInvoice,
  shipLotsForInvoice,
  returnLotShipments,
};
