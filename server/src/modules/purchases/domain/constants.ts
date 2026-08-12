/**
 * Constantes de negócio do módulo Compras — **G11, alçada de aprovação de
 * pedido de compra** (decisão D-C do dono do produto em 2026-08-10,
 * registrada em `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md`
 * §4).
 *
 * ⚠️ A alçada é por **ORIGEM** da compra, não apenas por faixa de valor —
 * ao contrário do que todos assumiam antes da decisão:
 *
 * | Origem       | Regra                                                        |
 * |--------------|--------------------------------------------------------------|
 * | Nacional     | até R$ 500.000 segue direto; **acima** exige `diretor`        |
 * | Importação   | **sempre** exige `diretor`, em qualquer valor                 |
 *
 * Threshold como constante de código (não tabela de configuração editável
 * nesta rodada) — mesmo padrão já aprovado em
 * `server/src/modules/juridico/domain/constants.ts` (RF-JUR-003) e em
 * `server/src/modules/marketing/domain/constants.ts`.
 *
 * ## Qual valor é comparado com o teto (decisão desta implementação)
 *
 * `purchase_orders.total_amount` (mercadoria — soma de
 * `quantidade × preço unitário` dos itens) **+** `purchase_orders.freight_value`
 * (frete), **sem impostos**. Motivos:
 * - o pedido de compra nacional deste ERP não calcula imposto nenhum (não há
 *   coluna de tributo em `purchase_orders`/`purchase_order_items`); usar
 *   "com impostos" seria comparar com um número que não existe;
 * - somar o frete fecha o desvio óbvio de dividir um pedido de R$ 520.000 em
 *   R$ 499.000 de mercadoria + R$ 21.000 de frete para não subir à diretoria.
 * Consequência aceita e documentada: o valor da alçada é **maior** que o da
 * `AccountPayable` gerada na aprovação (que usa só `total_amount`) — a
 * alçada é deliberadamente mais conservadora que o passivo lançado.
 *
 * ## Como a origem é determinada (e por que ela é confiável)
 *
 * A origem efetiva é o **OU** de duas fontes, ver
 * {@link resolvePurchaseOrigin}:
 * 1. `purchase_orders.origin` — declaração explícita de quem cria o pedido
 *    (cobre importação por conta e ordem, feita através de uma trading
 *    nacional);
 * 2. `suppliers.is_foreign` — dado de **cadastro** do fornecedor, fora do
 *    fluxo do pedido.
 *
 * O desenho é **escalation-only**: a fonte que o comprador controla no
 * pedido (1) só consegue tornar a alçada MAIS restritiva. Marcar
 * `origin = 'national'` num pedido de fornecedor estrangeiro não escapa da
 * diretoria, porque (2) prevalece. É por isso que a distinção não depende de
 * um campo livremente editável por quem quer fugir da alçada.
 *
 * ## O que mudou em 2026-08-11 (auditoria)
 *
 * A resolução acima acontecia **só na hora de aprovar**, e o pedido ficava
 * gravado com a origem que o comprador declarou — o dado persistido mentia,
 * mesmo com a alçada certa. Duas correções, ambas na criação do pedido
 * (`CreatePurchaseUseCase`), via {@link checkPurchaseOriginAgainstSupplier}:
 *
 * 1. fornecedor `is_foreign = true` faz o pedido **nascer** com
 *    `origin = 'import'`, não apenas ser tratado como tal na aprovação;
 * 2. declarar `origin = 'import'` para fornecedor **não** estrangeiro passa a
 *    ser recusado (422 `G11-ORIGIN-SUPPLIER-MISMATCH`): a contradição indica
 *    cadastro errado, e engoli-la enfraquece a única fonte que o comprador
 *    não controla.
 *
 * A terceira perna do problema era anterior a tudo isso: `is_foreign` era
 * **opcional** no validador de fornecedor, com `DEFAULT false` no banco —
 * fornecedor estrangeiro cadastrado sem marcar o campo virava nacional em
 * silêncio. Hoje a declaração é obrigatória na criação (ver
 * `modules/suppliers/presentation/validators/supplierValidators.ts`).
 *
 * @module modules/purchases/domain/constants
 */

/** Acima deste valor (R$), pedido de compra NACIONAL exige aprovação do papel `diretor` (G11). */
export const PURCHASE_APPROVAL_THRESHOLD_DIRECTOR = 500000;

/**
 * `details.rule` da recusa de **incoerência entre a origem declarada no
 * pedido e o cadastro do fornecedor** (auditoria de 2026-08-11).
 *
 * Declarar `origin = 'import'` para um fornecedor `is_foreign = false`
 * significa que **um dos dois está errado** — ou o fornecedor deveria estar
 * marcado como estrangeiro, ou a compra não é importação. Antes, o pedido
 * era aceito e a alçada apenas escalava (lado seguro), mas o cadastro seguia
 * mentindo e ninguém era avisado. Como `suppliers.is_foreign` é a fonte que
 * o comprador **não** controla no pedido, deixar a contradição passar
 * enfraquece justamente a fonte confiável.
 */
export const PURCHASE_ORIGIN_MISMATCH_RULE = 'G11-ORIGIN-SUPPLIER-MISMATCH';

/** Origem da compra — dimensão que comanda a alçada (G11). */
export type PurchaseOrigin = 'national' | 'import';

/** Papéis de aprovador válidos para `purchase_order_approvals.approver_role`. */
export type PurchaseApproverRole = 'diretor';

/**
 * Resolve a origem EFETIVA de um pedido de compra (G11).
 *
 * Regra escalation-only: o pedido é importação se **qualquer uma** das duas
 * fontes disser que é. A declaração do pedido nunca "rebaixa" um fornecedor
 * estrangeiro para nacional.
 *
 * @param declaredOrigin - `purchase_orders.origin` (pode vir `null`/`undefined` em pedidos legados anteriores à migration; tratado como `'national'`, que é o DEFAULT da coluna).
 * @param supplierIsForeign - `suppliers.is_foreign` do fornecedor do pedido.
 * @returns `'import'` se qualquer uma das fontes indicar importação; `'national'` caso contrário.
 */
export function resolvePurchaseOrigin(
  declaredOrigin: string | null | undefined,
  supplierIsForeign: boolean | null | undefined,
): PurchaseOrigin {
  if (declaredOrigin === 'import') return 'import';
  if (supplierIsForeign === true) return 'import';
  return 'national';
}

/**
 * Verifica a coerência entre a origem DECLARADA no pedido e o CADASTRO do
 * fornecedor (auditoria de 2026-08-11).
 *
 * Função pura, sem exceção: devolve o diagnóstico para o caso de uso montar
 * o erro (mesmo padrão de `decideLotRelease` no módulo de qualidade).
 *
 * Só existe **uma** combinação incoerente:
 *
 * | Declarado | `is_foreign` | Resultado |
 * |---|---|---|
 * | `import`   | `true`  | coerente |
 * | `import`   | `false` | **incoerente** — cadastro ou declaração está errado |
 * | `national` | `true`  | coerente: a origem é REESCRITA para `import` (o cadastro prevalece) |
 * | `national` | `false` | coerente |
 *
 * A linha 3 não é erro de propósito: recusar o pedido puniria o comprador
 * por um dado de cadastro que ele não controla e cujo efeito (subir a
 * alçada) o sistema já sabe aplicar sozinho. A linha 2 é erro porque o
 * caminho de correção é claro e barato — marcar o fornecedor como
 * estrangeiro (`PUT /api/suppliers/:id`, que aceita a escalada) ou corrigir
 * a origem do pedido.
 *
 * @param declaredOrigin - `origin` informada no payload do pedido.
 * @param supplierIsForeign - `suppliers.is_foreign` do fornecedor escolhido.
 * @returns `{ coherent }` e, quando coerente, a `origin` EFETIVA a persistir.
 */
export function checkPurchaseOriginAgainstSupplier(
  declaredOrigin: string | null | undefined,
  supplierIsForeign: boolean | null | undefined,
): { coherent: boolean; effectiveOrigin: PurchaseOrigin } {
  if (declaredOrigin === 'import' && supplierIsForeign !== true) {
    return { coherent: false, effectiveOrigin: 'import' };
  }

  return { coherent: true, effectiveOrigin: resolvePurchaseOrigin(declaredOrigin, supplierIsForeign) };
}

/**
 * Resolve os papéis de aprovador exigidos para APROVAR um pedido de compra
 * (transição `pending → approved`), segundo a decisão D-C (G11).
 *
 * @param origin - Origem EFETIVA do pedido (use {@link resolvePurchaseOrigin}, nunca o campo cru).
 * @param approvalValue - Valor comparado com o teto: mercadoria + frete (ver cabeçalho deste módulo). `null`/`undefined`/não numérico é tratado como 0.
 * @returns Lista de papéis exigidos — vazia quando o pedido segue direto (nacional dentro do teto).
 */
export function requiredApproverRoles(
  origin: PurchaseOrigin,
  approvalValue: string | number | null | undefined,
): PurchaseApproverRole[] {
  // Importação exige a diretoria em QUALQUER valor — inclusive R$ 0,00
  // (pedido de amostra/reposição de garantia importada continua sendo
  // operação de comércio exterior).
  if (origin === 'import') return ['diretor'];

  const numericValue = approvalValue === null || approvalValue === undefined ? 0 : Number(approvalValue);
  if (Number.isNaN(numericValue) || numericValue <= PURCHASE_APPROVAL_THRESHOLD_DIRECTOR) {
    return [];
  }
  return ['diretor'];
}

/**
 * Calcula o valor do pedido usado na comparação com o teto da alçada:
 * mercadoria (`total_amount`) + frete (`freight_value`), sem impostos.
 *
 * @param purchase - Registro (ou objeto cru) do pedido de compra.
 * @returns Valor numérico em R$ (0 quando os campos são nulos/não numéricos).
 */
export function purchaseApprovalValue(purchase: { total_amount?: any; freight_value?: any }): number {
  const total = Number(purchase?.total_amount ?? 0);
  const freight = Number(purchase?.freight_value ?? 0);
  return (Number.isNaN(total) ? 0 : total) + (Number.isNaN(freight) ? 0 : freight);
}
