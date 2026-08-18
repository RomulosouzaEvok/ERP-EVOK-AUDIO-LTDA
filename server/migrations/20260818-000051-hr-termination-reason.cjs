'use strict';

/**
 * CASE-012 / FIND-ERP-007 / APR-2026-057 P11-P13.
 *
 * O motivo da rescisao passa a integrar o processo de demissao como texto
 * livre obrigatorio, nos dois caminhos que criam `hr_termination_processes`.
 * Migration aditiva: o baseline congelado permanece intocado e bancos novos
 * executam esta migration depois do bootstrap versionado.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('hr_termination_processes', 'termination_reason', {
      type: Sequelize.TEXT,
      allowNull: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('hr_termination_processes', 'termination_reason');
  },
};
