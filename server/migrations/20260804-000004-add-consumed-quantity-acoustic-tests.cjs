'use strict';

/**
 * Bloco 4/UC-42-E (docs/governance/TODO.md; BUSINESS_RULES.md §12/§13):
 * adiciona `consumed_quantity` a `acoustic_test_results` para vincular o
 * consumo do Depósito de Laboratório em teste destrutivo diretamente ao
 * registro do teste (débito automático, não manual).
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('acoustic_test_results', 'consumed_quantity', {
      type: Sequelize.NUMERIC(12, 4),
      allowNull: true,
      comment: 'Quantidade consumida (destruída) do produto testado, debitada automaticamente do Depósito LABORATORIO na mesma transação do registro do teste (UC-42-E). Nulo/zero quando o teste não é destrutivo.',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('acoustic_test_results', 'consumed_quantity');
  },
};
