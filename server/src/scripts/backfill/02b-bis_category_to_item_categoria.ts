/**
 * Fase 2B-bis: Backfill Category → ItemCategoria
 *
 * Script simples para migrar product_categories legadas para item_categorias novas.
 * Cria crosswalk categoria_map para referência futura.
 *
 * Uso: npm run backfill -- 02b-bis
 * @module scripts/backfill/02b-bis_category_to_item_categoria
 */

import { sequelize } from '../../config/database';
import ItemCategoria from '../../models/ItemCategoria';
import { v4 as uuidv4 } from 'uuid';

interface CategoryBackfillStats {
  totalCategories: number;
  migratedCategories: number;
  errors: string[];
}

/**
 * Migra product_categories → item_categorias
 * Transacional (tudo ou nada)
 */
async function backfillCategoryToItemCategoria(): Promise<void> {
  const transaction = await sequelize.transaction();
  const stats: CategoryBackfillStats = {
    totalCategories: 0,
    migratedCategories: 0,
    errors: [],
  };

  console.log('🚀 Iniciando Fase 2B-bis: Backfill Category → ItemCategoria');

  try {
    // Buscar todas as categorias legadas
    const categories: any[] = await sequelize.query(
      'SELECT id, name, description FROM product_categories ORDER BY id ASC',
      {
        type: 'SELECT' as any,
      }
    );

    stats.totalCategories = categories.length;
    console.log(`📦 Total de categorias a migrar: ${stats.totalCategories}`);

    // Criar tabela temporária de mapeamento se não existir
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS migracao_categoria_map (
        product_category_id INT NOT NULL UNIQUE,
        item_categoria_id UUID NOT NULL UNIQUE REFERENCES item_categorias(id),
        mapeado_em TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      { transaction }
    );

    for (const category of categories) {
      try {
        const newCategoryId = uuidv4();

        // Gerar código único a partir do ID legado + nome
        const codigo = `CAT-${category.id}-${category.name.substring(0, 10).toUpperCase()}`.substring(
          0,
          50
        );

        // Criar ItemCategoria
        await ItemCategoria.create(
          {
            id: newCategoryId,
            codigo,
            descricao: category.name,
          },
          { transaction }
        );

        // Registrar no mapeamento
        await sequelize.query(
          `INSERT INTO migracao_categoria_map (product_category_id, item_categoria_id)
           VALUES (:old_id, :new_id)`,
          {
            replacements: {
              old_id: category.id,
              new_id: newCategoryId,
            },
            transaction,
            type: 'INSERT' as any,
          }
        );

        stats.migratedCategories++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        stats.errors.push(`Categoria ${category.id} (${category.name}): ${msg}`);
      }
    }

    await transaction.commit();

    // Resumo final
    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMO DO BACKFILL (Fase 2B-bis)');
    console.log('='.repeat(70));
    console.log(`Total de categorias processadas: ${stats.totalCategories}`);
    console.log(`Categorias criadas com sucesso: ${stats.migratedCategories}`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️ ERROS (${stats.errors.length}):`);
      stats.errors.forEach((err) => console.log(`  - ${err}`));
    } else if (stats.migratedCategories === stats.totalCategories) {
      console.log('\n✅ BACKFILL CONCLUÍDO COM SUCESSO!');
      console.log(`   ${stats.migratedCategories}/${stats.totalCategories} categorias migradas`);
      console.log('\n📌 Próximo: Executar Fase 2B para migrar Products');
    }

    console.log('='.repeat(70) + '\n');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erro ao executar backfill de categorias:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// CLI entry point
if (require.main === module) {
  backfillCategoryToItemCategoria();
}

export { backfillCategoryToItemCategoria, CategoryBackfillStats };
