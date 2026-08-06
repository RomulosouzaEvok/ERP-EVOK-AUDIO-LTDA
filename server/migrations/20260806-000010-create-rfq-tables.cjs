'use strict';

/**
 * Cotacao/RFQ multi-fornecedor (docs/LEVANTAMENTO_ERP_2026-08-02.md, secao 2).
 *
 * Cria 4 tabelas:
 * - `rfqs`: cabecalho da cotacao (numero `RFQ-<ano>-XXXX`, status, origem
 *   opcional em `purchase_requisitions`, prazo de resposta).
 * - `rfq_items`: itens cotados (quantidade/unidade), com
 *   `awarded_supplier_id`/`awarded_unit_price` preenchidos no momento da
 *   adjudicacao (POST /api/rfqs/:id/award) para auditoria/exibicao rapida
 *   sem precisar recalcular o mapa comparativo.
 * - `rfq_suppliers`: fornecedores convidados a cotar, com status por
 *   fornecedor (invited/responded/declined).
 * - `rfq_quotes`: resposta digitada pelo comprador (preco, prazo, MOQ,
 *   validade) por par (rfq_item, fornecedor) — unico por par.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rfqs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      rfq_number: {
        type: Sequelize.STRING(60),
        allowNull: false,
        unique: true,
        comment: 'Numero da cotacao, formato RFQ-<ano>-XXXX',
      },
      requisition_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'purchase_requisitions',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'FK opcional -> purchase_requisitions.id (RFQ pode nascer de requisicao ou avulsa)',
      },
      status: {
        type: Sequelize.ENUM('draft', 'sent', 'quoted', 'awarded', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft',
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      response_deadline: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Prazo de resposta dos fornecedores convidados',
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

    await queryInterface.createTable('rfq_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      rfq_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'rfqs',
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
      awarded_supplier_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'suppliers',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Preenchido em POST /api/rfqs/:id/award — fornecedor vencedor deste item',
      },
      awarded_unit_price: {
        type: Sequelize.DECIMAL(18, 6),
        allowNull: true,
        comment: 'Preco unitario cotado do vencedor, congelado no momento da adjudicacao',
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

    await queryInterface.createTable('rfq_suppliers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      rfq_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'rfqs',
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
      status: {
        type: Sequelize.ENUM('invited', 'responded', 'declined'),
        allowNull: false,
        defaultValue: 'invited',
      },
      invited_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      responded_at: {
        type: Sequelize.DATE,
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

    await queryInterface.createTable('rfq_quotes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      rfq_item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'rfq_items',
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
        allowNull: false,
      },
      lead_time_days: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      moq: {
        type: Sequelize.DECIMAL(18, 6),
        allowNull: true,
      },
      validity_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Validade da cotacao informada pelo fornecedor',
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

    await queryInterface.addConstraint('rfq_suppliers', {
      fields: ['rfq_id', 'supplier_id'],
      type: 'unique',
      name: 'uq_rfq_suppliers_rfq_supplier',
    });

    await queryInterface.addConstraint('rfq_quotes', {
      fields: ['rfq_item_id', 'supplier_id'],
      type: 'unique',
      name: 'uq_rfq_quotes_item_supplier',
    });

    await queryInterface.addIndex('rfqs', ['requisition_id'], { name: 'idx_rfqs_requisition_id' });
    await queryInterface.addIndex('rfqs', ['status'], { name: 'idx_rfqs_status' });
    await queryInterface.addIndex('rfqs', ['created_by'], { name: 'idx_rfqs_created_by' });

    await queryInterface.addIndex('rfq_items', ['rfq_id'], { name: 'idx_rfq_items_rfq_id' });
    await queryInterface.addIndex('rfq_items', ['item_id'], { name: 'idx_rfq_items_item_id' });
    await queryInterface.addIndex('rfq_items', ['awarded_supplier_id'], { name: 'idx_rfq_items_awarded_supplier_id' });

    await queryInterface.addIndex('rfq_suppliers', ['rfq_id'], { name: 'idx_rfq_suppliers_rfq_id' });
    await queryInterface.addIndex('rfq_suppliers', ['supplier_id'], { name: 'idx_rfq_suppliers_supplier_id' });
    await queryInterface.addIndex('rfq_suppliers', ['status'], { name: 'idx_rfq_suppliers_status' });

    await queryInterface.addIndex('rfq_quotes', ['rfq_item_id'], { name: 'idx_rfq_quotes_rfq_item_id' });
    await queryInterface.addIndex('rfq_quotes', ['supplier_id'], { name: 'idx_rfq_quotes_supplier_id' });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable('rfq_quotes');
    await queryInterface.dropTable('rfq_suppliers');
    await queryInterface.dropTable('rfq_items');
    await queryInterface.dropTable('rfqs');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_rfqs_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_rfq_suppliers_status";');
  },
};
