'use strict';

/**
 * Bloco 4 (docs/governance/TODO.md) — Multiplos Depositos (UC-42), gap de
 * escopo do inventario ciclico.
 *
 * `inventory_counts` (cabecalho da contagem) nao tinha `warehouse_id`: a
 * contagem inteira (todos os `inventory_count_items` dela) deveria estar
 * escopada a um unico deposito por vez, seguindo o mesmo raciocinio de
 * `warehouse_transfers`/`product_warehouse_stock` (BUSINESS_RULES.md §12).
 * Coloca-se o escopo no CABECALHO (`inventory_counts`), nao no item
 * (`inventory_count_items`), porque nao faz sentido operacional uma unica
 * contagem fisica misturar depositos diferentes — o operador conta um
 * deposito de cada vez.
 *
 * Decisao de nullable vs NOT NULL: a tabela ja tem 4 linhas reais em
 * ambiente de desenvolvimento (`SELECT COUNT(*) FROM inventory_counts` = 4,
 * verificado antes desta migration), todas sem nenhuma nocao de deposito
 * (schema antigo nao tinha o conceito). Portanto e IMPOSSIVEL inferir o
 * deposito correto de forma confiavel para 2 delas que ja estao com status
 * `adjusted` (ja impactaram o saldo global de `Product.quantity`). Segue-se
 * o MESMO padrao expand-contract ja estabelecido em
 * `20260804-000001-create-warehouses.cjs` para `inventory_movements` e
 * `lot_controls`: coluna NULLABLE + backfill das linhas existentes para o
 * deposito `INSUMOS` (deposito padrao de todo saldo legado nesta mesma
 * migration anterior). Contagens NOVAS, criadas pelo use case que o
 * proximo agente vai escrever, DEVEM sempre informar `warehouse_id`
 * (validacao fica na camada de aplicacao/use case, nao em NOT NULL no
 * banco, para nao quebrar o historico de auditoria das 4 linhas legadas).
 *
 * Contrato para o proximo agente (use case de ajuste por deposito):
 * - `warehouse_id` e nullable no banco por causa do legado acima, mas o
 *   use case de CRIACAO de contagem deve exigir o campo como obrigatorio
 *   no payload (400 se ausente) — nunca permitir novas contagens sem
 *   deposito.
 * - Ao aprovar a contagem (`ApproveInventoryCountUseCase`), o ajuste de
 *   saldo deve ser feito em `ProductWarehouseStock` (product_id,
 *   warehouse_id=inventory_counts.warehouse_id), nao mais direto em
 *   `Product.quantity` — mantendo o dual-write ja em vigor desde o Bloco 4
 *   (`Product.quantity` = soma dos saldos por deposito).
 * - `inventory_count_items` NAO ganhou `warehouse_id` proprio — todos os
 *   itens de uma contagem herdam o deposito do cabecalho
 *   `inventory_counts.warehouse_id`.
 *
 * Precedente de padrao seguido: 20260804-000001-create-warehouses.cjs
 * (coluna FK nullable + indice + backfill idempotente).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('inventory_counts', 'warehouse_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'warehouses',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
      comment: 'FK -> warehouses.id. Deposito ao qual TODA a contagem pertence (nullable apenas por legado pre-Bloco 4; use case de criacao deve exigir o campo em contagens novas).',
    });

    await queryInterface.addIndex('inventory_counts', ['warehouse_id'], {
      name: 'idx_inventory_counts_warehouse_id',
    });

    // Backfill das contagens legadas (criadas antes do conceito de
    // deposito existir) para o deposito INSUMOS, mesmo criterio adotado
    // em 20260804-000001-create-warehouses.cjs para inventory_movements
    // e lot_controls legados.
    await queryInterface.sequelize.query(`
      UPDATE inventory_counts
      SET warehouse_id = (SELECT id FROM warehouses WHERE code = 'INSUMOS')
      WHERE warehouse_id IS NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('inventory_counts', 'idx_inventory_counts_warehouse_id');
    await queryInterface.removeColumn('inventory_counts', 'warehouse_id');
  },
};
