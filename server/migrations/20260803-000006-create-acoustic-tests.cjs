'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Tabela acoustic_test_results
    await queryInterface.createTable('acoustic_test_results', {
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
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      serial_number: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      lot_number: {
        type: Sequelize.STRING(80),
        allowNull: true,
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
      test_type: {
        type: Sequelize.ENUM(
          'impedance',
          'frequency_response',
          'thd',
          'power_rms',
          'power_peak',
          'life',
          'polarity',
          'noise',
          'thiele_small'
        ),
        allowNull: false,
      },
      test_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      tester_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      parameters: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      result: {
        type: Sequelize.NUMERIC(12, 4),
        allowNull: true,
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      specification_min: {
        type: Sequelize.NUMERIC(12, 4),
        allowNull: true,
      },
      specification_max: {
        type: Sequelize.NUMERIC(12, 4),
        allowNull: true,
      },
      passed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      curve_data: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      non_conformity_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'non_conformities',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
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

    await queryInterface.addIndex('acoustic_test_results', ['product_id'], {
      name: 'idx_acoustic_test_results_product_id',
    });
    await queryInterface.addIndex('acoustic_test_results', ['test_type'], {
      name: 'idx_acoustic_test_results_test_type',
    });
    await queryInterface.addIndex('acoustic_test_results', ['test_date'], {
      name: 'idx_acoustic_test_results_test_date',
    });
    await queryInterface.addIndex('acoustic_test_results', ['passed'], {
      name: 'idx_acoustic_test_results_passed',
    });
    await queryInterface.addIndex('acoustic_test_results', ['serial_number'], {
      name: 'idx_acoustic_test_results_serial_number',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('acoustic_test_results', 'idx_acoustic_test_results_serial_number');
    await queryInterface.removeIndex('acoustic_test_results', 'idx_acoustic_test_results_passed');
    await queryInterface.removeIndex('acoustic_test_results', 'idx_acoustic_test_results_test_date');
    await queryInterface.removeIndex('acoustic_test_results', 'idx_acoustic_test_results_test_type');
    await queryInterface.removeIndex('acoustic_test_results', 'idx_acoustic_test_results_product_id');
    await queryInterface.dropTable('acoustic_test_results');

    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_acoustic_test_results_test_type";');
  },
};
