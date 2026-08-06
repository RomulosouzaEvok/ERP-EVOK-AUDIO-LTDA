'use strict';

/**
 * Atribuição de contagem de inventário cíclico a funcionário específico
 * e/ou "pool" (docs/governance/TODO.md — evolução do submódulo
 * `InventoryCount`/`InventoryCountItem`, 2026-08-06).
 *
 * `inventory_counts.assigned_to` (nullable, FK -> users.id, ON DELETE SET
 * NULL): funcionário responsável pela contagem. `NULL` = disponível no
 * "pool" (qualquer funcionário autorizado pode "pegar" via
 * `POST /:id/start`, que faz o claim atômico — ver
 * `StartInventoryCountUseCase`). Diferente de `warehouse_id`
 * (migration `20260804-000006`), não há dado legado a fazer backfill:
 * toda contagem existente simplesmente nasce sem atribuição (pool),
 * comportamento equivalente ao pré-existente (qualquer operador com
 * `operate` podia iniciar qualquer contagem em `draft`).
 *
 * `ON DELETE SET NULL` (não `RESTRICT`): se o usuário atribuído for
 * removido/desativado, a contagem volta para o pool em vez de bloquear a
 * exclusão do usuário — mesmo raciocínio de soft-ownership já usado em
 * outras FKs opcionais de "responsável" no projeto.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Idempotente: mesmo padrão de 20260804-000006 (bancos criados do zero
    // a partir dos models Sequelize atuais em dist/ já nascem com a coluna).
    const countsColumns = await queryInterface.describeTable('inventory_counts');
    if (!countsColumns.assigned_to) {
      await queryInterface.addColumn('inventory_counts', 'assigned_to', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'FK -> users.id. Funcionário responsável pela contagem (NULL = pool, disponível para qualquer funcionário autorizado pegar via claim atômico em POST /:id/start).',
      });
    }

    const countsIndexes = await queryInterface.showIndex('inventory_counts');
    if (!countsIndexes.some((i) => i.name === 'idx_inventory_counts_assigned_to')) {
      await queryInterface.addIndex('inventory_counts', ['assigned_to'], {
        name: 'idx_inventory_counts_assigned_to',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('inventory_counts', 'idx_inventory_counts_assigned_to');
    await queryInterface.removeColumn('inventory_counts', 'assigned_to');
  },
};
