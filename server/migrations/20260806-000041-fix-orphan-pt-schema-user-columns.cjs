'use strict';

/**
 * Onda 2 (2026-08-06) — desarme das "bombas latentes" documentadas em
 * `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` (secao "Bombas latentes conhecidas"):
 * colunas UUID referenciando usuario em tabelas do schema-fantasma em
 * portugues criado pelo `01_schema.sql` (baseline `20260731-000001`), que
 * nunca ganhou model Sequelize nem uso em codigo vivo — o app real usa as
 * tabelas em ingles (`users`, `purchase_requisitions`, `production_orders`,
 * `inventory_movements`, `audit_logs`, `suppliers`, etc, todas com PK
 * INTEGER onde aplicavel).
 *
 * Diagnostico (banco real, 2026-08-06) — confirmado ANTES desta migration:
 *   - `requisicoes_compra`, `requisicao_compra_items`, `ordens_producao`,
 *     `movimentos_estoque`, `auditoria_eventos`, `entradas_nf`,
 *     `entradas_nf_items`, `usuarios`, `fornecedores`, `lotes`,
 *     `numeros_serie`, `webhooks_eventos`: 0 linhas em TODAS, 0 models
 *     Sequelize, 0 referencias em `server/src` (grep completo).
 *   - As 4 colunas citadas no levantamento existem e sao `uuid` FK ->
 *     `usuarios(id)` (tambem uuid, tabela igualmente orfa):
 *     `requisicoes_compra.aprovado_por`, `ordens_producao.criado_por`,
 *     `movimentos_estoque.usuario_id`, `auditoria_eventos.usuario_id`.
 *   - MESMO padrao encontrado em mais 2 colunas nao citadas no levantamento
 *     original (mesmas tabelas orfas): `requisicoes_compra.solicitante_id`
 *     e `entradas_nf.recebido_por`. Incluidas aqui pela mesma logica.
 *
 * Decisao (nenhuma tabela e removida nesta rodada — ver item 3 do plano,
 * documentado via `COMMENT ON TABLE` em migration separada): como as
 * colunas estao 100% vazias e sem consumidor, a correcao de tipo e trivial
 * e segura (zero risco de dado incompativel). Convertidas para INTEGER com
 * FK real para `users(id)` (`ON DELETE SET NULL`) em vez de manter o
 * vinculo com a tabela orfa `usuarios` — assim, se algum dia este
 * schema-fantasma for reaproveitado por engano, o tipo ja aponta para a
 * fonte de verdade real de usuarios, prevenindo a MESMA classe de bug que
 * ja quebrou `item_estruturas` (migration `20260802-000005`) e
 * `items.fornecedor_padrao_id` (migration `20260806-000040`).
 */

const TARGETS = [
  { table: 'requisicoes_compra', column: 'solicitante_id' },
  { table: 'requisicoes_compra', column: 'aprovado_por' },
  { table: 'ordens_producao', column: 'criado_por' },
  { table: 'movimentos_estoque', column: 'usuario_id' },
  { table: 'auditoria_eventos', column: 'usuario_id' },
  { table: 'entradas_nf', column: 'recebido_por' },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const { table, column } of TARGETS) {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT count(*)::int AS count FROM ${table} WHERE ${column} IS NOT NULL`
      );
      if (rows[0].count > 0) {
        throw new Error(
          `Abortado: ${table}.${column} possui ${rows[0].count} linha(s) nao nulas. ` +
          'Esta migration assume 0 dados (schema-fantasma orfao) — revise antes de aplicar.'
        );
      }

      // Descobre e derruba a FK legada (aponta para usuarios(id) uuid)
      // independente do nome exato da constraint gerada pelo Postgres.
      const [constraints] = await queryInterface.sequelize.query(`
        SELECT conname FROM pg_constraint
        WHERE conrelid = '${table}'::regclass
          AND confrelid = 'usuarios'::regclass
          AND pg_get_constraintdef(oid) LIKE '%(${column})%'
      `);
      for (const { conname } of constraints) {
        await queryInterface.sequelize.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS "${conname}";`);
      }

      await queryInterface.sequelize.query(`
        ALTER TABLE ${table} ALTER COLUMN ${column} TYPE integer USING NULL;
      `);

      const fkName = `fk_${table}_${column}_users`;
      await queryInterface.sequelize.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${fkName};`);
      await queryInterface.sequelize.query(`
        ALTER TABLE ${table}
          ADD CONSTRAINT ${fkName}
          FOREIGN KEY (${column}) REFERENCES users(id) ON DELETE SET NULL;
      `);

      await queryInterface.sequelize.query(`
        COMMENT ON COLUMN ${table}.${column} IS
          'FK -> users.id (INTEGER). Corrigido em 20260806-000041 (era uuid -> usuarios, tabela orfa do schema-fantasma dual). Tabela ${table} e ela mesma orfa (0 uso em codigo vivo) — ver COMMENT ON TABLE.';
      `);
    }
  },

  async down(queryInterface, Sequelize) {
    for (const { table, column } of TARGETS) {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT count(*)::int AS count FROM ${table} WHERE ${column} IS NOT NULL`
      );
      if (rows[0].count > 0) {
        throw new Error(
          `Rollback abortado: ${table}.${column} possui ${rows[0].count} linha(s) nao nulas ` +
          '(referenciando users.id, integer). Reverter para uuid perderia esse vinculo.'
        );
      }

      const fkName = `fk_${table}_${column}_users`;
      await queryInterface.sequelize.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${fkName};`);
      await queryInterface.sequelize.query(`
        ALTER TABLE ${table} ALTER COLUMN ${column} TYPE uuid USING NULL;
      `);
      await queryInterface.sequelize.query(`
        ALTER TABLE ${table}
          ADD CONSTRAINT ${table}_${column}_fkey
          FOREIGN KEY (${column}) REFERENCES usuarios(id);
      `);
    }
  },
};
