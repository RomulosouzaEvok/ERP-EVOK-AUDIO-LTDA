'use strict';

/**
 * Auditoria DBA pos-Bloco 4.3 (docs/governance/TODO.md; CLAUDE.md §
 * "Precisao Industrial"): corrige `acoustic_test_results.consumed_quantity`,
 * criada em `20260804-000004-add-consumed-quantity-acoustic-tests.cjs` como
 * `NUMERIC(12,4)`, para `NUMERIC(18,6)` — o padrao obrigatorio do projeto
 * para toda coluna de quantidade/peso/custo fracionado (mesma precisao de
 * `product_warehouse_stock.quantity`, `warehouse_transfers.quantity` e
 * `inventory_movements.quantity`).
 *
 * Seguro de aplicar: coluna criada nesta mesma sessao, sem dados
 * (`SELECT count(*) FROM acoustic_test_results WHERE consumed_quantity IS
 * NOT NULL` = 0 no momento da auditoria). `NUMERIC(12,4)` -> `NUMERIC(18,6)`
 * e uma ampliacao de precisao/escala (sem risco de truncamento/overflow),
 * portanto nao precisa de USING/cast explicito.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('acoustic_test_results', 'consumed_quantity', {
      type: Sequelize.NUMERIC(18, 6),
      allowNull: true,
      comment: 'Quantidade consumida (destruída) do produto testado, debitada automaticamente do Depósito LABORATORIO na mesma transação do registro do teste (UC-42-E). Nulo/zero quando o teste não é destrutivo.',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('acoustic_test_results', 'consumed_quantity', {
      type: Sequelize.NUMERIC(12, 4),
      allowNull: true,
      comment: 'Quantidade consumida (destruída) do produto testado, debitada automaticamente do Depósito LABORATORIO na mesma transação do registro do teste (UC-42-E). Nulo/zero quando o teste não é destrutivo.',
    });
  },
};
