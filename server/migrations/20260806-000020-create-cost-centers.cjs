'use strict';

/**
 * Bloco Financeiro — Centros de Custo (gap "fluxo projetado, centros de
 * custo" de `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`).
 *
 * Cria a tabela `cost_centers` (código único, nome, descrição, `active`) e
 * adiciona a coluna opcional `cost_center_id` (nullable, FK `ON DELETE
 * SET NULL`, com índice) em `accounts_payable` e `accounts_receivable`.
 *
 * Sem backfill: todo o histórico existente nasce com `cost_center_id = NULL`
 * ("Sem centro de custo" nos relatórios) — não há mapeamento automático
 * seguro de lançamentos antigos para um centro de custo específico.
 *
 * Migration idempotente (mesmo padrão de `20260803-000004-create-work-centers.cjs`
 * e `20260805-000004-add-invoice-type-payable-and-purchase.cjs`): a migration
 * baseline (`20260731-000001-baseline-schema.cjs`) cria tabelas dinamicamente
 * a partir dos models Sequelize *atuais*, então um banco criado do zero após
 * este commit já nasce com `cost_centers`/`cost_center_id` prontos — sem as
 * checagens de existência, um banco novo falharia aqui com "already exists".
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('cost_centers')) {
      await queryInterface.createTable('cost_centers', {
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
    }

    await addCostCenterColumn(queryInterface, Sequelize, 'accounts_payable');
    await addCostCenterColumn(queryInterface, Sequelize, 'accounts_receivable');
  },

  async down(queryInterface) {
    await removeCostCenterColumn(queryInterface, 'accounts_payable');
    await removeCostCenterColumn(queryInterface, 'accounts_receivable');
    await queryInterface.dropTable('cost_centers');
  },
};

/**
 * Adiciona `cost_center_id` (nullable, FK `ON DELETE SET NULL`) + índice em
 * `tableName`, se ainda não existir.
 *
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {import('sequelize')} Sequelize
 * @param {string} tableName
 * @returns {Promise<void>}
 */
async function addCostCenterColumn(queryInterface, Sequelize, tableName) {
  const columns = await queryInterface.describeTable(tableName);
  if (!columns.cost_center_id) {
    await queryInterface.addColumn(tableName, 'cost_center_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'cost_centers',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  }

  const indexes = await queryInterface.showIndex(tableName);
  const indexName = `idx_${tableName}_cost_center_id`;
  if (!indexes.some((index) => index.name === indexName)) {
    await queryInterface.addIndex(tableName, ['cost_center_id'], { name: indexName });
  }
}

/**
 * Remove o índice e a coluna `cost_center_id` de `tableName` (rollback).
 *
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {string} tableName
 * @returns {Promise<void>}
 */
async function removeCostCenterColumn(queryInterface, tableName) {
  const indexName = `idx_${tableName}_cost_center_id`;
  try {
    await queryInterface.removeIndex(tableName, indexName);
  } catch (error) {
    // Índice pode já não existir (rollback parcial) — segue para a coluna.
  }
  await queryInterface.removeColumn(tableName, 'cost_center_id');
}
