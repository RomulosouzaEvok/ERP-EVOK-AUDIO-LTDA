/**
 * Contrato das planilhas de importação de cadastro (insumos, produtos e
 * estrutura), em português, do ponto de vista de quem PREENCHE — não do
 * banco.
 *
 * Este arquivo é a fonte única de verdade dos cabeçalhos: os arquivos-modelo
 * servidos por `GET /api/catalog-import/modelos/*.csv` e os validadores são
 * gerados a partir daqui, de modo que planilha e validação não podem
 * divergir.
 *
 * ## Por que dois arquivos e não duas abas
 *
 * O ERP não tem (nem passa a ter) dependência de leitura de `.xlsx`: o
 * pacote `xlsx`/SheetJS é pesado, está fora do registro público do npm nas
 * versões corrigidas e traz um parser binário inteiro para dentro do
 * servidor só para ler duas tabelas. CSV é lido e escrito nativamente pelo
 * Excel (Arquivo → Salvar como → "CSV UTF-8"), e um CSV não tem abas — daí
 * **um arquivo por conceito**.
 *
 * @module modules/spreadsheetImport/domain/catalogSpreadsheetSchema
 */

/** `product_type` do model `Product` (mesmo ENUM `enum_products_product_type`). */
export type ProductTypeLiteral = 'finished' | 'semi_finished' | 'component' | 'raw_material';

/** `tipo` do model `Item` (mesmo ENUM `item_tipo`). */
export type ItemTipoLiteral =
  | 'MATERIA_PRIMA'
  | 'SUBCONJUNTO'
  | 'PRODUTO_ACABADO'
  | 'USO_E_CONSUMO'
  | 'ATIVO_IMOBILIZADO';

/** Tradução de um rótulo de tipo em português para os dois cadastros do ERP. */
export interface TipoDescriptor {
  /** Rótulo canônico mostrado no modelo e nas mensagens de erro. */
  rotulo: string;
  /** Valor gravado em `products.product_type`. */
  productType: ProductTypeLiteral;
  /** Valor gravado em `items.tipo`. */
  itemTipo: ItemTipoLiteral;
  /** Explicação curta em linguagem de usuário final (usada no modelo e no manual). */
  explicacao: string;
}

/**
 * Classe de caracteres dos diacríticos combinantes (U+0300–U+036F) gerados
 * pela forma NFD. Construída por código em vez de literal porque, escrita
 * direto no fonte, a faixa fica invisível no editor e some em qualquer
 * ferramenta que normalize o arquivo para NFC.
 */
const DIACRITICOS_COMBINANTES = new RegExp(
  `[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`,
  'g',
);

/**
 * Normaliza um texto para comparação tolerante: remove acentos, colapsa
 * separadores (espaço, hífen, sublinhado, ponto) e passa para maiúsculas.
 *
 * Existe para que "Matéria-Prima", "materia prima" e "MATERIA_PRIMA" sejam o
 * mesmo valor — o dono preenche a planilha à mão e não deve ser recusado por
 * um acento.
 *
 * @param value - Texto bruto vindo da célula ou do cabeçalho.
 * @returns Texto normalizado (`''` quando a entrada é vazia/indefinida).
 */
export function normalizeLabel(value: string | undefined | null): string {
  if (value === undefined || value === null) return '';
  return String(value)
    .normalize('NFD')
    .replace(DIACRITICOS_COMBINANTES, '')
    .replace(/[\s._-]+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Tipos aceitos na coluna `tipo` de `produtos.csv`, com os sinônimos que o
 * dono provavelmente vai digitar.
 *
 * Os pares `productType`/`itemTipo` seguem exatamente o mapeamento já usado
 * pelo backfill oficial `src/scripts/backfill/02b_product_to_item.ts` — em
 * particular `COMPONENTE → component / MATERIA_PRIMA`, porque o ENUM
 * `item_tipo` não tem um valor "COMPONENTE".
 */
export const TIPOS_ACEITOS: readonly TipoDescriptor[] = [
  {
    rotulo: 'PRODUTO ACABADO',
    productType: 'finished',
    itemTipo: 'PRODUTO_ACABADO',
    explicacao: 'Item que a fábrica vende. É o único tipo que pode ter estrutura própria (lista de componentes).',
  },
  {
    rotulo: 'SUBCONJUNTO',
    productType: 'semi_finished',
    itemTipo: 'SUBCONJUNTO',
    explicacao: 'Conjunto montado internamente que ainda não é o produto final e não é vendido avulso.',
  },
  {
    rotulo: 'COMPONENTE',
    productType: 'component',
    itemTipo: 'MATERIA_PRIMA',
    explicacao: 'Peça comprada pronta e montada no produto (ex.: ímã, carcaça, terminais).',
  },
  {
    rotulo: 'MATERIA-PRIMA',
    productType: 'raw_material',
    itemTipo: 'MATERIA_PRIMA',
    explicacao: 'Insumo transformado na fábrica (ex.: papel de cone, fio de cobre, cola).',
  },
  {
    rotulo: 'USO E CONSUMO',
    productType: 'raw_material',
    itemTipo: 'USO_E_CONSUMO',
    explicacao: 'Material que não vai para o produto (ex.: EPI, material de limpeza, ferramenta de consumo).',
  },
];

/** Sinônimos aceitos por tipo, além do próprio rótulo canônico. */
const SINONIMOS_DE_TIPO: Record<string, string> = {
  ACABADO: 'PRODUTO ACABADO',
  'PRODUTO FINAL': 'PRODUTO ACABADO',
  'PRODUTO ACABADO': 'PRODUTO ACABADO',
  FINISHED: 'PRODUTO ACABADO',
  SUBCONJUNTO: 'SUBCONJUNTO',
  'SEMI ACABADO': 'SUBCONJUNTO',
  SEMIACABADO: 'SUBCONJUNTO',
  MONTAGEM: 'SUBCONJUNTO',
  COMPONENTE: 'COMPONENTE',
  PECA: 'COMPONENTE',
  'MATERIA PRIMA': 'MATERIA-PRIMA',
  MATERIAPRIMA: 'MATERIA-PRIMA',
  INSUMO: 'MATERIA-PRIMA',
  'USO E CONSUMO': 'USO E CONSUMO',
  CONSUMO: 'USO E CONSUMO',
  'USO CONSUMO': 'USO E CONSUMO',
};

/**
 * Resolve o rótulo digitado na coluna `tipo` para o descritor canônico.
 *
 * @param value - Conteúdo bruto da célula `tipo`.
 * @returns Descritor correspondente, ou `undefined` se o valor não for reconhecido.
 */
export function resolveTipo(value: string | undefined | null): TipoDescriptor | undefined {
  const normalized = normalizeLabel(value);
  if (!normalized) return undefined;
  const canonical = SINONIMOS_DE_TIPO[normalized] ?? normalized;
  return TIPOS_ACEITOS.find((tipo) => normalizeLabel(tipo.rotulo) === normalizeLabel(canonical));
}

/** Lista dos rótulos canônicos, para mensagens de erro. */
export const ROTULOS_DE_TIPO: readonly string[] = TIPOS_ACEITOS.map((tipo) => tipo.rotulo);

/** Definição de uma coluna de planilha. */
export interface ColumnSpec {
  /** Cabeçalho exato esperado no arquivo (também aceito sem acento/maiúscula). */
  nome: string;
  /** Se a célula precisa estar preenchida em toda linha. */
  obrigatoria: boolean;
  /** Texto de ajuda usado no manual e no cabeçalho comentado do modelo. */
  ajuda: string;
}

/**
 * Colunas de `produtos.csv` (o cadastro em si).
 *
 * **Não existe coluna de saldo de estoque de propósito.** Saldo é resultado
 * de movimentação (entrada, ajuste, inventário) e precisa deixar rastro em
 * `inventory_movements`; se a planilha escrevesse `products.quantity` direto,
 * o ERP ficaria com um saldo que nenhum documento explica. O saldo inicial
 * entra por Estoque → Movimentações, depois do cadastro.
 */
export const COLUNAS_PRODUTOS: readonly ColumnSpec[] = [
  { nome: 'codigo', obrigatoria: true, ajuda: 'Código interno da fábrica. É a chave: reimportar a mesma planilha atualiza, não duplica. Até 50 caracteres.' },
  { nome: 'descricao', obrigatoria: true, ajuda: 'Nome do item como aparece nas telas e nos documentos. Até 200 caracteres.' },
  { nome: 'tipo', obrigatoria: true, ajuda: `Um de: ${ROTULOS_DE_TIPO.join(' / ')}.` },
  { nome: 'unidade', obrigatoria: true, ajuda: 'Unidade de medida: un, kg, m, l, pc... Até 10 caracteres.' },
  { nome: 'preco_venda', obrigatoria: false, ajuda: 'Preço de venda. Deixe em branco no que a fábrica não vende.' },
  { nome: 'custo_padrao', obrigatoria: false, ajuda: 'Custo unitário de referência, usado para custear a estrutura.' },
  { nome: 'estoque_minimo', obrigatoria: false, ajuda: 'Ponto de reposição: abaixo disso o ERP alerta. Não é saldo.' },
  { nome: 'lote_minimo', obrigatoria: false, ajuda: 'Lote mínimo de compra/produção usado pelo MRP.' },
  { nome: 'lead_time_dias', obrigatoria: false, ajuda: 'Prazo em dias entre pedir e ter o material disponível.' },
  { nome: 'ncm', obrigatoria: false, ajuda: 'NCM fiscal, 8 dígitos. Em branco, o ERP grava o padrão da fábrica (85182100) e avisa no relatório.' },
  { nome: 'cest', obrigatoria: false, ajuda: 'CEST fiscal, 7 dígitos. Em branco fica vazio.' },
  { nome: 'peso_kg', obrigatoria: false, ajuda: 'Peso unitário em quilos.' },
  { nome: 'localizacao', obrigatoria: false, ajuda: 'Endereço físico no almoxarifado (ex.: RUA A - PRAT 3).' },
  { nome: 'desenho', obrigatoria: false, ajuda: 'Número do desenho técnico, quando houver.' },
  { nome: 'revisao', obrigatoria: false, ajuda: 'Revisão técnica do item (ex.: 00, 01). Em branco fica 00.' },
  { nome: 'observacao', obrigatoria: false, ajuda: 'Texto livre; vira a descrição detalhada do produto.' },
];

/**
 * Colunas de `estrutura.csv` (quem é feito de quê).
 *
 * Uma linha = um componente de um produto. Vários níveis saem naturalmente:
 * basta que um código que aparece como `codigo_componente` de alguém apareça
 * também como `codigo_produto` das suas próprias linhas — é exatamente o caso
 * do reparo, que é vendido avulso e ao mesmo tempo entra no alto-falante.
 */
export const COLUNAS_ESTRUTURA: readonly ColumnSpec[] = [
  { nome: 'codigo_produto', obrigatoria: true, ajuda: 'Código do item que É MONTADO. Precisa ser do tipo PRODUTO ACABADO.' },
  { nome: 'codigo_componente', obrigatoria: true, ajuda: 'Código do item que ENTRA na montagem.' },
  { nome: 'quantidade', obrigatoria: true, ajuda: 'Quanto do componente entra em UMA unidade do produto. Maior que zero.' },
  { nome: 'unidade', obrigatoria: false, ajuda: 'Unidade da quantidade. Em branco, usa a unidade cadastrada do componente.' },
  { nome: 'perda_percentual', obrigatoria: false, ajuda: 'Perda normal de processo, em % (ex.: 2,5). Em branco é 0.' },
  { nome: 'critico', obrigatoria: false, ajuda: 'sim/nao. Marca o componente que trava a produção quando falta.' },
  { nome: 'revisao', obrigatoria: false, ajuda: 'Revisão desta versão da estrutura. Em branco é 00. Para MUDAR uma estrutura já cadastrada, informe uma revisão nova.' },
  { nome: 'observacao', obrigatoria: false, ajuda: 'Texto livre sobre este componente.' },
];

/** Nome esperado do campo multipart do arquivo de produtos. */
export const CAMPO_ARQUIVO_PRODUTOS = 'produtos';

/** Nome esperado do campo multipart do arquivo de estrutura. */
export const CAMPO_ARQUIVO_ESTRUTURA = 'estrutura';
