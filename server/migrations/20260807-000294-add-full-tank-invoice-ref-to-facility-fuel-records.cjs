'use strict';

/**
 * BLOCO 4 FAC (correção) — RF-FAC-022 a 027, BR-FAC-009.
 *
 * Adiciona a `facility_fuel_records`:
 * - `full_tank` (BOOLEAN, default false): necessário para o cálculo de
 *   consumo km/l (RF-FAC-025/026) — só abastecimentos com tanque cheio
 *   entram no cálculo de consumo médio entre dois pontos.
 * - `invoice_ref` (nullable): referência da nota fiscal/cupom do
 *   abastecimento (RF-FAC-025).
 *
 * `km_at_refuel >= maior km conhecido` (RF-FAC-022), teto de litros contra
 * `facility_vehicle_details.tank_capacity_liters` (RF-FAC-024) e alerta de
 * anomalia de consumo ±30% (RF-FAC-026) são regra de aplicação — dependem
 * de outra tabela (`facility_vehicle_details`) e de histórico de linhas
 * anteriores, não expressáveis em CHECK de coluna única.
 *
 * `facility_fuel_records.vehicle_id` já foi migrado para `asset_id` na
 * migration `20260807-000290` (D-2) — esta migration só adiciona colunas.
 *
 * `trip_id` (nullable, FK → `facility_vehicle_trips.id`) foi adicionado
 * nesta reconciliação (`AuditorIntegrador`, 2026-08-07): o contrato de API
 * (`BLOCO_4_FAC_API.md` §4.4, `POST /api/facilities/fuel-records`) já
 * previa o campo `trip_id` no payload para vincular opcionalmente um
 * abastecimento ao uso/diário de viagem em andamento, mas nenhuma migration
 * o criava — a API prometia um campo que o banco não sustentava (achado do
 * checklist deste agente, item 2). `SET NULL` no delete porque o vínculo é
 * informativo (abastecimento permanece válido mesmo que o uso associado
 * seja, no futuro, tratado de outra forma).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('facility_fuel_records');

    if (!columns.full_tank) {
      await queryInterface.addColumn('facility_fuel_records', 'full_tank', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    if (!columns.invoice_ref) {
      await queryInterface.addColumn('facility_fuel_records', 'invoice_ref', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }

    if (!columns.trip_id) {
      await queryInterface.addColumn('facility_fuel_records', 'trip_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'facility_vehicle_trips', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addIndex('facility_fuel_records', ['trip_id'], { name: 'idx_facility_fuel_records_trip_id' });
    }
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable('facility_fuel_records');
    if (columns.trip_id) {
      try {
        await queryInterface.removeIndex('facility_fuel_records', 'idx_facility_fuel_records_trip_id');
      } catch (error) {
        // índice pode já não existir
      }
      await queryInterface.removeColumn('facility_fuel_records', 'trip_id');
    }
    if (columns.invoice_ref) {
      await queryInterface.removeColumn('facility_fuel_records', 'invoice_ref');
    }
    if (columns.full_tank) {
      await queryInterface.removeColumn('facility_fuel_records', 'full_tank');
    }
  },
};
