'use strict';

/**
 * Módulo Contabilidade (subárea CONT do departamento Financeiro, sem linha
 * própria em `departments`) — implementação do zero.
 *
 * Antes desta migration, o módulo existia apenas como spec funcional em
 * `docs/financeiro/02-CONTABILIDADE.md`, que trazia 4 tabelas em sintaxe
 * MySQL como se fossem reais (`accounting_entries`, `accounting_entry_items`,
 * `chart_of_accounts`, `trial_balance`) — nunca foram migradas. Esta
 * migration as torna reais em PostgreSQL, com os seguintes ajustes
 * deliberados (mesmo padrão dos módulos Facilities/Marketing/Jurídico,
 * `20260807-000200`/`20260807-000210`/`20260807-000220`):
 *
 * - `chart_of_accounts` → renomeada para `accounting_chart_of_accounts`
 *   (prefixo `accounting_` em todo o módulo, mesmo padrão de prefixo por
 *   domínio adotado pelos módulos mais recentes — `sst_*`, `it_*`,
 *   `facility_*`, `marketing_*`, `legal_*`).
 * - `accounting_entry_items.account_code VARCHAR(20)` → `account_id INTEGER`
 *   (FK real para `accounting_chart_of_accounts.id`, `ON DELETE RESTRICT` —
 *   não pode apagar conta com lançamento; o spec original usava o código
 *   como string solta, sem integridade referencial).
 * - `trial_balance` NÃO foi criada como tabela: é dado 100% derivado,
 *   calculado on-the-fly a partir de `accounting_entry_items` agregados por
 *   conta/mês (`GET /api/accounting/trial-balance?year=&month=`), seguindo a
 *   instrução explícita da tarefa — evita a tabela ficar dessincronizada do
 *   razão real.
 * - `AUTO_INCREMENT` → `SERIAL`/`autoIncrement: true` (PostgreSQL).
 * - `ENUM(...)` MySQL → `Sequelize.ENUM(...)` (tipo enumerado nativo do
 *   PostgreSQL, um `CREATE TYPE` por coluna enum).
 * - `updated_at` adicionado às 3 tabelas para manter consistência com o
 *   padrão `created_at`/`updated_at` do restante do schema (o spec original
 *   não tinha em nenhuma das 2 tabelas documentadas).
 * - `accounting_entries.created_by`/`approved_by` viram FK reais para
 *   `users.id` (`ON DELETE RESTRICT` — não pode apagar um usuário autor de
 *   lançamento contábil; o spec original era `INT` solto sem FK).
 * - `accounting_entries.reversal_of_id` é uma coluna NOVA (não existia no
 *   spec original): self-FK nullable para `accounting_entries.id`,
 *   `ON DELETE SET NULL`, que aponta do lançamento de ESTORNO (criado por
 *   `PATCH /api/accounting/entries/:id/reverse`) para o lançamento ORIGINAL
 *   revertido — preserva o histórico sem apagar nada (ver regra de negócio
 *   no handoff), permitindo navegar "este lançamento estornou o de nº X"
 *   sem depender de parsing de texto na `description`.
 * - `accounting_chart_of_accounts.parent_id` é self-FK nullable
 *   (`ON DELETE RESTRICT` — não pode apagar uma conta sintética/pai com
 *   filhas), usada para a hierarquia do Plano de Contas (nível calculado a
 *   partir do número de segmentos do `code`, ex.: "1.1.1" → nível 3).
 *
 * Nenhuma das 3 tabelas tem soft delete (`CLAUDE.md` §7 reserva soft delete
 * apenas para `Category`): `accounting_chart_of_accounts` usa `active`
 * (boolean) para desativação lógica (nunca apagada fisicamente — pode ter
 * histórico de lançamento); `accounting_entries` tem ciclo de vida via
 * `status` enum (`draft -> posted -> reversed`, nunca apagado fisicamente —
 * é livro contábil, exige histórico imutável); `accounting_entry_items` só
 * é apagável via `ON DELETE CASCADE` do lançamento pai, e só enquanto o
 * lançamento estiver `draft` (regra aplicada na camada de aplicação, não no
 * banco — ver `UpdateEntryUseCase`).
 *
 * FKs:
 * - `accounting_chart_of_accounts.parent_id` → `accounting_chart_of_accounts.id`, RESTRICT.
 * - `accounting_entries.created_by`/`approved_by` → `users.id`, RESTRICT.
 * - `accounting_entries.reversal_of_id` → `accounting_entries.id`, SET NULL.
 * - `accounting_entry_items.entry_id` → `accounting_entries.id`, CASCADE
 *   (um item de lançamento não existe sem o lançamento; só é criado/apagado
 *   dentro da mesma transação do lançamento em rascunho).
 * - `accounting_entry_items.account_id` → `accounting_chart_of_accounts.id`, RESTRICT
 *   (não pode apagar conta com lançamento — auditoria fiscal).
 * - `accounting_entry_items.cost_center_id` → `cost_centers.id`, SET NULL
 *   (mesmo padrão de `accounts_payable.cost_center_id`/
 *   `accounts_receivable.cost_center_id`, `20260806-000020-create-cost-centers.cjs`).
 *
 * Migration idempotente (mesmo padrão de `20260807-000220-create-legal-module.cjs`):
 * a migration baseline (`20260731-000001-baseline-schema.cjs`) cria tabelas a
 * partir de uma lista fixa de models — as 3 tabelas deste módulo não estão
 * nessa lista, então um banco criado do zero após este commit ainda precisa
 * desta migration para nascer com o módulo Contabilidade pronto.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    // ---- accounting_chart_of_accounts ----
    if (!tables.includes('accounting_chart_of_accounts')) {
      await queryInterface.createTable('accounting_chart_of_accounts', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        code: { type: Sequelize.STRING(20), allowNull: false, unique: true },
        name: { type: Sequelize.STRING(200), allowNull: false },
        account_type: {
          type: Sequelize.ENUM('asset', 'liability', 'equity', 'revenue', 'expense', 'cost'),
          allowNull: false,
        },
        account_level: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        parent_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'accounting_chart_of_accounts', key: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        accept_entries: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }

    // ---- accounting_entries ----
    if (!tables.includes('accounting_entries')) {
      await queryInterface.createTable('accounting_entries', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        entry_number: { type: Sequelize.STRING(20), allowNull: false, unique: true },
        entry_date: { type: Sequelize.DATEONLY, allowNull: false },
        description: { type: Sequelize.STRING(255), allowNull: false },
        entry_type: {
          type: Sequelize.ENUM('receipt', 'payment', 'sales', 'purchase', 'payroll', 'depreciation', 'closing', 'adjustment'),
          allowNull: false,
        },
        status: {
          type: Sequelize.ENUM('draft', 'posted', 'reversed'),
          allowNull: false,
          defaultValue: 'draft',
        },
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        approved_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        approved_at: { type: Sequelize.DATE, allowNull: true },
        reversal_of_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'accounting_entries', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }

    // ---- accounting_entry_items ----
    if (!tables.includes('accounting_entry_items')) {
      await queryInterface.createTable('accounting_entry_items', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        entry_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'accounting_entries', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        account_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'accounting_chart_of_accounts', key: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        cost_center_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'cost_centers', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        debit: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        credit: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        historical: { type: Sequelize.TEXT, allowNull: true },
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

    await addIndexIfMissing('accounting_chart_of_accounts', ['code'], 'uq_accounting_chart_of_accounts_code', { unique: true });
    await addIndexIfMissing('accounting_chart_of_accounts', ['parent_id'], 'idx_accounting_chart_of_accounts_parent_id');
    await addIndexIfMissing('accounting_chart_of_accounts', ['account_type'], 'idx_accounting_chart_of_accounts_account_type');
    await addIndexIfMissing('accounting_chart_of_accounts', ['active'], 'idx_accounting_chart_of_accounts_active');

    await addIndexIfMissing('accounting_entries', ['entry_number'], 'uq_accounting_entries_entry_number', { unique: true });
    await addIndexIfMissing('accounting_entries', ['status'], 'idx_accounting_entries_status');
    await addIndexIfMissing('accounting_entries', ['entry_type'], 'idx_accounting_entries_entry_type');
    await addIndexIfMissing('accounting_entries', ['entry_date'], 'idx_accounting_entries_entry_date');
    await addIndexIfMissing('accounting_entries', ['reversal_of_id'], 'idx_accounting_entries_reversal_of_id');

    await addIndexIfMissing('accounting_entry_items', ['entry_id'], 'idx_accounting_entry_items_entry_id');
    await addIndexIfMissing('accounting_entry_items', ['account_id'], 'idx_accounting_entry_items_account_id');
    await addIndexIfMissing('accounting_entry_items', ['cost_center_id'], 'idx_accounting_entry_items_cost_center_id');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('accounting_entry_items');
    await queryInterface.dropTable('accounting_entries');
    await queryInterface.dropTable('accounting_chart_of_accounts');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_accounting_chart_of_accounts_account_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_accounting_entries_entry_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_accounting_entries_status";');
  },
};
