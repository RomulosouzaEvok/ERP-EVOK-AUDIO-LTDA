/**
 * Fase 4.5b: Backfill production_lot_consumptions.item_id
 *
 * Script transacional por lotes (5000 registros/lote):
 * - Busca registros de production_lot_consumptions com item_id NULL
 * - Mapeia product_id → item_id via crosswalk migracao_product_item_map
 * - UPDATE production_lot_consumptions SET item_id = mapped_item_id
 * - Rollback automático por lote se falhar
 *
 * Uso: npx tsx server/src/scripts/backfill/04e_production_lot_consumptions_expand.ts [--start 0] [--limit 50000]
 */

import { sequelize } from '../../config/database';

const LOTE_SIZE = 5000;

interface BackfillStats {
  totalRows: number;
  backfilledRows: number;
  skippedRows: number;
  failedLotes: number;
  errors: { offset: number; error: string }[];
}

/**
 * Processa um lote de production_lot_consumptions (transação isolada)
 */
async function processLote(
  loteIndex: number,
  offset: number
): Promise<{
  success: boolean;
  backfilledCount: number;
  skippedCount: number;
  error?: string;
}> {
  const transaction = await sequelize.transaction();
  let backfilledCount = 0;
  let skippedCount = 0;

  try {
    // 1. Buscar lote de production_lot_consumptions com item_id NULL
    const rows: any[] = await sequelize.query(
      `SELECT id, product_id FROM production_lot_consumptions
       WHERE item_id IS NULL
       ORDER BY id ASC LIMIT :limit OFFSET :offset`,
      {
        replacements: { limit: LOTE_SIZE, offset },
        type: 'SELECT' as any,
        transaction,
      }
    );

    if (rows.length === 0) {
      await transaction.commit();
      return { success: true, backfilledCount: 0, skippedCount: 0 };
    }

    // 2. Para cada linha, buscar item_id via crosswalk
    for (const row of rows) {
      const mapping: any = await sequelize.query(
        `SELECT item_id FROM migracao_product_item_map
         WHERE product_id = :product_id AND status = 'SUCESSO'`,
        {
          replacements: { product_id: row.product_id },
          type: 'SELECT' as any,
          transaction,
        }
      );

      if (mapping.length > 0) {
        // Atualizar com item_id mapeado
        await sequelize.query(
          `UPDATE production_lot_consumptions SET item_id = :item_id WHERE id = :id`,
          {
            replacements: { id: row.id, item_id: mapping[0].item_id },
            type: 'UPDATE' as any,
            transaction,
          }
        );
        backfilledCount++;
      } else {
        // Produto não mapeado — deixar NULL, será capturado na validação como SKIP
        skippedCount++;
      }
    }

    await transaction.commit();
    return { success: true, backfilledCount, skippedCount };
  } catch (error) {
    await transaction.rollback();
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Lote ${loteIndex} falhou: ${errorMsg}`);

    return { success: false, backfilledCount: 0, skippedCount: 0, error: errorMsg };
  }
}

/**
 * Executa backfill de production_lot_consumptions.item_id via crosswalk
 */
async function backfillProductionLotConsumptionsExpand(opts: { start?: number; limit?: number } = {}): Promise<void> {
  const startOffset = opts.start || 0;
  const limit = opts.limit || Infinity;

  console.log('🚀 Iniciando Fase 4.5b: Backfill production_lot_consumptions.item_id (expand-contract)');
  console.log(`   Offset: ${startOffset}, Limite: ${limit}`);

  const stats: BackfillStats = {
    totalRows: 0,
    backfilledRows: 0,
    skippedRows: 0,
    failedLotes: 0,
    errors: [],
  };

  try {
    // Contar total de registros com item_id NULL
    const totalCount: any = await sequelize.query(
      'SELECT COUNT(*) as count FROM production_lot_consumptions WHERE item_id IS NULL',
      {
        type: 'SELECT' as any,
      }
    );
    stats.totalRows = totalCount[0]?.count || 0;

    console.log(`📦 Total de registros para backfill: ${stats.totalRows}`);

    if (stats.totalRows === 0) {
      console.log('✅ Nenhum registro para backfill (todos já têm item_id preenchido ou tabela vazia).');
      await sequelize.close();
      return;
    }

    let offset = startOffset;
    let loteIndex = 0;

    while (offset < startOffset + (limit === Infinity ? stats.totalRows : limit)) {
      console.log(`\n📋 Processando lote ${loteIndex} (offset ${offset})...`);

      const result = await processLote(loteIndex, offset);

      if (result.success) {
        stats.backfilledRows += result.backfilledCount;
        stats.skippedRows += result.skippedCount;
        console.log(
          `✅ Lote ${loteIndex} concluído: ${result.backfilledCount} backfilled, ${result.skippedCount} skipped`
        );
      } else {
        stats.failedLotes++;
        stats.errors.push({
          offset,
          error: result.error || 'Erro desconhecido',
        });
        console.error(`❌ Lote ${loteIndex} falhou, continuando próximas lotes...`);
      }

      offset += LOTE_SIZE;
      loteIndex++;
    }

    // Resumo final
    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMO DO BACKFILL (Fase 4.5b)');
    console.log('='.repeat(70));
    console.log(`Total de registros processados: ${stats.totalRows}`);
    console.log(`Backfilled com sucesso: ${stats.backfilledRows}`);
    console.log(`Skipped (sem mapeamento): ${stats.skippedRows}`);
    console.log(`Lotes falhados: ${stats.failedLotes}`);

    if (stats.errors.length > 0) {
      console.log('\n⚠️ ERROS ENCONTRADOS:');
      stats.errors.forEach(({ offset, error }) => {
        console.log(`  Offset ${offset}: ${error}`);
      });
    }

    if (stats.backfilledRows + stats.skippedRows === stats.totalRows) {
      console.log('\n✅ BACKFILL CONCLUÍDO COM SUCESSO!');
      console.log(`   ${stats.backfilledRows}/${stats.totalRows} registros preenchidos`);
      if (stats.skippedRows > 0) {
        console.log(`   ${stats.skippedRows} registros skipped (produtos órfãos)`);
      }
      console.log('\n📌 Próximo: Fase 4.5c (Validação SQL)');
    } else {
      console.log('\n⚠️ BACKFILL PARCIAL OU COM FALHAS');
      console.log(`   Processado: ${stats.backfilledRows + stats.skippedRows}/${stats.totalRows}`);
    }

    console.log('='.repeat(70) + '\n');
  } catch (error) {
    console.error('❌ Erro geral ao executar backfill:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const opts: { start?: number; limit?: number } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--start' && args[i + 1]) {
      opts.start = parseInt(args[i + 1], 10);
      i++;
    }
    if (args[i] === '--limit' && args[i + 1]) {
      opts.limit = parseInt(args[i + 1], 10);
      i++;
    }
  }

  backfillProductionLotConsumptionsExpand(opts);
}

export { backfillProductionLotConsumptionsExpand, BackfillStats };
