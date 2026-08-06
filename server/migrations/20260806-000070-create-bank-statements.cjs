'use strict';

/**
 * Conciliação Bancária v1 (importação OFX) — gap "conciliação bancária/CNAB"
 * de `docs/governance/TODO.md` (CNAB fica fora desta v1, ver README do
 * módulo `financial`).
 *
 * Cria `bank_statements` (um registro por arquivo OFX importado) e
 * `bank_statement_entries` (cada `<STMTTRN>` do OFX, com dedup por `fitid`
 * e vínculo opcional — nunca os dois ao mesmo tempo — com uma conta a pagar
 * OU a receber já existente).
 *
 * Migration idempotente (mesmo padrão de
 * `20260806-000020-create-cost-centers.cjs`): a migration baseline
 * (`20260731-000001-baseline-schema.cjs`) cria tabelas dinamicamente a
 * partir dos models Sequelize *atuais*, então um banco criado do zero após
 * este commit já nasce com as tabelas prontas — sem a checagem de
 * existência, um banco novo falharia aqui com "already exists".
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('bank_statements')) {
      await queryInterface.createTable('bank_statements', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        filename: {
          type: Sequelize.STRING(255),
          allowNull: false,
          comment: 'Nome original do arquivo .ofx enviado',
        },
        bank_name: {
          type: Sequelize.STRING(150),
          allowNull: true,
          comment: 'Nome do banco (deduzido do BANKID do OFX quando reconhecido) — apenas informativo',
        },
        account_number: {
          type: Sequelize.STRING(60),
          allowNull: true,
          comment: 'ACCTID do OFX — apenas informativo',
        },
        period_start: {
          type: Sequelize.DATEONLY,
          allowNull: true,
          comment: 'DTSTART do OFX',
        },
        period_end: {
          type: Sequelize.DATEONLY,
          allowNull: true,
          comment: 'DTEND do OFX',
        },
        imported_by: {
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

      await queryInterface.addIndex('bank_statements', ['imported_by'], { name: 'idx_bank_statements_imported_by' });
    }

    if (!tables.includes('bank_statement_entries')) {
      await queryInterface.createTable('bank_statement_entries', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        statement_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'bank_statements', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        entry_date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
          comment: 'DTPOSTED do <STMTTRN>',
        },
        amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          comment: 'TRNAMT com sinal (negativo = saída/debito, positivo = entrada/credito)',
        },
        description: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'MEMO/NAME do <STMTTRN>',
        },
        fitid: {
          type: Sequelize.STRING(100),
          allowNull: false,
          comment: 'FITID do <STMTTRN> (ou id sintético determinístico quando ausente no arquivo) — usado para dedup na reimportação',
        },
        status: {
          type: Sequelize.ENUM('pending', 'matched', 'ignored'),
          allowNull: false,
          defaultValue: 'pending',
        },
        matched_payable_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'accounts_payable', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        matched_receivable_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'accounts_receivable', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        matched_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        matched_at: {
          type: Sequelize.DATE,
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

      await queryInterface.addIndex('bank_statement_entries', ['statement_id', 'fitid'], {
        name: 'uq_bank_statement_entries_statement_fitid',
        unique: true,
      });
      await queryInterface.addIndex('bank_statement_entries', ['fitid'], { name: 'idx_bank_statement_entries_fitid' });
      await queryInterface.addIndex('bank_statement_entries', ['status'], { name: 'idx_bank_statement_entries_status' });
      await queryInterface.addIndex('bank_statement_entries', ['matched_payable_id'], { name: 'idx_bank_statement_entries_matched_payable' });
      await queryInterface.addIndex('bank_statement_entries', ['matched_receivable_id'], { name: 'idx_bank_statement_entries_matched_receivable' });

      await queryInterface.sequelize.query(`
        ALTER TABLE bank_statement_entries
        ADD CONSTRAINT chk_bank_statement_entries_single_match
        CHECK (matched_payable_id IS NULL OR matched_receivable_id IS NULL);
      `);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('bank_statement_entries');
    await queryInterface.dropTable('bank_statements');
  },
};
