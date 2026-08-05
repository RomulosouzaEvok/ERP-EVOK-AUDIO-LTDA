'use strict';

/**
 * Bloco A do TODO de reorganizacao de departamentos
 * (docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md, secao 3): ativo
 * (`Asset`) comprado com defeito precisa poder ser vinculado a uma NC,
 * assim como hoje ja acontece com `product_id`/`purchase_item_id`. Sem
 * este campo, `NonConformity` nao tem como apontar para `assets` —
 * `Asset` nao tem hoje como ser referenciado por uma nao-conformidade.
 *
 * `asset_id` (INTEGER nullable, FK -> assets.id, ON DELETE SET NULL): a
 * grande maioria das NCs continua sem ativo (produto/material), entao
 * fica nullable; ON DELETE SET NULL preserva o historico da NC mesmo se
 * o ativo for removido do cadastro.
 *
 * A logica de negocio que efetivamente usa este campo (disparar
 * atualizacao de `Asset.status` na devolucao ao fornecedor) fica para o
 * Bloco B (backend) — aqui e apenas o schema.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Idempotente: a migration baseline (20260731-000001) cria tabelas
    // dinamicamente a partir dos models Sequelize *atuais* em dist/ — um
    // banco criado do zero hoje já nasce com non_conformities.asset_id
    // pronto. Mesma causa/fix de 20260803-000004-create-work-centers.cjs,
    // 20260803-000008-create-access-profiles.cjs e
    // 20260804-000001-create-warehouses.cjs (2026-08-05).
    const nonConformitiesColumns = await queryInterface.describeTable('non_conformities');
    if (!nonConformitiesColumns.asset_id) {
      await queryInterface.addColumn('non_conformities', 'asset_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'assets',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'FK -> assets.id (quando a NC se refere a um ativo/patrimonio, nao a um produto)',
      });
    }

    const nonConformitiesIndexes = await queryInterface.showIndex('non_conformities');
    if (!nonConformitiesIndexes.some((i) => i.name === 'idx_non_conformities_asset_id')) {
      await queryInterface.addIndex('non_conformities', ['asset_id'], {
        name: 'idx_non_conformities_asset_id',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('non_conformities', 'idx_non_conformities_asset_id');
    await queryInterface.removeColumn('non_conformities', 'asset_id');
  },
};
