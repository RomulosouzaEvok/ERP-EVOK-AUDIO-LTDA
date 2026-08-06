'use strict';

/**
 * CNAB 240 (Cobrança) v1 — pendência "CNAB (boleto/remessa/retorno)" de
 * `docs/governance/TODO.md`.
 *
 * Cria `cnab_remittance_items` (um título por remessa — ver
 * `server/src/models/CnabRemittanceItem.ts`). `nosso_numero` é único
 * globalmente (nunca reaproveitado, mesmo entre remessas diferentes).
 *
 * Migration idempotente — ver nota em `20260806-000110-create-company-banking-config.cjs`.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('cnab_remittance_items')) return;

    await queryInterface.createTable('cnab_remittance_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      remittance_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'cnab_remittances', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      receivable_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'accounts_receivable', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      nosso_numero: { type: Sequelize.STRING(20), allowNull: false },
      amount: { type: Sequelize.DECIMAL(18, 6), allowNull: false },
      due_date: { type: Sequelize.DATEONLY, allowNull: false },
      status: {
        type: Sequelize.ENUM('pending', 'settled', 'error'),
        allowNull: false,
        defaultValue: 'pending',
      },
      settled_at: { type: Sequelize.DATE, allowNull: true },
      error_description: { type: Sequelize.STRING(255), allowNull: true },
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

    await queryInterface.addIndex('cnab_remittance_items', ['nosso_numero'], { name: 'uq_cnab_remittance_items_nosso_numero', unique: true });
    await queryInterface.addIndex('cnab_remittance_items', ['remittance_id'], { name: 'idx_cnab_remittance_items_remittance_id' });
    await queryInterface.addIndex('cnab_remittance_items', ['receivable_id'], { name: 'idx_cnab_remittance_items_receivable_id' });
    await queryInterface.addIndex('cnab_remittance_items', ['status'], { name: 'idx_cnab_remittance_items_status' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cnab_remittance_items');
  },
};
