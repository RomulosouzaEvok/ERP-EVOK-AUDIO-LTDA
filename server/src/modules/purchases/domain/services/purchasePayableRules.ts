/**
 * 💸 Regras puras da conta a pagar de compra (gap G13, decisão D-A).
 *
 * ## Por que este arquivo existe
 *
 * Até 2026-08-10 a `AccountPayable` de um pedido de compra nascia na
 * **aprovação do pedido** (`ChangePurchaseStatusUseCase`, transição
 * `pending -> approved`), com valor igual ao pedido inteiro e vencimento
 * `expected_date + 30 dias`.
 *
 * Isso contraria o **CPC 00 (R2) — Estrutura Conceitual**:
 *  - item **4.56**: pedido aprovado e não entregue é *contrato executório*
 *    (nenhuma das partes cumpriu);
 *  - item **4.58**: *"Se a outra parte efetua o cumprimento primeiro, esse
 *    cumprimento é o evento que altera o direito e a obrigação (…) pela
 *    obrigação de transferir um recurso econômico. Essa obrigação é um
 *    passivo."*
 *
 * Ou seja: o passivo nasce **quando o fornecedor entrega**, não quando a
 * empresa aprova a compra. O gatilho correto é o **recebimento**
 * (`ReceivePurchaseItemsUseCase`), que é também o único momento em que
 * existem as três pernas do *three-way match* (pedido × recebimento × NF do
 * fornecedor).
 *
 * ## Consequência direta no recebimento parcial
 *
 * Recebeu metade, deve a metade. O valor da AP é calculado sobre as
 * quantidades **deste recebimento**, nunca sobre `purchase_orders.
 * total_amount`. Um pedido recebido em três parcelas gera três contas a
 * pagar, cada uma amarrada à NF do fornecedor daquela entrega
 * (`purchase_receipts.invoice_number`, que já é único por pedido).
 *
 * ## O que este módulo NÃO decide
 *
 * `freight_value` fica de fora do valor da AP porque já ficava de fora de
 * `total_amount` (ver `CreatePurchaseUseCase`, onde o total é a soma
 * `quantidade × preço unitário`, e `purchaseApprovalValue`, que soma o
 * frete à parte). Manter o mesmo escopo evita mudar, de carona, o valor do
 * passivo — o frete continua sendo lançamento manual em
 * `POST /api/finance/payable`.
 *
 * @module modules/purchases/domain/services/purchasePayableRules
 */

const { toCents, fromCents } = require('../../../../shared/utils/money');

/** Prazo padrão de pagamento, em dias, quando nada é informado. */
export const DEFAULT_PAYMENT_TERM_DAYS = 30;

/** Uma linha efetivamente recebida nesta entrega. */
export interface ReceivedLine {
  /** Quantidade recebida NESTA entrega (não a acumulada do item). */
  quantity: number | string;
  /** Preço unitário do item no pedido. */
  unitPrice: number | string;
}

/**
 * Soma o valor da entrega em centavos e devolve em reais.
 *
 * O cálculo é feito em centavos (`shared/utils/money`) pelo mesmo motivo do
 * faturamento de venda: somar `quantidade × preço` em ponto flutuante
 * acumula erro e o passivo passa a divergir do somatório das notas.
 *
 * @param lines - Linhas recebidas nesta entrega (quantidade × preço unitário).
 * @returns Valor da entrega em reais, com 2 casas.
 *
 * @example
 * calculateReceiptAmount([{ quantity: 5, unitPrice: 10.10 }]) // => 50.5
 */
export function calculateReceiptAmount(lines: ReceivedLine[]): number {
  let totalCents = 0;
  for (const line of lines || []) {
    const quantity = Number(line?.quantity);
    const unitPrice = Number(line?.unitPrice);
    if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) continue;
    if (quantity <= 0) continue;
    totalCents += Math.round(quantity * toCents(unitPrice));
  }
  return fromCents(totalCents);
}

/**
 * Resolve a data de vencimento da conta a pagar do recebimento.
 *
 * ⚠️ **Pergunta C9/C7 ao contador ainda em aberto** (ver
 * `docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`, Decisão
 * 6): se o prazo de pagamento é contado da **NF do fornecedor** ou do
 * **recebimento físico**. Enquanto não há resposta, a regra aqui é
 * conservadora e explícita:
 *
 * 1. `dueDate` informado no recebimento **sempre** prevalece — é o prazo
 *    real negociado, digitado por quem tem a nota na mão;
 * 2. senão, `invoiceDate` (data de emissão da NF do fornecedor) + 30 dias;
 * 3. senão, data do recebimento + 30 dias.
 *
 * Os 30 dias são o **mesmo default que já existia** no comportamento
 * anterior — nada foi inventado aqui; o que mudou é a data-base, que deixou
 * de ser `expected_date` (data prometida, muitas vezes já vencida ou nunca
 * cumprida) e passou a ser um fato ocorrido.
 *
 * `suppliers.payment_terms` **não** é usado: a coluna é `STRING(100)` de
 * texto livre ("30/60/90", "à vista", "a combinar"), não um número de dias
 * — derivar vencimento dela seria adivinhação.
 *
 * @param input.dueDate - Vencimento informado explicitamente no recebimento (opcional).
 * @param input.invoiceDate - Data de emissão da NF do fornecedor (opcional).
 * @param input.receivedAt - Data/hora do recebimento (obrigatória, é o fato gerador).
 * @param input.termDays - Prazo em dias aplicado sobre a data-base (default 30).
 * @returns Data de vencimento no formato `YYYY-MM-DD` (coluna `DATEONLY`).
 */
export function resolvePayableDueDate({
  dueDate,
  invoiceDate,
  receivedAt,
  termDays = DEFAULT_PAYMENT_TERM_DAYS,
}: {
  dueDate?: string | Date | null;
  invoiceDate?: string | Date | null;
  receivedAt: string | Date;
  termDays?: number;
}): string {
  if (dueDate) return toDateOnly(dueDate);

  const base = new Date(invoiceDate || receivedAt);
  const resolved = Number.isNaN(base.getTime()) ? new Date() : base;
  return toDateOnly(new Date(resolved.getTime() + termDays * 24 * 60 * 60 * 1000));
}

/**
 * Normaliza uma data para `YYYY-MM-DD` (colunas `DATEONLY` do Sequelize).
 *
 * Aceita string já no formato (devolve os 10 primeiros caracteres, sem
 * passar por `new Date`, o que evita o deslocamento de fuso que transforma
 * `2026-08-10` em `2026-08-09` em máquinas a oeste de Greenwich).
 *
 * @param value - Data em `Date` ou string.
 * @returns Data no formato `YYYY-MM-DD`.
 */
export function toDateOnly(value: string | Date): string {
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

module.exports = {
  DEFAULT_PAYMENT_TERM_DAYS,
  calculateReceiptAmount,
  resolvePayableDueDate,
  toDateOnly,
};
