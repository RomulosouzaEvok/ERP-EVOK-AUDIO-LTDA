'use strict';

/**
 * CNAB 240 (Cobrança) v1 — pendência "CNAB (boleto/remessa/retorno)" de
 * `docs/governance/TODO.md`.
 *
 * Cria `company_banking_config`: tabela singleton (uma única linha, id=1)
 * com os dados bancários do cedente (a própria empresa) usados na geração
 * de remessa CNAB 240 (ver `server/src/modules/financial/infrastructure/cnab`).
 * Mantida separada de `company_fiscal_config` (módulo fiscal/NF-e) por
 * separação de domínio — ver `server/src/models/CompanyBankingConfig.ts`.
 *
 * Migration idempotente (mesmo padrão de `20260806-000020-create-cost-centers.cjs`
 * e `20260806-000070-create-bank-statements.cjs`): a migration baseline
 * cria tabelas dinamicamente a partir dos models Sequelize *atuais*, então
 * um banco criado do zero após este commit já nasce com
 * `company_banking_config` pronta — sem a checagem de existência, um banco
 * novo falharia aqui com "already exists".
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('company_banking_config')) return;

    await queryInterface.createTable('company_banking_config', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      bank_code: { type: Sequelize.STRING(3), allowNull: false },
      bank_name: { type: Sequelize.STRING(30), allowNull: false },
      agency: { type: Sequelize.STRING(5), allowNull: false },
      agency_dv: { type: Sequelize.STRING(1), allowNull: true },
      account_number: { type: Sequelize.STRING(12), allowNull: false },
      account_dv: { type: Sequelize.STRING(1), allowNull: true },
      agency_account_dv: { type: Sequelize.STRING(1), allowNull: true },
      covenant_code: { type: Sequelize.STRING(20), allowNull: false },
      wallet_code: { type: Sequelize.STRING(1), allowNull: false },
      company_document: { type: Sequelize.STRING(14), allowNull: false },
      company_legal_name: { type: Sequelize.STRING(30), allowNull: false },
      next_our_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      next_remittance_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('company_banking_config');
  },
};
