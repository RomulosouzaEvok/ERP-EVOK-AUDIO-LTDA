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
