'use strict';

/**
 * Painel de TV (gestores) — agregação de demandas em aberto por
 * departamento. `purchase_requisitions.department_id` já existia; faltava
 * o mesmo campo em `production_orders` (OPs) e `inventory_counts`
 * (contagens de inventário cíclico) para que as 3 entidades pudessem ser
 * agrupadas por departamento de verdade, sem usar depósito/centro de
 * trabalho como proxy (decisão de produto confirmada com o usuário).
 *
 * Decisão de nullable + SEM backfill: ambas as colunas nascem NULLABLE e
 * TODAS as linhas existentes ficam `NULL` propositalmente. Diferente do
 * backfill de `warehouse_id` em `20260804-000006` (onde havia um destino
 * óbvio e seguro — depósito padrão `INSUMOS` para saldo legado), não existe
 * nenhuma forma confiável de inferir retroativamente a qual departamento
 * uma OP ou uma contagem já existente pertence: não há coluna, convenção de
 * nomenclatura nem relação transitiva (via produto, depósito, responsável
 * etc.) que garanta o departamento correto sem risco de atribuição errada.
 * Inventar uma regra de backfill aqui contaminaria a auditoria com dados
 * fabricados. Portanto: colunas NULLABLE, ON DELETE SET NULL, sem UPDATE de
 * backfill. O painel de TV (endpoint `GET /api/dashboard/department-demands`)
 * trata `department_id IS NULL` como grupo agregado explícito "Sem
 * departamento", que hoje cobre 100% do histórico de ambas as tabelas.
 *
 * Precedente de padrão seguido: `20260804-000006-add-warehouse-id-to-inventory-counts.cjs`
 * (coluna FK nullable + índice, guard idempotente via `describeTable`/
 * `showIndex` — necessário porque a migration baseline `20260731-000001`
 * cria as tabelas a partir dos models Sequelize *atuais*, então um banco
 * novo já nasce com as colunas prontas).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // production_orders.department_id
    const productionOrdersColumns = await queryInterface.describeTable('production_orders');
    if (!productionOrdersColumns.department_id) {
      await queryInterface.addColumn('production_orders', 'department_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'departments',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'FK -> departments.id. Departamento dono da OP para agregacao no painel de TV (nullable; historico legado fica NULL/"Sem departamento" por design, ver migration).',
      });
    }

    const productionOrdersIndexes = await queryInterface.showIndex('production_orders');
    if (!productionOrdersIndexes.some((i) => i.name === 'idx_production_orders_department_id')) {
      await queryInterface.addIndex('production_orders', ['department_id'], {
        name: 'idx_production_orders_department_id',
      });
    }

    // inventory_counts.department_id
    const inventoryCountsColumns = await queryInterface.describeTable('inventory_counts');
    if (!inventoryCountsColumns.department_id) {
      await queryInterface.addColumn('inventory_counts', 'department_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'departments',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'FK -> departments.id. Departamento dono da contagem para agregacao no painel de TV (nullable; historico legado fica NULL/"Sem departamento" por design, ver migration).',
      });
    }

    const inventoryCountsIndexes = await queryInterface.showIndex('inventory_counts');
    if (!inventoryCountsIndexes.some((i) => i.name === 'idx_inventory_counts_department_id')) {
      await queryInterface.addIndex('inventory_counts', ['department_id'], {
        name: 'idx_inventory_counts_department_id',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('inventory_counts', 'idx_inventory_counts_department_id');
    await queryInterface.removeColumn('inventory_counts', 'department_id');

    await queryInterface.removeIndex('production_orders', 'idx_production_orders_department_id');
    await queryInterface.removeColumn('production_orders', 'department_id');
  },
};
