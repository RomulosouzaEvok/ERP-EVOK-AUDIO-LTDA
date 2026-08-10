'use strict';

/**
 * Vocabulario de `audit_logs.action` — 9 valores novos.
 *
 * ## Problema (varredura de escrita real, 2026-08-10)
 *
 * `enum_audit_logs_action` tinha 15 valores e o codigo chamava
 * `auditLogService.logAction` com 43 literais, sendo **37 fora do tipo, em 46
 * call sites**. Como `logAction` e fire-and-forget por desenho (nunca propaga
 * erro ao chamador), o Postgres rejeitava o INSERT com
 * `22P02 invalid input value for enum`, a API respondia 200 e **a trilha de
 * auditoria nao era gravada**.
 *
 * A prova esta no dado real do banco do dono: `audit_logs` so tem 5 valores
 * distintos (`login=111, create=85, status_change=42, update=27, approve=20`).
 * Nenhum dos 37 literais invalidos jamais entrou.
 *
 * Entre os ausentes estava **`access_denied`**: tentativa de acesso indevido
 * nao deixava rastro nenhum. Achado de seguranca — e o motivo de esta
 * migration nao poder esperar o Go-Live.
 *
 * Ver `docs/governance/auditorias/VARREDURA_ESCRITA_REAL_2026-08-10.md` §2.
 *
 * ## Decisao: 9 valores novos, 29 sinonimos normalizados
 *
 * Nem "estender com os 37" (o ENUM viraria campo de texto livre com passos
 * extras, crescendo a cada modulo novo) nem "achatar tudo nos 15" (perderia
 * exatamente os eventos de maior valor probatorio). O criterio literal a
 * literal foi **"a pergunta do auditor muda?"**:
 *
 * | novo | por que nenhum dos 15 serve |
 * |---|---|
 * | `access_denied`     | negativa de autorizacao; nao e mutacao, e `reject` e decisao humana sobre documento |
 * | `read`              | consulta a dado pessoal/regulado (LGPD art. 37); `export` e outra operacao |
 * | `read_sensitive`    | exibicao de segredo em claro; afogaria no volume de `read` |
 * | `permission_change` | concessao/revogacao de acesso; segue o padrao `password_change`/`salary_change` |
 * | `cancel`            | ato terminal de documento; `delete` apaga, `status_change` nao distingue |
 * | `close`             | encerramento de processo/caso; idem |
 * | `post`              | contabilizacao (lancamento vira definitivo); par obrigatorio de `reverse` |
 * | `reverse`           | estorno contabil; por norma nao e update nem delete |
 * | `settle`            | liquidacao/baixa financeira; movimenta caixa |
 *
 * Os outros 28 verbos de modulo (`award`, `convert`, `upsert`, `update_steps`,
 * `mrp_auto_convert_to_requisition`, ...) foram normalizados no codigo pela
 * tabela `AUDIT_ACTION_ALIASES` de `server/src/shared/domain/auditActions.ts`,
 * que preserva o verbo original como marcador `[verbo]` no inicio da
 * `description` da propria linha (`description LIKE '[award]%'`).
 *
 * ## ORDEM DE DEPLOY — esta migration NAO bloqueia o codigo
 *
 * Ao contrario de `20260809-000027` (onde o codigo quebra se a migration nao
 * estiver aplicada), aqui a dependencia e opcional por desenho:
 *
 * - **Antes desta migration:** `auditLogService` recebe o `22P02`, memoriza o
 *   valor como nao suportado e **regrava a mesma linha** com o valor legado
 *   equivalente (`AUDIT_ACTION_DB_FALLBACK`) mais o marcador `[verbo]`.
 *   Ex.: `access_denied` -> `reject` + `description` começando com
 *   `[access_denied]`. O evento existe, e atribuivel (usuario, IP, rota,
 *   timestamp) e e recuperavel. Nenhum fallback mente de categoria: evento
 *   nao-mutante so cai em valor nao-mutante.
 * - **Depois desta migration:** a primeira tentativa passa e o valor exato e
 *   gravado. Nada mais e exercitado do caminho de degradacao.
 *
 * ## Backfill: deliberadamente NAO feito
 *
 * As linhas gravadas em modo degradado sao identificaveis com precisao
 * (`WHERE description LIKE '[access_denied]%'`), mas **reescrever log de
 * auditoria existente e exatamente o que uma trilha nao pode permitir**. Se
 * um dia for necessario reclassificar, que seja por decisao explicita e
 * registrada, com o UPDATE revisado — nunca como efeito colateral de uma
 * migration de schema.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  /**
   * Acrescenta os 9 valores ao tipo. `ALTER TYPE ... ADD VALUE` e aditivo e
   * retrocompativel: nenhuma linha existente muda, nenhum leitor quebra.
   *
   * @param {import('sequelize').QueryInterface} queryInterface - Interface de query do Sequelize.
   * @returns {Promise<void>}
   */
  async up(queryInterface) {
    // ALTER TYPE ... ADD VALUE nao pode rodar dentro de uma transacao no
    // Postgres; `queryInterface.sequelize.query` com raw evita o wrap
    // transacional padrao do sequelize-cli para este comando especifico
    // (mesma tecnica de 20260804-000009 e 20260809-000027).
    const values = [
      'access_denied',
      'read',
      'read_sensitive',
      'permission_change',
      'cancel',
      'close',
      'post',
      'reverse',
      'settle',
    ];

    for (const value of values) {
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_audit_logs_action" ADD VALUE IF NOT EXISTS '${value}';`
      );
    }
  },

  /**
   * Rollback no-op consciente.
   *
   * Remover valor de ENUM no Postgres exige recriar o tipo inteiro (com todas
   * as colunas, indices e defaults dependentes) e, pior, exigiria decidir o
   * que fazer com as linhas de auditoria ja gravadas com o valor novo —
   * apagar ou reescrever trilha de auditoria e inaceitavel. O valor extra
   * permanece, inofensivo. Mesmo criterio de 20260804-000009 e 20260809-000027.
   *
   * @returns {Promise<void>}
   */
  async down() {
    // Intencionalmente vazio — ver JSDoc acima.
  },
};
