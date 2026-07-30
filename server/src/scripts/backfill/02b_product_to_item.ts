/**
 * Fase 2B: Backfill Product → Item + ItemDetalheComercial + ItemEspecificacaoTecnica
 *
 * Script transacional por lotes (100 produtos/transação):
 * - Para cada Product: cria/atualiza Item (mapeamento de campos)
 * - Cria ItemDetalheComercial com campos comerciais/fiscais
 * - Se Thiele-Small preenchido, cria ItemEspecificacaoTecnica
 * - Registra na crosswalk migracao_product_item_map
 * - Rollback automático por lote se falhar
 *
 * Uso: npm run backfill -- 02b [--start 0] [--limit 1000]
 * @module scripts/backfill/02b_product_to_item
 */

import { sequelize } from '../../config/database';
import { Product } from '../../models';
import Item from '../../models/Item';
import ItemDetalheComercial from '../../models/ItemDetalheComercial';
import ItemEspecificacaoTecnica from '../../models/ItemEspecificacaoTecnica';
import { v4 as uuidv4 } from 'uuid';

const LOTE_SIZE = 100;

interface BackfillStats {
  totalProducts: number;
  migratedItems: number;
  successLotes: number;
  failedLotes: number;
  errors: { loteIndex: number; error: string }[];
}

/**
 * Mapeia product_type (legado, em inglês) → ItemTipo (novo, em português)
 */
function mapProductTypeToItemTipo(
  productType: 'finished' | 'semi_finished' | 'component' | 'raw_material'
): 'PRODUTO_ACABADO' | 'SUBCONJUNTO' | 'MATERIA_PRIMA' {
  switch (productType) {
    case 'finished':
      return 'PRODUTO_ACABADO';
    case 'semi_finished':
      return 'SUBCONJUNTO';
    case 'component':
    case 'raw_material':
    default:
      return 'MATERIA_PRIMA';
  }
}

/**
 * Mapeia status legado → novo
 */
function mapProductStatusToItemStatus(status: 'active' | 'inactive'): 'ATIVO' | 'INATIVO' {
  return status === 'active' ? 'ATIVO' : 'INATIVO';
}

/**
 * Verifica se há algum parâmetro Thiele-Small preenchido (não null)
 */
function hasThieleSmallParams(product: any): boolean {
  const tsFields = [
    'ts_params_fs',
    'ts_params_qms',
    'ts_params_qes',
    'ts_params_qts',
    'ts_params_vas',
    'ts_params_sd',
    'ts_params_xmax',
    'ts_params_re',
    'ts_params_le',
    'ts_params_bl',
    'ts_params_mms',
    'ts_params_cms',
    'ts_params_spl',
  ];
  return tsFields.some((field) => product[field] !== null && product[field] !== undefined);
}

/**
 * Extrai parâmetros Thiele-Small de um Product para JSON
 */
function extractThieleSmallAtributos(product: any): Record<string, any> {
  return {
    fs: product.ts_params_fs,
    qms: product.ts_params_qms,
    qes: product.ts_params_qes,
    qts: product.ts_params_qts,
    vas: product.ts_params_vas,
    sd: product.ts_params_sd,
    xmax: product.ts_params_xmax,
    re: product.ts_params_re,
    le: product.ts_params_le,
    bl: product.ts_params_bl,
    mms: product.ts_params_mms,
    cms: product.ts_params_cms,
    spl: product.ts_params_spl,
  };
}

/**
 * Processa um lote de produtos (transação isolada)
 * Retorna { success: boolean, itemIds: string[] }
 */
async function processLote(
  products: any[],
  loteIndex: number
): Promise<{ success: boolean; itemIds: string[]; error?: string }> {
  const transaction = await sequelize.transaction();
  const itemIds: string[] = [];

  try {
    for (const product of products) {
      const itemId = uuidv4();
      itemIds.push(itemId);

      // 1. Criar/atualizar Item
      const item = await Item.create(
        {
          id: itemId,
          codigo: product.code,
          descricao: product.name,
          tipo: mapProductTypeToItemTipo(product.product_type),
          unidade: product.unit || 'un',
          status: mapProductStatusToItemStatus(product.status),
          estoque_atual: product.quantity.toString(),
          estoque_reservado: product.reserved_quantity.toString(),
          estoque_seguranca: product.min_quantity.toString(),
          lote_minimo: product.min_quantity.toString(),
          lead_time_dias: product.lead_time || 0,
          custo_padrao: product.cost_price.toString(),
          fornecedor_padrao_id: null,
        },
        { transaction }
      );

      // 2. Criar ItemDetalheComercial (obrigatório 1:1)
      await ItemDetalheComercial.create(
        {
          item_id: itemId,
          preco_venda: product.price.toString(),
          categoria_id: null, // TODO: mapear via crosswalk de categories em Fase 2B-bis
          ncm: product.ncm || '85182100',
          cest: product.cest,
          peso_kg: (product.weight || 0).toString(),
          localizacao_estoque: product.location,
          numero_desenho: product.drawing_number,
          revisao_tecnica: product.revision || '00',
          lote_rastreabilidade: product.lot_number,
          numero_serie: product.serial_number,
        },
        { transaction }
      );

      // 3. Se houver Thiele-Small, criar ItemEspecificacaoTecnica
      if (hasThieleSmallParams(product)) {
        await ItemEspecificacaoTecnica.create(
          {
            item_id: itemId,
            familia_tecnica: 'ALTO_FALANTE',
            atributos: extractThieleSmallAtributos(product),
          },
          { transaction }
        );
      }

      // 4. Registrar na crosswalk
      await sequelize.query(
        `INSERT INTO migracao_product_item_map (product_id, item_id, product_code, product_name, status, observacoes)
         VALUES (:product_id, :item_id, :product_code, :product_name, :status, :observacoes)`,
        {
          replacements: {
            product_id: product.id,
            item_id: itemId,
            product_code: product.code,
            product_name: product.name,
            status: 'SUCESSO',
            observacoes: `Migrado com ItemDetalheComercial${
              hasThieleSmallParams(product) ? ' + ItemEspecificacaoTecnica' : ''
            }`,
          },
          transaction,
          type: 'INSERT' as any,
        }
      );
    }

    await transaction.commit();
    return { success: true, itemIds };
  } catch (error) {
    await transaction.rollback();
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Lote ${loteIndex} falhou: ${errorMsg}`);

    // Registrar falha na crosswalk (sem transação)
    for (const product of products) {
      try {
        await sequelize.query(
          `INSERT INTO migracao_product_item_map (product_id, product_code, product_name, status, observacoes)
           VALUES (:product_id, :product_code, :product_name, :status, :observacoes)`,
          {
            replacements: {
              product_id: product.id,
              product_code: product.code,
              product_name: product.name,
              status: 'ERRO',
              observacoes: `Falha ao processar lote ${loteIndex}: ${errorMsg}`,
            },
            type: 'INSERT' as any,
          }
        );
      } catch (logError) {
        console.warn(
          `Não foi possível registrar falha do Product ${product.id} na crosswalk:`,
          logError
        );
      }
    }

    return { success: false, itemIds: [], error: errorMsg };
  }
}

/**
 * Executa backfill de todos os Products → Items em lotes
 */
async function backfillProductToItem(opts: { start?: number; limit?: number } = {}): Promise<void> {
  const startOffset = opts.start || 0;
  const limit = opts.limit || Infinity;

  console.log('🚀 Iniciando Fase 2B: Backfill Product → Item + Detalhes Comerciais');
  console.log(`   Offset: ${startOffset}, Limite: ${limit}`);

  const stats: BackfillStats = {
    totalProducts: 0,
    migratedItems: 0,
    successLotes: 0,
    failedLotes: 0,
    errors: [],
  };

  try {
    // Contar total de produtos
    const totalCount: any = await sequelize.query(
      'SELECT COUNT(*) as count FROM products',
      {
        type: 'SELECT' as any,
      }
    );
    const allCount = totalCount[0]?.count || 0;
    stats.totalProducts = Math.min(
      allCount,
      limit === Infinity ? allCount : limit
    );
    console.log(`📦 Total de produtos a migrar: ${stats.totalProducts}`);

    let offset = startOffset;
    let loteIndex = 0;

    while (offset < startOffset + (limit === Infinity ? stats.totalProducts : limit)) {
      // Buscar lote de produtos
      const products: any[] = await sequelize.query(
        'SELECT * FROM products ORDER BY id ASC LIMIT :limit OFFSET :offset',
        {
          replacements: { limit: LOTE_SIZE, offset },
          type: 'SELECT' as any,
        }
      );

      if (products.length === 0) break;

      console.log(
        `\n📋 Processando lote ${loteIndex} (${products.length} produtos, offset ${offset})...`
      );

      // Processar lote
      const result = await processLote(products, loteIndex);

      if (result.success) {
        stats.migratedItems += result.itemIds.length;
        stats.successLotes++;
        console.log(`✅ Lote ${loteIndex} concluído: ${result.itemIds.length} itens criados`);
      } else {
        stats.failedLotes++;
        stats.errors.push({
          loteIndex,
          error: result.error || 'Erro desconhecido',
        });
        console.error(`❌ Lote ${loteIndex} falhou, continuando próximas lotes...`);
      }

      offset += LOTE_SIZE;
      loteIndex++;
    }

    // Resumo final
    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMO DO BACKFILL (Fase 2B)');
    console.log('='.repeat(70));
    console.log(`Total de produtos processados: ${stats.totalProducts}`);
    console.log(`Itens criados com sucesso: ${stats.migratedItems}`);
    console.log(`Lotes bem-sucedidos: ${stats.successLotes}`);
    console.log(`Lotes com falha: ${stats.failedLotes}`);

    if (stats.errors.length > 0) {
      console.log('\n⚠️ ERROS ENCONTRADOS:');
      stats.errors.forEach(({ loteIndex, error }) => {
        console.log(`  Lote ${loteIndex}: ${error}`);
      });
    }

    if (stats.migratedItems === stats.totalProducts) {
      console.log('\n✅ BACKFILL CONCLUÍDO COM SUCESSO!');
      console.log(`   ${stats.migratedItems}/${stats.totalProducts} produtos migrados`);
    } else {
      console.log('\n⚠️ BACKFILL PARCIAL OU COM FALHAS');
      console.log(`   Sucesso: ${stats.migratedItems}/${stats.totalProducts}`);
      console.log(
        '   Próximas ações: verificar erros acima, corrigir, e reiniciar o backfill'
      );
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

  backfillProductToItem(opts);
}

export { backfillProductToItem, BackfillStats };
