'use strict';

/**
 * Faturamento parcial (gap 3/3 do módulo `sales`) — adiciona
 * `sale_items.invoiced_quantity` (quanto já foi faturado/emitido em NF-e
 * daquele item, cumulativo entre múltiplas emissões parciais).
 * `quantity - invoiced_quantity` = saldo pendente de faturamento do item.
 *
 * Idempotente (mesmo padrão de `20260806-000001-add-assigned-to-inventory-
 * counts.cjs`): bancos criados do zero a partir dos models Sequelize atuais
 * já nascem com a coluna.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('sale_items');
    if (!columns.invoiced_quantity) {
      await queryInterface.addColumn('sale_items', 'invoiced_quantity', {
        type: Sequelize.DECIMAL(18, 6),
        allowNull: false,
        defaultValue: 0,
        comment: 'Quantidade ja faturada (NF-e emitida) deste item, cumulativa entre emissoes parciais. quantity - invoiced_quantity = saldo pendente.',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('sale_items', 'invoiced_quantity');
  },
};
