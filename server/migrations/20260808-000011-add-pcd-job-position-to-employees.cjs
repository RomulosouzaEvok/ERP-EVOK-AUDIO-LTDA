'use strict';

/**
 * BLOCO 6 RH — RF-RH-067 (campo `pcd`, indicador de quota legal PCD) e
 * RF-RH-025 (`job_position_id` opcional, migracao incremental sem quebrar
 * `employees.position` texto livre existente).
 *
 * Nota: NAO usar a propriedade `comment` em addColumn (Sequelize/postgres
 * corrompe o ALTER TABLE quando o texto do comentario tem parenteses) —
 * mesmo padrao ja documentado em `20260807-000268`. Comentarios aplicados
 * via COMMENT ON COLUMN explicito abaixo.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('employees');

    if (!columns.pcd) {
      await queryInterface.addColumn('employees', 'pcd', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      });
    }

    if (!columns.job_position_id) {
      await queryInterface.addColumn('employees', 'job_position_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'hr_job_positions', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      });
    }

    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN employees.pcd IS 'RF-RH-067 - indicador PCD para calculo de quota legal (BR-RH-018) - dado sensivel, segregacao rh/BR-RH-020';`
    );
    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN employees.job_position_id IS 'RF-RH-025 - FK opcional para hr_job_positions.id - Employee.position (texto livre) permanece valido para registros nao migrados';`
    );

    const indexes = await queryInterface.showIndex('employees');
    if (!indexes.some((index) => index.name === 'idx_employees_job_position_id')) {
      await queryInterface.addIndex('employees', ['job_position_id'], { name: 'idx_employees_job_position_id' });
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeIndex('employees', 'idx_employees_job_position_id');
    } catch (error) {
      // indice pode ja nao existir
    }
    await queryInterface.removeColumn('employees', 'job_position_id');
    await queryInterface.removeColumn('employees', 'pcd');
  },
};
