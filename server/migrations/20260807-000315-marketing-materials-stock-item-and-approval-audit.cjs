'use strict';

/**
 * BLOCO 5 MKT (correção) — RF-MKT-038/039/040 (BR-MKT-010/011), P3.
 *
 * 1. `stock_item_id` (FK opcional → `items.id`, categoria "Material
 *    Promocional" — convenção de negócio, não imposta pelo schema): vínculo
 *    do material físico ao item cujo Almoxarifado já controla entrada/
 *    saída (RF-MKT-038). Nenhuma movimentação de estoque é criada pelo
 *    módulo MKT — a FK só referencia o item (BR-MKT-011 mantida: sem
 *    estoque paralelo). `UUID` (não `INTEGER`) porque `items.id` é UUID no
 *    schema real, mesmo padrão já usado por `product_id` nesta mesma
 *    tabela (migration original `20260807-000210`).
 *
 * 2. `approved_by`/`approved_at`: auditoria da aprovação dedicada
 *    (RF-MKT-039 — `PATCH /api/marketing/materials/:id/approve` grava
 *    `approved=true, approved_by, approved_at`). A própria coluna
 *    `approved` já existe desde a migration original; o comportamento de
 *    "nasce sempre `approved=false` no POST" e "nova versão reseta para
 *    `false`" (RF-MKT-039/040) é regra de validação/aplicação
 *    (`createMaterialSchema`, endpoint de nova versão), sem alteração de
 *    schema necessária além das duas colunas de auditoria abaixo.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('marketing_materials');

    if (!columns.stock_item_id) {
      await queryInterface.addColumn('marketing_materials', 'stock_item_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'items', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN marketing_materials.stock_item_id IS 'RF-MKT-038 — item de estoque (Almoxarifado) do material fisico, categoria Material Promocional; nenhuma movimentacao e criada pelo modulo MKT (BR-MKT-011)';`
      );

      await queryInterface.addIndex('marketing_materials', ['stock_item_id'], {
        name: 'idx_marketing_materials_stock_item_id',
      });
    }

    if (!columns.approved_by) {
      await queryInterface.addColumn('marketing_materials', 'approved_by', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    }

    if (!columns.approved_at) {
      await queryInterface.addColumn('marketing_materials', 'approved_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable('marketing_materials');
    if (columns.approved_at) {
      await queryInterface.removeColumn('marketing_materials', 'approved_at');
    }
    if (columns.approved_by) {
      await queryInterface.removeColumn('marketing_materials', 'approved_by');
    }
    if (columns.stock_item_id) {
      await queryInterface.removeIndex('marketing_materials', 'idx_marketing_materials_stock_item_id');
      await queryInterface.removeColumn('marketing_materials', 'stock_item_id');
    }
  },
};
