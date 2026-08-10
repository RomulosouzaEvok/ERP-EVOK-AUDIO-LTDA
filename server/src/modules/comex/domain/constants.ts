/**
 * Constantes de negócio do módulo COMEX — **G11-COMEX, gate de aprovação da
 * diretoria no processo de importação** (decisão D-G do dono do produto em
 * 2026-08-10).
 *
 * ## Por que esta regra existe
 *
 * O G11 (`server/src/modules/purchases/domain/constants.ts`) colocou a
 * alçada da diretoria sobre o **pedido de compra** — e importação lá exige a
 * diretoria em qualquer valor. Só que `import_processes` (este módulo) é um
 * fluxo **paralelo**: não vira `purchase_orders` e, até esta rodada, não
 * tinha etapa de aprovação nenhuma (todas as escritas eram
 * `comex:operate`). Ou seja, uma importação de R$ 1 milhão registrada pelo
 * COMEX passava sem a diretoria — exatamente o furo que o G11 não alcança.
 *
 * ## A regra
 *
 * | Dimensão      | Decisão                                                   |
 * |---------------|-----------------------------------------------------------|
 * | Quem aprova   | papel `diretor` (mesmo módulo de acesso do G11/RF-JUR-003) |
 * | Faixa de valor| **não há** — importação é sempre da diretoria              |
 * | Onde trava    | transição `draft → shipped` (evento `shipped`)             |
 *
 * O ponto de gate é o embarque porque é o último instante do ciclo
 * (`draft → shipped → arrived → customs_cleared → received`) em que ainda dá
 * para desistir sem custo afundado: depois do embarque, câmbio e frete já
 * estão comprometidos.
 *
 * Não há threshold aqui, ao contrário do G11 nacional — logo não existe
 * "valor que decide se sobe ou não". Isso tem uma consequência de desenho
 * importante: inflar o valor **não** escapa da alçada (ela é
 * incondicional). O que precisa ser protegido é outra coisa — que o processo
 * embarcado seja o MESMO que a diretoria viu; ver
 * {@link MONETARY_FIELDS_FROZEN_ON_SHIPMENT}.
 *
 * @module modules/comex/domain/constants
 */

/**
 * Identificador da regra, ecoado em `BusinessRuleError.details.rule`.
 * Deliberadamente distinto do `'G11'` de compras: são gates diferentes, em
 * tabelas diferentes, e a tela/o teste precisam saber qual dos dois barrou.
 */
export const IMPORT_APPROVAL_RULE = 'G11-COMEX';

/** Papéis de aprovador válidos para `import_process_approvals.approver_role`. */
export type ImportApproverRole = 'diretor';

/**
 * Status do processo em que o gate é avaliado (e único em que a aprovação
 * pode ser registrada). Registrar aprovação depois do embarque seria
 * aprovação retroativa — o compromisso já foi assumido.
 */
export const IMPORT_APPROVAL_STATUS = 'draft';

/** Evento de acompanhamento bloqueado pelo gate (`draft → shipped`). */
export const IMPORT_APPROVAL_GATE_EVENT = 'shipped';

/**
 * Campos monetários do cabeçalho que ficam **congelados** na transição
 * gateada (`draft → shipped`).
 *
 * Motivo: `POST /:id/tracking` é o ÚNICO caminho de escrita capaz de alterar
 * o cabeçalho monetário de um processo (não existe `PUT /:id` neste módulo,
 * e os itens são imutáveis desde a criação). Sem este congelamento, a mesma
 * requisição que consome a aprovação poderia inflar câmbio/frete/seguro e a
 * diretoria teria aprovado um processo diferente do que embarcou — o gate
 * viraria decoração. É o equivalente exato do congelamento de
 * `supplier_id`/`freight_value`/`origin` após `approved` no G11.
 *
 * Escopo deliberadamente restrito ao evento `shipped`: `arrived` e
 * `customs_cleared` continuam aceitando dados monetários, porque despesas
 * aduaneiras reais (armazenagem, capatazia) só são conhecidas na chegada/no
 * desembaraço e são posteriores ao compromisso — bloqueá-las quebraria o
 * custo nacionalizado sem proteger nada.
 */
export const MONETARY_FIELDS_FROZEN_ON_SHIPMENT = [
  'exchange_rate',
  'freight_value',
  'insurance_value',
  'other_expenses_value',
] as const;

/**
 * Resolve os papéis de aprovador exigidos por um processo de importação
 * (decisão D-G): importação é **sempre** da diretoria, sem faixa de valor.
 *
 * Existe como função (e não como constante solta) para manter a mesma forma
 * de {@link requiredApproverRoles} do G11 — se um dia entrar faixa de valor
 * ou um segundo papel, muda-se aqui e todos os chamadores acompanham.
 *
 * @returns Lista de papéis exigidos (hoje sempre `['diretor']`).
 */
export function requiredImportApproverRoles(): ImportApproverRole[] {
  return ['diretor'];
}
