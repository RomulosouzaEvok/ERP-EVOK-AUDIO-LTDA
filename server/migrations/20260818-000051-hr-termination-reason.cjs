'use strict';

/**
 * CASE-012 / FIND-ERP-007 / APR-2026-057 P11-P13.
 *
 * O motivo da rescisao passa a integrar o processo de demissao como texto
 * livre obrigatorio, nos dois caminhos que criam `hr_termination_processes`.
 * Migration aditiva: o baseline congelado permanece intocado e bancos novos
 * executam esta migration depois do bootstrap versionado.
 *
 * Correcao 03 (2026-08-18): a versao original adicionava a coluna ja como
 * NOT NULL, o que falha deterministicamente em qualquer banco que ja tenha
 * linhas em `hr_termination_processes` (ex.: `erp_evok_audio_test`,
 * compartilhado entre workspaces de remediacao). Sequencia segura:
 * 1) adicionar a coluna nullable; 2) backfill explicito das linhas
 * pre-existentes com um placeholder auditavel (nao um motivo real);
 * 3) so entao promover a coluna para NOT NULL via changeColumn.
 */
const PLACEHOLDER_REASON =
  'Motivo nao registrado (pre-existente a correcao CASE-012/FIND-ERP-007)';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('hr_termination_processes', 'termination_reason', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.sequelize.query(
      'UPDATE hr_termination_processes SET termination_reason = :placeholder WHERE termination_reason IS NULL',
      { replacements: { placeholder: PLACEHOLDER_REASON } },
    );

    await queryInterface.changeColumn('hr_termination_processes', 'termination_reason', {
      type: Sequelize.TEXT,
      allowNull: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('hr_termination_processes', 'termination_reason');
  },
};
