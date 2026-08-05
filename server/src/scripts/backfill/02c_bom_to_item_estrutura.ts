/**
 * Fase 2C: Backfill BillOfMaterial → ItemEstrutura
 *
 * Script transacional por BOM (tudo ou nada):
 * - Para cada BOM, busca Item pai via crosswalk
 * - Para cada BOMItem: busca Item componente, cria ItemEstrutura com hierarquia
 * - Calcula total_cost = qty × unit_cost × (1 + scrap%)
 * - Resolve parent_item_estrutura_id via autorelacionamento
 * - Registra na migracao_bom_log com status SUCESSO/ERRO
 * - Rollback automático se BOM falhar
 *
 * Uso: npm run backfill -- 02c [--start 0] [--limit 1000]
 * @module scripts/backfill/02c_bom_to_item_estrutura
 */

import { sequelize } from '../../config/database';
import { BillOfMaterial, BillOfMaterialItem } from '../../models';
import ItemEstrutura from '../../models/ItemEstrutura';
import { v4 as uuidv4 } from 'uuid';
import { Decimal } from 'decimal.js';

interface BackfillStats {
  totalBoms: number;
  migratedBoms: number;
  migratedItemStructures: number;
  successBoms: number;
  failedBoms: number;
  errors: { bomId: number; error: string }[];
}

/**
 * Mapeia component_type (igual em ambos)
 */
function mapComponentType(
  type: 'raw_material' | 'component' | 'semi_finished' | 'packaging' | 'consumable' | 'other'
): 'raw_material' | 'component' | 'semi_finished' | 'packaging' | 'consumable' | 'other' {
  return type; // Mapeamento direto, pois enums são iguais
}

/**
 * Calcula total_cost com scrap: qty × unit_cost × (1 + scrap% / 100)
 */
function calculateTotalCost(quantity: string, unitCost: string, scrapPercent: string): string {
  try {
    const qty = new Decimal(quantity);
    const uc = new Decimal(unitCost);
    const scrap = new Decimal(scrapPercent || 0);

    // total = qty × unit_cost × (1 + scrap/100)
    const scrapFactor = new Decimal(1).plus(scrap.div(100));
    const total = qty.times(uc).times(scrapFactor);

    return total.toString();
  } catch (error) {
    console.warn(
      `Erro ao calcular total_cost (qty=${quantity}, uc=${unitCost}, scrap=${scrapPercent}):`,
      error
    );
    // Fallback: qty × unit_cost
    try {
      return new Decimal(quantity).times(unitCost).toString();
    } catch {
      return '0';
    }
  }
}

/**
 * Processa uma BOM completa (transação isolada)
 * Retorna { success: boolean, migratedCount: number, error?: string }
 */
async function processBom(
  bom: any,
  bomIndex: number
): Promise<{
  success: boolean;
  migratedCount: number;
  error?: string;
  estruturaIds?: Record<number, string>;
}> {
  const transaction = await sequelize.transaction();
  const estruturaIds: Record<number, string> = {}; // bom_item_id → item_estrutura_id (para resolver hierarquia)
  let migratedCount = 0;

  try {
    // 1. Buscar Item pai (produto final desta BOM)
    const parentMapping: any = await sequelize.query(
      'SELECT item_id FROM migracao_product_item_map WHERE product_id = :product_id LIMIT 1',
      {
        replacements: { product_id: bom.product_id },
        type: 'SELECT' as any,
        transaction,
      }
    );

    if (!parentMapping || parentMapping.length === 0) {
      throw new Error(
        `Produto pai (Product.id=${bom.product_id}) não encontrado na crosswalk de Product→Item`
      );
    }

    const itemPaiId = parentMapping[0].item_id;

    // 2. Buscar todos os BOMItems ordenados por nível + sequência
    const bomItems: any[] = await sequelize.query(
      `SELECT * FROM bill_of_material_items
       WHERE bom_id = :bom_id
       ORDER BY bom_level ASC, sequence_order ASC`,
      {
        replacements: { bom_id: bom.id },
        type: 'SELECT' as any,
        transaction,
      }
    );

    if (bomItems.length === 0) {
      // BOM vazio é permitido, apenas registra
      await sequelize.query(
        `INSERT INTO migracao_bom_log (bill_of_material_id, status, mensagem_erro, processado_em)
         VALUES (:bom_id, :status, :msg, now())`,
        {
          replacements: {
            bom_id: bom.id,
            status: 'SUCESSO',
            msg: 'BOM vazia (sem itens)',
          },
          transaction,
          type: 'INSERT' as any,
        }
      );
      await transaction.commit();
      return { success: true, migratedCount: 0, estruturaIds };
    }

    // 3. Processar cada BOMItem
    for (const bomItem of bomItems) {
      const estruturaId = uuidv4();
      estruturaIds[bomItem.id] = estruturaId; // Registra para resolver hierarquia

      // Buscar componente na crosswalk
      const componentMapping: any = await sequelize.query(
        'SELECT item_id FROM migracao_product_item_map WHERE product_id = :product_id LIMIT 1',
        {
          replacements: { product_id: bomItem.component_product_id },
          type: 'SELECT' as any,
          transaction,
        }
      );

      if (!componentMapping || componentMapping.length === 0) {
        // Componente não migrado — log e skip
        await sequelize.query(
          `INSERT INTO migracao_bom_log (bill_of_material_id, bill_of_material_item_id, status, mensagem_erro, processado_em)
           VALUES (:bom_id, :bom_item_id, :status, :msg, now())`,
          {
            replacements: {
              bom_id: bom.id,
              bom_item_id: bomItem.id,
              status: 'SKIP',
              msg: `Componente (Product.id=${bomItem.component_product_id}) não encontrado na crosswalk`,
            },
            transaction,
            type: 'INSERT' as any,
          }
        );
        continue; // Pula este item
      }

      const itemComponenteId = componentMapping[0].item_id;

      // Resolver parent_item_estrutura_id (se houver parent_item_id)
      let parentItemEstruturaId: string | null = null;
      if (bomItem.parent_item_id !== null && estruturaIds[bomItem.parent_item_id]) {
        parentItemEstruturaId = estruturaIds[bomItem.parent_item_id];
      }

      // Calcular total_cost
      const totalCost = calculateTotalCost(
        bomItem.quantity.toString(),
        bomItem.unit_cost.toString(),
        bomItem.scrap_percentage.toString()
      );

      // approved_by agora e INTEGER com FK para users(id): copia direta.
      const approvedById: number | null = bom.approved_by ?? null;

      // criado_por: bill_of_materials.created_by (INTEGER, FK -> users.id) mapeia
      // diretamente para item_estruturas.criado_por (mesmo tipo/FK). Origem existe
      // no legado (BillOfMaterial.created_by), então isso é um mapeamento real,
      // não um dado ausente.
      const criadoPorId: number | null = bom.created_by ?? null;

      // alternative_product_id: resolvido via crosswalk migracao_product_item_map
      // (mesma crosswalk usada para item_componente_id acima). Se o produto
      // substituto legado não tiver sido migrado para Item (órfão), o campo fica
      // null + log de aviso — não interrompe o processamento da BOM.
      let alternativeItemId: string | null = null;
      if (bomItem.alternative_product_id !== null && bomItem.alternative_product_id !== undefined) {
        const alternativeMapping: any = await sequelize.query(
          'SELECT item_id FROM migracao_product_item_map WHERE product_id = :product_id LIMIT 1',
          {
            replacements: { product_id: bomItem.alternative_product_id },
            type: 'SELECT' as any,
            transaction,
          }
        );

        if (alternativeMapping && alternativeMapping.length > 0) {
          alternativeItemId = alternativeMapping[0].item_id;
        } else {
          console.warn(
            `⚠️ BOMItem ${bomItem.id}: alternative_product_id legado ${bomItem.alternative_product_id} não encontrado em migracao_product_item_map. alternative_product_id ficará null.`
          );
        }
      }

      // Criar ItemEstrutura
      await ItemEstrutura.create(
        {
          id: estruturaId,
          item_pai_id: itemPaiId,
          item_componente_id: itemComponenteId,
          quantidade: bomItem.quantity.toString(),
          perda_percentual: (bomItem.scrap_percentage || 0).toString(),
          nivel: bomItem.bom_level || 1,
          sequencia: bomItem.sequence_order || 0,
          ativo: bom.status !== 'inactive',
          revisao: bom.revision || '00',
          observacoes: bomItem.notes,
          criado_por: criadoPorId,
          status: bom.status,
          approved_by: approvedById,
          approval_date: bom.approval_date,
          unit_cost: bomItem.unit_cost.toString(),
          total_cost: totalCost,
          parent_item_estrutura_id: parentItemEstruturaId,
          component_type: mapComponentType(bomItem.component_type),
          is_critical: bomItem.is_critical || false,
          alternative_product_id: alternativeItemId,
        },
        { transaction }
      );

      // Registrar na auditoria
      await sequelize.query(
        `INSERT INTO migracao_bom_log (bill_of_material_id, bill_of_material_item_id, item_estrutura_id, status, processado_em)
         VALUES (:bom_id, :bom_item_id, :estrutura_id, :status, now())`,
        {
          replacements: {
            bom_id: bom.id,
            bom_item_id: bomItem.id,
            estrutura_id: estruturaId,
            status: 'SUCESSO',
          },
          transaction,
          type: 'INSERT' as any,
        }
      );

      migratedCount++;
    }

    await transaction.commit();
    return { success: true, migratedCount, estruturaIds };
  } catch (error) {
    await transaction.rollback();
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ BOM ${bom.id} (Produto ${bom.product_id}) falhou: ${errorMsg}`);

    // Registrar falha na auditoria
    try {
      await sequelize.query(
        `INSERT INTO migracao_bom_log (bill_of_material_id, status, mensagem_erro, processado_em)
         VALUES (:bom_id, :status, :msg, now())`,
        {
          replacements: {
            bom_id: bom.id,
            status: 'ERRO',
            msg: `Falha ao processar BOM ${bomIndex}: ${errorMsg}`,
          },
          type: 'INSERT' as any,
        }
      );
    } catch (logError) {
      console.warn(`Não foi possível registrar falha da BOM ${bom.id}:`, logError);
    }

    return { success: false, migratedCount: 0, error: errorMsg };
  }
}

/**
 * Executa backfill de todas as BOMs → ItemEstrutura
 */
async function backfillBomToItemEstrutura(opts: { start?: number; limit?: number } = {}): Promise<void> {
  const startOffset = opts.start || 0;
  const limit = opts.limit || Infinity;

  console.log('🚀 Iniciando Fase 2C: Backfill BOM → ItemEstrutura');
  console.log(`   Offset: ${startOffset}, Limite: ${limit}`);

  const stats: BackfillStats = {
    totalBoms: 0,
    migratedBoms: 0,
    migratedItemStructures: 0,
    successBoms: 0,
    failedBoms: 0,
    errors: [],
  };

  try {
    // Contar total de BOMs
    const totalCount: any = await sequelize.query(
      'SELECT COUNT(*) as count FROM bill_of_materials',
      {
        type: 'SELECT' as any,
      }
    );
    stats.totalBoms = totalCount[0]?.count || 0;
    const bomLimit = limit === Infinity ? stats.totalBoms : Math.min(limit, stats.totalBoms);
    console.log(`📦 Total de BOMs a migrar: ${stats.totalBoms}`);

    if (stats.totalBoms === 0) {
      console.log('✅ Nenhuma BOM para migrar.');
      await sequelize.close();
      return;
    }

    // Buscar todas as BOMs
    const boms: any[] = await sequelize.query(
      'SELECT * FROM bill_of_materials ORDER BY id ASC LIMIT :limit OFFSET :offset',
      {
        replacements: { limit: Math.min(limit, 10000), offset: startOffset },
        type: 'SELECT' as any,
      }
    );

    console.log(`\n📋 Processando ${boms.length} BOMs...`);

    for (let i = 0; i < boms.length; i++) {
      const bom = boms[i];
      console.log(`\n[${i + 1}/${boms.length}] Processando BOM ${bom.id} (Produto ${bom.product_id})...`);

      const result = await processBom(bom, i);

      if (result.success) {
        stats.migratedBoms++;
        stats.migratedItemStructures += result.migratedCount;
        stats.successBoms++;
        console.log(
          `✅ BOM ${bom.id} concluída: ${result.migratedCount} ItemEstrutura(s) criada(s)`
        );
      } else {
        stats.failedBoms++;
        stats.errors.push({
          bomId: bom.id,
          error: result.error || 'Erro desconhecido',
        });
        console.error(`❌ BOM ${bom.id} falhou`);
      }
    }

    // Resumo final
    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMO DO BACKFILL (Fase 2C)');
    console.log('='.repeat(70));
    console.log(`Total de BOMs processadas: ${stats.totalBoms}`);
    console.log(`BOMs migradas com sucesso: ${stats.migratedBoms}`);
    console.log(`ItemEstrutura(s) criada(s): ${stats.migratedItemStructures}`);
    console.log(`BOMs com falha: ${stats.failedBoms}`);

    if (stats.errors.length > 0) {
      console.log('\n⚠️ ERROS ENCONTRADOS:');
      stats.errors.forEach(({ bomId, error }) => {
        console.log(`  BOM ${bomId}: ${error}`);
      });
    }

    if (stats.migratedBoms === stats.totalBoms) {
      console.log('\n✅ BACKFILL CONCLUÍDO COM SUCESSO!');
      console.log(`   ${stats.migratedBoms}/${stats.totalBoms} BOMs migradas`);
      console.log(`   ${stats.migratedItemStructures} ItemEstrutura(s) criada(s)`);
      console.log('\n📌 Próximo: Fase 2D (Validação pós-backfill)');
    } else {
      console.log('\n⚠️ BACKFILL PARCIAL OU COM FALHAS');
      console.log(`   Sucesso: ${stats.migratedBoms}/${stats.totalBoms}`);
    }

    console.log('='.repeat(70) + '\n');
  } catch (error) {
    console.error('❌ Erro geral ao executar backfill de BOM:', error);
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

  backfillBomToItemEstrutura(opts);
}

export { backfillBomToItemEstrutura, BackfillStats };
