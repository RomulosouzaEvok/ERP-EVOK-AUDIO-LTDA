/**
 * Validação completa das planilhas de cadastro **antes** de qualquer escrita.
 *
 * O contrato deste módulo é o que dá segurança ao dono para importar 300
 * linhas de uma vez: ou a planilha inteira passa e é gravada, ou nada é
 * gravado e o relatório aponta arquivo, linha, coluna e motivo. Por isso a
 * validação é exaustiva e replica aqui, sem banco no meio do caminho, todas
 * as regras que `BomService.createBOM` só descobriria durante a gravação
 * (produto pai precisa ser acabado, componente precisa existir, sem
 * auto-referência, sem revisão repetida) — se essas regras só fossem
 * conferidas lá dentro, a linha 300 derrubaria a importação com 299 já
 * gravadas.
 *
 * @module modules/spreadsheetImport/application/validation/validarPlanilhaCadastro
 */

import type {
  ICatalogImportRepository,
  ItemGravavel,
  ProdutoGravavel,
} from '../../domain/repositories/CatalogImportRepository';
import type { OcorrenciaImportacao } from '../../domain/importReport';
import {
  COLUNAS_ESTRUTURA,
  COLUNAS_PRODUTOS,
  ROTULOS_DE_TIPO,
  normalizeLabel,
  resolveTipo,
  type ColumnSpec,
} from '../../domain/catalogSpreadsheetSchema';
import { lerArquivoDelimitado, type LinhaBruta } from '../parsing/parseDelimitedFile';
import { parseNumeroPtBr, parseSimNao } from '../parsing/parseNumeroPtBr';

/** NCM aplicado pelo banco quando a coluna fica em branco (`products.ncm` DEFAULT). */
const NCM_PADRAO_DO_BANCO = '85182100';

/** Limites de tamanho das colunas de texto (o menor entre `products` e `items`). */
const LIMITES = { codigo: 50, descricao: 200, unidade: 10, ncm: 8, cest: 7, localizacao: 100, desenho: 50, revisao: 10 };

/** Operação planejada para uma linha de `produtos.csv`. */
export interface PlanoProduto {
  linha: number;
  codigo: string;
  acao: 'criar' | 'atualizar';
  /** Id do produto legado, quando já existe. */
  produtoId?: number;
  /** UUID do item canônico, quando já existe. */
  itemId?: string;
  /** `product_type` resolvido, usado também pela validação da estrutura. */
  productType: ProdutoGravavel['product_type'];
  produto: ProdutoGravavel;
  item: ItemGravavel;
  avisos: string[];
}

/** Um componente planejado de uma estrutura. */
export interface ComponentePlanejado {
  linha: number;
  codigoComponente: string;
  quantidade: number;
  unidade?: string;
  perdaPercentual: number;
  critico: boolean;
  observacao?: string;
}

/** Operação planejada para um grupo de linhas de `estrutura.csv` (um produto pai). */
export interface PlanoEstrutura {
  codigoProduto: string;
  revisao: string;
  acao: 'criar' | 'sem_alteracao';
  /** Linhas da planilha que compõem esta estrutura, para o relatório. */
  linhas: number[];
  componentes: ComponentePlanejado[];
  avisos: string[];
}

/** Resultado da validação: o que gravar e o que recusar. */
export interface ResultadoValidacao {
  erros: OcorrenciaImportacao[];
  avisos: OcorrenciaImportacao[];
  produtos: PlanoProduto[];
  estruturas: PlanoEstrutura[];
}

/** Entrada da validação. */
export interface EntradaValidacao {
  arquivoProdutos?: Buffer;
  arquivoEstrutura?: Buffer;
  repository: ICatalogImportRepository;
}

/**
 * Indexa os cabeçalhos do arquivo, tolerando acento, caixa e espaços.
 *
 * @param cabecalhos - Cabeçalhos lidos do arquivo.
 * @returns Mapa `nome normalizado da coluna → índice`.
 */
function indexarCabecalhos(cabecalhos: string[]): Map<string, number> {
  const indice = new Map<string, number>();
  cabecalhos.forEach((cabecalho, posicao) => {
    const chave = normalizeLabel(cabecalho);
    if (chave && !indice.has(chave)) indice.set(chave, posicao);
  });
  return indice;
}

/**
 * Lê uma célula pelo nome da coluna.
 *
 * @param linha - Linha bruta.
 * @param indice - Índice de cabeçalhos.
 * @param coluna - Nome da coluna.
 * @returns Conteúdo da célula sem espaços nas pontas (`''` se a coluna não existir).
 */
function celula(linha: LinhaBruta, indice: Map<string, number>, coluna: string): string {
  const posicao = indice.get(normalizeLabel(coluna));
  if (posicao === undefined) return '';
  return (linha.celulas[posicao] ?? '').trim();
}

/**
 * Confere se todas as colunas obrigatórias existem no cabeçalho.
 *
 * @param arquivo - Nome do arquivo, para a mensagem.
 * @param indice - Índice de cabeçalhos lidos.
 * @param colunas - Especificação esperada.
 * @param erros - Lista de erros acumulada.
 */
function validarCabecalho(
  arquivo: 'produtos' | 'estrutura',
  indice: Map<string, number>,
  colunas: readonly ColumnSpec[],
  erros: OcorrenciaImportacao[],
): void {
  for (const coluna of colunas) {
    if (coluna.obrigatoria && !indice.has(normalizeLabel(coluna.nome))) {
      erros.push({
        arquivo,
        linha: 1,
        coluna: coluna.nome,
        mensagem:
          `A coluna obrigatória "${coluna.nome}" não existe no arquivo. `
          + 'Baixe o modelo novamente e copie os seus dados para ele, sem apagar a primeira linha.',
      });
    }
  }
}

/**
 * Converte uma célula numérica, registrando erro quando o valor é inválido.
 *
 * @param bruto - Conteúdo da célula.
 * @param contexto - Arquivo/linha/coluna/chave para a mensagem.
 * @param erros - Lista de erros acumulada.
 * @param opcoes - Restrições adicionais (mínimo, máximo).
 * @returns Número convertido, ou `undefined` (célula vazia ou inválida).
 */
function numero(
  bruto: string,
  contexto: { arquivo: 'produtos' | 'estrutura'; linha: number; coluna: string; chave: string },
  erros: OcorrenciaImportacao[],
  opcoes: { min?: number; max?: number; maiorQueZero?: boolean } = {},
): number | undefined {
  const resultado = parseNumeroPtBr(bruto);
  if (!resultado.ok) {
    erros.push({ ...contexto, mensagem: `Coluna "${contexto.coluna}": ${resultado.motivo}` });
    return undefined;
  }
  const valor = resultado.valor;
  if (valor === undefined) return undefined;

  if (opcoes.maiorQueZero && valor <= 0) {
    erros.push({ ...contexto, mensagem: `Coluna "${contexto.coluna}": o valor precisa ser maior que zero (recebido ${bruto}).` });
    return undefined;
  }
  if (opcoes.min !== undefined && valor < opcoes.min) {
    erros.push({ ...contexto, mensagem: `Coluna "${contexto.coluna}": o valor não pode ser menor que ${opcoes.min} (recebido ${bruto}).` });
    return undefined;
  }
  if (opcoes.max !== undefined && valor > opcoes.max) {
    erros.push({ ...contexto, mensagem: `Coluna "${contexto.coluna}": o valor não pode ser maior que ${opcoes.max} (recebido ${bruto}).` });
    return undefined;
  }
  return valor;
}

/**
 * Texto com limite de tamanho; devolve `undefined` para célula vazia (nunca
 * `''` e nunca `null`, para que o default do banco continue valendo).
 *
 * @param bruto - Conteúdo da célula.
 * @param limite - Tamanho máximo da coluna no banco.
 * @param contexto - Arquivo/linha/coluna/chave.
 * @param erros - Lista de erros acumulada.
 * @returns Texto aparado ou `undefined`.
 */
function texto(
  bruto: string,
  limite: number,
  contexto: { arquivo: 'produtos' | 'estrutura'; linha: number; coluna: string; chave: string },
  erros: OcorrenciaImportacao[],
): string | undefined {
  if (bruto === '') return undefined;
  if (bruto.length > limite) {
    erros.push({
      ...contexto,
      mensagem: `Coluna "${contexto.coluna}": o texto tem ${bruto.length} caracteres e o limite é ${limite}.`,
    });
    return undefined;
  }
  return bruto;
}

/**
 * Valida o arquivo de produtos e monta o plano de gravação.
 *
 * @param buffer - Conteúdo do arquivo.
 * @param repository - Porta de persistência (para saber o que já existe).
 * @param erros - Lista de erros acumulada.
 * @param avisos - Lista de avisos acumulada.
 * @returns Plano por linha, na ordem do arquivo.
 */
async function validarProdutos(
  buffer: Buffer,
  repository: ICatalogImportRepository,
  erros: OcorrenciaImportacao[],
  avisos: OcorrenciaImportacao[],
): Promise<PlanoProduto[]> {
  const arquivo = 'produtos' as const;
  const { cabecalhos, linhas } = lerArquivoDelimitado(buffer);
  const indice = indexarCabecalhos(cabecalhos);
  validarCabecalho(arquivo, indice, COLUNAS_PRODUTOS, erros);
  if (erros.length > 0) return [];

  if (linhas.length === 0) {
    erros.push({ arquivo, linha: 1, mensagem: 'O arquivo só tem o cabeçalho — nenhuma linha de produto para importar.' });
    return [];
  }

  const codigosDaPlanilha = linhas
    .map((linha) => celula(linha, indice, 'codigo'))
    .filter((codigo) => codigo !== '');

  const produtosExistentes = await repository.findProdutosByCodigos(codigosDaPlanilha);
  const itensExistentes = await repository.findItensByCodigos(codigosDaPlanilha);

  const vistos = new Map<string, number>();
  const planos: PlanoProduto[] = [];

  for (const linha of linhas) {
    const codigo = celula(linha, indice, 'codigo');
    const chave = codigo || `linha ${linha.numero}`;
    const ctx = { arquivo, linha: linha.numero, chave };
    const avisosDaLinha: string[] = [];

    if (codigo === '') {
      erros.push({ ...ctx, coluna: 'codigo', mensagem: 'Coluna "codigo": está em branco. O código é a identidade do item e não pode faltar.' });
      continue;
    }
    if (codigo.length > LIMITES.codigo) {
      erros.push({ ...ctx, coluna: 'codigo', mensagem: `Coluna "codigo": tem ${codigo.length} caracteres e o limite é ${LIMITES.codigo}.` });
      continue;
    }

    const chaveComparacao = codigo.toUpperCase();
    const linhaAnterior = vistos.get(chaveComparacao);
    if (linhaAnterior !== undefined) {
      erros.push({
        ...ctx,
        coluna: 'codigo',
        mensagem: `Coluna "codigo": o código "${codigo}" já aparece na linha ${linhaAnterior} desta mesma planilha. Cada item pode aparecer uma vez só.`,
      });
      continue;
    }
    vistos.set(chaveComparacao, linha.numero);

    const descricao = celula(linha, indice, 'descricao');
    if (descricao === '') {
      erros.push({ ...ctx, coluna: 'descricao', mensagem: 'Coluna "descricao": está em branco. É o nome que aparece nas telas e nos documentos.' });
      continue;
    }
    if (descricao.length > LIMITES.descricao) {
      erros.push({ ...ctx, coluna: 'descricao', mensagem: `Coluna "descricao": tem ${descricao.length} caracteres e o limite é ${LIMITES.descricao}.` });
      continue;
    }

    const tipoBruto = celula(linha, indice, 'tipo');
    const tipo = resolveTipo(tipoBruto);
    if (!tipo) {
      erros.push({
        ...ctx,
        coluna: 'tipo',
        mensagem:
          tipoBruto === ''
            ? `Coluna "tipo": está em branco. Escreva um de: ${ROTULOS_DE_TIPO.join(', ')}.`
            : `Coluna "tipo": "${tipoBruto}" não é um tipo conhecido. Escreva um de: ${ROTULOS_DE_TIPO.join(', ')}.`,
      });
      continue;
    }

    const unidade = celula(linha, indice, 'unidade');
    if (unidade === '') {
      erros.push({ ...ctx, coluna: 'unidade', mensagem: 'Coluna "unidade": está em branco. Escreva a unidade de medida (un, kg, m, l...).' });
      continue;
    }
    if (unidade.length > LIMITES.unidade) {
      erros.push({ ...ctx, coluna: 'unidade', mensagem: `Coluna "unidade": tem ${unidade.length} caracteres e o limite é ${LIMITES.unidade}.` });
      continue;
    }

    const precoVenda = numero(celula(linha, indice, 'preco_venda'), { ...ctx, coluna: 'preco_venda' }, erros, { min: 0 });
    const custoPadrao = numero(celula(linha, indice, 'custo_padrao'), { ...ctx, coluna: 'custo_padrao' }, erros, { min: 0 });
    const estoqueMinimo = numero(celula(linha, indice, 'estoque_minimo'), { ...ctx, coluna: 'estoque_minimo' }, erros, { min: 0 });
    const loteMinimo = numero(celula(linha, indice, 'lote_minimo'), { ...ctx, coluna: 'lote_minimo' }, erros, { min: 0 });
    const leadTime = numero(celula(linha, indice, 'lead_time_dias'), { ...ctx, coluna: 'lead_time_dias' }, erros, { min: 0 });
    const peso = numero(celula(linha, indice, 'peso_kg'), { ...ctx, coluna: 'peso_kg' }, erros, { min: 0 });

    // Regra de negócio do ERP (`ProductEntity`): preço de venda tem de cobrir
    // o custo. Só se aplica a quem TEM preço de venda — insumo comprado
    // normalmente não tem, e exigir um preço aqui obrigaria o dono a inventar
    // número, que é justamente o que não se pode fazer num cadastro fiscal.
    if (precoVenda !== undefined && precoVenda > 0 && custoPadrao !== undefined && custoPadrao > 0 && precoVenda <= custoPadrao) {
      erros.push({
        ...ctx,
        coluna: 'preco_venda',
        mensagem: `Coluna "preco_venda": o preço (${precoVenda}) não pode ser menor ou igual ao custo (${custoPadrao}).`,
      });
      continue;
    }

    const ncmBruto = celula(linha, indice, 'ncm').replace(/\D/g, '');
    let ncm: string | undefined;
    if (ncmBruto === '') {
      avisosDaLinha.push(
        `NCM não informado: o item vai ficar com o NCM padrão da fábrica (${NCM_PADRAO_DO_BANCO}, alto-falantes). `
        + 'Corrija antes de emitir nota fiscal deste item.',
      );
      avisos.push({ ...ctx, coluna: 'ncm', mensagem: avisosDaLinha[avisosDaLinha.length - 1] });
    } else if (ncmBruto.length !== LIMITES.ncm) {
      erros.push({ ...ctx, coluna: 'ncm', mensagem: `Coluna "ncm": o NCM tem ${ncmBruto.length} dígitos e precisa ter ${LIMITES.ncm}.` });
      continue;
    } else {
      ncm = ncmBruto;
    }

    const cestBruto = celula(linha, indice, 'cest').replace(/\D/g, '');
    let cest: string | undefined;
    if (cestBruto !== '') {
      if (cestBruto.length !== LIMITES.cest) {
        erros.push({ ...ctx, coluna: 'cest', mensagem: `Coluna "cest": o CEST tem ${cestBruto.length} dígitos e precisa ter ${LIMITES.cest}.` });
        continue;
      }
      cest = cestBruto;
    }

    const localizacao = texto(celula(linha, indice, 'localizacao'), LIMITES.localizacao, { ...ctx, coluna: 'localizacao' }, erros);
    const desenho = texto(celula(linha, indice, 'desenho'), LIMITES.desenho, { ...ctx, coluna: 'desenho' }, erros);
    const revisao = texto(celula(linha, indice, 'revisao'), LIMITES.revisao, { ...ctx, coluna: 'revisao' }, erros);
    const observacao = celula(linha, indice, 'observacao');

    if (chaveComparacao.startsWith('EXEMPLO-')) {
      const aviso =
        'O código ainda é o do arquivo-modelo ("EXEMPLO-..."). Troque pelo código real da fábrica antes de usar em produção.';
      avisosDaLinha.push(aviso);
      avisos.push({ ...ctx, coluna: 'codigo', mensagem: aviso });
    }

    const produtoExistente = produtosExistentes.get(chaveComparacao);
    const itemExistente = itensExistentes.get(chaveComparacao);

    if (produtoExistente && produtoExistente.product_type !== tipo.productType) {
      const aviso =
        `O item já existe cadastrado como "${produtoExistente.product_type}" e a planilha diz "${tipo.rotulo}". `
        + 'O tipo vai ser alterado — confira, porque mudar o tipo muda o comportamento em produção, compras e estoque.';
      avisosDaLinha.push(aviso);
      avisos.push({ ...ctx, coluna: 'tipo', mensagem: aviso });
    }

    planos.push({
      linha: linha.numero,
      codigo,
      acao: produtoExistente ? 'atualizar' : 'criar',
      produtoId: produtoExistente?.id,
      itemId: itemExistente?.id,
      productType: tipo.productType,
      produto: {
        code: produtoExistente ? undefined : codigo,
        name: descricao,
        description: observacao === '' ? undefined : observacao,
        product_type: tipo.productType,
        unit: unidade,
        price: precoVenda,
        cost_price: custoPadrao,
        min_quantity: estoqueMinimo,
        lead_time: leadTime === undefined ? undefined : Math.round(leadTime),
        ncm,
        cest,
        weight: peso,
        location: localizacao,
        drawing_number: desenho,
        revision: revisao,
      },
      item: {
        codigo: itemExistente ? undefined : codigo,
        descricao,
        tipo: tipo.itemTipo,
        unidade,
        custo_padrao: custoPadrao,
        estoque_seguranca: estoqueMinimo,
        lote_minimo: loteMinimo,
        lead_time_dias: leadTime === undefined ? undefined : Math.round(leadTime),
      },
      avisos: avisosDaLinha,
    });
  }

  return planos;
}

/**
 * Compara a estrutura proposta pela planilha com a estrutura vigente.
 *
 * @param componentes - Componentes propostos, já resolvidos para id de produto.
 * @param vigentes - Componentes da BOM ativa.
 * @returns `true` quando são a mesma estrutura (mesmo conjunto, quantidade, unidade e perda).
 */
function estruturaIgual(
  componentes: { componentProductId: number; quantidade: number; unidade: string; perda: number }[],
  vigentes: { component_product_id: number; quantity: number; unit: string; scrap_percentage: number }[],
): boolean {
  if (componentes.length !== vigentes.length) return false;

  const chave = (id: number, qtd: number, un: string, perda: number) => `${id}|${qtd.toFixed(6)}|${un.toLowerCase()}|${perda.toFixed(4)}`;
  const propostos = new Set(componentes.map((c) => chave(c.componentProductId, c.quantidade, c.unidade, c.perda)));
  for (const vigente of vigentes) {
    if (!propostos.has(chave(vigente.component_product_id, vigente.quantity, vigente.unit, vigente.scrap_percentage))) {
      return false;
    }
  }
  return true;
}

/**
 * Detecta ciclo no grafo de estruturas resultante (banco + planilha).
 *
 * A planilha SUBSTITUI as arestas do produto que ela redefine — importar uma
 * estrutura nova cria uma revisão que supersede a anterior, então manter as
 * arestas antigas daquele produto acusaria ciclo que não vai existir.
 *
 * @param arestasBanco - Arestas das BOMs vigentes, em código.
 * @param arestasPlanilha - Arestas propostas, em código.
 * @param produtosRedefinidos - Códigos cujos filhos a planilha substitui.
 * @returns Caminho do ciclo encontrado (em código), ou `undefined`.
 */
export function detectarCiclo(
  arestasBanco: { produtoCodigo: string; componenteCodigo: string }[],
  arestasPlanilha: { produtoCodigo: string; componenteCodigo: string }[],
  produtosRedefinidos: Set<string>,
): string[] | undefined {
  const grafo = new Map<string, string[]>();
  const adicionar = (de: string, para: string) => {
    const lista = grafo.get(de) ?? [];
    lista.push(para);
    grafo.set(de, lista);
  };

  for (const aresta of arestasBanco) {
    if (produtosRedefinidos.has(aresta.produtoCodigo)) continue;
    adicionar(aresta.produtoCodigo, aresta.componenteCodigo);
  }
  for (const aresta of arestasPlanilha) {
    adicionar(aresta.produtoCodigo, aresta.componenteCodigo);
  }

  const EM_VISITA = 1;
  const CONCLUIDO = 2;
  const estado = new Map<string, number>();
  const caminho: string[] = [];

  const visitar = (no: string): string[] | undefined => {
    estado.set(no, EM_VISITA);
    caminho.push(no);

    for (const vizinho of grafo.get(no) ?? []) {
      const situacao = estado.get(vizinho);
      if (situacao === EM_VISITA) {
        const inicio = caminho.indexOf(vizinho);
        return [...caminho.slice(inicio), vizinho];
      }
      if (situacao === undefined) {
        const ciclo = visitar(vizinho);
        if (ciclo) return ciclo;
      }
    }

    caminho.pop();
    estado.set(no, CONCLUIDO);
    return undefined;
  };

  for (const no of grafo.keys()) {
    if (estado.get(no) === undefined) {
      const ciclo = visitar(no);
      if (ciclo) return ciclo;
    }
  }
  return undefined;
}

/**
 * Valida o arquivo de estrutura e monta o plano de gravação.
 *
 * @param buffer - Conteúdo do arquivo.
 * @param planosProduto - Plano já validado de `produtos.csv` (a estrutura pode referenciar itens criados agora).
 * @param repository - Porta de persistência.
 * @param erros - Lista de erros acumulada.
 * @param avisos - Lista de avisos acumulada.
 * @returns Plano por produto pai.
 */
async function validarEstrutura(
  buffer: Buffer,
  planosProduto: PlanoProduto[],
  repository: ICatalogImportRepository,
  erros: OcorrenciaImportacao[],
  avisos: OcorrenciaImportacao[],
): Promise<PlanoEstrutura[]> {
  const arquivo = 'estrutura' as const;
  const { cabecalhos, linhas } = lerArquivoDelimitado(buffer);
  const indice = indexarCabecalhos(cabecalhos);
  validarCabecalho(arquivo, indice, COLUNAS_ESTRUTURA, erros);
  if (erros.length > 0) return [];

  if (linhas.length === 0) {
    erros.push({ arquivo, linha: 1, mensagem: 'O arquivo só tem o cabeçalho — nenhuma linha de estrutura para importar.' });
    return [];
  }

  /** Índice do que a planilha de produtos está criando/atualizando nesta mesma importação. */
  const daPlanilha = new Map(planosProduto.map((plano) => [plano.codigo.toUpperCase(), plano]));

  const codigosReferenciados = new Set<string>();
  for (const linha of linhas) {
    const pai = celula(linha, indice, 'codigo_produto');
    const filho = celula(linha, indice, 'codigo_componente');
    if (pai) codigosReferenciados.add(pai);
    if (filho) codigosReferenciados.add(filho);
  }

  const produtosNoBanco = await repository.findProdutosByCodigos([...codigosReferenciados]);

  /** Agrupamento por produto pai, preservando a ordem de aparição. */
  const grupos = new Map<string, {
    codigoProduto: string;
    linhas: number[];
    revisoes: { valor: string; linha: number }[];
    componentes: ComponentePlanejado[];
    vistos: Map<string, number>;
  }>();

  for (const linha of linhas) {
    const codigoProduto = celula(linha, indice, 'codigo_produto');
    const codigoComponente = celula(linha, indice, 'codigo_componente');
    const chave = codigoProduto ? `${codigoProduto} > ${codigoComponente}` : `linha ${linha.numero}`;
    const ctx = { arquivo, linha: linha.numero, chave };

    if (codigoProduto === '') {
      erros.push({ ...ctx, coluna: 'codigo_produto', mensagem: 'Coluna "codigo_produto": está em branco. Repita o código do produto em toda linha de componente dele.' });
      continue;
    }
    if (codigoComponente === '') {
      erros.push({ ...ctx, coluna: 'codigo_componente', mensagem: 'Coluna "codigo_componente": está em branco.' });
      continue;
    }

    const paiUpper = codigoProduto.toUpperCase();
    const filhoUpper = codigoComponente.toUpperCase();

    if (paiUpper === filhoUpper) {
      erros.push({
        ...ctx,
        coluna: 'codigo_componente',
        mensagem: `O item "${codigoProduto}" não pode ser componente de si mesmo. Isso é um ciclo: a estrutura nunca terminaria de explodir.`,
      });
      continue;
    }

    const planoPai = daPlanilha.get(paiUpper);
    const paiNoBanco = produtosNoBanco.get(paiUpper);
    if (!planoPai && !paiNoBanco) {
      erros.push({
        ...ctx,
        coluna: 'codigo_produto',
        mensagem: `O produto "${codigoProduto}" não está cadastrado nem aparece na planilha de produtos desta importação.`,
      });
      continue;
    }

    const tipoDoPai = planoPai?.productType ?? paiNoBanco?.product_type;
    if (tipoDoPai !== 'finished') {
      erros.push({
        ...ctx,
        coluna: 'codigo_produto',
        mensagem:
          `Só item do tipo "PRODUTO ACABADO" pode ter estrutura própria, e "${codigoProduto}" está como outro tipo. `
          + 'Um item que é vendido avulso E entra em outro produto (como o reparo) deve ser cadastrado como PRODUTO ACABADO — '
          + 'ele continua podendo aparecer como componente de outro item.',
      });
      continue;
    }

    if (!daPlanilha.has(filhoUpper) && !produtosNoBanco.has(filhoUpper)) {
      erros.push({
        ...ctx,
        coluna: 'codigo_componente',
        mensagem: `O componente "${codigoComponente}" não está cadastrado nem aparece na planilha de produtos desta importação.`,
      });
      continue;
    }

    const quantidade = numero(celula(linha, indice, 'quantidade'), { ...ctx, coluna: 'quantidade' }, erros, { maiorQueZero: true });
    if (quantidade === undefined) continue;

    const perda = numero(celula(linha, indice, 'perda_percentual'), { ...ctx, coluna: 'perda_percentual' }, erros, { min: 0, max: 100 });

    const criticoResultado = parseSimNao(celula(linha, indice, 'critico'));
    if (!criticoResultado.ok) {
      erros.push({ ...ctx, coluna: 'critico', mensagem: `Coluna "critico": ${criticoResultado.motivo}` });
      continue;
    }

    const unidade = texto(celula(linha, indice, 'unidade'), LIMITES.unidade, { ...ctx, coluna: 'unidade' }, erros);
    const revisao = texto(celula(linha, indice, 'revisao'), LIMITES.revisao, { ...ctx, coluna: 'revisao' }, erros);
    const observacao = celula(linha, indice, 'observacao');

    let grupo = grupos.get(paiUpper);
    if (!grupo) {
      grupo = { codigoProduto, linhas: [], revisoes: [], componentes: [], vistos: new Map() };
      grupos.set(paiUpper, grupo);
    }

    const linhaAnterior = grupo.vistos.get(filhoUpper);
    if (linhaAnterior !== undefined) {
      erros.push({
        ...ctx,
        coluna: 'codigo_componente',
        mensagem:
          `O componente "${codigoComponente}" já aparece na linha ${linhaAnterior} para o mesmo produto "${codigoProduto}". `
          + 'Some as quantidades numa linha só.',
      });
      continue;
    }
    grupo.vistos.set(filhoUpper, linha.numero);

    grupo.linhas.push(linha.numero);
    if (revisao !== undefined) grupo.revisoes.push({ valor: revisao, linha: linha.numero });
    grupo.componentes.push({
      linha: linha.numero,
      codigoComponente,
      quantidade,
      unidade,
      perdaPercentual: perda ?? 0,
      critico: criticoResultado.valor ?? false,
      observacao: observacao === '' ? undefined : observacao,
    });
  }

  // --- Ciclo, considerando também as estruturas que já estão no banco ---
  const arestasPlanilha: { produtoCodigo: string; componenteCodigo: string }[] = [];
  for (const [paiUpper, grupo] of grupos) {
    for (const componente of grupo.componentes) {
      arestasPlanilha.push({ produtoCodigo: paiUpper, componenteCodigo: componente.codigoComponente.toUpperCase() });
    }
  }
  const ciclo = detectarCiclo(await repository.findArestasBomAtivas(), arestasPlanilha, new Set(grupos.keys()));
  if (ciclo) {
    const primeiroGrupo = grupos.get(ciclo[0]);
    erros.push({
      arquivo,
      linha: primeiroGrupo?.linhas[0] ?? 2,
      coluna: 'codigo_componente',
      chave: ciclo[0],
      mensagem:
        `A estrutura ficaria circular: ${ciclo.join(' → ')}. `
        + 'Um item não pode, direta ou indiretamente, fazer parte de si mesmo.',
    });
    return [];
  }

  // --- Igualdade com a estrutura vigente e regra de revisão ---
  const idsDosPais = [...grupos.keys()]
    .map((paiUpper) => produtosNoBanco.get(paiUpper)?.id)
    .filter((id): id is number => id !== undefined);
  const bomsAtivas = await repository.findBomsAtivas(idsDosPais);

  const planos: PlanoEstrutura[] = [];

  for (const [paiUpper, grupo] of grupos) {
    const avisosDoGrupo: string[] = [];
    const primeiraLinha = grupo.linhas[0];
    const ctx = { arquivo, linha: primeiraLinha, chave: grupo.codigoProduto };

    const revisoesDistintas = [...new Set(grupo.revisoes.map((revisao) => revisao.valor))];
    if (revisoesDistintas.length > 1) {
      erros.push({
        ...ctx,
        coluna: 'revisao',
        mensagem:
          `As linhas de "${grupo.codigoProduto}" têm revisões diferentes (${revisoesDistintas.join(', ')}). `
          + 'Todas as linhas do mesmo produto formam UMA estrutura e precisam da mesma revisão.',
      });
      continue;
    }
    const revisao = revisoesDistintas[0] ?? '00';

    const paiNoBanco = produtosNoBanco.get(paiUpper);
    const bomVigente = paiNoBanco ? bomsAtivas.get(paiNoBanco.id) : undefined;

    // Só dá para comparar com a estrutura vigente quando todos os componentes
    // já existem no banco (os criados agora não têm id ainda) — se algum é
    // novo, a estrutura é necessariamente diferente.
    const componentesResolvidos = grupo.componentes.map((componente) => ({
      componentProductId: produtosNoBanco.get(componente.codigoComponente.toUpperCase())?.id,
      quantidade: componente.quantidade,
      unidade: componente.unidade
        ?? produtosNoBanco.get(componente.codigoComponente.toUpperCase())?.unit
        ?? daPlanilha.get(componente.codigoComponente.toUpperCase())?.item.unidade
        ?? 'un',
      perda: componente.perdaPercentual,
    }));
    const todosResolvidos = componentesResolvidos.every((componente) => componente.componentProductId !== undefined);

    if (bomVigente && todosResolvidos
      && estruturaIgual(
        componentesResolvidos as { componentProductId: number; quantidade: number; unidade: string; perda: number }[],
        bomVigente.itens,
      )) {
      planos.push({
        codigoProduto: grupo.codigoProduto,
        revisao: bomVigente.revision,
        acao: 'sem_alteracao',
        linhas: grupo.linhas,
        componentes: grupo.componentes,
        avisos: [`A estrutura de "${grupo.codigoProduto}" já está cadastrada exatamente assim (revisão ${bomVigente.revision}). Nada foi alterado.`],
      });
      continue;
    }

    if (paiNoBanco) {
      const revisoesBloqueantes = await repository.findRevisoesBloqueantes(paiNoBanco.id);
      if (revisoesBloqueantes.includes(revisao)) {
        erros.push({
          ...ctx,
          coluna: 'revisao',
          mensagem:
            `A estrutura de "${grupo.codigoProduto}" mudou em relação ao que está cadastrado, mas a revisão informada `
            + `("${revisao}") já existe. Informe uma revisão nova na coluna "revisao" (ex.: ${proximaRevisao(revisoesBloqueantes)}) — `
            + 'é a revisão que permite dizer, depois, contra qual versão da estrutura cada ordem de produção rodou.',
        });
        continue;
      }
      if (bomVigente) {
        avisosDoGrupo.push(
          `A estrutura de "${grupo.codigoProduto}" vai passar da revisão ${bomVigente.revision} para a ${revisao}. `
          + 'A anterior fica no histórico, marcada como substituída.',
        );
        avisos.push({ ...ctx, coluna: 'revisao', mensagem: avisosDoGrupo[avisosDoGrupo.length - 1] });
      }
    }

    planos.push({
      codigoProduto: grupo.codigoProduto,
      revisao,
      acao: 'criar',
      linhas: grupo.linhas,
      componentes: grupo.componentes,
      avisos: avisosDoGrupo,
    });
  }

  return planos;
}

/**
 * Sugere um rótulo de revisão livre a partir dos já usados.
 *
 * @param usadas - Revisões que já existem no produto.
 * @returns Próximo rótulo numérico de dois dígitos ainda livre.
 */
function proximaRevisao(usadas: string[]): string {
  const numeros = usadas.map((revisao) => Number(revisao)).filter((valor) => Number.isFinite(valor));
  const maior = numeros.length > 0 ? Math.max(...numeros) : 0;
  return String(maior + 1).padStart(2, '0');
}

/**
 * Valida as planilhas recebidas e devolve o plano completo de gravação.
 *
 * Nunca escreve nada: é o mesmo caminho usado pela simulação
 * (`POST /api/catalog-import/simulacao`) e pela gravação.
 *
 * @param entrada - Arquivos recebidos e porta de persistência.
 * @returns Erros, avisos e o plano de produtos/estruturas.
 */
export async function validarPlanilhaCadastro(entrada: EntradaValidacao): Promise<ResultadoValidacao> {
  const erros: OcorrenciaImportacao[] = [];
  const avisos: OcorrenciaImportacao[] = [];

  const produtos = entrada.arquivoProdutos
    ? await validarProdutos(entrada.arquivoProdutos, entrada.repository, erros, avisos)
    : [];

  // A estrutura só é avaliada se os produtos passaram: sem isso, um erro de
  // digitação no código do produto viraria uma cascata de "componente não
  // encontrado" que esconde o erro de verdade.
  const estruturas = entrada.arquivoEstrutura && erros.length === 0
    ? await validarEstrutura(entrada.arquivoEstrutura, produtos, entrada.repository, erros, avisos)
    : [];

  return { erros, avisos, produtos, estruturas };
}
