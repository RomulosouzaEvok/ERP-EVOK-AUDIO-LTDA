/**
 * Backfill G3 — reconstroi a reserva de material VINCULADA a ordem de
 * producao (`production_order_reservations`) a partir do dado que ja existe,
 * e realinha o cache `products.reserved_quantity`.
 *
 * Rode DEPOIS de aplicar a migration
 * `20260809-000026-create-production-order-reservations.cjs`.
 *
 * ## O que este script consegue reconstruir
 *
 * Ate 2026-08-09 a reserva era um contador global em
 * `products.reserved_quantity`, sem nenhum vinculo com a OP que reservou.
 * Nao existe, no banco, a informacao de qual OP reservou o que. O que existe
 * e determinístico o suficiente para reconstruir com honestidade:
 *
 * - a reserva era criada na transicao para `released`, explodindo a BOM
 *   ativa do produto na quantidade PLANEJADA da OP;
 * - nada era liberado ou consumido antes da conclusao/cancelamento.
 *
 * Logo, para cada OP viva (`released`, `in_progress`, `paused`), a reserva
 * esperada e a explosao da BOM ativa do produto na quantidade da OP. E
 * exatamente isso que o script grava.
 *
 * ## O que este script NAO consegue reconstruir (e por isso apenas relata)
 *
 * 1. **BOM alterada depois da liberacao da OP.** A explosao usa a estrutura
 *    ATUAL. Se a engenharia mudou a BOM depois que a OP foi liberada, a
 *    reserva reconstruida difere da que foi realmente feita. Nao ha registro
 *    historico da explosao — inventar um seria pior que relatar.
 * 2. **OP viva cujo produto perdeu a BOM ativa.** Sem estrutura nao ha o que
 *    explodir; a OP e listada como NAO reconstruida e o operador decide
 *    (reativar a BOM e rodar de novo, ou cancelar a OP).
 * 3. **Saldo reservado "orfao"**: produto com `reserved_quantity > 0` sem
 *    nenhuma OP viva por tras. Isso e vazamento herdado — OP removida em
 *    `released` (a remocao nunca devolvia a reserva), conclusao com
 *    quantidade zero antes da correcao do gap G2, ou reserva de rotinas ja
 *    extintas. A origem e irrecuperavel. O script relata cada caso e, com
 *    `--apply`, zera o cache para a soma real das reservas — sem isso o
 *    material fica indisponivel para sempre.
 *
 * ## Seguranca
 *
 * - **Dry-run por padrao.** Sem `--apply` nada e escrito: o script imprime o
 *   plano completo e a lista de divergencias.
 * - **Idempotente.** OPs que ja possuem qualquer linha em
 *   `production_order_reservations` sao puladas. Rodar duas vezes com
 *   `--apply` produz o mesmo estado.
 * - **Atomico.** Tudo roda numa unica transacao; qualquer erro faz rollback.
 *
 * Uso:
 *   npx tsx server/src/scripts/backfill/05_production_order_reservations.ts            # dry-run
 *   npx tsx server/src/scripts/backfill/05_production_order_reservations.ts --apply    # grava
 *
 * @module scripts/backfill/05_production_order_reservations
 */

import { Op } from 'sequelize';
import { sequelize } from '../../config/database';

const BomService = require('../../services/bomService');
const { Product, ProductionOrder, ProductionOrderReservation } = require('../../models/index');

/** Status de OP que mantem material reservado. */
const LIVE_ORDER_STATUSES = ['released', 'in_progress', 'paused'];

interface RebuiltReservation {
  orderId: number;
  orderNumber: string;
  productId: number;
  quantity: number;
}

interface BackfillReport {
  ordersScanned: number;
  ordersSkippedAlreadyMigrated: number;
  ordersWithoutBom: Array<{ orderId: number; orderNumber: string; productId: number; reason: string }>;
  reservationsCreated: RebuiltReservation[];
  cacheChanges: Array<{ productId: number; productCode: string; before: number; after: number; difference: number }>;
}

/**
 * Reconstroi as reservas das OPs vivas e realinha o cache de reserva dos
 * produtos afetados.
 *
 * @param options - `apply: true` grava; caso contrario faz rollback (dry-run).
 * @returns Relatorio completo do que foi (ou seria) feito.
 */
async function backfillProductionOrderReservations(options: { apply?: boolean } = {}): Promise<BackfillReport> {
  const apply = options.apply === true;

  const report: BackfillReport = {
    ordersScanned: 0,
    ordersSkippedAlreadyMigrated: 0,
    ordersWithoutBom: [],
    reservationsCreated: [],
    cacheChanges: [],
  };

  const transaction = await sequelize.transaction();

  try {
    const liveOrders = await ProductionOrder.findAll({
      where: { status: LIVE_ORDER_STATUSES },
      order: [['id', 'ASC']],
      transaction,
    });

    report.ordersScanned = liveOrders.length;

    // Produtos cujo cache precisa ser reavaliado: os componentes reconstruidos
    // AQUI mais todo produto que hoje carrega saldo reservado no cache (para
    // detectar e corrigir vazamento herdado).
    const impactedProductIds = new Set<number>();

    const productsWithLegacyReserve = await Product.findAll({
      where: { reserved_quantity: { [Op.gt]: 0 } },
      transaction,
    });
    for (const product of productsWithLegacyReserve) {
      impactedProductIds.add(Number(product.id));
    }

    for (const order of liveOrders) {
      // Idempotencia: OP ja migrada (qualquer linha, ativa ou historica) nao
      // e tocada de novo.
      const alreadyMigrated = await ProductionOrderReservation.count({
        where: { production_order_id: order.id },
        transaction,
      });
      if (alreadyMigrated > 0) {
        report.ordersSkippedAlreadyMigrated++;
        continue;
      }

      let explosion: any;
      try {
        explosion = await BomService.explodeBOM(order.product_id, Number(order.quantity), { includeCost: false });
      } catch (error: any) {
        report.ordersWithoutBom.push({
          orderId: order.id,
          orderNumber: order.order_number,
          productId: order.product_id,
          reason: error?.message ?? String(error),
        });
        continue;
      }

      for (const component of explosion.components) {
        const quantity = Number(component.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) continue;

        impactedProductIds.add(Number(component.component_id));
        report.reservationsCreated.push({
          orderId: order.id,
          orderNumber: order.order_number,
          productId: Number(component.component_id),
          quantity,
        });

        await ProductionOrderReservation.create(
          {
            production_order_id: order.id,
            product_id: component.component_id,
            quantity,
            quantity_released: 0,
            status: 'active',
            created_by: order.created_by ?? null,
            notes:
              `Backfill G3 (${new Date().toISOString().slice(0, 10)}): reserva reconstruida pela explosao da BOM ` +
              `ATUAL na quantidade planejada da OP ${order.order_number}. A reserva original (contador global ` +
              'products.reserved_quantity) nao registrava a ordem dona.',
          },
          { transaction }
        );
      }
    }

    // Realinhamento do cache: `reserved_quantity` passa a valer exatamente a
    // soma das reservas vivas do produto.
    for (const productId of Array.from(impactedProductIds).sort((a, b) => a - b)) {
      const product = await Product.findByPk(productId, { transaction });
      if (!product) continue;

      const activeReservations = await ProductionOrderReservation.findAll({
        where: { product_id: productId, status: 'active' },
        transaction,
      });
      const after = activeReservations.reduce(
        (sum: number, row: any) => sum + (Number(row.quantity || 0) - Number(row.quantity_released || 0)),
        0
      );
      const before = Number(product.reserved_quantity || 0);

      if (Math.abs(after - before) > 0.0000005) {
        report.cacheChanges.push({
          productId,
          productCode: product.code,
          before,
          after,
          difference: after - before,
        });
      }

      await Product.update({ reserved_quantity: after }, { where: { id: productId }, transaction });
    }

    if (apply) {
      await transaction.commit();
    } else {
      await transaction.rollback();
    }

    return report;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Imprime o relatorio do backfill em formato legivel.
 *
 * @param report - Relatorio gerado.
 * @param apply - Se as mudancas foram efetivamente gravadas.
 * @returns void
 */
function printReport(report: BackfillReport, apply: boolean): void {
  const line = '='.repeat(76);
  console.log('\n' + line);
  console.log(`BACKFILL G3 — reserva de material por OP  [${apply ? 'APLICADO' : 'DRY-RUN (nada gravado)'}]`);
  console.log(line);
  console.log(`OPs vivas (released/in_progress/paused) analisadas: ${report.ordersScanned}`);
  console.log(`OPs puladas por ja terem reserva migrada:           ${report.ordersSkippedAlreadyMigrated}`);
  console.log(`Linhas de reserva reconstruidas:                    ${report.reservationsCreated.length}`);

  if (report.ordersWithoutBom.length > 0) {
    console.log('\n⚠️  OPs VIVAS QUE NAO PUDERAM SER RECONSTRUIDAS (sem BOM ativa):');
    console.log('    Estas OPs seguem SEM reserva vinculada. Decida caso a caso:');
    console.log('    reativar a BOM do produto e rodar de novo, ou cancelar a OP.');
    for (const item of report.ordersWithoutBom) {
      console.log(`    - OP ${item.orderNumber} (id ${item.orderId}, produto ${item.productId}): ${item.reason}`);
    }
  }

  if (report.cacheChanges.length > 0) {
    console.log('\n⚠️  DIVERGENCIAS ENTRE O CONTADOR GLOBAL ANTIGO E A SOMA DAS RESERVAS:');
    console.log('    `diferenca` negativa = o contador antigo estava INFLADO (material estava');
    console.log('    indisponivel sem dono: OP removida em released, conclusao com quantidade');
    console.log('    zero antes do gap G2, etc). Positiva = o contador estava BAIXO demais.');
    console.log('    A origem dessas diferencas nao existe no banco e NAO foi inventada.');
    for (const change of report.cacheChanges) {
      console.log(
        `    - produto ${change.productCode} (id ${change.productId}): ` +
        `antes ${change.before} -> depois ${change.after} (diferenca ${change.difference > 0 ? '+' : ''}${change.difference})`
      );
    }
  } else {
    console.log('\n✅ Nenhuma divergencia de saldo reservado encontrada.');
  }

  if (!apply) {
    console.log('\nNada foi gravado. Revise o relatorio acima e rode de novo com --apply.');
  }
  console.log(line + '\n');
}

// CLI entry point
if (require.main === module) {
  const apply = process.argv.slice(2).includes('--apply');

  backfillProductionOrderReservations({ apply })
    .then((report) => {
      printReport(report, apply);
      return sequelize.close();
    })
    .catch(async (error) => {
      console.error('❌ Backfill G3 falhou (rollback aplicado):', error);
      await sequelize.close();
      process.exit(1);
    });
}

export { backfillProductionOrderReservations, LIVE_ORDER_STATUSES };
export type { BackfillReport, RebuiltReservation };
