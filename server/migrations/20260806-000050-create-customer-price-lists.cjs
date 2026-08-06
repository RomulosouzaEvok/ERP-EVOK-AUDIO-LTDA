'use strict';

/**
 * Tabela de preços por cliente (`customer_price_lists`) — gap 1/3 do módulo
 * `sales` (ver `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`, linha `sales`).
 *
 * Cada linha registra um preço unitário negociado para um par
 * cliente×produto, com vigência opcional (`valid_from`/`valid_until`,
 * ambos nullable = sem limite naquela ponta) e soft delete via `active`
 * (mesmo padrão de `item_suppliers.active`/`Category.active`, já
 * consolidado no projeto — ver CLAUDE.md §7 "Sem Soft Delete Padrão").
 *
 * Referencia `products.id` (não `items.id`): `SaleItem.product_id` ainda é
 * o campo "quente" usado pelo fluxo de vendas (`item_id` é a extensão
 * paralela em migração, Fase 4.3) — a tabela de preços por cliente segue a
 * mesma referência para poder ser cruzada diretamente com os itens de
 * venda sem depender do dual-read.
 *
 * Não há índice único simples de `customer_id + product_id` porque a
 * vigência permite múltiplas faixas de preço no tempo para o mesmo par
 * (ex.: reajuste anual mantendo histórico); a unicidade de uma vigência
 * ativa e não sobreposta é validada na camada de aplicação
 * (`CreateCustomerPriceUseCase`), não no banco.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('customer_price_lists', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'clients', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'FK -> clients.id',
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'FK -> products.id',
      },
      unit_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Preco unitario negociado com o cliente para este produto',
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'BRL',
      },
      valid_from: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Inicio da vigencia (NULL = valido desde sempre)',
      },
      valid_until: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Fim da vigencia (NULL = sem prazo de expiracao)',
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Soft delete - false = preco desativado, mantido para auditoria',
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
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

    await queryInterface.addIndex('customer_price_lists', ['customer_id'], {
      name: 'idx_customer_price_lists_customer_id',
    });
    await queryInterface.addIndex('customer_price_lists', ['customer_id', 'product_id'], {
      name: 'idx_customer_price_lists_customer_product',
    });
    await queryInterface.addIndex('customer_price_lists', ['product_id'], {
      name: 'idx_customer_price_lists_product_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('customer_price_lists');
  },
};
