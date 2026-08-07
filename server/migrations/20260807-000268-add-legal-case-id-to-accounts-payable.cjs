'use strict';

/**
 * BLOCO 3 JUR — RF-JUR-018, §6.3 do documento de requisitos (decisao
 * explicita repassada ao AdmDBA).
 *
 * Adiciona a `accounts_payable`:
 * - `legal_case_id` (nullable, FK RESTRICT → `legal_cases.id`): vinculo
 *   direto da conta a pagar ao processo (honorarios, custas, pericias).
 *   RESTRICT porque `jur_legal_cases` nunca e excluido fisicamente (RF-JUR-019)
 *   — nao ha cenario legitimo de apagar um processo com AP vinculada.
 * - `legal_expense_type` (ENUM nullable): distingue DESPESA de DEPOSITO
 *   JUDICIAL/RECURSAL desde o dia 1 (RF-JUR-018 — "depósito judicial é
 *   registrado com tipo próprio, nunca confundido com despesa"). O
 *   tratamento contabil fino (ativo restrito vs. despesa no balanco) fica
 *   pendente de confirmacao com o contador (§6.5 item 6 do documento de
 *   requisitos, `[VERIFICAR COM ASSESSOR JURÍDICO DA EMPRESA]`) — esta
 *   coluna so garante que o dado minimo para essa distincao existe desde
 *   already, sem forcar decisao contabil que nao e desta migration.
 * - CHECK: `legal_expense_type` so pode ser preenchido quando
 *   `legal_case_id IS NOT NULL` (nao faz sentido em AP sem vinculo a
 *   processo).
 *
 * Idempotente (mesmo padrao de `20260806-000115-add-cost-center-id-to-departments.cjs`).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('accounts_payable');

    if (!columns.legal_case_id) {
      await queryInterface.addColumn('accounts_payable', 'legal_case_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'jur_legal_cases', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'FK → legal_cases.id (RF-JUR-018) — custos de contencioso (honorarios, custas, pericias, depositos)',
      });
    }

    if (!columns.legal_expense_type) {
      await queryInterface.addColumn('accounts_payable', 'legal_expense_type', {
        type: Sequelize.ENUM('expense', 'judicial_deposit'),
        allowNull: true,
        comment: 'Distingue despesa juridica normal de deposito judicial/recursal (RF-JUR-018) — so preenchido quando legal_case_id nao e nulo',
      });
    }

    const indexes = await queryInterface.showIndex('accounts_payable');
    const indexName = 'idx_accounts_payable_legal_case_id';
    if (!indexes.some((index) => index.name === indexName)) {
      await queryInterface.addIndex('accounts_payable', ['legal_case_id'], { name: indexName });
    }

    const constraints = await queryInterface.sequelize.query(
      `SELECT conname FROM pg_constraint WHERE conname = 'ck_jur_accounts_payable_legal_expense_type_requires_case';`
    );
    if (!constraints[0].length) {
      await queryInterface.sequelize.query(`
        ALTER TABLE accounts_payable ADD CONSTRAINT ck_jur_accounts_payable_legal_expense_type_requires_case
        CHECK (legal_expense_type IS NULL OR legal_case_id IS NOT NULL);
      `);
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE accounts_payable DROP CONSTRAINT IF EXISTS ck_jur_accounts_payable_legal_expense_type_requires_case;'
    );
    try {
      await queryInterface.removeIndex('accounts_payable', 'idx_accounts_payable_legal_case_id');
    } catch (error) {
      // Indice pode ja nao existir (rollback parcial) — segue para as colunas.
    }
    await queryInterface.removeColumn('accounts_payable', 'legal_expense_type');
    await queryInterface.removeColumn('accounts_payable', 'legal_case_id');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_accounts_payable_legal_expense_type";');
  },
};
