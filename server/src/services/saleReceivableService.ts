/**
 * 💵 SaleReceivableService — a conta a receber da venda nasce na NF-e.
 *
 * Gap G13 (2026-08-10, decisão D-A do dono em
 * `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4): as parcelas
 * de `AccountReceivable` saíram da **confirmação do pedido** e passaram para
 * a **autorização da NF-e**.
 *
 * ## Base normativa
 *
 * **CPC 47 — Receita de Contrato com Cliente** (IFRS 15):
 *  - item **31**: a receita é reconhecida quando o cliente **obtém o
 *    controle** do ativo;
 *  - item **38**: os indicadores de transferência de controle são direito
 *    presente a pagamento, titularidade legal, posse física, riscos e
 *    benefícios, aceite — **nenhum deles existe na confirmação do pedido**;
 *  - item **108**: *"Recebível é um direito da entidade à contraprestação
 *    que seja **incondicional**."* Antes da nota o direito é condicional ao
 *    faturamento/embarque, logo não é recebível.
 *
 * Criar as parcelas na confirmação antecipava receita e inflava o ativo.
 *
 * ## Faturamento parcial (coerência com o G9)
 *
 * O recebível acompanha a **emissão**, não o pedido. Uma venda de R$ 1.000
 * faturada em duas notas de R$ 400 e R$ 600 gera parcelas de R$ 400 e
 * depois de R$ 600 — exatamente como o estoque, que o G9 já passou a baixar
 * por emissão (`services/saleStockService.ts`). As duas correções são a
 * mesma ideia aplicada aos dois lados do lançamento.
 *
 * A numeração de parcelas é **contínua por venda**: a segunda emissão
 * continua de onde a primeira parou, em vez de recomeçar em 1 e criar dois
 * pares `(sale_id, installment)` iguais.
 *
 * ## Nenhuma parcela nasce `paid`
 *
 * A venda à vista criava a parcela já com `status: 'paid'` e
 * `payment_date: hoje`, **sem dinheiro nenhum ter entrado**. Isso quebrava
 * conciliação bancária (recebível que nunca aparece como pendência no
 * extrato), trilha de auditoria (quem recebeu? em qual conta?) e
 * segregação de funções — quem vende dava quitação. Agora toda parcela
 * nasce `pending`; a baixa é evento próprio em
 * `PUT /api/finance/receivable/:id/pay`, com valor, data e usuário.
 * Venda de balcão continua possível: a baixa acontece um segundo depois,
 * mas **acontece**, com registro.
 *
 * ## Recebível avulso continua livre (decisão D-J)
 *
 * Reembolso, aluguel e venda de sucata são cobranças legítimas **sem
 * venda**. Este serviço trata apenas do recebível **originado de venda**;
 * o avulso entra por `POST /api/finance/receivable`
 * (`CreateReceivableUseCase`), que exige `sale_id` ausente exatamente para
 * que os dois caminhos não se misturem.
 *
 * @module services/saleReceivableService
 */

import { Transaction } from 'sequelize';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { toCents, fromCents } = require('../shared/utils/money');

/** Uma parcela planejada, antes de virar linha em `accounts_receivable`. */
export interface PlannedInstallment {
  /** Número da parcela dentro da venda (contínuo entre emissões). */
  installment: number;
  /** Valor da parcela em reais, 2 casas. */
  amount: number;
  /** Vencimento (`Date`, gravado em coluna `DATEONLY`). */
  due_date: Date;
}

/** Resultado da criação das parcelas de uma emissão. */
export interface CreateInvoiceReceivablesResult {
  /** Parcelas efetivamente criadas (vazio quando nada foi criado). */
  created: PlannedInstallment[];
  /** `'created'`, ou o motivo de não ter criado nada. */
  reason: 'created' | 'zero_amount' | 'legacy_created_on_confirmation';
}

/**
 * Gateway mínimo de persistência exigido por `createInvoiceReceivables`.
 * Implementado tanto por `FiscalRepository` quanto pelos dublês de teste —
 * o serviço não conhece Sequelize.
 */
export interface ReceivableGateway {
  /** Cria uma linha em `accounts_receivable`. */
  createAccountReceivable(data: Record<string, unknown>, options?: { transaction?: Transaction }): Promise<any>;
  /** Lista as contas a receber já existentes da venda (para legado e numeração). */
  findReceivablesBySaleId(saleId: number | string, options?: { transaction?: Transaction }): Promise<any[]>;
}

/**
 * Monta o plano de parcelas de UMA emissão de NF-e.
 *
 * Função pura — o arredondamento é feito em centavos e a **última parcela
 * absorve o resto da divisão inteira** (mesma regra F24 que já valia na
 * confirmação, preservada para não mudar o centavo do dono ao mudar o
 * momento do lançamento).
 *
 * Vencimentos:
 *  - 1 parcela → vence na data da emissão (venda à vista vence hoje e é
 *    baixada pela Tesouraria, não nasce paga);
 *  - N parcelas → +1 mês, +2 meses… a partir da emissão, com proteção do
 *    overflow de data do JS (31/jan + 1 mês nunca vira 03/mar).
 *
 * @param totalAmount - Valor TOTAL desta emissão (não do pedido).
 * @param installments - Quantidade de parcelas (mínimo 1).
 * @param issuedAt - Data de autorização da NF-e (âncora dos vencimentos).
 * @param firstInstallmentNumber - Número da primeira parcela desta emissão (continuidade entre notas).
 * @returns Parcelas planejadas, em ordem.
 *
 * @example
 * buildInstallmentPlan(100, 3, new Date('2026-08-10'), 1)
 * // => 33.33 (set), 33.33 (out), 33.34 (nov)
 */
export function buildInstallmentPlan(
  totalAmount: number,
  installments: number,
  issuedAt: Date,
  firstInstallmentNumber = 1
): PlannedInstallment[] {
  const totalCents = toCents(Number(totalAmount) || 0);
  const count = Math.max(1, Math.floor(Number(installments) || 1));
  if (totalCents <= 0) return [];

  if (count === 1) {
    return [{
      installment: firstInstallmentNumber,
      amount: fromCents(totalCents),
      due_date: new Date(issuedAt.getTime()),
    }];
  }

  const baseCents = Math.floor(totalCents / count);
  const remainderCents = totalCents % count;
  const day = issuedAt.getDate();

  const plan: PlannedInstallment[] = [];
  for (let i = 1; i <= count; i++) {
    // Cálculo de mês seguro (evita 31/jan + 1 mês = 03/mar).
    const nextMonth = issuedAt.getMonth() + i;
    const year = issuedAt.getFullYear() + Math.floor(nextMonth / 12);
    const month = nextMonth % 12;
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const safeDay = Math.min(day, lastDayOfMonth);

    plan.push({
      installment: firstInstallmentNumber + i - 1,
      amount: fromCents(baseCents + (i === count ? remainderCents : 0)),
      due_date: new Date(year, month, safeDay),
    });
  }
  return plan;
}

/**
 * Cria as contas a receber de UMA emissão de NF-e autorizada.
 *
 * Chamada pelos dois caminhos que podem autorizar uma emissão, **sempre na
 * mesma transação** que incrementa `SaleItem.invoiced_quantity` e baixa o
 * estoque (`saleStockService.commitInvoicedStock`):
 *  - `IssueSaleNfeUseCase` (síncrono — provedor mock/retorno imediato);
 *  - `GetSaleNfeStatusUseCase` (assíncrono — provedores reais/webhook).
 *
 * Assim "quantidade faturada", "quantidade baixada do estoque" e "valor a
 * receber" nunca divergem: ou os três acontecem, ou nenhum acontece.
 *
 * **Migração do dado existente.** Venda confirmada ANTES do corte já tem
 * parcelas criadas pela regra antiga — reconhecíveis porque nasceram sem
 * número de nota (`invoice_number IS NULL`), já que a NF-e não existia na
 * confirmação. Nesse caso nada é criado (`reason:
 * 'legacy_created_on_confirmation'`) e **nenhuma linha financeira do dono é
 * alterada**; sem essa guarda, faturar uma venda antiga duplicaria o
 * recebível.
 *
 * @param input.sale - Venda já travada na transação (usa `id`, `customer_id`, `installments`, `payment_method`).
 * @param input.invoiceTotal - Valor total DESTA emissão.
 * @param input.invoiceNumber - Número da NF-e desta emissão (marca a origem e separa do dado legado).
 * @param input.issuedAt - Data/hora da autorização.
 * @param input.gateway - Persistência (`FiscalRepository` em produção).
 * @param input.transaction - Mesma transação do faturamento.
 * @returns As parcelas criadas, ou o motivo de não ter criado nenhuma.
 */
export async function createInvoiceReceivables({
  sale,
  invoiceTotal,
  invoiceNumber,
  issuedAt,
  gateway,
  transaction,
}: {
  sale: any;
  invoiceTotal: number;
  invoiceNumber?: string | null;
  issuedAt: Date;
  gateway: ReceivableGateway;
  transaction: Transaction;
}): Promise<CreateInvoiceReceivablesResult> {
  const total = Number(invoiceTotal) || 0;
  if (total <= 0) return { created: [], reason: 'zero_amount' };

  const existing = (await gateway.findReceivablesBySaleId(sale.id, { transaction })) || [];

  // Parcela legada (criada na confirmação, antes do G13): sem número de
  // nota. Ver "Migração do dado existente" no JSDoc.
  const hasLegacy = existing.some((row: any) => !row.invoice_number);
  if (hasLegacy) return { created: [], reason: 'legacy_created_on_confirmation' };

  const maxInstallment = existing.reduce(
    (max: number, row: any) => Math.max(max, Number(row.installment) || 0),
    0
  );

  const plan = buildInstallmentPlan(total, sale.installments || 1, issuedAt, maxInstallment + 1);

  for (const parcel of plan) {
    await gateway.createAccountReceivable({
      sale_id: sale.id,
      customer_id: sale.customer_id,
      installment: parcel.installment,
      amount: parcel.amount,
      due_date: parcel.due_date,
      // Nunca `paid` na criação: a baixa é evento próprio da Tesouraria.
      status: 'pending',
      payment_date: null,
      payment_method: sale.payment_method || null,
      invoice_number: invoiceNumber || null,
    }, { transaction });
  }

  return { created: plan, reason: 'created' };
}

// CommonJS compatibility (mesmo padrão de saleStockService.ts).
// ATENÇÃO: este objeto SUBSTITUI os named exports acima em tempo de
// execução (require) — toda função nova precisa aparecer aqui também.
module.exports = { buildInstallmentPlan, createInvoiceReceivables };
