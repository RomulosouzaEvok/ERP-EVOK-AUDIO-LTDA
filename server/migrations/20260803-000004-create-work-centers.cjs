'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Tabela work_centers
    await queryInterface.createTable('work_centers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: Sequelize.STRING(30),
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      machines_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      capacity_hours_per_day: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 8,
      },
      efficiency_factor: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: false,
        defaultValue: 1,
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    // 2. Tabela work_center_shifts
    await queryInterface.createTable('work_center_shifts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      work_center_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'work_centers',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      weekday: {
        type: Sequelize.SMALLINT,
        allowNull: false,
      },
      start_time: {
        type: Sequelize.TIME,
        allowNull: false,
      },
      end_time: {
        type: Sequelize.TIME,
        allowNull: false,
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

    await queryInterface.sequelize.query(`
      ALTER TABLE work_center_shifts
      ADD CONSTRAINT ck_work_center_shifts_weekday_range
      CHECK (weekday BETWEEN 0 AND 6);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE work_center_shifts
      ADD CONSTRAINT ck_work_center_shifts_end_after_start
      CHECK (end_time > start_time);
    `);

    await queryInterface.addConstraint('work_center_shifts', {
      fields: ['work_center_id', 'weekday', 'start_time'],
      type: 'unique',
      name: 'uq_work_center_shifts_center_weekday_start',
    });

    await queryInterface.addIndex('work_center_shifts', ['work_center_id'], {
      name: 'idx_work_center_shifts_work_center_id',
    });

    // 3. Coluna work_center_id em production_route_steps (fase expand — mantém work_center legado)
    await queryInterface.addColumn('production_route_steps', 'work_center_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'work_centers',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addIndex('production_route_steps', ['work_center_id'], {
      name: 'idx_production_route_steps_work_center_id',
    });

    // 4. Backfill idempotente a partir das strings livres já digitadas
    await queryInterface.sequelize.query(`
      INSERT INTO work_centers (code, name, created_at, updated_at)
      SELECT DISTINCT
        LEFT(UPPER(TRIM(prs.work_center)), 30),
        TRIM(prs.work_center),
        NOW(),
        NOW()
      FROM production_route_steps prs
      WHERE prs.work_center IS NOT NULL AND TRIM(prs.work_center) <> ''
      ON CONFLICT (code) DO NOTHING;
    `);

    await queryInterface.sequelize.query(`
      UPDATE production_route_steps prs
      SET work_center_id = wc.id
      FROM work_centers wc
      WHERE UPPER(TRIM(prs.work_center)) = wc.code
        AND prs.work_center_id IS NULL
        AND prs.work_center IS NOT NULL
        AND TRIM(prs.work_center) <> '';
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('production_route_steps', 'idx_production_route_steps_work_center_id');
    await queryInterface.removeColumn('production_route_steps', 'work_center_id');
    await queryInterface.dropTable('work_center_shifts');
    await queryInterface.dropTable('work_centers');
  },
};
