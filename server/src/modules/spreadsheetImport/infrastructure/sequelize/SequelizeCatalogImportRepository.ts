/**
 * Implementação Sequelize do contrato de persistência da importação de
 * cadastro por planilha.
 *
 * Escreve nos DOIS cadastros que o ERP mantém hoje para o mesmo item físico:
 * `products` (legado — BOM, produção, vendas, estoque) e `items` (canônico —
 * requisição de compra, MRP, COMEX, rastreabilidade). Importar só um dos dois
 * deixa o material invisível para metade da fábrica, que é exatamente a
 * armadilha registrada no cabeçalho de
 * `tests/integration/e2e-cadeia-insumo-produto.test.ts`.
 *
 * @module modules/spreadsheetImport/infrastructure/sequelize/SequelizeCatalogImportRepository
 */

import type { Transaction } from 'sequelize';
import type {
  ArestaBom,
  BomAtiva,
  ICatalogImportRepository,
  ItemExistente,
  ItemGravavel,
  ProdutoExistente,
  ProdutoGravavel,
} from '../../domain/repositories/CatalogImportRepository';

const { Op } = require('sequelize');
const { BillOfMaterial, BillOfMaterialItem, Item, Product } = require('../../../../models/index');

/**
 * Remove as chaves com valor `undefined` de um objeto de gravação.
 *
 * Não é cosmético: o Sequelize inclui a coluna no `INSERT` quando a chave
 * existe, mesmo indefinida em alguns caminhos, e `null` numa coluna
 * `NOT NULL DEFAULT ...` **não** aplica o default — ele quebra o INSERT.
 * Podar aqui garante que célula em branco = coluna ausente = default do banco.
 *
 * @param dados - Objeto potencialmente com chaves indefinidas.
 * @returns Novo objeto apenas com as chaves preenchidas.
 */
function somenteDefinidos<T extends Record<string, unknown>>(dados: T): Partial<T> {
  const saida: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(dados)) {
    if (valor !== undefined && valor !== null) saida[chave] = valor;
  }
  return saida as Partial<T>;
}

/** Repositório de importação de catálogo apoiado nos models Sequelize. */
class SequelizeCatalogImportRepository implements ICatalogImportRepository {
  /** @inheritdoc */
  async findProdutosByCodigos(codigos: string[], transaction?: Transaction): Promise<Map<string, ProdutoExistente>> {
    const mapa = new Map<string, ProdutoExistente>();
    if (codigos.length === 0) return mapa;

    const linhas = await Product.findAll({
      where: { code: { [Op.in]: codigos } },
      attributes: ['id', 'code', 'name', 'product_type', 'unit'],
      transaction,
    });

    for (const linha of linhas) {
      mapa.set(String(linha.code).toUpperCase(), {
        id: Number(linha.id),
        code: String(linha.code),
        name: String(linha.name),
        product_type: linha.product_type,
        unit: String(linha.unit),
      });
    }
    return mapa;
  }

  /** @inheritdoc */
  async findItensByCodigos(codigos: string[], transaction?: Transaction): Promise<Map<string, ItemExistente>> {
    const mapa = new Map<string, ItemExistente>();
    if (codigos.length === 0) return mapa;

    const linhas = await Item.findAll({
      where: { codigo: { [Op.in]: codigos } },
      attributes: ['id', 'codigo', 'tipo'],
      transaction,
    });

    for (const linha of linhas) {
      mapa.set(String(linha.get('codigo')).toUpperCase(), {
        id: String(linha.get('id')),
        codigo: String(linha.get('codigo')),
        tipo: linha.get('tipo') as ItemExistente['tipo'],
      });
    }
    return mapa;
  }

  /** @inheritdoc */
  async criarProduto(dados: ProdutoGravavel, transaction: Transaction): Promise<number> {
    const criado = await Product.create(somenteDefinidos(dados as Record<string, unknown>), { transaction });
    return Number(criado.id);
  }

  /** @inheritdoc */
  async atualizarProduto(id: number, dados: ProdutoGravavel, transaction: Transaction): Promise<void> {
    const alteracoes = somenteDefinidos(dados as Record<string, unknown>);
    if (Object.keys(alteracoes).length === 0) return;
    await Product.update(alteracoes, { where: { id }, transaction });
  }

  /** @inheritdoc */
  async criarItem(dados: ItemGravavel, transaction: Transaction): Promise<string> {
    const criado = await Item.create(somenteDefinidos(dados as Record<string, unknown>), { transaction });
    return String(criado.get('id'));
  }

  /** @inheritdoc */
  async atualizarItem(id: string, dados: ItemGravavel, transaction: Transaction): Promise<void> {
    const alteracoes = somenteDefinidos(dados as Record<string, unknown>);
    if (Object.keys(alteracoes).length === 0) return;
    await Item.update(alteracoes, { where: { id }, transaction });
  }

  /** @inheritdoc */
  async findBomsAtivas(produtoIds: number[]): Promise<Map<number, BomAtiva>> {
    const mapa = new Map<number, BomAtiva>();
    if (produtoIds.length === 0) return mapa;

    const boms = await BillOfMaterial.findAll({
      where: { product_id: { [Op.in]: produtoIds }, status: 'active' },
      include: [{ model: BillOfMaterialItem, as: 'items' }],
    });

    for (const bom of boms) {
      mapa.set(Number(bom.product_id), {
        id: Number(bom.id),
        product_id: Number(bom.product_id),
        revision: String(bom.revision),
        itens: (bom.items ?? []).map((item: any) => ({
          component_product_id: Number(item.component_product_id),
          quantity: Number(item.quantity),
          unit: String(item.unit),
          scrap_percentage: Number(item.scrap_percentage),
        })),
      });
    }
    return mapa;
  }

  /** @inheritdoc */
  async findRevisoesBloqueantes(produtoId: number): Promise<string[]> {
    const boms = await BillOfMaterial.findAll({
      where: { product_id: produtoId, status: { [Op.ne]: 'inactive' } },
      attributes: ['revision'],
    });
    return boms.map((bom: any) => String(bom.revision));
  }

  /** @inheritdoc */
  async findArestasBomAtivas(): Promise<ArestaBom[]> {
    const boms = await BillOfMaterial.findAll({
      where: { status: 'active' },
      attributes: ['id', 'product_id'],
      include: [
        { model: Product, as: 'product', attributes: ['code'] },
        {
          model: BillOfMaterialItem,
          as: 'items',
          attributes: ['component_product_id'],
          include: [{ model: Product, as: 'componentProduct', attributes: ['code'] }],
        },
      ],
    });

    const arestas: ArestaBom[] = [];
    for (const bom of boms) {
      const produtoCodigo = bom.product?.code;
      if (!produtoCodigo) continue;
      for (const item of bom.items ?? []) {
        const componenteCodigo = item.componentProduct?.code;
        if (!componenteCodigo) continue;
        arestas.push({
          produtoCodigo: String(produtoCodigo).toUpperCase(),
          componenteCodigo: String(componenteCodigo).toUpperCase(),
        });
      }
    }
    return arestas;
  }
}

module.exports = SequelizeCatalogImportRepository;
