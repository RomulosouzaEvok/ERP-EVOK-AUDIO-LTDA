'use strict';

/**
 * Correcao de bomba de schema (achada ao implementar o roadmap pos-Go-Live
 * item 3, "MRP fecha o ciclo -> Ordem de Producao", ver
 * docs/LEVANTAMENTO_ERP_2026-08-02.md, secao 3): a baseline migration
 * (20260731-000001-baseline-schema.cjs) cria `production_orders` a partir
 * do model Sequelize via `attribute.allowNull` — e varios campos legitimamente
 * opcionais no model (`start_date`, `completion_date`, `sales_order_id`,
 * `responsible_id`, `notes`, `created_by`, `item_id`) foram declarados sem
 * `allowNull: true` explicito. O Sequelize assume `allowNull: false` por
 * omissao, entao a tabela FISICA acabou com `NOT NULL` sem default nessas
 * colunas — apesar do model TypeScript, das entidades de dominio
 * (`ProductionOrderEntity.toCreatePersistence`) e das FKs (todas
 * `ON DELETE SET NULL`) tratarem essas colunas como nullable.
 *
 * Efeito pratico: TODA criacao de Ordem de Producao (rota normal
 * `POST /api/production-orders` via `CreateProductionOrderUseCase`, e a
 * nova conversao MRP -> OP via `ConvertPlannedOrdersToProductionOrderUseCase`)
 * falhava com `null value in column "start_date" ... violates not-null
 * constraint` sempre que o payload nao populava manualmente cada um desses
 * campos (o caso comum: uma OP nasce planejada, sem `start_date`,
 * `completion_date`, `sales_order_id`, `responsible_id`, `created_by`
 * amarrado ao usuario logado apenas quando aplicavel).
 *
 * Este DOWN preserva o comportamento (incorreto) anterior apenas por
 * simetria formal de migration; reaplicar NOT NULL em producao com dados
 * existentes provavelmente falharia se ja houver OPs criadas com essas
 * colunas nulas — nao ha necessidade real de reverter esta correcao.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const nullableColumns = [
      'start_date',
      'completion_date',
      'sales_order_id',
      'responsible_id',
      'notes',
      'created_by',
      'item_id',
    ];

    for (const column of nullableColumns) {
      await queryInterface.sequelize.query(
        `ALTER TABLE production_orders ALTER COLUMN ${column} DROP NOT NULL;`,
      );
    }
  },

  async down(queryInterface) {
    const columns = [
      'start_date',
      'completion_date',
      'sales_order_id',
      'responsible_id',
      'notes',
      'created_by',
      'item_id',
    ];

    for (const column of columns) {
      await queryInterface.sequelize.query(
        `ALTER TABLE production_orders ALTER COLUMN ${column} SET NOT NULL;`,
      );
    }
  },
};
