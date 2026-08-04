'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Custeio de producao (roadmap pos-Go-Live, item 7/9 LEVANTAMENTO_ERP):
    // taxa de custo por hora do centro de trabalho, usada para calcular
    // mao-de-obra = horas apontadas (production_order_tracking) x cost_per_hour
    // do work_center vinculado ao production_route_step executado.
    await queryInterface.addColumn('work_centers', 'cost_per_hour', {
      type: Sequelize.DECIMAL(18, 6),
      allowNull: false,
      defaultValue: 0,
      comment: 'Custo de mao-de-obra + operacao por hora produtiva deste centro de trabalho (BRL/h), usado no custeio real de producao',
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE work_centers
      ADD CONSTRAINT ck_work_centers_cost_per_hour_non_negative
      CHECK (cost_per_hour >= 0);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE work_centers
      DROP CONSTRAINT IF EXISTS ck_work_centers_cost_per_hour_non_negative;
    `);
    await queryInterface.removeColumn('work_centers', 'cost_per_hour');
  },
};
