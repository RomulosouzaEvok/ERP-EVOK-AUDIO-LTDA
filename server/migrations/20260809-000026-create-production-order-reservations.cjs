'use strict';

/**
 * G3 (Onda 2 do PLANO_ACAO_CADEIA_PRODUTO_2026-08-09) — reserva de material
 * VINCULADA a ordem de producao.
 *
 * ## Problema que esta tabela resolve
 *
 * Ate 2026-08-09 a reserva de material de uma OP era apenas um contador
 * global no produto (`products.reserved_quantity`, incrementado por
 * `inventoryService.reserve`). Nao havia vinculo entre a reserva e a OP que
 * reservou, com duas consequencias reais:
 *
 * 1. **Canibalizacao**: a liberacao usava `MIN(reservado_total, desejado)`,
 *    entao QUALQUER OP conseguia liberar (e depois consumir) o material
 *    reservado por outra;
 * 2. Nao havia como responder "quanto deste item esta reservado para a OP X?".
 *
 * ## Desenho
 *
 * `production_order_reservations` passa a ser a **fonte da verdade** da
 * reserva: uma linha por (OP x produto), com a quantidade reservada e o
 * quanto ja foi liberado. `products.reserved_quantity` continua existindo,
 * mas rebaixado a **cache derivado** — e recalculado como
 * `SUM(quantity - quantity_released)` das reservas ativas do produto, na
 * MESMA transacao, para nao quebrar os leitores existentes
 * (`inventoryService.validateAndLock`, dual-read de `Item.estoque_reservado`,
 * MRP e telas do `client/`).
 *
 * ## Escopo declarado
 *
 * Somente ordens de producao. Vendas NAO reservam estoque neste ERP: elas
 * consomem direto (`CreateSaleUseCase`/`ChangeSaleStatusUseCase` chamam
 * `InventoryService.consume`), e orcamento (`quote`) nao toca estoque. Por
 * isso a FK aqui e real e dura (`production_order_id`), em vez de um par
 * polimorfico (tipo + id) que impediria integridade referencial. Se um dia
 * vendas/expedicao precisarem reservar, a generalizacao e uma migration
 * propria (tornar a coluna nullable, adicionar `sale_id` e um CHECK de
 * exatamente-um-dono) — decisao deliberadamente adiada.
 *
 * ## Notas de integridade
 *
 * - `ON DELETE CASCADE` em `production_order_id`: se a OP for removida, suas
 *   reservas somem junto (nao ha reserva orfa). `RemoveProductionOrderUseCase`
 *   passou a BLOQUEAR a remocao de OP com reserva ativa justamente para que
 *   esse CASCADE nunca ocorra com saldo vivo (deixaria o cache
 *   `products.reserved_quantity` alto para sempre) — o caminho correto e
 *   cancelar a OP (que libera o material) e so entao remove-la.
 * - `ON DELETE RESTRICT` em `product_id`: produto com reserva viva nao pode
 *   ser apagado.
 * - Indice UNIQUE PARCIAL `(production_order_id, product_id) WHERE status =
 *   'active'`: no maximo uma reserva viva por OP x produto. Reservas ja
 *   liberadas (`status = 'released'`) permanecem como historico e nao
 *   competem pelo indice.
 * - CHECK de coerencia entre `status` e `quantity_released`: `active`
 *   significa que ainda ha saldo a liberar; `released` significa liberado
 *   integralmente. Nao existe estado intermediario decorativo.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('production_order_reservations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      production_order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'production_orders', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      quantity: { type: Sequelize.DECIMAL(18, 6), allowNull: false },
      quantity_released: { type: Sequelize.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      status: { type: Sequelize.ENUM('active', 'released'), allowNull: false, defaultValue: 'active' },
      released_at: { type: Sequelize.DATE, allowNull: true },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('production_order_reservations', ['production_order_id'], {
      name: 'idx_production_order_reservations_order_id',
    });
    await queryInterface.addIndex('production_order_reservations', ['product_id'], {
      name: 'idx_production_order_reservations_product_id',
    });

    // Uma unica reserva VIVA por OP x produto. O historico de reservas ja
    // liberadas nao concorre (indice parcial).
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX uq_production_order_reservations_active
        ON production_order_reservations (production_order_id, product_id)
        WHERE status = 'active';
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE production_order_reservations
        ADD CONSTRAINT chk_production_order_reservations_quantity
        CHECK (quantity > 0);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE production_order_reservations
        ADD CONSTRAINT chk_production_order_reservations_released_range
        CHECK (quantity_released >= 0 AND quantity_released <= quantity);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE production_order_reservations
        ADD CONSTRAINT chk_production_order_reservations_status_coherence
        CHECK (
          (status = 'active'   AND quantity_released <  quantity) OR
          (status = 'released' AND quantity_released =  quantity)
        );
    `);

    await queryInterface.sequelize.query(
      `COMMENT ON TABLE production_order_reservations IS 'G3 - fonte da verdade da reserva de material por ordem de producao. products.reserved_quantity e cache derivado desta tabela.';`
    );
    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN production_order_reservations.quantity IS 'Quantidade originalmente reservada pela OP para este produto. Imutavel apos a criacao - a liberacao acumula em quantity_released.';`
    );
    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN production_order_reservations.quantity_released IS 'Quantidade ja liberada desta reserva. Saldo vivo = quantity - quantity_released.';`
    );
    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN production_order_reservations.status IS 'active = ainda ha saldo reservado; released = liberado integralmente (historico).';`
    );

    // Rebaixamento explicito do contador global a cache derivado. Sem
    // `comment:` em addColumn (bug conhecido do projeto: parenteses no texto
    // corrompem o SQL gerado) - COMMENT ON COLUMN direto.
    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN products.reserved_quantity IS 'CACHE DERIVADO (G3, 2026-08-09) - somatorio de production_order_reservations.quantity - quantity_released das reservas ativas do produto, atualizado na mesma transacao. NAO alterar diretamente: use inventoryService.reserve / releaseReservation / releaseAllReservationsForOrder.';`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN products.reserved_quantity IS 'Estoque reservado para pedidos/OPs';`
    );
    await queryInterface.dropTable('production_order_reservations');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_production_order_reservations_status";');
  },
};
