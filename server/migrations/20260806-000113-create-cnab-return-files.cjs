'use strict';

/**
 * CNAB 240 (Cobrança) v1 — pendência "CNAB (boleto/remessa/retorno)" de
 * `docs/governance/TODO.md`.
 *
 * Cria `cnab_return_files` (um registro por arquivo `.RET` processado — ver
 * `server/src/models/CnabReturnFile.ts`).
 *
 * Migration idempotente — ver nota em `20260806-000110-create-company-banking-config.cjs`.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('cnab_return_files')) return;

    await queryInterface.createTable('cnab_return_files', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      filename: { type: Sequelize.STRING(255), allowNull: false },
      bank_code: { type: Sequelize.STRING(3), allowNull: true },
      occurrences_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      settled_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      duplicates_skipped: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      processed_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
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

    await queryInterface.addIndex('cnab_return_files', ['processed_by'], { name: 'idx_cnab_return_files_processed_by' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cnab_return_files');
  },
};
