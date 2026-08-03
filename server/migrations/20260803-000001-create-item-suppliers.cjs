'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('item_suppliers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      item_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'items',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      supplier_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'suppliers',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      unit_price: {
        type: Sequelize.DECIMAL(18, 6),
        allowNull: true,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'BRL',
      },
      lead_time_days: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      moq: {
        type: Sequelize.DECIMAL(18, 6),
        allowNull: true,
      },
      supplier_item_code: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },
      preferred: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addConstraint('item_suppliers', {
      fields: ['item_id', 'supplier_id'],
      type: 'unique',
      name: 'uq_item_suppliers_item_supplier',
    });

    await queryInterface.addIndex('item_suppliers', ['item_id'], { name: 'idx_item_suppliers_item_id' });
    await queryInterface.addIndex('item_suppliers', ['supplier_id'], { name: 'idx_item_suppliers_supplier_id' });

    // Backfill: deriva vinculos item x fornecedor a partir do historico de compras.
    // Para cada par (item, fornecedor), usa o preco unitario do pedido mais recente.
    await queryInterface.sequelize.query(`
      INSERT INTO item_suppliers (item_id, supplier_id, unit_price, created_at, updated_at)
      SELECT DISTINCT ON (poi.item_id, po.supplier_id)
        poi.item_id,
        po.supplier_id,
        poi.unit_price,
        NOW(),
        NOW()
      FROM purchase_order_items poi
      JOIN purchase_orders po ON po.id = poi.purchase_id
      WHERE poi.item_id IS NOT NULL AND po.supplier_id IS NOT NULL
      ORDER BY poi.item_id, po.supplier_id, po.order_date DESC
      ON CONFLICT DO NOTHING;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('item_suppliers');
  },
};
