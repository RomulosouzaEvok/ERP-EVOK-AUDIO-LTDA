'use strict';

/**
 * G11 — alçada de aprovação de pedido de compra (decisão D-C do dono do
 * produto em 2026-08-10, `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md`
 * §4).
 *
 * A regra é por ORIGEM, não só por valor: nacional até R$ 500.000 segue
 * direto, acima disso exige a diretoria; **importação exige a diretoria em
 * qualquer valor**. Regra e thresholds em
 * `server/src/modules/purchases/domain/constants.ts`.
 *
 * ## O que esta migration cria
 *
 * 1. `suppliers.is_foreign` (BOOLEAN NOT NULL DEFAULT false) — dado de
 *    CADASTRO. Antes desta migration não havia **nenhuma** forma no schema
 *    de saber se um fornecedor é estrangeiro: `suppliers` não tem país,
 *    apenas `state` (UF) e um `cnpj` obrigatório; e `import_processes`
 *    (COMEX) é um fluxo paralelo que nunca vira `purchase_orders`. Esta é a
 *    fonte que o comprador NÃO controla dentro do pedido.
 * 2. `purchase_orders.origin` (ENUM national|import NOT NULL DEFAULT
 *    'national') — declaração explícita no pedido, necessária para a
 *    importação por conta e ordem (trading NACIONAL importando para a
 *    empresa). Escalation-only por desenho: só consegue tornar a alçada mais
 *    restritiva; um pedido marcado `national` para fornecedor estrangeiro
 *    continua exigindo a diretoria (ver `resolvePurchaseOrigin`).
 * 3. `purchase_order_approvals` — registro das aprovações de alçada, no
 *    mesmo padrão já aprovado de `jur_contract_approvals` (RF-JUR-003):
 *    `approver_user_id` sempre vindo do JWT (nunca do body), `approver_role`
 *    sempre resolvido por RBAC, e UNIQUE (`purchase_id`, `approver_role`)
 *    impedindo que o mesmo papel aprove duas vezes o mesmo pedido.
 *
 * ## Efeito nas linhas existentes
 *
 * Todos os pedidos e fornecedores já cadastrados ficam com o DEFAULT
 * (`origin = 'national'`, `is_foreign = false`), ou seja, o comportamento de
 * hoje é preservado. Se já existirem fornecedores estrangeiros cadastrados,
 * marcá-los é ação manual do Suprimentos — não há como inferir isso do dado
 * atual (o `cnpj` é obrigatório mesmo para eles). Registrado como risco
 * residual em `docs/governance/TODO.md`.
 *
 * ⚠️ `comment:` NÃO é usado em `addColumn` (corrompe o SQL gerado com
 * parênteses neste projeto) — os comentários vão em `COMMENT ON COLUMN`.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('suppliers', 'is_foreign', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN suppliers.is_foreign IS 'G11: fornecedor estrangeiro (importacao). Dado de cadastro — fonte NAO controlada pelo comprador dentro do pedido; torna a alcada de diretoria obrigatoria em qualquer valor.';`
    );

    await queryInterface.addColumn('purchase_orders', 'origin', {
      type: Sequelize.ENUM('national', 'import'),
      allowNull: false,
      defaultValue: 'national',
    });

    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN purchase_orders.origin IS 'G11: origem declarada da compra (national|import). Escalation-only: so torna a alcada mais restritiva; fornecedor estrangeiro (suppliers.is_foreign) prevalece sobre national.';`
    );

    await queryInterface.createTable('purchase_order_approvals', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      purchase_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'purchase_orders', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      approver_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      approver_role: { type: Sequelize.ENUM('diretor'), allowNull: false },
      approved_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('purchase_order_approvals', {
      fields: ['purchase_id', 'approver_role'],
      type: 'unique',
      name: 'uq_purchase_order_approvals_purchase_role',
    });

    await queryInterface.addIndex('purchase_order_approvals', ['purchase_id'], {
      name: 'idx_purchase_order_approvals_purchase_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('purchase_order_approvals');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purchase_order_approvals_approver_role";');

    await queryInterface.removeColumn('purchase_orders', 'origin');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purchase_orders_origin";');

    await queryInterface.removeColumn('suppliers', 'is_foreign');
  },
};
