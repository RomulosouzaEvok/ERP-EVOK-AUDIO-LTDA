'use strict';

/**
 * Módulo Tesouraria (subárea TES do departamento Financeiro, sem linha
 * própria em `departments`) — implementação do zero.
 *
 * Antes desta migration, o módulo existia apenas como spec funcional em
 * `docs/financeiro/03-TESOURARIA.md`, que trazia 2 tabelas em sintaxe MySQL
 * como se fossem reais (`reconciliation_items`, `financial_operations`) —
 * nunca foram migradas. Esta migration NÃO recria `reconciliation_items`:
 * o projeto já tem conciliação bancária real e funcional em
 * `server/src/modules/financial/` (`bank_statements`/`bank_statement_entries`,
 * `server/src/modules/financial/presentation/routes/reconciliation.ts`) —
 * recriar essa tabela seria duplicação de domínio. Apenas
 * `financial_operations` (empréstimos, aplicações, financiamentos, leasing)
 * é implementada de fato, renomeada para `treasury_financial_operations`
 * (prefixo `treasury_` em todo o módulo, mesmo padrão de prefixo por domínio
 * dos módulos mais recentes — `sst_*`, `it_*`, `facility_*`, `marketing_*`,
 * `legal_*`, `accounting_*`).
 *
 * `treasury_bank_accounts` é uma tabela NOVA (não estava no spec original,
 * que só listava contas bancárias em uma tabela markdown estática de
 * exemplo) — decisão arquitetural registrada em
 * `docs/financeiro/03-TESOURARIA.md` §Decisões: `CompanyBankingConfig`
 * (`company_banking_config`) é uma tabela SINGLETON (1 linha, id=1) com os
 * dados bancários do cedente usados apenas na geração de remessa/boleto
 * CNAB — não é um cadastro de múltiplas contas correntes/aplicação da
 * empresa. Como a Tesouraria precisa gerenciar N contas bancárias (corrente,
 * poupança, aplicação) com saldo atual cada, `treasury_bank_accounts` é
 * criada separada de `company_banking_config`, sem nenhuma FK entre as duas
 * (são domínios de configuração distintos: "conta bancária operacional" vs.
 * "config de cedente para CNAB" — mesma razão de design já documentada no
 * cabeçalho do model `CompanyBankingConfig`).
 *
 * Ajustes deliberados em relação ao spec original de `financial_operations`
 * (mesmo padrão dos módulos Facilities/Marketing/Jurídico/Contabilidade):
 * - `AUTO_INCREMENT` → `SERIAL`/`autoIncrement: true` (PostgreSQL).
 * - `ENUM(...)` MySQL → `Sequelize.ENUM(...)` (tipo enumerado nativo do
 *   PostgreSQL, um `CREATE TYPE` por coluna enum).
 * - `contract_number` mantém UNIQUE (evita 2 operações apontando para o
 *   mesmo contrato).
 * - `settled_at` é uma coluna NOVA (não existia no spec original): registra
 *   a data em que a operação foi liquidada (`PATCH
 *   /api/treasury/financial-operations/:id/settle`), preservando o
 *   histórico de quando o encerramento ocorreu (o spec original só tinha o
 *   enum `status`, sem timestamp de transição).
 *
 * Nenhuma das 2 tabelas tem soft delete (`CLAUDE.md` §7 reserva soft delete
 * apenas para `Category`): `treasury_bank_accounts` usa `active` (boolean)
 * para desativação lógica; `treasury_financial_operations` tem ciclo de vida
 * via `status` enum (`active -> settled | canceled`, nunca apagado
 * fisicamente — é histórico de contrato financeiro, exige auditoria).
 *
 * Migration idempotente (mesmo padrão de
 * `20260807-000230-create-accounting-module.cjs`): a migration baseline
 * (`20260731-000001-baseline-schema.cjs`) cria tabelas a partir de uma lista
 * fixa de models — as 2 tabelas deste módulo não estão nessa lista, então um
 * banco criado do zero após este commit ainda precisa desta migration para
 * nascer com o módulo Tesouraria pronto.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    // ---- treasury_bank_accounts ----
    if (!tables.includes('treasury_bank_accounts')) {
      await queryInterface.createTable('treasury_bank_accounts', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        bank_name: { type: Sequelize.STRING(100), allowNull: false },
        agency: { type: Sequelize.STRING(20), allowNull: false },
        account_number: { type: Sequelize.STRING(20), allowNull: false },
        account_type: {
          type: Sequelize.ENUM('corrente', 'poupanca', 'aplicacao'),
          allowNull: false,
        },
        current_balance: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        manager_name: { type: Sequelize.STRING(100), allowNull: true },
        manager_phone: { type: Sequelize.STRING(20), allowNull: true },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }

    // ---- treasury_financial_operations ----
    if (!tables.includes('treasury_financial_operations')) {
      await queryInterface.createTable('treasury_financial_operations', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        operation_type: {
          type: Sequelize.ENUM('loan', 'investment', 'financing', 'leasing'),
          allowNull: false,
        },
        institution: { type: Sequelize.STRING(100), allowNull: false },
        contract_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
        interest_rate: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
        start_date: { type: Sequelize.DATEONLY, allowNull: false },
        end_date: { type: Sequelize.DATEONLY, allowNull: true },
        guarantee_type: {
          type: Sequelize.ENUM('aval', 'fianca', 'alienacao', 'recebiveis', 'none'),
          allowNull: false,
          defaultValue: 'none',
        },
        status: {
          type: Sequelize.ENUM('active', 'settled', 'canceled'),
          allowNull: false,
          defaultValue: 'active',
        },
        notes: { type: Sequelize.TEXT, allowNull: true },
        settled_at: { type: Sequelize.DATEONLY, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }

    // ---- índices ----
    const addIndexIfMissing = async (tableName, fields, name, options = {}) => {
      const indexes = await queryInterface.showIndex(tableName);
      if (!indexes.some((index) => index.name === name)) {
        await queryInterface.addIndex(tableName, fields, { name, ...options });
      }
    };

    await addIndexIfMissing('treasury_bank_accounts', ['agency', 'account_number'], 'uq_treasury_bank_accounts_agency_account', { unique: true });
    await addIndexIfMissing('treasury_bank_accounts', ['account_type'], 'idx_treasury_bank_accounts_account_type');
    await addIndexIfMissing('treasury_bank_accounts', ['active'], 'idx_treasury_bank_accounts_active');

    await addIndexIfMissing('treasury_financial_operations', ['contract_number'], 'uq_treasury_financial_operations_contract_number', { unique: true });
    await addIndexIfMissing('treasury_financial_operations', ['status'], 'idx_treasury_financial_operations_status');
    await addIndexIfMissing('treasury_financial_operations', ['operation_type'], 'idx_treasury_financial_operations_operation_type');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('treasury_financial_operations');
    await queryInterface.dropTable('treasury_bank_accounts');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_treasury_bank_accounts_account_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_treasury_financial_operations_operation_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_treasury_financial_operations_guarantee_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_treasury_financial_operations_status";');
  },
};
