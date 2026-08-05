'use strict';

/**
 * Bloco A do TODO de reorganizacao de departamentos
 * (docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md, secoes 3 e 4):
 *
 * - `license_expires_at` (DATE nullable): data de vencimento da licenca,
 *   usada apenas quando `asset_type = 'license'` (ver migration
 *   20260805-000002). Alerta de vencimento proximo fica para o Bloco F
 *   (frontend) — aqui e so o campo.
 * - `purchase_item_id` (INTEGER nullable, FK -> purchase_order_items.id,
 *   ON DELETE SET NULL): rastreia a origem de compra do ativo, para o
 *   fluxo de devolucao ao fornecedor (Bloco B) conseguir localizar o
 *   pedido/NF de origem de um Asset com defeito. Nullable porque
 *   cadastro manual de ativo sem origem de compra continua valido
 *   (ativo legado, doacao, transferencia entre unidades etc).
 *
 *   Nota de nomenclatura: o TODO menciona a tabela como `purchase_items`,
 *   mas a tabela fisica real (ver model `server/src/models/PurchaseItem.ts`)
 *   e `purchase_order_items` — segue-se o nome real da tabela.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Idempotente: a migration baseline (20260731-000001) cria tabelas
    // dinamicamente a partir dos models Sequelize *atuais* em dist/ — um
    // banco criado do zero hoje já nasce com assets.license_expires_at/
    // assets.purchase_item_id prontos. Mesma causa/fix de
    // 20260803-000004-create-work-centers.cjs,
    // 20260803-000008-create-access-profiles.cjs e
    // 20260804-000001-create-warehouses.cjs (2026-08-05).
    const assetsColumns = await queryInterface.describeTable('assets');

    if (!assetsColumns.license_expires_at) {
      await queryInterface.addColumn('assets', 'license_expires_at', {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Data de vencimento da licenca (usado quando asset_type = license)',
      });
    }

    if (!assetsColumns.purchase_item_id) {
      await queryInterface.addColumn('assets', 'purchase_item_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'purchase_order_items',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'FK -> purchase_order_items.id (origem de compra do ativo, quando aplicavel)',
      });
    }

    const assetsIndexes = await queryInterface.showIndex('assets');
    if (!assetsIndexes.some((i) => i.name === 'idx_assets_purchase_item_id')) {
      await queryInterface.addIndex('assets', ['purchase_item_id'], {
        name: 'idx_assets_purchase_item_id',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('assets', 'idx_assets_purchase_item_id');
    await queryInterface.removeColumn('assets', 'purchase_item_id');
    await queryInterface.removeColumn('assets', 'license_expires_at');
  },
};
