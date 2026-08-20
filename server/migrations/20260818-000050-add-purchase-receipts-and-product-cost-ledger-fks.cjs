'use strict';

const TABLE_PURCHASE_RECEIPTS = 'purchase_receipts';
const TABLE_PRODUCT_COST_LEDGERS = 'product_cost_ledgers';

const FK_PURCHASE_RECEIPTS_PURCHASE = 'fk_purchase_receipts_purchase_id';
const FK_PURCHASE_RECEIPTS_RECEIVED_BY = 'fk_purchase_receipts_received_by';
const FK_PRODUCT_COST_LEDGERS_PRODUCT = 'fk_product_cost_ledgers_product_id';
const IDX_PRODUCT_COST_LEDGERS_PRODUCT = 'idx_product_cost_ledgers_product_id_fk';

async function hasForeignKey(queryInterface, tableName, constraintName) {
  const [rows] = await queryInterface.sequelize.query(
    `
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.referential_constraints rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.table_name = :tableName
        AND tc.constraint_name = :constraintName
        AND tc.constraint_type = 'FOREIGN KEY'
      LIMIT 1
    `,
    {
      replacements: { tableName, constraintName },
    }
  );

  return rows.length > 0;
}

async function hasIndex(queryInterface, tableName, indexName) {
  const [rows] = await queryInterface.sequelize.query(
    `
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = current_schema()
        AND tablename = :tableName
        AND indexname = :indexName
      LIMIT 1
    `,
    {
      replacements: { tableName, indexName },
    }
  );

  return rows.length > 0;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await hasForeignKey(queryInterface, TABLE_PURCHASE_RECEIPTS, FK_PURCHASE_RECEIPTS_PURCHASE))) {
      await queryInterface.addConstraint(TABLE_PURCHASE_RECEIPTS, {
        fields: ['purchase_id'],
        type: 'foreign key',
        name: FK_PURCHASE_RECEIPTS_PURCHASE,
        references: {
          table: 'purchase_orders',
          field: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      });
    }

    if (!(await hasForeignKey(queryInterface, TABLE_PURCHASE_RECEIPTS, FK_PURCHASE_RECEIPTS_RECEIVED_BY))) {
      await queryInterface.addConstraint(TABLE_PURCHASE_RECEIPTS, {
        fields: ['received_by'],
        type: 'foreign key',
        name: FK_PURCHASE_RECEIPTS_RECEIVED_BY,
        references: {
          table: 'users',
          field: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      });
    }

    if (!(await hasForeignKey(queryInterface, TABLE_PRODUCT_COST_LEDGERS, FK_PRODUCT_COST_LEDGERS_PRODUCT))) {
      await queryInterface.addConstraint(TABLE_PRODUCT_COST_LEDGERS, {
        fields: ['product_id'],
        type: 'foreign key',
        name: FK_PRODUCT_COST_LEDGERS_PRODUCT,
        references: {
          table: 'products',
          field: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      });
    }

    if (!(await hasIndex(queryInterface, TABLE_PRODUCT_COST_LEDGERS, IDX_PRODUCT_COST_LEDGERS_PRODUCT))) {
      await queryInterface.addIndex(TABLE_PRODUCT_COST_LEDGERS, ['product_id'], {
        name: IDX_PRODUCT_COST_LEDGERS_PRODUCT,
      });
    }
  },

  async down(queryInterface) {
    if (await hasIndex(queryInterface, TABLE_PRODUCT_COST_LEDGERS, IDX_PRODUCT_COST_LEDGERS_PRODUCT)) {
      await queryInterface.removeIndex(TABLE_PRODUCT_COST_LEDGERS, IDX_PRODUCT_COST_LEDGERS_PRODUCT);
    }

    if (await hasForeignKey(queryInterface, TABLE_PRODUCT_COST_LEDGERS, FK_PRODUCT_COST_LEDGERS_PRODUCT)) {
      await queryInterface.removeConstraint(TABLE_PRODUCT_COST_LEDGERS, FK_PRODUCT_COST_LEDGERS_PRODUCT);
    }

    if (await hasForeignKey(queryInterface, TABLE_PURCHASE_RECEIPTS, FK_PURCHASE_RECEIPTS_RECEIVED_BY)) {
      await queryInterface.removeConstraint(TABLE_PURCHASE_RECEIPTS, FK_PURCHASE_RECEIPTS_RECEIVED_BY);
    }

    if (await hasForeignKey(queryInterface, TABLE_PURCHASE_RECEIPTS, FK_PURCHASE_RECEIPTS_PURCHASE)) {
      await queryInterface.removeConstraint(TABLE_PURCHASE_RECEIPTS, FK_PURCHASE_RECEIPTS_PURCHASE);
    }
  },
};
