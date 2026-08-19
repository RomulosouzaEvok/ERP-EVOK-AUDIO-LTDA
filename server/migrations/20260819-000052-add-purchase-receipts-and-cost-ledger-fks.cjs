'use strict';

/**
 * Fecha a excecao conhecida de integridade referencial em:
 * - `purchase_receipts.purchase_id` -> `purchase_orders.id`
 * - `purchase_receipts.received_by` -> `users.id`
 * - `product_cost_ledgers.product_id` -> `products.id`
 *
 * A auditoria viva de 2026-08-10 apontou estas tres FKs como ausentes.
 * Todas as tabelas envolvidas estao vazias ou com volume baixo e, por isso,
 * a migracao e aditiva e sem backfill. Antes de criar as FKs, a migracao
 * falha explicitamente se encontrar linhas orfas, para nao mascarar
 * divergencia entre bancos.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const orphanChecks = [
      {
        label: 'purchase_receipts.purchase_id',
        sql: `
          SELECT count(*)::int AS orphan_count
          FROM purchase_receipts pr
          LEFT JOIN purchase_orders po ON po.id = pr.purchase_id
          WHERE po.id IS NULL;
        `,
      },
      {
        label: 'purchase_receipts.received_by',
        sql: `
          SELECT count(*)::int AS orphan_count
          FROM purchase_receipts pr
          LEFT JOIN users u ON u.id = pr.received_by
          WHERE pr.received_by IS NOT NULL
            AND u.id IS NULL;
        `,
      },
      {
        label: 'product_cost_ledgers.product_id',
        sql: `
          SELECT count(*)::int AS orphan_count
          FROM product_cost_ledgers pcl
          LEFT JOIN products p ON p.id = pcl.product_id
          WHERE p.id IS NULL;
        `,
      },
    ];

    for (const check of orphanChecks) {
      const [rows] = await queryInterface.sequelize.query(check.sql);
      const orphanCount = Number(rows?.[0]?.orphan_count ?? 0);
      if (orphanCount > 0) {
        throw new Error(
          `Nao foi possivel adicionar a FK de ${check.label}: existem ${orphanCount} linha(s) orfa(s). `
          + 'Corrija os dados antes de rodar esta migration novamente.',
        );
      }
    }

    await queryInterface.sequelize.query(`
      ALTER TABLE purchase_receipts
        DROP CONSTRAINT IF EXISTS fk_purchase_receipts_purchase_id;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE purchase_receipts
        ADD CONSTRAINT fk_purchase_receipts_purchase_id
        FOREIGN KEY (purchase_id) REFERENCES purchase_orders(id) ON DELETE RESTRICT;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE purchase_receipts
        DROP CONSTRAINT IF EXISTS fk_purchase_receipts_received_by;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE purchase_receipts
        ADD CONSTRAINT fk_purchase_receipts_received_by
        FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE RESTRICT;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE product_cost_ledgers
        DROP CONSTRAINT IF EXISTS fk_product_cost_ledgers_product_id;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE product_cost_ledgers
        ADD CONSTRAINT fk_product_cost_ledgers_product_id
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_receipts_purchase_id
      ON purchase_receipts (purchase_id);
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_receipts_received_by
      ON purchase_receipts (received_by);
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_cost_ledgers_product_id
      ON product_cost_ledgers (product_id);
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_product_cost_ledgers_product_id;
    `);
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_purchase_receipts_received_by;
    `);
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_purchase_receipts_purchase_id;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE product_cost_ledgers
        DROP CONSTRAINT IF EXISTS fk_product_cost_ledgers_product_id;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE purchase_receipts
        DROP CONSTRAINT IF EXISTS fk_purchase_receipts_received_by;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE purchase_receipts
        DROP CONSTRAINT IF EXISTS fk_purchase_receipts_purchase_id;
    `);
  },
};
