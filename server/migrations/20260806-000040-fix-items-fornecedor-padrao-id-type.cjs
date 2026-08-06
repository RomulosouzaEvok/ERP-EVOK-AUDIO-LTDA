'use strict';

/**
 * Onda 2 (2026-08-06) — desarme de bomba latente nº 1: `items.fornecedor_padrao_id`
 * era UUID (`REFERENCES fornecedores(id)`, a tabela orfa em portugues criada
 * pelo `01_schema.sql`), mas o codigo vivo associa esta coluna ao model
 * `Supplier` real (`models/index.ts`: `Item.belongsTo(Supplier, {
 * foreignKey: 'fornecedor_padrao_id' })`), cuja PK (`suppliers.id`) e
 * INTEGER. Ou seja: (1) qualquer `include` de `fornecedorPadrao` em uma
 * query de Item gerava JOIN `items.fornecedor_padrao_id = suppliers.id`
 * comparando uuid com integer, erro em runtime
 * ("operator does not exist: uuid = integer"); (2) os validators Zod de
 * criar/atualizar item (`itemValidators.ts`) exigiam
 * `z.string().uuid()`, entao a API nunca aceitava um `supplier_id` real
 * (todos inteiros) — o campo era estruturalmente impossivel de preencher
 * corretamente. Mesmo padrao de bug ja corrigido em `item_estruturas`
 * (migration `20260802-000005-fix-item-estruturas-user-columns`).
 *
 * Diagnostico antes do fix (banco real, 2026-08-06): `items` tem 13 linhas,
 * `fornecedor_padrao_id` 100% NULL (0/13) em todos os ambientes conhecidos
 * — nao ha dado incompativel a migrar, entao a correcao de tipo e segura.
 *
 * Fix: converte a coluna para INTEGER com FK real para `suppliers(id)`
 * (`ON DELETE SET NULL`, mesma politica de todo FK opcional de auditoria/
 * referencia neste projeto). O model Sequelize (`Item.ts`) e os validators
 * (`itemValidators.ts`) sao atualizados no mesmo commit desta migration.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // FK antiga apontava para a tabela orfa `fornecedores` (uuid) e
    // bloquearia o ALTER TYPE.
    await queryInterface.sequelize.query(`
      ALTER TABLE items
        DROP CONSTRAINT IF EXISTS items_fornecedor_padrao_id_fkey;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE items
        ALTER COLUMN fornecedor_padrao_id TYPE integer USING NULL;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE items
        DROP CONSTRAINT IF EXISTS fk_items_fornecedor_padrao_id_suppliers;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE items
        ADD CONSTRAINT fk_items_fornecedor_padrao_id_suppliers
        FOREIGN KEY (fornecedor_padrao_id) REFERENCES suppliers(id) ON DELETE SET NULL;
    `);

    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN items.fornecedor_padrao_id IS
        'FK -> suppliers.id (INTEGER). Corrigido em 20260806-000040 (era uuid -> fornecedores, tabela orfa dual-schema).';
    `);
  },

  async down(queryInterface, Sequelize) {
    const [rows] = await queryInterface.sequelize.query(`
      SELECT count(*)::int AS count FROM items WHERE fornecedor_padrao_id IS NOT NULL
    `);
    if (rows[0].count > 0) {
      throw new Error(
        `Rollback abortado: ${rows[0].count} linha(s) em items possuem fornecedor_padrao_id preenchido ` +
        '(referenciando suppliers.id, integer). Reverter para uuid perderia esse vinculo — decida antes ' +
        'se aceita a perda ou faz backfill manual para a tabela orfa fornecedores (nao recomendado).'
      );
    }

    await queryInterface.sequelize.query(`
      ALTER TABLE items
        DROP CONSTRAINT IF EXISTS fk_items_fornecedor_padrao_id_suppliers;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE items
        ALTER COLUMN fornecedor_padrao_id TYPE uuid USING NULL;
    `);
  },
};
