'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Tabela engineering_projects
    await queryInterface.createTable('engineering_projects', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      project_code: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      project_type: {
        type: Sequelize.ENUM('new_product', 'improvement', 'customization', 'research'),
        allowNull: false,
        defaultValue: 'new_product',
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'products',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      project_manager_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      target_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      completion_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      budget: {
        type: Sequelize.NUMERIC(15, 2),
        allowNull: true,
      },
      actual_cost: {
        type: Sequelize.NUMERIC(15, 2),
        allowNull: false,
        defaultValue: 0,
      },
      stage: {
        type: Sequelize.ENUM('concept', 'design', 'prototype', 'testing', 'homologation', 'production'),
        allowNull: false,
        defaultValue: 'concept',
      },
      status: {
        type: Sequelize.ENUM('active', 'paused', 'completed', 'canceled'),
        allowNull: false,
        defaultValue: 'active',
      },
      priority: {
        type: Sequelize.ENUM('low', 'normal', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'normal',
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

    await queryInterface.addIndex('engineering_projects', ['product_id'], {
      name: 'idx_engineering_projects_product_id',
    });
    await queryInterface.addIndex('engineering_projects', ['status'], {
      name: 'idx_engineering_projects_status',
    });
    await queryInterface.addIndex('engineering_projects', ['stage'], {
      name: 'idx_engineering_projects_stage',
    });

    // 2. Tabela product_drawings
    await queryInterface.createTable('product_drawings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      drawing_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      revision: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: '00',
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      drawing_type: {
        type: Sequelize.ENUM('assembly', 'detail', 'exploded', 'schematic', 'bom'),
        allowNull: false,
        defaultValue: 'detail',
      },
      file_path: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      material_spec: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      dimensions: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      tolerances: {
        type: Sequelize.TEXT,
        allowNull: true,
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
      status: {
        type: Sequelize.ENUM('draft', 'released', 'obsolete', 'canceled'),
        allowNull: false,
        defaultValue: 'draft',
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

    await queryInterface.addConstraint('product_drawings', {
      fields: ['drawing_number', 'revision'],
      type: 'unique',
      name: 'uq_product_drawings_number_revision',
    });

    await queryInterface.addIndex('product_drawings', ['product_id'], {
      name: 'idx_product_drawings_product_id',
    });
    await queryInterface.addIndex('product_drawings', ['status'], {
      name: 'idx_product_drawings_status',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('product_drawings', 'idx_product_drawings_status');
    await queryInterface.removeIndex('product_drawings', 'idx_product_drawings_product_id');
    await queryInterface.removeConstraint('product_drawings', 'uq_product_drawings_number_revision');
    await queryInterface.dropTable('product_drawings');

    await queryInterface.removeIndex('engineering_projects', 'idx_engineering_projects_stage');
    await queryInterface.removeIndex('engineering_projects', 'idx_engineering_projects_status');
    await queryInterface.removeIndex('engineering_projects', 'idx_engineering_projects_product_id');
    await queryInterface.dropTable('engineering_projects');

    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_product_drawings_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_product_drawings_drawing_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_engineering_projects_priority";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_engineering_projects_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_engineering_projects_stage";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_engineering_projects_project_type";');
  },
};
