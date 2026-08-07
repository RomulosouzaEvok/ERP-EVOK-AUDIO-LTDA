'use strict';

/**
 * BLOCO 4 FAC (correção) — RF-FAC-036 a 043, decisões D-1/D-2.
 *
 * Estende `maintenance_orders` (reutilizada, não uma tabela paralela de
 * chamado predial — decisão D-1 explícita) com:
 *
 * - `next_maintenance_km` (nullable): preventiva veicular por km, dispara
 *   pelo que vencer primeiro entre isso e `next_maintenance_date`/
 *   `frequency_days` (já existentes) — RF-FAC-036/038.
 * - `facility_specialty` (ENUM nullable): especialidade do chamado predial
 *   (`electrical`/`plumbing`/`civil`/`hvac`/`roofing`/`gardening`/`other`)
 *   — RF-FAC-039.
 * - `facility_area_id` (FK nullable → `facility_areas.id`): local do
 *   chamado predial quando não há ativo físico associado (ex.: infiltração
 *   em parede) — RF-FAC-039.
 *
 * `asset_id` passa de `NOT NULL` para nullable: chamado predial pode não
 * ter ativo (usa só `facility_area_id`). Para não abrir a porta para uma
 * ordem sem NENHUM dos dois vínculos (nem máquina nem área), adiciona-se o
 * CHECK `ck_maintenance_orders_asset_or_area_present` — toda ordem precisa
 * apontar para pelo menos um ativo ou uma área física. Isso NÃO quebra o
 * uso atual de MANUT (chamado de máquina sempre informa `asset_id`).
 *
 * RBAC de chamado predial vs. manutenção de máquina (§6.2 do documento de
 * requisitos) é decisão do `ArquitetoSoftwareAPI` — fora do escopo desta
 * migration, que só garante o dado.
 *
 * Idempotente — todas as alterações são condicionais a `describeTable`.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('maintenance_orders');

    if (!columns.next_maintenance_km) {
      await queryInterface.addColumn('maintenance_orders', 'next_maintenance_km', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!columns.facility_specialty) {
      await queryInterface.addColumn('maintenance_orders', 'facility_specialty', {
        type: Sequelize.ENUM('electrical', 'plumbing', 'civil', 'hvac', 'roofing', 'gardening', 'other'),
        allowNull: true,
      });
    }

    if (!columns.facility_area_id) {
      await queryInterface.addColumn('maintenance_orders', 'facility_area_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'facility_areas', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      });
    }

    if (columns.asset_id && columns.asset_id.allowNull === false) {
      await queryInterface.sequelize.query(
        'ALTER TABLE maintenance_orders ALTER COLUMN asset_id DROP NOT NULL'
      );
    }

    const constraints = await queryInterface.sequelize.query(
      `SELECT conname FROM pg_constraint WHERE conname = 'ck_maintenance_orders_asset_or_area_present';`
    );
    if (!constraints[0].length) {
      await queryInterface.sequelize.query(`
        ALTER TABLE maintenance_orders ADD CONSTRAINT ck_maintenance_orders_asset_or_area_present
        CHECK (asset_id IS NOT NULL OR facility_area_id IS NOT NULL);
      `);
    }

    const indexes = await queryInterface.showIndex('maintenance_orders');
    if (!indexes.some((i) => i.name === 'idx_maintenance_orders_facility_area_id')) {
      await queryInterface.addIndex('maintenance_orders', ['facility_area_id'], { name: 'idx_maintenance_orders_facility_area_id' });
    }
    if (!indexes.some((i) => i.name === 'idx_maintenance_orders_facility_specialty')) {
      await queryInterface.addIndex('maintenance_orders', ['facility_specialty'], { name: 'idx_maintenance_orders_facility_specialty' });
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE maintenance_orders DROP CONSTRAINT IF EXISTS ck_maintenance_orders_asset_or_area_present;'
    );

    try {
      await queryInterface.removeIndex('maintenance_orders', 'idx_maintenance_orders_facility_specialty');
    } catch (error) {
      // índice pode já não existir
    }
    try {
      await queryInterface.removeIndex('maintenance_orders', 'idx_maintenance_orders_facility_area_id');
    } catch (error) {
      // índice pode já não existir
    }

    const columns = await queryInterface.describeTable('maintenance_orders');
    if (columns.facility_area_id) {
      await queryInterface.removeColumn('maintenance_orders', 'facility_area_id');
    }
    if (columns.facility_specialty) {
      await queryInterface.removeColumn('maintenance_orders', 'facility_specialty');
    }
    if (columns.next_maintenance_km) {
      await queryInterface.removeColumn('maintenance_orders', 'next_maintenance_km');
    }
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_maintenance_orders_facility_specialty";');

    // Nota: NÃO restauramos `asset_id SET NOT NULL` automaticamente no
    // down() — se chamados prediais sem asset_id já tiverem sido criados
    // enquanto a coluna era nullable, o ALTER falharia. Reverter esse ponto
    // específico é uma decisão manual pós-limpeza de dado, fora do escopo
    // de um rollback automático seguro.
  },
};
