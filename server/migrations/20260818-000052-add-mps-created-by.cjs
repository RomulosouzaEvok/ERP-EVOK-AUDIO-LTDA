'use strict';

/**
 * CASE-013 / RC-2: torna representavel o usuario que abriu o MPS.
 * Planos novos recebem a identidade exclusivamente do JWT. Nao existe
 * backfill confiavel; por isso a migration falha explicitamente se encontrar
 * plano legado, em vez de fabricar autoria.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('master_production_plans');
    if (!columns.created_by) {
      await queryInterface.addColumn('master_production_plans', 'created_by', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      });
    }

    const [rows] = await queryInterface.sequelize.query(
      'SELECT COUNT(*)::integer AS count FROM master_production_plans WHERE created_by IS NULL',
    );
    if (Number(rows[0]?.count ?? 0) > 0) {
      throw new Error('CASE-013: existem planos MPS sem autoria; backfill manual obrigatorio antes de aplicar NOT NULL.');
    }

    await queryInterface.changeColumn('master_production_plans', 'created_by', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });
    await queryInterface.addIndex('master_production_plans', ['created_by'], {
      name: 'idx_master_production_plans_created_by',
    });
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable('master_production_plans');
    if (columns.created_by) {
      await queryInterface.removeIndex('master_production_plans', 'idx_master_production_plans_created_by');
      await queryInterface.removeColumn('master_production_plans', 'created_by');
    }
  },
};
