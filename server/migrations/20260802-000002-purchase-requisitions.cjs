'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('purchase_requisitions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      requisition_number: {
        type: Sequelize.STRING(60),
        allowNull: false,
        unique: true,
      },
      requester_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'departments',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      production_order_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'production_orders',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      request_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_DATE'),
      },
      priority: {
        type: Sequelize.ENUM('normal', 'urgent', 'emergency'),
        allowNull: false,
        defaultValue: 'normal',
      },
      status: {
        type: Sequelize.ENUM('draft', 'pending', 'approved', 'ordered', 'partial', 'received', 'canceled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      origin: {
        type: Sequelize.STRING(80),
        allowNull: false,
        defaultValue: 'manual',
      },
      approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      approval_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
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

    await queryInterface.createTable('purchase_requisition_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      requisition_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'purchase_requisitions',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      item_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'items',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      quantity: {
        type: Sequelize.DECIMAL(18, 6),
        allowNull: false,
      },
      unit: {
        type: Sequelize.STRING(12),
        allowNull: true,
      },
      required_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      suggested_supplier_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'suppliers',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      unit_price_estimated: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'ordered', 'canceled'),
        allowNull: false,
        defaultValue: 'pending',
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

    await queryInterface.addIndex('purchase_requisitions', ['requester_id']);
    await queryInterface.addIndex('purchase_requisitions', ['status']);
    await queryInterface.addIndex('purchase_requisitions', ['request_date']);
    await queryInterface.addIndex('purchase_requisition_items', ['requisition_id']);
    await queryInterface.addIndex('purchase_requisition_items', ['item_id']);
    await queryInterface.addIndex('purchase_requisition_items', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('purchase_requisition_items');
    await queryInterface.dropTable('purchase_requisitions');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purchase_requisitions_priority";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purchase_requisitions_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purchase_requisition_items_status";');
  },
};

