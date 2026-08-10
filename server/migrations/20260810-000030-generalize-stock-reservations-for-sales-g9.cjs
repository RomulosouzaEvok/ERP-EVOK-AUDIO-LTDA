'use strict';

/**
 * G9 (Onda 3 do PLANO_ACAO_CADEIA_PRODUTO_2026-08-09, decisao D-A do dono) —
 * a baixa de estoque da venda sai da CONFIRMACAO do pedido e passa para a
 * AUTORIZACAO DA NF-e. A confirmacao passa a apenas RESERVAR.
 *
 * ## Por que
 *
 * Ajuste SINIEF 07/05, clausula 1a §1o e clausula 9a §1o: a NF-e e
 * autorizada ANTES do fato gerador e a mercadoria so pode transitar depois
 * da autorizacao de uso. Baixar estoque na confirmacao do pedido registrava
 * saida de mercadoria que ainda estava fisicamente na empresa — o saldo do
 * sistema ficava menor que o saldo real do galpao entre a confirmacao e o
 * faturamento, e um inventario nesse intervalo acusaria sobra inexistente.
 *
 * ## O que muda no schema
 *
 * `production_order_reservations` (criada pelo G3 em 20260809-000026) era
 * exclusiva de ordem de producao — o proprio cabecalho daquela migration
 * previu esta generalizacao: "tornar a coluna nullable, adicionar `sale_id`
 * e um CHECK de exatamente-um-dono". E o que esta migration faz:
 *
 * 1. `production_order_id` vira NULLABLE;
 * 2. entra `sale_id` (FK -> sales, ON DELETE RESTRICT: venda nao e apagada
 *    neste ERP, por exigencia de auditoria fiscal);
 * 3. CHECK `chk_stock_reservations_exactly_one_owner`: exatamente um dos
 *    dois donos preenchido, nunca zero nem dois;
 * 4. o indice unico parcial de OP ganha `AND production_order_id IS NOT
 *    NULL` e nasce o equivalente para venda — no maximo UMA reserva viva
 *    por (dono x produto).
 *
 * A tabela NAO foi renomeada de proposito (viraria "stock_reservations").
 * Renomear tabela num banco que ja apresenta drift em relacao as migrations
 * e risco desnecessario para ganho cosmetico; o nome ficou historico e esta
 * documentado no model e em docs/database/DATABASE.md.
 *
 * ## Migracao do dado existente (parte obrigatoria da entrega)
 *
 * Levantamento feito no banco real do dono em 2026-08-10, ANTES de escrever
 * esta migration:
 *
 *   SELECT status, COUNT(*) FROM sales GROUP BY status;
 *   -> confirmed: 1   (nenhuma venda em quote/partially_invoiced/invoiced/
 *                      shipped/canceled)
 *
 * Ou seja: **1 unico pedido** em estado "ja baixou estoque e ainda nao
 * faturou" (venda #10, 1 unidade do produto #25, `invoiced_quantity = 0`,
 * movimento de saida #46). Isso confirma a decisao D-E do dono ("entre
 * confirmar o pedido e faturar passa o mesmo dia"): a migracao e indolor e
 * NAO exige decisao adicional. Mesmo assim o backfill abaixo e escrito de
 * forma generica (funciona para N pedidos), porque o banco de producao
 * definitivo ainda nao existe e o volume no dia do deploy pode ser outro.
 *
 * Para cada item de venda `confirmed`/`partially_invoiced` com saldo nao
 * faturado (`quantity - invoiced_quantity > 0`), o backfill:
 *
 *   a) cria a reserva equivalente (dona = a venda);
 *   b) DEVOLVE esse saldo a `products.quantity` — o estoque estava baixado
 *      indevidamente pela regra antiga, e fisicamente a mercadoria esta no
 *      galpao;
 *   c) devolve o mesmo saldo ao deposito ACABADOS
 *      (`product_warehouse_stock`), preservando a invariante
 *      "saldo_total = SOMA por deposito" (BUSINESS_RULES.md §12 item 3);
 *   d) grava o `inventory_movements` de entrada correspondente (o estorno
 *      precisa aparecer no extrato do produto, senao o saldo "anda sozinho"
 *      aos olhos de quem audita);
 *   e) recalcula o cache `products.reserved_quantity`.
 *
 * Vendas `invoiced`/`shipped` NAO sao tocadas: na regra antiga o estoque
 * saiu na confirmacao, na nova sai no faturamento — o efeito liquido e o
 * mesmo e nao ha nada a corrigir. `quote` nunca baixou nada. `canceled` ja
 * teve o estoque restaurado pelo cancelamento.
 *
 * ## ATENCAO — ordem de deploy
 *
 * O codigo do working tree ja depende desta migration (a confirmacao de
 * pedido chama `inventoryService.reserve({ saleId })`, que grava
 * `sale_id`). Aplicar ANTES de subir o codigo. Subir o codigo com o schema
 * antigo faz a confirmacao de pedido falhar (coluna inexistente); aplicar a
 * migration sem subir o codigo e inofensivo (o backfill deixa o estoque no
 * estado fisicamente correto e o codigo antigo simplesmente nao cria
 * reservas novas).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      // 1) production_order_id deixa de ser obrigatorio. SQL cru (e nao
      //    `changeColumn`) de proposito: `changeColumn` reemite o tipo da
      //    coluna e, num banco com drift, pode reescrever mais do que se
      //    pretende. `DROP NOT NULL` nao encosta na FK existente.
      await sequelize.query(
        'ALTER TABLE production_order_reservations ALTER COLUMN production_order_id DROP NOT NULL;',
        { transaction }
      );

      // 2) Novo dono possivel: a venda.
      await queryInterface.addColumn(
        'production_order_reservations',
        'sale_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'sales', key: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        { transaction }
      );

      await queryInterface.addIndex('production_order_reservations', ['sale_id'], {
        name: 'idx_production_order_reservations_sale_id',
        transaction,
      });

      // 3) Exatamente um dono. Sem este CHECK a tabela aceitaria reserva
      //    orfa (nenhum dono — o gap G3 de volta) ou com dois donos, que
      //    tornaria ambiguo quem tem direito de liberar o material.
      await sequelize.query(
        `ALTER TABLE production_order_reservations
           ADD CONSTRAINT chk_stock_reservations_exactly_one_owner
           CHECK (
             (CASE WHEN production_order_id IS NULL THEN 0 ELSE 1 END) +
             (CASE WHEN sale_id IS NULL THEN 0 ELSE 1 END) = 1
           );`,
        { transaction }
      );

      // 4) Unicidade da reserva viva, agora por dono.
      await sequelize.query('DROP INDEX IF EXISTS uq_production_order_reservations_active;', { transaction });
      await sequelize.query(
        `CREATE UNIQUE INDEX uq_production_order_reservations_active
           ON production_order_reservations (production_order_id, product_id)
           WHERE status = 'active' AND production_order_id IS NOT NULL;`,
        { transaction }
      );
      await sequelize.query(
        `CREATE UNIQUE INDEX uq_sale_reservations_active
           ON production_order_reservations (sale_id, product_id)
           WHERE status = 'active' AND sale_id IS NOT NULL;`,
        { transaction }
      );

      // ------------------------------------------------------------------
      // BACKFILL — pedidos que baixaram estoque pela regra antiga e ainda
      // nao foram faturados.
      // ------------------------------------------------------------------

      // (a) Uma reserva por (venda x produto). O SUM/GROUP BY existe porque
      //     `sale_items` nao tem unicidade de produto por venda: uma venda
      //     antiga pode ter duas linhas do mesmo produto, e duas reservas
      //     vivas para o mesmo par violariam o indice unico recem-criado.
      await sequelize.query(
        `INSERT INTO production_order_reservations
           (production_order_id, sale_id, product_id, quantity, quantity_released,
            status, created_by, notes, created_at, updated_at)
         SELECT NULL,
                s.id,
                si.product_id,
                SUM(si.quantity - COALESCE(si.invoiced_quantity, 0)),
                0,
                'active',
                s.user_id,
                'Backfill G9 (2026-08-10): saldo nao faturado do pedido, devolvido ao estoque e convertido em reserva.',
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
           FROM sales s
           JOIN sale_items si ON si.sale_id = s.id
          WHERE s.status IN ('confirmed', 'partially_invoiced')
          GROUP BY s.id, s.user_id, si.product_id
         HAVING SUM(si.quantity - COALESCE(si.invoiced_quantity, 0)) > 0;`,
        { transaction }
      );

      // (b) Devolve o saldo a `products.quantity`. Antes desta migration
      //     nenhuma linha da tabela tinha `sale_id`, entao "sale_id IS NOT
      //     NULL" identifica exatamente o que o passo (a) acabou de criar.
      await sequelize.query(
        `UPDATE products p
            SET quantity = p.quantity + r.qty,
                updated_at = CURRENT_TIMESTAMP
           FROM (
             SELECT product_id, SUM(quantity) AS qty
               FROM production_order_reservations
              WHERE sale_id IS NOT NULL AND status = 'active'
              GROUP BY product_id
           ) r
          WHERE p.id = r.product_id;`,
        { transaction }
      );

      // (c) Mesmo credito no deposito ACABADOS (dual-write, §12 item 3/7).
      //     UPDATE para o par que ja existe, INSERT para o que nao existe.
      await sequelize.query(
        `UPDATE product_warehouse_stock pws
            SET quantity = pws.quantity + r.qty,
                updated_at = CURRENT_TIMESTAMP
           FROM (
             SELECT product_id, SUM(quantity) AS qty
               FROM production_order_reservations
              WHERE sale_id IS NOT NULL AND status = 'active'
              GROUP BY product_id
           ) r,
           warehouses w
          WHERE w.code = 'ACABADOS'
            AND pws.warehouse_id = w.id
            AND pws.product_id = r.product_id;`,
        { transaction }
      );
      await sequelize.query(
        `INSERT INTO product_warehouse_stock (product_id, warehouse_id, quantity, created_at, updated_at)
         SELECT r.product_id, w.id, r.qty, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
           FROM (
             SELECT product_id, SUM(quantity) AS qty
               FROM production_order_reservations
              WHERE sale_id IS NOT NULL AND status = 'active'
              GROUP BY product_id
           ) r
           CROSS JOIN warehouses w
          WHERE w.code = 'ACABADOS'
            AND NOT EXISTS (
              SELECT 1 FROM product_warehouse_stock pws
               WHERE pws.product_id = r.product_id AND pws.warehouse_id = w.id
            );`,
        { transaction }
      );

      // (d) Rastro no extrato do produto. `reference_type = 'sale'` e
      //     `reference_id = sales.id` mantem a consulta reversa correta
      //     (o documento de origem do estorno E a venda). `type = 'in'`
      //     porque `products.quantity` de fato subiu.
      await sequelize.query(
        `INSERT INTO inventory_movements
           (product_id, item_id, user_id, warehouse_id, type, quantity, unit_cost,
            description, reference_id, reference_type, created_at, updated_at)
         SELECT r.product_id,
                NULL,
                s.user_id,
                (SELECT id FROM warehouses WHERE code = 'ACABADOS' LIMIT 1),
                'in',
                r.quantity,
                0,
                'Estorno G9: baixa indevida na confirmacao do pedido devolvida ao estoque; saldo virou reserva ate a autorizacao da NF-e.',
                r.sale_id,
                'sale',
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
           FROM production_order_reservations r
           JOIN sales s ON s.id = r.sale_id
          WHERE r.sale_id IS NOT NULL AND r.status = 'active';`,
        { transaction }
      );

      // (e) Cache derivado. Recalculado apenas para os produtos tocados
      //     pelo backfill — os demais ja estao coerentes com as reservas de
      //     OP e nao devem ser mexidos por esta migration.
      await sequelize.query(
        `UPDATE products p
            SET reserved_quantity = COALESCE(x.total, 0),
                updated_at = CURRENT_TIMESTAMP
           FROM (
             SELECT product_id, SUM(quantity - quantity_released) AS total
               FROM production_order_reservations
              WHERE status = 'active'
              GROUP BY product_id
           ) x
          WHERE p.id = x.product_id
            AND p.id IN (
              SELECT product_id FROM production_order_reservations
               WHERE sale_id IS NOT NULL AND status = 'active'
            );`,
        { transaction }
      );

      // Documentacao no proprio banco.
      await sequelize.query(
        `COMMENT ON TABLE production_order_reservations IS 'Reserva de estoque (G3 + G9). Fonte da verdade do que esta comprometido; products.reserved_quantity e cache derivado. Dono = EXATAMENTE UM entre production_order_id e sale_id. Nome da tabela e historico (G3 era so producao) - trate como stock_reservations.';`,
        { transaction }
      );
      await sequelize.query(
        `COMMENT ON COLUMN production_order_reservations.sale_id IS 'G9 (2026-08-10) - venda dona da reserva. Confirmacao do pedido RESERVA; a baixa efetiva so ocorre na autorizacao da NF-e (Ajuste SINIEF 07/05, clausula 9a §1o).';`,
        { transaction }
      );
      await sequelize.query(
        `COMMENT ON COLUMN production_order_reservations.production_order_id IS 'OP dona da reserva. NULL quando a dona e uma venda (G9) - CHECK chk_stock_reservations_exactly_one_owner garante exatamente um dono.';`,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async (transaction) => {
      // Reverte o backfill: o que esta reservado por venda volta a estar
      // BAIXADO do estoque, que era a regra antiga. Reservas de venda ja
      // liberadas (status 'released') correspondem a saldo consumido na
      // autorizacao da NF-e — nao ha o que devolver, apenas some a linha.
      await sequelize.query(
        `UPDATE products p
            SET quantity = p.quantity - r.qty,
                updated_at = CURRENT_TIMESTAMP
           FROM (
             SELECT product_id, SUM(quantity - quantity_released) AS qty
               FROM production_order_reservations
              WHERE sale_id IS NOT NULL AND status = 'active'
              GROUP BY product_id
           ) r
          WHERE p.id = r.product_id;`,
        { transaction }
      );

      await sequelize.query(
        `UPDATE product_warehouse_stock pws
            SET quantity = pws.quantity - r.qty,
                updated_at = CURRENT_TIMESTAMP
           FROM (
             SELECT product_id, SUM(quantity - quantity_released) AS qty
               FROM production_order_reservations
              WHERE sale_id IS NOT NULL AND status = 'active'
              GROUP BY product_id
           ) r,
           warehouses w
          WHERE w.code = 'ACABADOS'
            AND pws.warehouse_id = w.id
            AND pws.product_id = r.product_id;`,
        { transaction }
      );

      await sequelize.query(
        `INSERT INTO inventory_movements
           (product_id, item_id, user_id, warehouse_id, type, quantity, unit_cost,
            description, reference_id, reference_type, created_at, updated_at)
         SELECT r.product_id,
                NULL,
                s.user_id,
                (SELECT id FROM warehouses WHERE code = 'ACABADOS' LIMIT 1),
                'out',
                r.quantity - r.quantity_released,
                0,
                'Rollback G9: reserva do pedido revertida para baixa na confirmacao (regra anterior).',
                r.sale_id,
                'sale',
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
           FROM production_order_reservations r
           JOIN sales s ON s.id = r.sale_id
          WHERE r.sale_id IS NOT NULL AND r.status = 'active';`,
        { transaction }
      );

      await sequelize.query(
        `DELETE FROM production_order_reservations WHERE sale_id IS NOT NULL;`,
        { transaction }
      );

      await sequelize.query(
        `UPDATE products p
            SET reserved_quantity = COALESCE((
                  SELECT SUM(quantity - quantity_released)
                    FROM production_order_reservations r
                   WHERE r.product_id = p.id AND r.status = 'active'
                ), 0),
                updated_at = CURRENT_TIMESTAMP
          WHERE p.reserved_quantity <> COALESCE((
                  SELECT SUM(quantity - quantity_released)
                    FROM production_order_reservations r
                   WHERE r.product_id = p.id AND r.status = 'active'
                ), 0);`,
        { transaction }
      );

      await sequelize.query('DROP INDEX IF EXISTS uq_sale_reservations_active;', { transaction });
      await sequelize.query('DROP INDEX IF EXISTS uq_production_order_reservations_active;', { transaction });
      await sequelize.query(
        `CREATE UNIQUE INDEX uq_production_order_reservations_active
           ON production_order_reservations (production_order_id, product_id)
           WHERE status = 'active';`,
        { transaction }
      );

      await sequelize.query(
        'ALTER TABLE production_order_reservations DROP CONSTRAINT IF EXISTS chk_stock_reservations_exactly_one_owner;',
        { transaction }
      );

      await queryInterface.removeIndex('production_order_reservations', 'idx_production_order_reservations_sale_id', { transaction });
      await queryInterface.removeColumn('production_order_reservations', 'sale_id', { transaction });

      await sequelize.query(
        'ALTER TABLE production_order_reservations ALTER COLUMN production_order_id SET NOT NULL;',
        { transaction }
      );

      await sequelize.query(
        `COMMENT ON TABLE production_order_reservations IS 'G3 - fonte da verdade da reserva de material por ordem de producao. products.reserved_quantity e cache derivado desta tabela.';`,
        { transaction }
      );
    });
  },
};
