/**
 * Segregação de função na cadeia de compras — **decisão D-K do dono do
 * produto em 2026-08-10** (`docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md`
 * §4), respondendo à pergunta direta *"aprovador ≠ solicitante?"* com
 * **"Sim, aprovador ≠ solicitante"**.
 *
 * Fecha o critério de pronto da §5 do mesmo plano — *"quem aprova uma compra
 * não é quem a solicitou"* — que até esta data estava explicitamente **não
 * atendido**: o G11 (`ec1b499`) entregou **alçada** (quem tem poder para
 * aprovar), não **segregação** (se essa pessoa é a mesma que pediu).
 *
 * ## Por que isto mora em `shared/domain` e não dentro de um módulo
 *
 * A regra vale em 4 pontos de aprovação que pertencem a 3 módulos
 * diferentes (`purchaseRequisitions`, `purchases`, `comex`). Uma cópia por
 * módulo garantiria que, na próxima rodada, um dos pontos ficasse para trás —
 * exatamente o que aconteceu com o G11, que nasceu em Compras e só depois
 * (D-G) alcançou o COMEX.
 *
 * ## Alçada × segregação: são controles diferentes e independentes
 *
 * | Controle | Pergunta que responde | Onde vive |
 * |---|---|---|
 * | RBAC (`authorizeModule`) | *este usuário tem direito a executar este tipo de ação?* | rota |
 * | Alçada (G11 / G11-COMEX) | *este documento exige um poder maior (diretoria)?* | `domain/constants.ts` de cada módulo |
 * | **Segregação (D-K)** | *o aprovador é a MESMA PESSOA que pediu?* | **este módulo** |
 *
 * Os três são cumulativos: passar em dois não dispensa o terceiro.
 *
 * ## ⚠️ `role === 'admin'` NÃO isenta (decisão desta implementação)
 *
 * Em todo o resto do ERP `admin` é curto-circuito: `authorizeModule` libera
 * antes de qualquer checagem (`middlewares/auth.ts` §3) e
 * `resolveAvailableApproverRoles` trata `admin` como se tivesse o papel
 * `diretor`. **Aqui, deliberadamente, não.**
 *
 * O motivo é que os dois controles respondem a perguntas de natureza
 * diferente. RBAC e alçada são sobre **privilégio**, e privilégio é
 * concedível — faz sentido que o administrador tenha todos. Segregação é
 * sobre **identidade**, e identidade não é concedível: nenhum nível de
 * permissão transforma uma pessoa em duas. Uma exceção para `admin` não
 * seria uma exceção estreita, seria o cancelamento da regra, porque `admin`
 * é justamente a conta que na prática opera o sistema.
 *
 * Consequência operacional que o dono precisa conhecer ANTES de aplicar
 * (reportada junto da entrega): hoje o banco de dev tem **1 único usuário
 * capaz de aprovar compra** — o próprio `admin`. Com esta regra ativa, uma
 * requisição criada por ele não pode ser aprovada por ninguém. A regra está
 * correta; falta a contrapartida organizacional (um segundo aprovador
 * cadastrado), que é o próprio conteúdo do controle interno pedido.
 *
 * ## Solicitante desconhecido: a regra não inventa um culpado
 *
 * Quando o documento não registra quem o solicitou, a comparação é
 * impossível e {@link isSelfApproval} devolve `false` (não bloqueia). Isso
 * NÃO é um afrouxamento silencioso: as 3 entidades cobertas gravam o
 * solicitante a partir do JWT em 100% dos caminhos de criação, e
 * `purchase_requisitions.requester_id` / `import_processes.created_by` são
 * `NOT NULL` no banco. A única frouxidão real é
 * `purchase_orders.requester_id`, que é `NULL`-able no schema (0 linhas
 * nulas hoje) — registrado como achado desta entrega, com a recomendação de
 * `SET NOT NULL` em migration futura. Bloquear por `NULL` tornaria pedidos
 * legados inaprováveis para sempre, sem caminho de remediação.
 *
 * @module shared/domain/segregationOfDuties
 */

import { BusinessRuleError } from '../../errors';

/**
 * Identificador de regra publicado em `details.rule` de cada 422. Um valor
 * por ponto de aprovação, para que o cliente (e o suporte) saibam
 * exatamente qual gate reprovou sem depender do texto da mensagem.
 */
export const SEGREGATION_RULES = {
  /** `PATCH /api/purchase-requisitions/:id/status` com `status = 'approved'`. */
  PURCHASE_REQUISITION: 'D-K-REQUISICAO',
  /** `PUT /api/purchases/:id/status` com `status = 'approved'`. */
  PURCHASE_ORDER: 'D-K-PEDIDO',
  /** `POST /api/purchases/:id/approve` (alçada da diretoria, G11). */
  PURCHASE_ORDER_AUTHORITY: 'D-K-ALCADA',
  /** `POST /api/comex/import-processes/:id/approve` (gate COMEX, G11-COMEX). */
  IMPORT_PROCESS_AUTHORITY: 'D-K-COMEX',
  /** `POST /api/jur/contracts/:id/approve` (alçada de contrato jurídico, CASE-002). */
  JUR_CONTRACT_AUTHORITY: 'D-K-JURIDICO',
  /** `POST /api/ti/access-requests/:id/approve` (CASE-013/FIND-ERP-009). */
  TI_ACCESS_REQUEST_APPROVE: 'CASE-013-TI-ACCESS-APPROVE',
  /** `POST /api/ti/access-requests/:id/reject` (CASE-013/FIND-ERP-009). */
  TI_ACCESS_REQUEST_REJECT: 'CASE-013-TI-ACCESS-REJECT',
  /** `PATCH /api/accounting/entries/:id/post` (CASE-013/FIND-ERP-009). */
  ACCOUNTING_ENTRY_POST: 'CASE-013-ACCOUNTING-ENTRY-POST',
  /** `PATCH /api/accounting/entries/:id/reverse` vs original creator (CASE-013/FIND-ERP-009). */
  ACCOUNTING_ENTRY_REVERSE_CREATOR: 'CASE-013-ACCOUNTING-ENTRY-REVERSE-CREATOR',
  /** `PATCH /api/accounting/entries/:id/reverse` vs original poster (CASE-013/FIND-ERP-009). */
  ACCOUNTING_ENTRY_REVERSE_POSTER: 'CASE-013-ACCOUNTING-ENTRY-REVERSE-POSTER',
  /** `PUT /api/inventory/transfers/:id/approve` (CASE-013/FIND-ERP-009). */
  WAREHOUSE_TRANSFER_APPROVE: 'CASE-013-WAREHOUSE-TRANSFER-APPROVE',
  /** `PUT /api/inventory/transfers/:id/reject` (CASE-013/FIND-ERP-009). */
  WAREHOUSE_TRANSFER_REJECT: 'CASE-013-WAREHOUSE-TRANSFER-REJECT',
  /** `PATCH /api/production/routes/:id/activate` (CASE-013/FIND-ERP-009). */
  PRODUCTION_ROUTE_ACTIVATE: 'CASE-013-PRODUCTION-ROUTE-ACTIVATE',
  /** `PATCH /api/production/routes/:id/inactivate` (CASE-013/FIND-ERP-009). */
  PRODUCTION_ROUTE_INACTIVATE: 'CASE-013-PRODUCTION-ROUTE-INACTIVATE',
} as const;

/** União dos identificadores de {@link SEGREGATION_RULES}. */
export type SegregationRule = (typeof SEGREGATION_RULES)[keyof typeof SEGREGATION_RULES];

/** Entrada de {@link assertApproverIsNotRequester}. */
export interface SegregationCheckInput {
  /** Identificador do ponto de aprovação — vai para `details.rule`. */
  rule: SegregationRule;
  /** Quem SOLICITOU o documento (`requester_id`/`created_by` gravado do JWT na criação). `null`/`undefined` = desconhecido, não bloqueia. */
  requesterUserId: number | null | undefined;
  /** Quem está APROVANDO agora. **Sempre `req.user.id` (JWT)** — nunca do body (regra P0 anti-spoofing do projeto). */
  approverUserId: number | null | undefined;
  /** Como o documento aparece para o usuário, ex.: `'a requisicao de compra REQ-2026-0007'`. Entra na mensagem. */
  documentLabel: string;
  /** O que o usuário deve fazer para destravar, ex.: `"outro usuario com nivel 'approve' no modulo 'requisicoes'"`. Entra na mensagem e em `details.what_to_do`. */
  approverHint: string;
}

/**
 * Diz se a aprovação em curso é uma AUTO-aprovação (mesma pessoa que
 * solicitou). Função pura, sem efeito colateral — útil para a UI decidir se
 * desabilita o botão antes de o usuário tomar um 422 na cara.
 *
 * @param requesterUserId - Id de quem solicitou (`null`/`undefined` quando o documento não registra o solicitante).
 * @param approverUserId - Id de quem aprova (do JWT).
 * @returns `true` somente quando os dois ids existem e são iguais. Solicitante desconhecido devolve `false` (ver cabeçalho do módulo).
 */
export function isSelfApproval(
  requesterUserId: number | null | undefined,
  approverUserId: number | null | undefined,
): boolean {
  if (requesterUserId === null || requesterUserId === undefined) return false;
  if (approverUserId === null || approverUserId === undefined) return false;
  return Number(requesterUserId) === Number(approverUserId);
}

/** Entrada da segregação entre duas aprovações sucessivas do mesmo documento. */
export interface PriorApproverCheckInput {
  rule: SegregationRule;
  existingApprovals: Array<{ approver_user_id?: number | null; approver_role?: string | null }>;
  approverUserId: number | null | undefined;
  documentLabel: string;
  approverHint: string;
}

/**
 * Impede que a mesma pessoa registre duas aprovações de papéis distintos.
 * Base sincronizada do REMEDIATION_COMMIT `8d78882` do CASE-002; `admin`
 * deliberadamente não é isento porque a regra compara identidade.
 */
export function assertApproverIsNotPriorApprover(input: PriorApproverCheckInput): void {
  const already = (input.existingApprovals ?? []).find(
    (approval) => isSelfApproval(approval?.approver_user_id, input.approverUserId),
  );
  if (!already) return;

  throw new BusinessRuleError(
    `Segregacao de funcao: voce ja registrou a aprovacao "${already.approver_role ?? 'anterior'}" de ${input.documentLabel}, `
      + 'entao nao pode registrar tambem a segunda. Dupla aprovacao exige DUAS PESSOAS. '
      + `Peca a segunda aprovacao a ${input.approverHint}. `
      + 'Se ninguem mais tem esse acesso hoje, o administrador precisa cadastrar um segundo aprovador '
      + '(Administracao > Perfis de Acesso) — ser administrador nao isenta, porque nenhum nivel de permissao '
      + 'transforma uma pessoa em duas.',
    {
      rule: input.rule,
      approver_user_id: input.approverUserId,
      existing_role: already.approver_role ?? null,
      what_to_do: `Solicitar a segunda aprovacao a ${input.approverHint}.`,
    },
  );
}

/**
 * Aplica a segregação de função (D-K): lança quando quem aprova é quem
 * solicitou. Deve ser chamada **antes de qualquer escrita**, para que o
 * documento reprovado não fique com estado parcial gravado.
 *
 * A mensagem é deliberadamente prescritiva, não um 422 seco: quem esbarra
 * nela é um comprador no meio do expediente, e a informação que ele precisa
 * é *"o que eu faço agora"*, não *"regra violada"*.
 *
 * @param input - Ver {@link SegregationCheckInput}.
 * @returns `void` quando a aprovação é legítima (aprovador ≠ solicitante, ou solicitante desconhecido).
 * @throws {BusinessRuleError} HTTP 422 com `details.rule` = o identificador do ponto de aprovação, `details.requester_user_id`, `details.approver_user_id` e `details.what_to_do`.
 */
export function assertApproverIsNotRequester(input: SegregationCheckInput): void {
  if (!isSelfApproval(input.requesterUserId, input.approverUserId)) return;

  throw new BusinessRuleError(
    `Segregacao de funcao: voce mesmo registrou ${input.documentLabel}, entao nao pode aprova-la. `
      + `Peca a aprovacao a ${input.approverHint}. `
      + 'Se ninguem mais tem esse acesso hoje, o administrador precisa cadastrar um segundo aprovador '
      + '(Administracao > Perfis de Acesso) — a regra existe para que nenhuma compra seja pedida e aprovada pela mesma pessoa.',
    {
      rule: input.rule,
      requester_user_id: input.requesterUserId,
      approver_user_id: input.approverUserId,
      what_to_do: `Solicitar a aprovacao a ${input.approverHint}.`,
    },
  );
}
