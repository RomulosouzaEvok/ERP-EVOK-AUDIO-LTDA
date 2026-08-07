'use strict';

/**
 * BLOCO 4 FAC (correção) — RF-FAC-016 a 021, BR-FAC-005/006, RNF-FAC-01.
 *
 * `facility_vehicle_trips` (diário de uso): saída/retorno de veículo com
 * rastreabilidade de condutor e integridade de odômetro.
 *
 * O que o banco garante diretamente (RNF-FAC-01 — "verdade no banco"):
 * - `return_km >= departure_km` do mesmo uso (CHECK, RF-FAC-018).
 * - Apenas 1 uso `status='out'` por veículo por vez (índice único parcial,
 *   RF-FAC-019).
 * - Apenas 1 uso `status='out'` por condutor por vez (índice único parcial,
 *   RF-FAC-019).
 *
 * O que fica com a aplicação (não há CHECK cross-row em Postgres sem
 * trigger, evitado por princípio do projeto —
 * `06-ESTRUTURAS_PROGRAMAVEIS.md`):
 * - `departure_km >= maior return_km já registrado para o veículo`
 *   (RF-FAC-017) — precisa olhar o histórico de outras linhas.
 * - Bloqueio por CRLV vencido (RF-FAC-009), condutor não autorizado/CNH
 *   vencida/categoria incompatível (RF-FAC-012/013), veículo em manutenção
 *   (RF-FAC-004) — todos dependem de outras tabelas.
 * - Atualização de `facility_vehicle_details.current_km` no retorno
 *   (RF-FAC-020) — é a aplicação que escreve nas duas tabelas na mesma
 *   transação; o banco não impõe isso via trigger.
 *
 * `odometer_override_*`: suporte à divergência aprovada de odômetro
 * (RF-FAC-017, fluxo alternativo A1 do UC-58) — quando `departure_km` é
 * menor que o maior `return_km` conhecido, a aplicação só grava com
 * `odometer_override_reason` preenchido e aprovação do Supervisor
 * registrada aqui.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('facility_vehicle_trips')) return;

    await queryInterface.createTable('facility_vehicle_trips', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      asset_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'assets', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      driver_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'facility_drivers', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      requested_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      purpose: {
        type: Sequelize.ENUM('delivery', 'executive', 'errand', 'other'),
        allowNull: false,
      },
      destination: { type: Sequelize.STRING(200), allowNull: true },
      departure_at: { type: Sequelize.DATE, allowNull: true },
      departure_km: { type: Sequelize.INTEGER, allowNull: true },
      return_at: { type: Sequelize.DATE, allowNull: true },
      return_km: { type: Sequelize.INTEGER, allowNull: true },
      fuel_level_out: { type: Sequelize.SMALLINT, allowNull: true },
      fuel_level_in: { type: Sequelize.SMALLINT, allowNull: true },
      incidents: { type: Sequelize.TEXT, allowNull: true },
      odometer_override_reason: { type: Sequelize.TEXT, allowNull: true },
      odometer_override_approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      odometer_override_approved_at: { type: Sequelize.DATE, allowNull: true },
      status: {
        type: Sequelize.ENUM('scheduled', 'out', 'returned', 'canceled'),
        allowNull: false,
        defaultValue: 'scheduled',
      },
      cancel_reason: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE facility_vehicle_trips ADD CONSTRAINT ck_facility_vehicle_trips_km_non_negative
      CHECK (departure_km IS NULL OR departure_km >= 0) ;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE facility_vehicle_trips ADD CONSTRAINT ck_facility_vehicle_trips_return_km_non_negative
      CHECK (return_km IS NULL OR return_km >= 0);
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE facility_vehicle_trips ADD CONSTRAINT ck_facility_vehicle_trips_return_ge_departure
      CHECK (return_km IS NULL OR departure_km IS NULL OR return_km >= departure_km);
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE facility_vehicle_trips ADD CONSTRAINT ck_facility_vehicle_trips_fuel_level_out_range
      CHECK (fuel_level_out IS NULL OR (fuel_level_out >= 0 AND fuel_level_out <= 100));
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE facility_vehicle_trips ADD CONSTRAINT ck_facility_vehicle_trips_fuel_level_in_range
      CHECK (fuel_level_in IS NULL OR (fuel_level_in >= 0 AND fuel_level_in <= 100));
    `);

    // RF-FAC-019: um veículo só pode ter um uso 'out' por vez.
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX uq_facility_vehicle_trips_open_per_asset
      ON facility_vehicle_trips (asset_id)
      WHERE status = 'out';
    `);
    // RF-FAC-019: um condutor só pode ter um veículo em aberto por vez.
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX uq_facility_vehicle_trips_open_per_driver
      ON facility_vehicle_trips (driver_id)
      WHERE status = 'out';
    `);

    await queryInterface.addIndex('facility_vehicle_trips', ['asset_id'], { name: 'idx_facility_vehicle_trips_asset_id' });
    await queryInterface.addIndex('facility_vehicle_trips', ['driver_id'], { name: 'idx_facility_vehicle_trips_driver_id' });
    await queryInterface.addIndex('facility_vehicle_trips', ['status'], { name: 'idx_facility_vehicle_trips_status' });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS uq_facility_vehicle_trips_open_per_asset;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS uq_facility_vehicle_trips_open_per_driver;');
    await queryInterface.dropTable('facility_vehicle_trips');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_facility_vehicle_trips_purpose";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_facility_vehicle_trips_status";');
  },
};
