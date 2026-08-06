'use strict';

/**
 * Onda 2 (2026-08-06) — passo de "contract" da unificacao legado/novo
 * (item 10 do roadmap, `docs/LEVANTAMENTO_ERP_2026-08-02.md`).
 *
 * Diagnostico (banco real, 2026-08-06): as 12 tabelas abaixo vieram do
 * `01_schema.sql` (baseline `20260731-000001`) — um schema-fantasma em
 * portugues que nunca foi adotado pelo app. Confirmado 100% orfao:
 *   - 0 linhas em TODAS (`SELECT count(*)` em cada uma).
 *   - 0 models Sequelize (`server/src/models/index.ts` nao as referencia).
 *   - 0 ocorrencias em `server/src` (controllers, use cases, repositories,
 *     migrations posteriores) fora de comentarios genericos em portugues
 *     sem relacao com a tabela.
 * O app real usa o schema em ingles equivalente, com PKs INTEGER onde
 * aplicavel: `users`, `suppliers`, `purchase_requisitions` (+
 * `purchase_requisition_items`), `production_orders`, `inventory_movements`,
 * `audit_logs`, `lot_controls`, `serial_numbers`, `webhook_events`,
 * `purchase_receipts` (+ dados de recebimento).
 *
 * Esta migration NAO remove nenhuma tabela (auditoria/historico —
 * principio de nunca derrubar dado potencialmente fiscal sem uma decisao
 * explicita e uma janela de confirmacao maior do que uma rodada). Apenas
 * documenta formalmente via `COMMENT ON TABLE` para que qualquer DBA/dev
 * que abra o schema (psql \dt, pgAdmin, DataGrip) veja o aviso na hora.
 * Guarda de codigo equivalente: `server/tests/unit/no-orphan-pt-schema-tables.test.ts`
 * (falha o build se `server/src` voltar a referenciar estas tabelas).
 *
 * Fora de escopo (tabelas em portugues que SAO o schema canonico vivo,
 * fase 1-4 da unificacao Item, e por isso NAO recebem este comentario):
 * `items`, `item_categorias`, `item_detalhes_comerciais`,
 * `item_especificacoes_tecnicas`, `item_estruturas`, `mrp_ordens_planejadas`
 * (todas com model Sequelize e uso ativo em `server/src`).
 */

const ORPHAN_TABLES = [
  'usuarios',
  'fornecedores',
  'lotes',
  'numeros_serie',
  'requisicoes_compra',
  'requisicao_compra_items',
  'entradas_nf',
  'entradas_nf_items',
  'ordens_producao',
  'movimentos_estoque',
  'webhooks_eventos',
  'auditoria_eventos',
];

const DEPRECATED_COMMENT =
  'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. ' +
  '0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. ' +
  'Equivalente ativo em ingles com PKs INTEGER. Ver docs/LEVANTAMENTO_ERP_2026-08-02.md e ' +
  'server/tests/unit/no-orphan-pt-schema-tables.test.ts.';

module.exports = {
  async up(queryInterface) {
    for (const table of ORPHAN_TABLES) {
      await queryInterface.sequelize.query(
        `COMMENT ON TABLE ${table} IS '${DEPRECATED_COMMENT.replace(/'/g, "''")}';`
      );
    }
  },

  async down(queryInterface) {
    for (const table of ORPHAN_TABLES) {
      await queryInterface.sequelize.query(`COMMENT ON TABLE ${table} IS NULL;`);
    }
  },
};
