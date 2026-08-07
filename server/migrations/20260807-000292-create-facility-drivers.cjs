'use strict';

/**
 * BLOCO 4 FAC (correção) — RF-FAC-011 a 015, BR-FAC-001/002/017.
 *
 * `facility_drivers`: condutor autorizado a dirigir veículo da empresa.
 * `employee_id` obrigatório (condutor terceirizado fora de escopo P0,
 * `[VERIFICAR COM GESTOR DE FACILITIES]` — RF-FAC-011); `UNIQUE` porque um
 * funcionário tem no máximo um cadastro de condutor.
 *
 * `authorized` é reversível (RF-FAC-015 — suspensão não apaga histórico de
 * uso associado, `facility_vehicle_trips.driver_id` permanece intacto).
 *
 * Sem exclusão física (RF-FAC-059) — não há endpoint de delete previsto;
 * suspensão usa `authorized=false`.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('facility_drivers')) return;

    await queryInterface.createTable('facility_drivers', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      cnh_number: { type: Sequelize.STRING(20), allowNull: false },
      cnh_category: { type: Sequelize.STRING(5), allowNull: false },
      cnh_valid_until: { type: Sequelize.DATEONLY, allowNull: false },
      cnh_file_path: { type: Sequelize.STRING(500), allowNull: true },
      authorized: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      authorized_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      authorized_at: { type: Sequelize.DATE, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('facility_drivers', ['cnh_valid_until'], { name: 'idx_facility_drivers_cnh_valid_until' });
    await queryInterface.addIndex('facility_drivers', ['authorized'], { name: 'idx_facility_drivers_authorized' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('facility_drivers');
  },
};
