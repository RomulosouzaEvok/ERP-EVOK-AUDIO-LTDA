'use strict';

/**
 * D-L / D-M — o gate de qualidade na SAÍDA e o retorno ao lote no
 * cancelamento da NF-e (decisões do dono em 2026-08-10,
 * `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4).
 *
 * ## O problema que esta migration resolve
 *
 * O G7 (`9e061ea`) fechou o gate de qualidade na **entrada**: lote de compra
 * nasce em quarentena e só sai dela com inspeção aprovada registrada. Na
 * **saída** não havia gate nenhum — `services/saleStockService.ts`, que baixa
 * o estoque na autorização da NF-e (G9, `ed47e10`), **nunca consultava
 * `lot_controls`**. Produto acabado com lote `quarantine`/`blocked` era
 * faturado normalmente, e o único item em aberto do critério de pronto do
 * dono ("nenhum produto sai sem liberação de qualidade registrada, com
 * evidência", §5 do plano) continuava aberto. É também exigência da
 * **ISO 9001:2015 §8.6** (liberação de produto só depois de verificada a
 * conformidade) e §8.7 (impedir uso/entrega não pretendidos de saída não
 * conforme) — a empresa pretende se certificar (decisão D-H).
 *
 * Havia ainda um segundo furo, do lado do dado: a baixa de estoque da venda
 * mexia em `products.quantity` e no depósito ACABADOS, mas **nenhum lote era
 * baixado**. O saldo rastreável do lote ficava eternamente parado — a
 * expedição não deixava rastro por lote, e um recall não teria como responder
 * "para qual cliente foi o lote X".
 *
 * ## O que esta migration cria
 *
 * `sale_lot_shipments` — uma linha por (emissão de NF-e × lote × produto),
 * com a quantidade que **aquela emissão** consumiu daquele lote. É o registro
 * que torna possíveis as duas decisões ao mesmo tempo:
 *
 *  - **D-L**: o gate sabe exatamente quais lotes a emissão consome (o
 *    faturamento parcial do G9 baixa proporcional à emissão, então olhar o
 *    pedido inteiro daria falso bloqueio);
 *  - **D-M**: cancelar a NF-e devolve a quantidade **daquela emissão**, **ao
 *    mesmo lote** de onde saiu — sem esta tabela, "mesmo lote" seria um
 *    palpite e a rastreabilidade quebraria.
 *
 * `sale_invoice_id` é nullable de propósito: é a emissão dona da saída, mas
 * uma venda legada/manual sem registro em `sale_invoices` não pode impedir a
 * gravação do rastro. `quantity_returned` acumula devoluções (cancelamento de
 * nota, cancelamento de venda) e `status` vira `'returned'` quando não sobra
 * saldo — nada é apagado, para a auditoria enxergar o par saída/retorno.
 *
 * ## Efeito nas linhas existentes
 *
 * Nasce vazia; **nenhum dado existente é alterado**. As vendas já faturadas
 * antes desta migration continuam sem rastro por lote (não há como inventar
 * de qual lote saíram), e o cancelamento delas devolve estoque sem devolver
 * lote — comportamento documentado como risco residual em
 * `docs/governance/TODO.md`.
 *
 * ⚠️ `comment:` NÃO é usado em `createTable` (corrompe o SQL gerado neste
 * projeto) — os comentários vão em `COMMENT ON COLUMN`.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sale_lot_shipments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      sale_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sales', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      sale_invoice_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'sale_invoices', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      lot_control_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'lot_controls', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      quantity: { type: Sequelize.DECIMAL(12, 4), allowNull: false },
      quantity_returned: { type: Sequelize.DECIMAL(12, 4), allowNull: false, defaultValue: 0 },
      status: {
        type: Sequelize.ENUM('shipped', 'returned'),
        allowNull: false,
        defaultValue: 'shipped',
      },
      shipped_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      returned_at: { type: Sequelize.DATE, allowNull: true },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('sale_lot_shipments', ['sale_id'], {
      name: 'idx_sale_lot_shipments_sale_id',
    });
    await queryInterface.addIndex('sale_lot_shipments', ['sale_invoice_id'], {
      name: 'idx_sale_lot_shipments_sale_invoice_id',
    });
    await queryInterface.addIndex('sale_lot_shipments', ['lot_control_id'], {
      name: 'idx_sale_lot_shipments_lot_control_id',
    });
    await queryInterface.addIndex('sale_lot_shipments', ['product_id', 'status'], {
      name: 'idx_sale_lot_shipments_product_status',
    });

    // Coerência status × saldo devolvido, no mesmo espírito do CHECK de
    // `production_order_reservations` (G3): 'returned' significa nada a
    // devolver, e não pode existir devolução maior que a saída.
    await queryInterface.sequelize.query(`
      ALTER TABLE sale_lot_shipments
        ADD CONSTRAINT chk_sale_lot_shipments_returned_within_shipped
        CHECK (quantity_returned >= 0 AND quantity_returned <= quantity);
    `);

    await queryInterface.sequelize.query(`
      COMMENT ON TABLE sale_lot_shipments IS 'D-L/D-M (2026-08-10): rastro de expedicao por LOTE. Uma linha por emissao de NF-e x lote consumido. Sustenta o gate de qualidade na saida (so lote liberado pode ser faturado) e a devolucao ao MESMO lote no cancelamento da nota.';
      COMMENT ON COLUMN sale_lot_shipments.sale_invoice_id IS 'FK -> sale_invoices.id: a EMISSAO dona desta saida. E o que permite devolver a quantidade daquela emissao (faturamento parcial), nao a do pedido inteiro. NULL apenas em saida sem registro de emissao (dado legado).';
      COMMENT ON COLUMN sale_lot_shipments.lot_control_id IS 'FK -> lot_controls.id de onde a mercadoria saiu. O cancelamento da NF-e devolve a ESTE lote — devolver a outro quebraria a rastreabilidade.';
      COMMENT ON COLUMN sale_lot_shipments.quantity IS 'Quantidade que ESTA emissao consumiu DESTE lote (alocacao FEFO).';
      COMMENT ON COLUMN sale_lot_shipments.quantity_returned IS 'Quanto ja voltou ao lote (cancelamento de NF-e / de venda). Nada e apagado: a auditoria precisa ver o par saida/retorno.';
      COMMENT ON COLUMN sale_lot_shipments.status IS 'shipped = ha saldo expedido nao devolvido; returned = tudo devolveu.';
      COMMENT ON COLUMN sale_lot_shipments.user_id IS 'FK -> users.id responsavel pela saida (do JWT; na reconciliacao assincrona, o vendedor da venda).';
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sale_lot_shipments');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sale_lot_shipments_status";');
  },
};
