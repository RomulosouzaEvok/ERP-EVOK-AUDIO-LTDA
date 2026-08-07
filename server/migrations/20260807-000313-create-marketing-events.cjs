'use strict';

/**
 * BLOCO 5 MKT (correção) — RF-MKT-020 a 025 (BR-MKT-009), Processo P3 do
 * brief, ausente por completo na primeira entrega
 * (`BLOCO_5_MKT_VERIFICACAO.md` §2.2).
 *
 * `marketing_events`: entidade própria de evento/feira, criável
 * independentemente de campanha (`campaign_id` FK opcional — RF-MKT-020,
 * UC-65 pré-condição "nenhuma").
 *
 * `marketing_event_checklist_items`: itens de checklist livres, tabela
 * filha em vez de JSONB — decisão de modelagem: o checklist precisa de
 * `responsible_user_id` (FK real a `users.id`, RF-MKT-021) e `status`
 * consultável/filtrável por item; o precedente mais próximo do projeto
 * para "sub-registro com responsável e status próprios" é
 * `facility_cleaning_executions` (tabela filha de
 * `facility_cleaning_schedules`, migration `20260807-000297`), não os
 * poucos usos de JSONB do projeto (que guardam payload não estruturado
 * sem FK, ex. `acoustic_tests`, `it_access_requests`). Tabela filha também
 * é a única forma de ter uma FK com integridade referencial real para
 * `responsible_user_id` — JSONB não suporta isso no Postgres.
 *
 * `marketing_leads.event_id` (FK opcional → `marketing_events.id`):
 * habilita ROI/custo por lead de evento (RF-MKT-024/027) sem exigir que
 * todo lead venha de um evento.
 *
 * Contagem de "leads captados" do evento (RF-MKT-023) é **sempre
 * derivada** de `COUNT(marketing_leads WHERE event_id = :id)` — não existe
 * (e não deve existir) coluna `leads_count` armazenada em
 * `marketing_events`, mesmo princípio de BR-MKT-004 aplicado ao evento.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    // ---- marketing_events ----
    if (!tables.includes('marketing_events')) {
      await queryInterface.createTable('marketing_events', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING(200), allowNull: false },
        location: { type: Sequelize.STRING(255), allowNull: true },
        event_type: {
          type: Sequelize.ENUM('feira', 'lancamento', 'workshop', 'regional'),
          allowNull: false,
        },
        campaign_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'marketing_campaigns', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        start_date: { type: Sequelize.DATEONLY, allowNull: false },
        end_date: { type: Sequelize.DATEONLY, allowNull: true },
        budget: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
        actual_cost: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
        status: {
          type: Sequelize.ENUM('planned', 'in_progress', 'completed', 'canceled'),
          allowNull: false,
          defaultValue: 'planned',
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });

      await queryInterface.addIndex('marketing_events', ['campaign_id'], { name: 'idx_marketing_events_campaign_id' });
      await queryInterface.addIndex('marketing_events', ['status'], { name: 'idx_marketing_events_status' });

      await queryInterface.sequelize.query(`
        ALTER TABLE marketing_events
        ADD CONSTRAINT ck_marketing_events_end_after_start
        CHECK (end_date IS NULL OR end_date >= start_date);
      `);

      // RF-MKT-025: fechamento do evento exige actual_cost preenchido.
      await queryInterface.sequelize.query(`
        ALTER TABLE marketing_events
        ADD CONSTRAINT ck_marketing_events_completed_requires_actual_cost
        CHECK (status <> 'completed' OR actual_cost IS NOT NULL);
      `);
    }

    // ---- marketing_event_checklist_items ----
    if (!tables.includes('marketing_event_checklist_items')) {
      await queryInterface.createTable('marketing_event_checklist_items', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        event_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'marketing_events', key: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        description: { type: Sequelize.STRING(255), allowNull: false },
        status: {
          type: Sequelize.ENUM('pending', 'done'),
          allowNull: false,
          defaultValue: 'pending',
        },
        responsible_user_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });

      await queryInterface.addIndex('marketing_event_checklist_items', ['event_id'], {
        name: 'idx_marketing_event_checklist_items_event_id',
      });
      await queryInterface.addIndex('marketing_event_checklist_items', ['responsible_user_id'], {
        name: 'idx_marketing_event_checklist_items_responsible_user_id',
      });
    }

    // ---- marketing_leads.event_id ----
    const leadColumns = await queryInterface.describeTable('marketing_leads');
    if (!leadColumns.event_id) {
      await queryInterface.addColumn('marketing_leads', 'event_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'marketing_events', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN marketing_leads.event_id IS 'RF-MKT-020/022 — evento/feira de origem do lead, opcional; quando preenchido, lead_source deve ser event (CHECK ck_marketing_leads_event_requires_event_source)';`
      );

      await queryInterface.addIndex('marketing_leads', ['event_id'], { name: 'idx_marketing_leads_event_id' });

      // RF-MKT-022: lead com event_id preenchido nasce automaticamente
      // com lead_source='event' — validação cruzada no banco (a
      // atribuição automática do valor 'event' em si é responsabilidade
      // da aplicação, o CHECK só impede a inconsistência).
      await queryInterface.sequelize.query(`
        ALTER TABLE marketing_leads
        ADD CONSTRAINT ck_marketing_leads_event_requires_event_source
        CHECK (event_id IS NULL OR lead_source = 'event');
      `);
    }
  },

  async down(queryInterface) {
    const leadColumns = await queryInterface.describeTable('marketing_leads');
    if (leadColumns.event_id) {
      await queryInterface.sequelize.query(`
        ALTER TABLE marketing_leads
        DROP CONSTRAINT IF EXISTS ck_marketing_leads_event_requires_event_source;
      `);
      await queryInterface.removeIndex('marketing_leads', 'idx_marketing_leads_event_id');
      await queryInterface.removeColumn('marketing_leads', 'event_id');
    }

    await queryInterface.dropTable('marketing_event_checklist_items');
    await queryInterface.dropTable('marketing_events');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_marketing_event_checklist_items_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_marketing_events_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_marketing_events_event_type";');
  },
};
