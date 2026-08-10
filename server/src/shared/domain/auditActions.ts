/**
 * 🔐 Vocabulário canônico de `audit_logs.action` — SSOT.
 *
 * @module shared/domain/auditActions
 *
 * ## Por que este arquivo existe
 *
 * Até 2026-08-10 o código chamava `auditLogService.logAction` com **43
 * literais** de `action`, enquanto `enum_audit_logs_action` tinha **15
 * valores**. Como `logAction` é fire-and-forget por desenho (nunca propaga
 * erro ao chamador), o Postgres rejeitava o `INSERT` com
 * `22P02 invalid input value for enum`, a API respondia `200` e **a trilha
 * de auditoria simplesmente não era gravada**. A prova está no dado real do
 * banco do dono: `audit_logs` só tem 5 valores distintos
 * (`login`, `create`, `status_change`, `update`, `approve`) — nenhum dos 37
 * literais inválidos jamais entrou.
 *
 * Um dos ausentes era `access_denied`: **tentativa de acesso indevido não
 * deixava rastro nenhum**. Ver
 * `docs/governance/auditorias/VARREDURA_ESCRITA_REAL_2026-08-10.md` §2.
 *
 * ## A decisão: vocabulário fechado + tabela de sinônimos
 *
 * Nem "estender o ENUM com os 37" nem "achatar tudo nos 15". O critério
 * aplicado literal a literal foi **"a pergunta do auditor muda?"**, não
 * "o verbo é diferente?":
 *
 * - `action` responde **que TIPO de evento** aconteceu;
 * - `entity_type` responde **sobre o quê**;
 * - `route` + `method` respondem **por onde**;
 * - `description` + `new_values` respondem **com que conteúdo**.
 *
 * Um `ENUM` que ganha um valor por endpoint não é vocabulário — é campo de
 * texto livre com passos extras: não agrega, não indexa e volta a divergir
 * no módulo seguinte. Por isso:
 *
 * 1. **9 valores novos** ({@link NEW_AUDIT_ACTIONS}) foram acrescentados,
 *    porque nenhum dos 15 existentes expressa aquele TIPO de evento e a
 *    pergunta do auditor é distinta (segurança, LGPD, contabilidade,
 *    tesouraria, permissão).
 * 2. **29 verbos de módulo** ({@link AUDIT_ACTION_ALIASES}) foram
 *    normalizados para o vocabulário, porque o verbo específico já é
 *    integralmente recuperável de `entity_type`/`route`/`description` — e,
 *    para não perder nada, o verbo original é preservado como marcador
 *    `[verbo]` no início da `description` da própria linha de auditoria
 *    (busca direta: `description LIKE '[award]%'`).
 *
 * ## Comportamento contra o banco ATUAL (migration ainda não aplicada)
 *
 * `20260810-000036-extend-audit-log-action-enum.cjs` acrescenta os 9 valores
 * novos, e **não pode ser aplicada agora** (fila de migrations pendentes
 * aguardando liberação do dono). Enquanto isso, `auditLogService` degrada de
 * forma segura via {@link AUDIT_ACTION_DB_FALLBACK}: ao receber o erro
 * `22P02` do Postgres, regrava a MESMA linha com o valor legado mais próximo
 * e o marcador `[verbo]` na `description`.
 *
 * | | antes da migration | depois da migration |
 * |---|---|---|
 * | `access_denied` | grava `reject` + `description` começando com `[access_denied]` | grava `access_denied` |
 * | `read` / `read_sensitive` | grava `export` + marcador | grava o valor exato |
 * | `cancel`/`close`/`post`/`reverse`/`settle` | grava `status_change` + marcador | grava o valor exato |
 * | `permission_change` | grava `update` + marcador | grava `permission_change` |
 *
 * **Em nenhum dos dois estados o evento é perdido** — que é a diferença que
 * importa. Nenhum fallback é uma mentira de categoria: `reject` e `export`
 * não são operações de escrita (um `access_denied` nunca vira `update`), e
 * os cinco atos terminais caem em `status_change`, que é o que de fato são.
 *
 * O backfill das linhas gravadas com fallback é possível e determinístico
 * depois da migration (`description LIKE '[<valor>]%'`), mas **não é feito
 * automaticamente** — reescrever log de auditoria existente é exatamente o
 * que uma trilha não pode permitir.
 */

/**
 * Os 15 valores que `enum_audit_logs_action` já tinha antes de 2026-08-10 —
 * portanto os únicos aceitos pelo banco enquanto a migration
 * `20260810-000036` não for aplicada.
 */
export const LEGACY_AUDIT_ACTIONS = [
  'create',
  'update',
  'delete',
  'soft_delete',
  'login',
  'logout',
  'password_change',
  'status_change',
  'approve',
  'reject',
  'price_change',
  'salary_change',
  'export',
  'import',
  'print',
] as const;

/**
 * Os 9 valores acrescentados em 2026-08-10. Cada um passou pelo teste
 * "a pergunta do auditor muda?" — o motivo individual está em
 * {@link NEW_AUDIT_ACTION_RATIONALE}.
 */
export const NEW_AUDIT_ACTIONS = [
  'access_denied',
  'read',
  'read_sensitive',
  'permission_change',
  'cancel',
  'close',
  'post',
  'reverse',
  'settle',
] as const;

/** Vocabulário canônico completo (24 valores) — espelha o `ENUM` do banco pós-`000036`. */
export const AUDIT_ACTIONS = [...LEGACY_AUDIT_ACTIONS, ...NEW_AUDIT_ACTIONS] as const;

/** Valor válido de `audit_logs.action`. */
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Valor de `audit_logs.action` aceito pelo banco antes da migration `000036`. */
export type LegacyAuditAction = (typeof LEGACY_AUDIT_ACTIONS)[number];

/**
 * Justificativa individual de cada valor novo. Fica no código (e não só na
 * documentação) porque a próxima pessoa que quiser acrescentar um valor
 * precisa comparar o caso dela com estes — o critério de admissão é o
 * conteúdo desta tabela, não a existência de um verbo novo.
 */
export const NEW_AUDIT_ACTION_RATIONALE: Readonly<Record<(typeof NEW_AUDIT_ACTIONS)[number], string>> = {
  access_denied:
    'Negativa de autorização. Não é mutação nenhuma, então nenhum dos 15 serve; '
    + '`reject` é decisão humana sobre um documento (pedido reprovado pelo gerente) e '
    + 'confundir os dois inviabiliza a consulta de segurança "quem tentou o quê e foi barrado".',
  read:
    'Consulta a dado pessoal/regulado (LGPD art. 37 exige registro das operações de tratamento, '
    + 'e acesso é uma delas). `export` é outra operação (dado sai do sistema); nenhum valor legado '
    + 'expressa "alguém consultou".',
  read_sensitive:
    'Exibição de segredo em claro (hoje chave de licença; amanhã chave de API, dado clínico). '
    + 'Evento raro e grave: colapsado em `read` ele afunda no volume rotineiro de leitura e a única '
    + 'forma de separá-lo volta a ser `LIKE` no texto — o antipadrão que este arquivo existe para matar.',
  permission_change:
    'Concessão/revogação de acesso (atribuir perfil a usuário, desativar perfil). Segue o padrão que o '
    + 'vocabulário JÁ tinha para atributo sensível (`password_change`, `salary_change`). Como `update`, '
    + 'a pergunta "todas as mudanças de permissão do período" se perde entre milhares de edições comuns.',
  cancel:
    'Cancelamento terminal de documento (processo de importação, operação de tesouraria). `delete` apaga; '
    + '`status_change` não distingue o ato terminal e irreversível, que é o que se audita.',
  close:
    'Encerramento de processo/caso (contencioso, incidente LGPD, RNC). Mesmo raciocínio de `cancel`: '
    + 'ato terminal, filtro universal de auditoria, agnóstico de módulo.',
  post:
    'Contabilização — o lançamento deixa de ser rascunho e passa a ser definitivo. Ato contábil com '
    + 'autoridade própria; par obrigatório de `reverse` (uma trilha que acha estorno mas não acha '
    + 'contabilização é meia trilha).',
  reverse:
    'Estorno contábil. Por norma não é `update` nem `delete`: o lançamento original permanece e um novo '
    + 'o anula. "Quantos estornos houve no período" é pergunta padrão de auditoria contábil.',
  settle:
    'Liquidação/baixa de operação financeira. Movimenta caixa e encerra um contrato financeiro — '
    + 'não é simples transição de estado administrativa.',
};

/**
 * Verbos específicos de módulo → valor canônico.
 *
 * Todo verbo aqui foi mantido **no call site** de propósito: `action: 'award'`
 * lido dentro do controller de RFQ diz o que aconteceu melhor do que
 * `action: 'approve'`. A política de tradução mora neste único arquivo
 * revisável, em vez de estar diluída em 46 edições — e o verbo original não
 * se perde, porque vira o marcador `[award]` no começo da `description`.
 *
 * Regra de admissão de um sinônimo novo: o verbo é recuperável de
 * `entity_type` + `route` + `description`, e a pergunta do auditor **não**
 * muda. Se mudar, o caso é de valor canônico novo — e aí a barra é a de
 * {@link NEW_AUDIT_ACTION_RATIONALE}.
 */
export const AUDIT_ACTION_ALIASES = {
  // Jurídico
  acknowledge: 'status_change',       // ciência de alerta de prazo
  activate: 'status_change',          // contrato passa a vigente; rota de produção passa a ativa
  confirm: 'status_change',           // prazo processual confirmado
  decision: 'status_change',          // decisão sobre incidente LGPD
  fulfill: 'status_change',           // prazo processual cumprido
  resolve: 'status_change',           // solicitação de titular resolvida
  review: 'status_change',            // solicitação de titular em análise
  revoke: 'status_change',            // procuração revogada
  terminate: 'status_change',         // contrato rescindido
  verify_identity: 'update',          // grava identity_verified/verification_notes no pedido do titular

  // Perfis de acesso / usuários
  assign: 'permission_change',        // perfil de acesso atribuído a um usuário
  deactivate: 'permission_change',    // perfil desativado — muda o que um conjunto de usuários pode fazer

  // Suprimentos / RFQ / COMEX
  award: 'approve',                   // adjudicação da RFQ é A decisão de aprovação; o vencedor vai em new_values
  convert: 'status_change',           // requisição vira pedido de compra
  invite_suppliers: 'update',         // fornecedores convidados para a RFQ
  receive: 'status_change',           // processo de importação recebido
  register_quote: 'create',           // cria a cotação do fornecedor na RFQ
  register_tracking: 'update',        // atualiza o acompanhamento do processo de importação
  update_status: 'status_change',     // requisição de compra

  // Engenharia
  obsolete: 'status_change',
  release: 'status_change',
  upsert: 'update',

  // Produção / MRP / Centros de trabalho
  //
  // ⚠️ Estes 7 sinônimos são a razão pela qual a tradução vive aqui e não nos
  // call sites: `src/modules/production/` e `src/modules/mrp/` estavam sob
  // edição de outros agentes em 2026-08-10 e não podiam ser tocados. A
  // tabela central os cobre sem um único byte de diff naqueles arquivos.
  convert_to_production_order: 'status_change',
  convert_to_requisition: 'status_change',
  mrp_auto_convert_to_requisition: 'create',  // o MRP CRIA a requisição
  inactivate: 'status_change',
  revise: 'status_change',
  update_shifts: 'update',
  update_steps: 'update',
} as const satisfies Record<string, AuditAction>;

/** Verbo de módulo aceito como entrada de `logAction` (traduzido antes de persistir). */
export type AuditActionAlias = keyof typeof AUDIT_ACTION_ALIASES;

/**
 * O que um chamador pode passar em `action`: um valor canônico ou um
 * sinônimo conhecido. Qualquer outra string quebra o `tsc` — que é
 * exatamente a rede que faltava (`AuditLog.action` era `string`, então o
 * compilador nunca viu nenhum dos 37 literais inválidos).
 */
export type AuditActionInput = AuditAction | AuditActionAlias;

/**
 * Degradação segura enquanto o banco não conhece um valor novo (migration
 * `20260810-000036` pendente).
 *
 * Critério de escolha: **nunca mentir de categoria**. Um evento não-mutante
 * (`access_denied`, `read`, `read_sensitive`) só pode cair em outro valor
 * não-mutante (`reject`, `export`) — se caísse em `update`, uma leitura
 * passaria a contar como escrita e o relatório de auditoria ficaria pior do
 * que sem a linha. Os cinco atos terminais caem em `status_change`, que é
 * literalmente o que eles são.
 *
 * Só existe entrada aqui para os valores de {@link NEW_AUDIT_ACTIONS}: os 15
 * legados nunca precisam de degradação.
 */
export const AUDIT_ACTION_DB_FALLBACK = {
  access_denied: 'reject',
  read: 'export',
  read_sensitive: 'export',
  permission_change: 'update',
  cancel: 'status_change',
  close: 'status_change',
  post: 'status_change',
  reverse: 'status_change',
  settle: 'status_change',
} as const satisfies Record<(typeof NEW_AUDIT_ACTIONS)[number], LegacyAuditAction>;

/** Valor canônico usado quando o verbo recebido é desconhecido (defesa em runtime). */
export const AUDIT_ACTION_UNKNOWN_FALLBACK: AuditAction = 'update';

const CANONICAL = new Set<string>(AUDIT_ACTIONS);
const LEGACY = new Set<string>(LEGACY_AUDIT_ACTIONS);

/** Resultado da normalização de um verbo recebido em `logAction`. */
export interface ResolvedAuditAction {
  /** Valor canônico a gravar em `audit_logs.action`. */
  action: AuditAction;
  /** Verbo exatamente como o chamador escreveu (vira marcador `[verbo]` quando difere). */
  requested: string;
  /** `true` quando `requested` não é um valor canônico (sinônimo traduzido ou verbo desconhecido). */
  translated: boolean;
  /** `true` quando o verbo não é canônico nem sinônimo conhecido — só deveria ocorrer se as guardas falharem. */
  unknown: boolean;
}

/**
 * Traduz um verbo recebido para o vocabulário canônico.
 *
 * @param requested - Verbo passado pelo chamador (`action` de `logAction`).
 * @returns Valor canônico, o verbo original e os sinalizadores de tradução.
 */
export function resolveAuditAction(requested: string): ResolvedAuditAction {
  if (CANONICAL.has(requested)) {
    return { action: requested as AuditAction, requested, translated: false, unknown: false };
  }

  const alias = (AUDIT_ACTION_ALIASES as Record<string, AuditAction | undefined>)[requested];
  if (alias) {
    return { action: alias, requested, translated: true, unknown: false };
  }

  return { action: AUDIT_ACTION_UNKNOWN_FALLBACK, requested, translated: true, unknown: true };
}

/**
 * Valor legado a usar quando o banco ainda não conhece `action`.
 *
 * @param action - Valor canônico que o banco rejeitou.
 * @returns Valor legado equivalente, ou `null` se `action` já é legado
 *   (nesse caso a rejeição não é de vocabulário e não deve ser degradada).
 */
export function downgradeAuditAction(action: AuditAction): LegacyAuditAction | null {
  if (LEGACY.has(action)) return null;
  return (AUDIT_ACTION_DB_FALLBACK as Record<string, LegacyAuditAction | undefined>)[action] ?? null;
}

/**
 * Marcador que preserva o verbo original quando o valor gravado em
 * `audit_logs.action` não é o verbo que o chamador pediu — por tradução de
 * sinônimo (`award` → `approve`) ou por degradação de banco
 * (`access_denied` → `reject`).
 *
 * @param requested - Verbo original.
 * @param description - Descrição do evento (a do chamador ou a default).
 * @returns Descrição prefixada com `[verbo] `, sem duplicar um marcador já presente.
 */
export function markAuditActionInDescription(requested: string, description: string): string {
  const marker = `[${requested}]`;
  return description.startsWith(marker) ? description : `${marker} ${description}`;
}

/** SQLSTATE do PostgreSQL para `invalid input value for enum` (`invalid_text_representation`). */
const PG_INVALID_TEXT_REPRESENTATION = '22P02';

/**
 * Identifica a rejeição de vocabulário de `audit_logs.action` pelo banco.
 *
 * Confirmado empiricamente em 2026-08-10 contra `erp_evok_audio_test`: o
 * Sequelize **não** valida `DataTypes.ENUM` no lado JS — o valor viaja até o
 * Postgres, que responde `SequelizeDatabaseError` com
 * `invalid input value for enum enum_audit_logs_action: "access_denied"` e
 * `parent.code = '22P02'`. É por isso que a detecção é por erro (e não por
 * uma consulta a `pg_enum` no boot): custo zero no caminho feliz, e passa a
 * acertar de primeira sozinha assim que a migration for aplicada.
 *
 * @param error - Erro capturado na gravação do log.
 * @returns `true` se o erro é rejeição do `ENUM` de `audit_logs.action`.
 */
export function isUnsupportedAuditActionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { message?: unknown; parent?: { code?: unknown; message?: unknown } };
  const code = candidate.parent?.code;
  const message = [candidate.message, candidate.parent?.message]
    .filter((m): m is string => typeof m === 'string')
    .join(' | ');

  if (!message.includes('enum_audit_logs_action')) return false;
  return code === PG_INVALID_TEXT_REPRESENTATION || /invalid input value for enum/i.test(message);
}
