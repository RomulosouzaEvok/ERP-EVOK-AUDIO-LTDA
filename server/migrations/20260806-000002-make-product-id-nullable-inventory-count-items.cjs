'use strict';

/**
 * Bug real encontrado em teste manual do fluxo de atribuicao de contagens
 * (2026-08-06): `CreateInventoryCountUseCase` aceita `item_ids` (caminho
 * NOVO, dual-read, PREFERIDO segundo o proprio comentario do use case) e
 * grava `product_id: null` / `item_id: <uuid>` nesse caso — mas a coluna
 * `inventory_count_items.product_id` continuava `NOT NULL` no banco (e no
 * model Sequelize), entao TODA contagem criada via `item_ids` falhava com
 * erro 500 (`null value in column "product_id" violates not-null
 * constraint`). So funcionava pelo caminho legado `product_ids`.
 *
 * Fix: `product_id` passa a ser nullable (segue o mesmo padrao dual-read
 * ja usado em `item_id`), com um CHECK constraint garantindo que pelo
 * menos um dos dois esteja preenchido (nunca os dois nulos ao mesmo
 * tempo) — mantem a integridade que o `allowNull: false` antigo tentava
 * garantir, sem bloquear o caminho novo.
 *
 * RISCO DE ROLLBACK (achado de auditoria 2026-08-06, item 4): o `down()`
 * desta migration executa `changeColumn(..., { allowNull: false })` em
 * `product_id`. Isso é IRREVERSÍVEL em produção assim que a primeira
 * contagem for criada pelo caminho `item_ids` (o caminho novo, preferido —
 * ver `CreateInventoryCountUseCase`): essas linhas nascem com
 * `product_id IS NULL` por design, e o Postgres rejeita o `ALTER COLUMN
 * ... SET NOT NULL` enquanto existir qualquer linha nessa condição. Ou
 * seja: `npm run migration:down` desta migration só funciona em uma janela
 * estreita, ANTES de qualquer uso real do dual-read via `item_ids` — depois
 * disso, reverter exige primeiro decidir o que fazer com as linhas
 * `product_id IS NULL` (backfill manual ou aceitar perda de dado), o que
 * NÃO é responsabilidade deste `down()` decidir sozinho. Por isso o
 * `down()` abaixo faz uma checagem explícita e aborta com mensagem clara
 * em vez de deixar o Postgres estourar um erro genérico de constraint.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('inventory_count_items');
    if (columns.product_id && columns.product_id.allowNull === false) {
      await queryInterface.changeColumn('inventory_count_items', 'product_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'FK -> products.id (LEGADO, dual-read com item_id — um dos dois deve estar preenchido)',
      });
    }

    const [constraints] = await queryInterface.sequelize.query(`
      SELECT conname FROM pg_constraint WHERE conname = 'chk_inventory_count_items_product_or_item'
    `);
    if (constraints.length === 0) {
      await queryInterface.sequelize.query(`
        ALTER TABLE inventory_count_items
        ADD CONSTRAINT chk_inventory_count_items_product_or_item
        CHECK (product_id IS NOT NULL OR item_id IS NOT NULL);
      `);
    }
  },

  async down(queryInterface, Sequelize) {
    // Ver comentário de cabeçalho ("RISCO DE ROLLBACK"): aborta com
    // mensagem clara em vez de deixar o Postgres estourar um erro genérico
    // de "column contains null values" no meio do downgrade.
    const [rows] = await queryInterface.sequelize.query(`
      SELECT count(*)::int AS count FROM inventory_count_items WHERE product_id IS NULL
    `);
    const count = rows[0].count;
    if (count > 0) {
      throw new Error(
        `Rollback abortado: ${count} linha(s) em inventory_count_items possuem product_id IS NULL ` +
        '(criadas pelo caminho dual-read item_ids). Reverter esta migration exigiria SET NOT NULL em ' +
        'product_id, o que falharia com essas linhas presentes. Decida antes: (a) fazer backfill manual ' +
        'de product_id para essas linhas via crosswalk items.codigo = products.code, ou (b) aceitar ' +
        'perda de rastreabilidade dessas linhas antes de revertê-las manualmente. Este down() não decide ' +
        'isso automaticamente.'
      );
    }

    await queryInterface.sequelize.query(`
      ALTER TABLE inventory_count_items
      DROP CONSTRAINT IF EXISTS chk_inventory_count_items_product_or_item;
    `);
    await queryInterface.changeColumn('inventory_count_items', 'product_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: 'FK -> products.id (LEGADO)',
    });
  },
};
