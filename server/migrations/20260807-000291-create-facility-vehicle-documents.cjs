'use strict';

/**
 * BLOCO 4 FAC (correção) — RF-FAC-007 a 010, BR-FAC-003/004.
 *
 * `facility_vehicle_documents`: generaliza vencimento de documento por
 * veículo (CRLV/licenciamento, seguro, IPVA, outro) — antes só
 * `facility_vehicles.insurance_expiry` existia (achado da verificação,
 * §3 "problema de regra de negócio" item 5).
 *
 * `asset_id` aponta direto para `assets.id` (não para
 * `facility_vehicle_details.id`) — mesmo padrão de FK direta a `assets`
 * usado em `facility_vehicle_details`/`it_software_license_details`; a
 * validação de que o asset é `asset_type='vehicle'` é responsabilidade do
 * use case (mesmo racional documentado em
 * `20260807-000153-create-it-software-license-details-seats.cjs`).
 *
 * `valid_until` é obrigatório para todo `doc_type`, exceto `outro`
 * (RF-FAC-007) — CHECK garante isso no banco, não só na aplicação.
 *
 * Alertas 60/30/7/vencido (RF-FAC-008) e bloqueio de saída por CRLV vencido
 * (RF-FAC-009) são regra de aplicação (não há trigger neste projeto por
 * princípio, `06-ESTRUTURAS_PROGRAMAVEIS.md`) — o schema só garante que o
 * dado mínimo (`valid_until`, `status`) exista e seja consultável por
 * índice.
 *
 * `released_by`/`released_at` (RF-FAC-010): liberação explícita do
 * Supervisor (nível `approve`) para saída com seguro vencido — campos
 * genéricos, reaproveitáveis por qualquer `doc_type` que futuramente
 * precise do mesmo fluxo de exceção.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('facility_vehicle_documents')) return;

    await queryInterface.createTable('facility_vehicle_documents', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      asset_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'assets', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      doc_type: {
        type: Sequelize.ENUM('crlv_licenciamento', 'seguro', 'ipva', 'outro'),
        allowNull: false,
      },
      reference: { type: Sequelize.STRING(100), allowNull: true },
      issuer: { type: Sequelize.STRING(150), allowNull: true },
      valid_until: { type: Sequelize.DATEONLY, allowNull: true },
      cost: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      file_path: { type: Sequelize.STRING(500), allowNull: true },
      status: {
        type: Sequelize.ENUM('vigente', 'vencido', 'renovado'),
        allowNull: false,
        defaultValue: 'vigente',
      },
      released_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      released_at: { type: Sequelize.DATE, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE facility_vehicle_documents ADD CONSTRAINT ck_facility_vehicle_documents_valid_until_required
      CHECK (doc_type = 'outro' OR valid_until IS NOT NULL);
    `);

    await queryInterface.addIndex('facility_vehicle_documents', ['asset_id'], { name: 'idx_facility_vehicle_documents_asset_id' });
    await queryInterface.addIndex('facility_vehicle_documents', ['doc_type'], { name: 'idx_facility_vehicle_documents_doc_type' });
    await queryInterface.addIndex('facility_vehicle_documents', ['valid_until'], { name: 'idx_facility_vehicle_documents_valid_until' });
    await queryInterface.addIndex('facility_vehicle_documents', ['status'], { name: 'idx_facility_vehicle_documents_status' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('facility_vehicle_documents');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_facility_vehicle_documents_doc_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_facility_vehicle_documents_status";');
  },
};
