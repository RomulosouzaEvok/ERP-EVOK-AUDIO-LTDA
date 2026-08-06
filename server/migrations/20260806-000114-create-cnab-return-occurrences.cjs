'use strict';

/**
 * CNAB 240 (Cobrança) v1 — pendência "CNAB (boleto/remessa/retorno)" de
 * `docs/governance/TODO.md`.
 *
 * Cria `cnab_return_occurrences` (uma ocorrência — par Segmento T+U — por
 * linha do arquivo de retorno processado; ver
 * `server/src/models/CnabReturnOccurrence.ts`). `remittance_item_id` é
 * nullable: um retorno pode conter `nosso_numero` que não corresponde a
 * nenhuma remessa gerada por este sistema (ex.: título registrado
 * diretamente no internet banking do banco).
 *
 * Migration idempotente — ver nota em `20260806-000110-create-company-banking-config.cjs`.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('cnab_return_occurrences')) return;

    await queryInterface.createTable('cnab_return_occurrences', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      return_file_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'cnab_return_files', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      remittance_item_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'cnab_remittance_items', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      nosso_numero: { type: Sequelize.STRING(20), allowNull: false },
      movement_code: { type: Sequelize.STRING(2), allowNull: false },
      movement_description: { type: Sequelize.STRING(100), allowNull: true },
      amount_paid: { type: Sequelize.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      occurrence_date: { type: Sequelize.DATEONLY, allowNull: true },
      applied: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
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

    await queryInterface.addIndex('cnab_return_occurrences', ['return_file_id'], { name: 'idx_cnab_return_occurrences_return_file_id' });
    await queryInterface.addIndex('cnab_return_occurrences', ['remittance_item_id'], { name: 'idx_cnab_return_occurrences_remittance_item_id' });
    await queryInterface.addIndex('cnab_return_occurrences', ['nosso_numero'], { name: 'idx_cnab_return_occurrences_nosso_numero' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cnab_return_occurrences');
  },
};
