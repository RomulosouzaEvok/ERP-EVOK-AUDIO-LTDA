'use strict';

/**
 * Centro de custo automático na AP de compras — pendência "centro de custo
 * automático na AP de compras" de `docs/governance/TODO.md`.
 *
 * Adiciona `cost_center_id` (nullable, FK `ON DELETE SET NULL`) em
 * `departments`: de-para simples departamento → centro de custo, usado por
 * `ChangePurchaseStatusUseCase._createPurchasePayable` para preencher
 * automaticamente `AccountPayable.cost_center_id` quando a conta a pagar
 * nasce a partir de um pedido de compra rastreável até um departamento
 * (requisição → pedido). Sem backfill: departamentos existentes nascem com
 * `cost_center_id = NULL` (comportamento igual ao atual — AP nasce sem
 * centro de custo, sem erro) — não há mapeamento automático seguro sem
 * decisão de negócio explícita de qual centro de custo corresponde a cada
 * departamento.
 *
 * DECISÃO (coluna simples vs. tabela de-para separada): coluna em
 * `departments` é a opção mais simples para um mapeamento 1 campo por
 * departamento (não há necessidade de histórico de mudança de mapeamento
 * nem de N:N) — ver `server/src/models/Department.ts`.
 *
 * Migration idempotente — mesmo padrão de
 * `20260806-000020-create-cost-centers.cjs` (adiciona coluna/índice só se
 * ainda não existir).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('departments');
    if (!columns.cost_center_id) {
      await queryInterface.addColumn('departments', 'cost_center_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'cost_centers', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    }

    const indexes = await queryInterface.showIndex('departments');
    const indexName = 'idx_departments_cost_center_id';
    if (!indexes.some((index) => index.name === indexName)) {
      await queryInterface.addIndex('departments', ['cost_center_id'], { name: indexName });
    }
  },

  async down(queryInterface) {
    const indexName = 'idx_departments_cost_center_id';
    try {
      await queryInterface.removeIndex('departments', indexName);
    } catch (error) {
      // Índice pode já não existir (rollback parcial) — segue para a coluna.
    }
    await queryInterface.removeColumn('departments', 'cost_center_id');
  },
};
