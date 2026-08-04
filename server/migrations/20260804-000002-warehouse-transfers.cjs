'use strict';

/**
 * Bloco 4 (docs/governance/TODO.md) — Multiplos Depositos (UC-42), backend.
 *
 * Continuacao de `20260804-000001-create-warehouses.cjs` (schema de saldo
 * por deposito): esta migration adiciona o tipo de movimentacao
 * `'transfer'` ao enum de `inventory_movements.type` e cria a tabela
 * `warehouse_transfers` (solicitacao de transferencia entre depositos,
 * com aprovacao de gestor, BUSINESS_RULES.md §12 itens 6 e 8).
 *
 * `type='transfer'` sempre gera DOIS registros de `InventoryMovement` (um
 * `out` na origem, um `in` no destino) vinculados por `reference_type =
 * 'transfer'` e `reference_id = warehouse_transfers.id` (nao foi criada
 * uma coluna `transfer_id` dedicada — o par `reference_type/reference_id`
 * ja existente em `inventory_movements` cumpre o mesmo papel sem
 * duplicar modelagem, ver `docs/DATABASE_DICTIONARY.md`).
 *
 * Precedentes de padrao seguidos:
 * - `ALTER TYPE ... ADD VALUE` fora de transacao:
 *   `20260803-000002-add-quarantine-lot-status.cjs`.
 * - Tabela com FKs + ENUM de status pending/approved/rejected + auditoria
 *   quem solicitou/quem aprovou: `20260803-000008-create-access-profiles.cjs`
 *   (padrao de constraints nomeadas) e o proprio `LotControl`/`PurchaseRequisition`
 *   (padrao approved_by nullable).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. ALTER TYPE ... ADD VALUE nao pode rodar dentro de uma transacao no
    // Postgres — mesma tecnica de 20260803-000002-add-quarantine-lot-status.cjs.
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_inventory_movements_type" ADD VALUE IF NOT EXISTS 'transfer';`
    );

    // 2. Tabela warehouse_transfers
    await queryInterface.createTable('warehouse_transfers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      from_warehouse_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'warehouses', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      to_warehouse_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'warehouses', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      quantity: {
        type: Sequelize.DECIMAL(18, 6),
        allowNull: false,
        comment: 'Quantidade solicitada para transferencia (CHECK > 0 no banco)',
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Motivo obrigatorio da transferencia (ex.: retrabalho, cessao a laboratorio)',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Usuario que solicitou a transferencia',
      },
      approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'Usuario (nivel gestor do modulo estoque) que aprovou ou rejeitou a transferencia',
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE warehouse_transfers
      ADD CONSTRAINT ck_warehouse_transfers_from_ne_to
      CHECK (from_warehouse_id <> to_warehouse_id);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE warehouse_transfers
      ADD CONSTRAINT ck_warehouse_transfers_quantity_positive
      CHECK (quantity > 0);
    `);

    await queryInterface.addIndex('warehouse_transfers', ['product_id'], {
      name: 'idx_warehouse_transfers_product_id',
    });
    await queryInterface.addIndex('warehouse_transfers', ['from_warehouse_id'], {
      name: 'idx_warehouse_transfers_from_warehouse_id',
    });
    await queryInterface.addIndex('warehouse_transfers', ['to_warehouse_id'], {
      name: 'idx_warehouse_transfers_to_warehouse_id',
    });
    await queryInterface.addIndex('warehouse_transfers', ['status'], {
      name: 'idx_warehouse_transfers_status',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('warehouse_transfers', 'idx_warehouse_transfers_status');
    await queryInterface.removeIndex('warehouse_transfers', 'idx_warehouse_transfers_to_warehouse_id');
    await queryInterface.removeIndex('warehouse_transfers', 'idx_warehouse_transfers_from_warehouse_id');
    await queryInterface.removeIndex('warehouse_transfers', 'idx_warehouse_transfers_product_id');
    await queryInterface.sequelize.query(`
      ALTER TABLE warehouse_transfers
      DROP CONSTRAINT IF EXISTS ck_warehouse_transfers_quantity_positive;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE warehouse_transfers
      DROP CONSTRAINT IF EXISTS ck_warehouse_transfers_from_ne_to;
    `);
    await queryInterface.dropTable('warehouse_transfers');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_warehouse_transfers_status";');

    // Remover um valor de ENUM no Postgres exige recriar o tipo inteiro
    // inteiro (mesma justificativa de 20260803-000002-add-quarantine-lot-status.cjs).
    // Rollback seguro e no-op: o valor extra 'transfer' permanece, inofensivo.
  },
};
