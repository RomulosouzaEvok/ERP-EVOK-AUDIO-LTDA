'use strict';

/**
 * Módulo Marketing (departamento 14, sigla MKT) — implementação do zero.
 *
 * Antes desta migration, o departamento Marketing existia apenas como linha
 * em `departments` (seed, `server/src/config/seeds.ts`), sem NENHUMA tabela
 * própria. O spec funcional em `docs/comercial/02-MARKETING.md` trazia 3
 * tabelas em sintaxe MySQL como se fossem reais (nunca foram migradas) —
 * esta migration as torna reais em PostgreSQL, com os seguintes ajustes
 * deliberados (mesmo padrão do módulo Facilities,
 * `20260807-000200-create-facilities-module.cjs`):
 *
 * - `marketing_campaigns`/`marketing_leads`/`marketing_materials` mantêm os
 *   mesmos nomes do spec original (já prefixados com `marketing_`).
 * - `AUTO_INCREMENT` → `SERIAL`/`autoIncrement: true` (PostgreSQL).
 * - `ENUM(...)` MySQL → `Sequelize.ENUM(...)` (tipo enumerado nativo do
 *   PostgreSQL, um `CREATE TYPE` por coluna enum).
 * - `updated_at` adicionado às 3 tabelas (o spec original só tinha
 *   `created_at`/`updated_at` em `marketing_campaigns`) para manter
 *   consistência com o padrão `created_at`/`updated_at` do restante do
 *   schema.
 * - `marketing_leads.campaign_id` e `marketing_materials.product_id` viram
 *   FKs reais (`marketing_campaigns.id`/`items.id`) — o spec original só
 *   tinha `INT` solto, sem `REFERENCES`. `marketing_materials.product_id` é
 *   `UUID` (não `INT`, diferença deliberada do spec original em MySQL):
 *   `items.id` é `UUID` no schema real (ver `server/src/models/Item.ts`),
 *   mesmo padrão já usado por `sst_tipo_epi.item_id`
 *   (`20260806-000130-create-sst-tipo-epi-matriz-epi.cjs`).
 * - `marketing_leads.converted_to_customer_id` vira FK real para
 *   `clients.id` (spec original só tinha `INT` solto) — é o vínculo formal
 *   entre um lead convertido e o cliente real do módulo `sales`/`clients`.
 *
 * Nenhuma das 3 tabelas tem soft delete (`CLAUDE.md` §7 reserva soft delete
 * apenas para `Category`) — `marketing_campaigns`/`marketing_leads` têm
 * ciclo de vida via `status` enum; `marketing_materials` não tem endpoint de
 * delete físico ou lógico nesta rodada (escopo: create/list/get/update).
 *
 * FKs:
 * - `marketing_leads.campaign_id` → `marketing_campaigns.id`,
 *   `ON DELETE SET NULL` (um lead pode não vir de nenhuma campanha
 *   específica — coluna já nullable no spec original).
 * - `marketing_leads.converted_to_customer_id` → `clients.id`,
 *   `ON DELETE SET NULL` (se o cliente for removido, o histórico do lead é
 *   preservado sem o vínculo).
 * - `marketing_materials.product_id` → `items.id`, `ON DELETE SET NULL`
 *   (material pode não ser de um produto específico, ex. material
 *   institucional/de marca).
 *
 * Migration idempotente (mesmo padrão de
 * `20260807-000200-create-facilities-module.cjs`): a migration baseline
 * (`20260731-000001-baseline-schema.cjs`) cria tabelas a partir de uma lista
 * fixa de models — as 3 tabelas deste módulo não estão nessa lista, então um
 * banco criado do zero após este commit ainda precisa desta migration para
 * nascer com o módulo Marketing pronto.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    // ---- marketing_campaigns ----
    if (!tables.includes('marketing_campaigns')) {
      await queryInterface.createTable('marketing_campaigns', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING(200), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        campaign_type: {
          type: Sequelize.ENUM('ads', 'social', 'email', 'event', 'trade', 'content'),
          allowNull: false,
        },
        start_date: { type: Sequelize.DATEONLY, allowNull: false },
        end_date: { type: Sequelize.DATEONLY, allowNull: true },
        budget: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
        actual_cost: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        target_audience: { type: Sequelize.STRING(255), allowNull: true },
        channel: { type: Sequelize.STRING(100), allowNull: true },
        leads_generated: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        conversions: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        roi: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
        status: {
          type: Sequelize.ENUM('planned', 'active', 'paused', 'completed', 'canceled'),
          allowNull: false,
          defaultValue: 'planned',
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }

    // ---- marketing_leads ----
    if (!tables.includes('marketing_leads')) {
      await queryInterface.createTable('marketing_leads', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        campaign_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'marketing_campaigns', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        name: { type: Sequelize.STRING(200), allowNull: false },
        email: { type: Sequelize.STRING(100), allowNull: true },
        phone: { type: Sequelize.STRING(20), allowNull: true },
        company: { type: Sequelize.STRING(200), allowNull: true },
        interest: { type: Sequelize.STRING(255), allowNull: true },
        lead_source: {
          type: Sequelize.ENUM('website', 'instagram', 'facebook', 'google', 'email', 'event', 'indication', 'other'),
          allowNull: true,
        },
        lead_score: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        status: {
          type: Sequelize.ENUM('new', 'contacted', 'qualified', 'converted', 'lost'),
          allowNull: false,
          defaultValue: 'new',
        },
        converted_to_customer_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'clients', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }

    // ---- marketing_materials ----
    if (!tables.includes('marketing_materials')) {
      await queryInterface.createTable('marketing_materials', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        title: { type: Sequelize.STRING(200), allowNull: false },
        material_type: {
          type: Sequelize.ENUM('catalog', 'flyer', 'banner', 'video', 'manual', 'technical_sheet', 'presentation'),
          allowNull: false,
        },
        product_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'items', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        file_path: { type: Sequelize.STRING(255), allowNull: true },
        version: { type: Sequelize.STRING(10), allowNull: false, defaultValue: '01' },
        approved: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
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

    await addIndexIfMissing('marketing_campaigns', ['status'], 'idx_marketing_campaigns_status');
    await addIndexIfMissing('marketing_campaigns', ['campaign_type'], 'idx_marketing_campaigns_campaign_type');
    await addIndexIfMissing('marketing_leads', ['campaign_id'], 'idx_marketing_leads_campaign_id');
    await addIndexIfMissing('marketing_leads', ['status'], 'idx_marketing_leads_status');
    await addIndexIfMissing('marketing_leads', ['converted_to_customer_id'], 'idx_marketing_leads_converted_to_customer_id');
    await addIndexIfMissing('marketing_materials', ['product_id'], 'idx_marketing_materials_product_id');
    await addIndexIfMissing('marketing_materials', ['material_type'], 'idx_marketing_materials_material_type');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('marketing_leads');
    await queryInterface.dropTable('marketing_materials');
    await queryInterface.dropTable('marketing_campaigns');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_marketing_campaigns_campaign_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_marketing_campaigns_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_marketing_leads_lead_source";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_marketing_leads_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_marketing_materials_material_type";');
  },
};
