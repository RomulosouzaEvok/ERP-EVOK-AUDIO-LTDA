'use strict';

/**
 * Registro de paradas de máquina/centro de trabalho (downtime), pendência
 * "campo de downtime/paradas para OEE preciso" de `docs/governance/TODO.md`.
 *
 * Cria a tabela `production_downtimes`:
 * - `work_center_id` (FK obrigatória `work_centers.id`, `ON DELETE RESTRICT`
 *   — não é possível remover um centro de trabalho com histórico de parada).
 * - `production_order_id` (FK opcional `production_orders.id`,
 *   `ON DELETE SET NULL` — parada pode ser geral do centro ou vinculada a
 *   uma OP específica; se a OP for removida, a parada permanece no
 *   histórico do centro).
 * - `reason` (enum de categoria: setup, manutenção corretiva/preventiva,
 *   falta de material/operador, qualidade, outros) + `notes` (texto livre).
 * - `started_at`/`finished_at` (parada em aberto quando `finished_at IS NULL`).
 * - `created_by` (FK obrigatória `users.id`, `ON DELETE RESTRICT`).
 *
 * Índice parcial único `uq_production_downtimes_open_per_work_center`
 * (`work_center_id` WHERE `finished_at IS NULL`) — defesa em profundidade
 * contra 2 paradas abertas simultâneas do mesmo centro (a regra de negócio
 * primária vive em `OpenProductionDowntimeUseCase`, este índice cobre
 * corrida de escrita concorrente que a checagem em aplicação não pega).
 *
 * Migration idempotente (mesmo padrão de `20260806-000020-create-cost-centers.cjs`
 * e `20260803-000004-create-work-centers.cjs`): a migration baseline
 * (`20260731-000001-baseline-schema.cjs`) cria tabelas dinamicamente a
 * partir de uma lista fixa de models — `ProductionDowntime` não está nessa
 * lista, mas o padrão idempotente é mantido por segurança/consistência com
 * as migrations recentes do dia.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('production_downtimes')) {
      await queryInterface.createTable('production_downtimes', {
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
          onDelete: 'RESTRICT',
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
        reason: {
          type: Sequelize.ENUM(
            'setup',
            'manutencao_corretiva',
            'manutencao_preventiva',
            'falta_material',
            'falta_operador',
            'qualidade',
            'outros',
          ),
          allowNull: false,
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        started_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        finished_at: {
          type: Sequelize.DATE,
          allowNull: true,
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
    }

    const indexes = await queryInterface.showIndex('production_downtimes');
    const indexNames = new Set(indexes.map((index) => index.name));

    if (!indexNames.has('idx_production_downtimes_work_center_id')) {
      await queryInterface.addIndex('production_downtimes', ['work_center_id'], {
        name: 'idx_production_downtimes_work_center_id',
      });
    }

    if (!indexNames.has('idx_production_downtimes_production_order_id')) {
      await queryInterface.addIndex('production_downtimes', ['production_order_id'], {
        name: 'idx_production_downtimes_production_order_id',
      });
    }

    if (!indexNames.has('idx_production_downtimes_started_at')) {
      await queryInterface.addIndex('production_downtimes', ['started_at'], {
        name: 'idx_production_downtimes_started_at',
      });
    }

    if (!indexNames.has('uq_production_downtimes_open_per_work_center')) {
      await queryInterface.addIndex('production_downtimes', ['work_center_id'], {
        name: 'uq_production_downtimes_open_per_work_center',
        unique: true,
        where: { finished_at: null },
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('production_downtimes');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_production_downtimes_reason";');
  },
};
