'use strict';

/**
 * CNAB 240 (Cobrança) v1 — pendência "CNAB (boleto/remessa/retorno)" de
 * `docs/governance/TODO.md`.
 *
 * Cria `cnab_remittances` (um registro por arquivo de remessa gerado — ver
 * `server/src/models/CnabRemittance.ts`).
 *
 * Migration idempotente — ver nota em `20260806-000110-create-company-banking-config.cjs`.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('cnab_remittances')) return;

    await queryInterface.createTable('cnab_remittances', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      sequential_number: { type: Sequelize.INTEGER, allowNull: false },
      bank_code: { type: Sequelize.STRING(3), allowNull: false },
      filename: { type: Sequelize.STRING(60), allowNull: false },
      file_content: { type: Sequelize.TEXT, allowNull: false },
      total_items: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      total_amount: { type: Sequelize.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      generated_by: {
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

    await queryInterface.addIndex('cnab_remittances', ['generated_by'], { name: 'idx_cnab_remittances_generated_by' });
    await queryInterface.addIndex('cnab_remittances', ['sequential_number'], { name: 'idx_cnab_remittances_sequential_number' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cnab_remittances');
  },
};
