/**
 * Porta de persistência da importação de cadastro por planilha.
 *
 * A camada de aplicação depende deste contrato, nunca do Sequelize — é o que
 * permite testar a validação inteira (que é onde mora a regra) sem banco, e
 * ao mesmo tempo exercitar a implementação real no teste de integração.
 *
 * @module modules/spreadsheetImport/domain/repositories/CatalogImportRepository
 */

import type { Transaction } from 'sequelize';
import type { ItemTipoLiteral, ProductTypeLiteral } from '../catalogSpreadsheetSchema';

/** Retrato mínimo de um produto já cadastrado, para decidir criar × atualizar. */
export interface ProdutoExistente {
  id: number;
  code: string;
  name: string;
  product_type: ProductTypeLiteral;
  unit: string;
}

/** Retrato mínimo de um item canônico já cadastrado. */
export interface ItemExistente {
  id: string;
  codigo: string;
  tipo: ItemTipoLiteral;
}

/**
 * Campos graváveis em `products`.
 *
 * **Todos opcionais e nunca `null`.** As colunas correspondentes são
 * `NOT NULL DEFAULT ...` no PostgreSQL: mandar `null` explícito não usa o
 * default, viola a constraint e derruba o INSERT — foi essa exata classe de
 * defeito que quebrou `POST /api/sales` e `POST /api/suppliers` (`5f47cf1`).
 * Célula em branco na planilha vira `undefined`, que o Sequelize omite do
 * INSERT, deixando o default do banco valer.
 */
export interface ProdutoGravavel {
  code?: string;
  name?: string;
  description?: string;
  product_type?: ProductTypeLiteral;
  unit?: string;
  price?: number;
  cost_price?: number;
  min_quantity?: number;
  lead_time?: number;
  ncm?: string;
  cest?: string;
  weight?: number;
  location?: string;
  drawing_number?: string;
  revision?: string;
}

/** Campos graváveis em `items` (mesma regra de `undefined` acima). */
export interface ItemGravavel {
  codigo?: string;
  descricao?: string;
  tipo?: ItemTipoLiteral;
  unidade?: string;
  custo_padrao?: number;
  estoque_seguranca?: number;
  lote_minimo?: number;
  lead_time_dias?: number;
}

/** Um componente de uma estrutura já cadastrada, para comparação de igualdade. */
export interface ComponenteBomExistente {
  component_product_id: number;
  quantity: number;
  unit: string;
  scrap_percentage: number;
}

/** A estrutura vigente de um produto. */
export interface BomAtiva {
  id: number;
  product_id: number;
  revision: string;
  itens: ComponenteBomExistente[];
}

/**
 * Aresta produto → componente das estruturas vigentes, **em código**.
 *
 * Código e não id porque a planilha traz produtos que ainda não existem (não
 * têm id) e a detecção de ciclo precisa avaliar o grafo resultante da união
 * "o que já está no banco" + "o que a planilha propõe" num espaço de chaves
 * único.
 */
export interface ArestaBom {
  produtoCodigo: string;
  componenteCodigo: string;
}

/** Contrato de persistência da importação. */
export interface ICatalogImportRepository {
  /**
   * Busca produtos por código.
   *
   * @param codigos - Códigos exatamente como na planilha.
   * @param transaction - Transação em curso, quando houver.
   * @returns Mapa `código em maiúsculas → produto`.
   */
  findProdutosByCodigos(codigos: string[], transaction?: Transaction): Promise<Map<string, ProdutoExistente>>;

  /**
   * Busca itens canônicos por código.
   *
   * @param codigos - Códigos exatamente como na planilha.
   * @param transaction - Transação em curso, quando houver.
   * @returns Mapa `código em maiúsculas → item`.
   */
  findItensByCodigos(codigos: string[], transaction?: Transaction): Promise<Map<string, ItemExistente>>;

  /**
   * Insere um produto.
   *
   * @param dados - Campos a gravar (sem `null`).
   * @param transaction - Transação da importação.
   * @returns Id gerado.
   */
  criarProduto(dados: ProdutoGravavel, transaction: Transaction): Promise<number>;

  /**
   * Atualiza um produto existente.
   *
   * @param id - Id do produto.
   * @param dados - Campos a alterar (sem `null`).
   * @param transaction - Transação da importação.
   */
  atualizarProduto(id: number, dados: ProdutoGravavel, transaction: Transaction): Promise<void>;

  /**
   * Insere um item canônico.
   *
   * @param dados - Campos a gravar (sem `null`).
   * @param transaction - Transação da importação.
   * @returns Id (UUID) gerado.
   */
  criarItem(dados: ItemGravavel, transaction: Transaction): Promise<string>;

  /**
   * Atualiza um item canônico existente.
   *
   * @param id - UUID do item.
   * @param dados - Campos a alterar (sem `null`).
   * @param transaction - Transação da importação.
   */
  atualizarItem(id: string, dados: ItemGravavel, transaction: Transaction): Promise<void>;

  /**
   * Carrega a estrutura vigente (`status = 'active'`) de cada produto pedido.
   *
   * @param produtoIds - Ids dos produtos.
   * @returns Mapa `product_id → estrutura vigente`.
   */
  findBomsAtivas(produtoIds: number[]): Promise<Map<number, BomAtiva>>;

  /**
   * Lista as revisões de estrutura já usadas por um produto e que **bloqueiam**
   * a criação de uma nova com o mesmo rótulo (tudo que não está `inactive`,
   * mesma regra de `BomService.createBOM`).
   *
   * @param produtoId - Id do produto.
   * @returns Rótulos de revisão em uso.
   */
  findRevisoesBloqueantes(produtoId: number): Promise<string[]>;

  /**
   * Lista todas as arestas produto → componente das estruturas vigentes, para
   * que a validação detecte ciclo considerando também o que já está no banco
   * (e não apenas o que veio na planilha).
   *
   * @returns Arestas das BOMs `active`.
   */
  findArestasBomAtivas(): Promise<ArestaBom[]>;
}
