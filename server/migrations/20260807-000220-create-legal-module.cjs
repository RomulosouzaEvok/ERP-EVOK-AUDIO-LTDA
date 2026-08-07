'use strict';

/**
 * Módulo Jurídico (departamento 16, sigla JUR) — implementação do zero.
 *
 * Antes desta migration, o departamento Jurídico existia apenas como linha em
 * `departments` (seed, `server/src/config/seeds.ts`), sem NENHUMA tabela
 * própria. O spec funcional em `docs/juridico/01-CONTRATOS.md` e
 * `docs/juridico/02-PROPRIEDADE_INTELECTUAL.md` trazia 3 tabelas em sintaxe
 * MySQL como se fossem reais (nunca foram migradas) — esta migration as
 * torna reais em PostgreSQL, com os seguintes ajustes deliberados (mesmo
 * padrão dos módulos Facilities/Marketing, `20260807-000200`/`20260807-000210`):
 *
 * - `contract_addendums`/`contract_reminders`/`intellectual_property` →
 *   prefixados com `legal_` (`legal_contract_addendums`,
 *   `legal_contract_reminders`, `legal_intellectual_property`), seguindo o
 *   padrão de prefixo por domínio adotado pelos módulos mais recentes
 *   (`sst_*`, `it_*`/`ti_*`, `facility_*`, `marketing_*`).
 * - `legal_contracts` é NOVA — o spec original só documentava as tabelas de
 *   aditivo/lembrete/PI (que dependem de um `contract_id` que nunca existiu
 *   como tabela própria) e a lista narrativa de tipos de contrato em texto;
 *   esta migration cria o cadastro central de contrato que faltava,
 *   consolidando os dois documentos (Contratos + Propriedade Intelectual).
 * - `AUTO_INCREMENT` → `SERIAL`/`autoIncrement: true` (PostgreSQL).
 * - `ENUM(...)` MySQL → `Sequelize.ENUM(...)` (tipo enumerado nativo do
 *   PostgreSQL, um `CREATE TYPE` por coluna enum).
 * - `updated_at` adicionado a todas as tabelas (o spec original só tinha em
 *   `intellectual_property`) para manter consistência com o padrão
 *   `created_at`/`updated_at` do restante do schema.
 * - `party_a`/`party_b` de `legal_contracts` são texto livre (`VARCHAR`), NÃO
 *   FK de `suppliers`/`clients`: contratos jurídicos cobrem também
 *   trabalhista (funcionário, não necessariamente um `Employee` formalizado
 *   no momento da assinatura), distribuidor/representante autônomo e
 *   terceiros diversos que não têm cadastro formal em nenhuma outra tabela
 *   do sistema — mesma decisão de design de `facility_cleaning_schedules.area`
 *   (texto livre por cobrir casos informais que uma FK rígida não cobriria).
 *
 * Nenhuma das 4 tabelas tem soft delete (`CLAUDE.md` §7 reserva soft delete
 * apenas para `Category`) — `legal_contracts` tem ciclo de vida via `status`
 * enum; as demais são histórico/detalhe do contrato ou cadastro de PI, sem
 * endpoint de delete físico ou lógico nesta rodada (escopo: create/list/get/
 * update apenas, mesma decisão de design de Facilities/Marketing).
 *
 * FKs:
 * - `legal_contract_addendums.contract_id` → `legal_contracts.id`,
 *   `ON DELETE CASCADE` (um aditivo não existe sem o contrato — diferente de
 *   `facility_fuel_records.vehicle_id`/RESTRICT porque aqui não há histórico
 *   fiscal/financeiro externo dependendo do aditivo isoladamente, e não há
 *   endpoint de delete de contrato nesta rodada de qualquer forma).
 * - `legal_contract_reminders.contract_id` → `legal_contracts.id`,
 *   `ON DELETE CASCADE` (mesmo raciocínio do aditivo).
 *
 * Migration idempotente (mesmo padrão de
 * `20260807-000210-create-marketing-module.cjs`): a migration baseline
 * (`20260731-000001-baseline-schema.cjs`) cria tabelas a partir de uma lista
 * fixa de models — as 4 tabelas deste módulo não estão nessa lista, então um
 * banco criado do zero após este commit ainda precisa desta migration para
 * nascer com o módulo Jurídico pronto.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    // ---- legal_contracts ----
    if (!tables.includes('legal_contracts')) {
      await queryInterface.createTable('legal_contracts', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        contract_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        contract_type: {
          type: Sequelize.ENUM(
            'clt_indeterminado', 'clt_determinado', 'experiencia', 'estagio', 'aprendiz',
            'distribuicao', 'representacao_comercial', 'fornecimento', 'prestacao_servicos',
            'confidencialidade', 'licenciamento_marca', 'outro',
          ),
          allowNull: false,
        },
        title: { type: Sequelize.STRING(200), allowNull: false },
        party_a: { type: Sequelize.STRING(200), allowNull: false },
        party_b: { type: Sequelize.STRING(200), allowNull: false },
        subject: { type: Sequelize.TEXT, allowNull: true },
        value: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
        start_date: { type: Sequelize.DATEONLY, allowNull: false },
        end_date: { type: Sequelize.DATEONLY, allowNull: true },
        auto_renewal: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        notice_period_days: { type: Sequelize.INTEGER, allowNull: true },
        file_path: { type: Sequelize.STRING(255), allowNull: true },
        status: {
          type: Sequelize.ENUM('draft', 'signed', 'active', 'expired', 'terminated'),
          allowNull: false,
          defaultValue: 'draft',
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }

    // ---- legal_contract_addendums ----
    if (!tables.includes('legal_contract_addendums')) {
      await queryInterface.createTable('legal_contract_addendums', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        contract_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'legal_contracts', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        addendum_number: { type: Sequelize.INTEGER, allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        change_type: {
          type: Sequelize.ENUM('term', 'value', 'clause', 'party', 'other'),
          allowNull: false,
        },
        new_end_date: { type: Sequelize.DATEONLY, allowNull: true },
        new_value: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
        file_path: { type: Sequelize.STRING(255), allowNull: true },
        signed_date: { type: Sequelize.DATEONLY, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }

    // ---- legal_contract_reminders ----
    if (!tables.includes('legal_contract_reminders')) {
      await queryInterface.createTable('legal_contract_reminders', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        contract_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'legal_contracts', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        reminder_type: {
          type: Sequelize.ENUM('renewal', 'expiration', 'notice', 'payment'),
          allowNull: false,
        },
        reminder_date: { type: Sequelize.DATEONLY, allowNull: false },
        days_before: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 30 },
        notified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }

    // ---- legal_intellectual_property ----
    if (!tables.includes('legal_intellectual_property')) {
      await queryInterface.createTable('legal_intellectual_property', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        ip_type: {
          type: Sequelize.ENUM('trademark', 'patent', 'industrial_design', 'copyright', 'trade_secret'),
          allowNull: false,
        },
        title: { type: Sequelize.STRING(200), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        registration_number: { type: Sequelize.STRING(50), allowNull: true },
        filing_date: { type: Sequelize.DATEONLY, allowNull: true },
        grant_date: { type: Sequelize.DATEONLY, allowNull: true },
        expiration_date: { type: Sequelize.DATEONLY, allowNull: true },
        owner: { type: Sequelize.STRING(200), allowNull: false, defaultValue: 'EVOK ÁUDIO LTDA' },
        status: {
          type: Sequelize.ENUM('filed', 'examined', 'granted', 'expired', 'abandoned'),
          allowNull: false,
          defaultValue: 'filed',
        },
        jurisdiction: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'BR' },
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

    await addIndexIfMissing('legal_contracts', ['contract_number'], 'uq_legal_contracts_contract_number', { unique: true });
    await addIndexIfMissing('legal_contracts', ['status'], 'idx_legal_contracts_status');
    await addIndexIfMissing('legal_contracts', ['contract_type'], 'idx_legal_contracts_contract_type');
    await addIndexIfMissing('legal_contracts', ['end_date'], 'idx_legal_contracts_end_date');
    await addIndexIfMissing('legal_contract_addendums', ['contract_id'], 'idx_legal_contract_addendums_contract_id');
    await addIndexIfMissing('legal_contract_reminders', ['contract_id'], 'idx_legal_contract_reminders_contract_id');
    await addIndexIfMissing('legal_contract_reminders', ['reminder_date'], 'idx_legal_contract_reminders_reminder_date');
    await addIndexIfMissing('legal_intellectual_property', ['ip_type'], 'idx_legal_intellectual_property_ip_type');
    await addIndexIfMissing('legal_intellectual_property', ['status'], 'idx_legal_intellectual_property_status');
    await addIndexIfMissing('legal_intellectual_property', ['expiration_date'], 'idx_legal_intellectual_property_expiration_date');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('legal_contract_addendums');
    await queryInterface.dropTable('legal_contract_reminders');
    await queryInterface.dropTable('legal_intellectual_property');
    await queryInterface.dropTable('legal_contracts');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_legal_contracts_contract_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_legal_contracts_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_legal_contract_addendums_change_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_legal_contract_reminders_reminder_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_legal_intellectual_property_ip_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_legal_intellectual_property_status";');
  },
};
