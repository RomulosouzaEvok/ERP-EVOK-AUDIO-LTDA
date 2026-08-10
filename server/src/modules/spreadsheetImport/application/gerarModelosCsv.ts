/**
 * Geração dos arquivos-modelo de importação.
 *
 * Os modelos são gerados a partir do MESMO objeto de colunas que o validador
 * usa (`catalogSpreadsheetSchema`), então é impossível o modelo pedir uma
 * coluna que a validação não conhece — que é o jeito clássico de um
 * importador enlouquecer o usuário.
 *
 * O exemplo embutido é a árvore real que o dono descreveu (alto-falante 12"
 * → reparo → cone/bobina/aranha/suspensão, mais ímã, carcaça e terminais),
 * com **códigos claramente marcados como exemplo** e preço, custo, peso e NCM
 * **em branco** de propósito: esses números são da fábrica e inventá-los num
 * cadastro fiscal é erro caro.
 *
 * @module modules/spreadsheetImport/application/gerarModelosCsv
 */

import { COLUNAS_ESTRUTURA, COLUNAS_PRODUTOS, type ColumnSpec } from '../domain/catalogSpreadsheetSchema';

/** Separador usado nos modelos: é o padrão de lista do Windows em português. */
export const SEPARADOR_MODELO = ';';

/** BOM UTF-8 — sem ele o Excel abre "Ímã" como "Ãmã". */
const BOM_UTF8 = '﻿';

/**
 * Escapa uma célula conforme RFC 4180 e neutraliza injeção de fórmula
 * (célula iniciada por `=`, `+`, `-` ou `@` é executada pelo Excel ao abrir).
 *
 * @param valor - Conteúdo bruto da célula.
 * @returns Célula pronta para escrita.
 */
function escapar(valor: string): string {
  let texto = valor;
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  if (texto.includes('"') || texto.includes(SEPARADOR_MODELO) || /[\n\r]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

/**
 * Monta o conteúdo CSV a partir do cabeçalho e das linhas.
 *
 * @param colunas - Especificação das colunas.
 * @param linhas - Linhas de exemplo (mapa coluna → valor).
 * @returns CSV completo, com BOM UTF-8 e quebras `\r\n`.
 */
function montarCsv(colunas: readonly ColumnSpec[], linhas: Record<string, string>[]): string {
  const cabecalho = colunas.map((coluna) => escapar(coluna.nome)).join(SEPARADOR_MODELO);
  const corpo = linhas.map((linha) => colunas.map((coluna) => escapar(linha[coluna.nome] ?? '')).join(SEPARADOR_MODELO));
  return `${BOM_UTF8}${[cabecalho, ...corpo].join('\r\n')}\r\n`;
}

/**
 * Linhas de exemplo do cadastro: a árvore do alto-falante 12".
 *
 * `preco_venda`, `custo_padrao`, `peso_kg`, `ncm` e `cest` ficam vazios de
 * propósito — o importador avisa no relatório quando o NCM está em branco.
 */
const EXEMPLO_PRODUTOS: Record<string, string>[] = [
  {
    codigo: 'EXEMPLO-AF12',
    descricao: 'Alto-falante 12 polegadas',
    tipo: 'PRODUTO ACABADO',
    unidade: 'un',
    observacao: 'EXEMPLO — o produto que a fabrica vende. Troque o codigo pelo codigo real.',
  },
  {
    codigo: 'EXEMPLO-REP12',
    descricao: 'Reparo 12 polegadas',
    tipo: 'PRODUTO ACABADO',
    unidade: 'un',
    observacao: 'EXEMPLO — vendido avulso E montado no alto-falante. Por isso e PRODUTO ACABADO e tem estrutura propria.',
  },
  { codigo: 'EXEMPLO-CONE12', descricao: 'Cone 12 polegadas', tipo: 'COMPONENTE', unidade: 'un', observacao: 'EXEMPLO' },
  { codigo: 'EXEMPLO-BOB12', descricao: 'Bobina movel 12 polegadas', tipo: 'COMPONENTE', unidade: 'un', observacao: 'EXEMPLO' },
  { codigo: 'EXEMPLO-ARA12', descricao: 'Aranha 12 polegadas', tipo: 'COMPONENTE', unidade: 'un', observacao: 'EXEMPLO' },
  { codigo: 'EXEMPLO-SUS12', descricao: 'Suspensao 12 polegadas', tipo: 'COMPONENTE', unidade: 'un', observacao: 'EXEMPLO' },
  { codigo: 'EXEMPLO-IMA12', descricao: 'Ima 12 polegadas', tipo: 'COMPONENTE', unidade: 'un', observacao: 'EXEMPLO' },
  { codigo: 'EXEMPLO-CARC12', descricao: 'Carcaca 12 polegadas', tipo: 'COMPONENTE', unidade: 'un', observacao: 'EXEMPLO' },
  { codigo: 'EXEMPLO-TERM12', descricao: 'Terminais', tipo: 'COMPONENTE', unidade: 'un', observacao: 'EXEMPLO' },
];

/** Linhas de exemplo da estrutura, nos dois níveis. */
const EXEMPLO_ESTRUTURA: Record<string, string>[] = [
  { codigo_produto: 'EXEMPLO-AF12', codigo_componente: 'EXEMPLO-REP12', quantidade: '1', unidade: 'un', critico: 'sim', observacao: 'EXEMPLO — nivel 1' },
  { codigo_produto: 'EXEMPLO-AF12', codigo_componente: 'EXEMPLO-IMA12', quantidade: '1', unidade: 'un', critico: 'sim', observacao: 'EXEMPLO — nivel 1' },
  { codigo_produto: 'EXEMPLO-AF12', codigo_componente: 'EXEMPLO-CARC12', quantidade: '1', unidade: 'un', observacao: 'EXEMPLO — nivel 1' },
  { codigo_produto: 'EXEMPLO-AF12', codigo_componente: 'EXEMPLO-TERM12', quantidade: '2', unidade: 'un', observacao: 'EXEMPLO — nivel 1' },
  { codigo_produto: 'EXEMPLO-REP12', codigo_componente: 'EXEMPLO-CONE12', quantidade: '1', unidade: 'un', critico: 'sim', observacao: 'EXEMPLO — nivel 2 (estrutura do proprio reparo)' },
  { codigo_produto: 'EXEMPLO-REP12', codigo_componente: 'EXEMPLO-BOB12', quantidade: '1', unidade: 'un', critico: 'sim', observacao: 'EXEMPLO — nivel 2' },
  { codigo_produto: 'EXEMPLO-REP12', codigo_componente: 'EXEMPLO-ARA12', quantidade: '1', unidade: 'un', observacao: 'EXEMPLO — nivel 2' },
  { codigo_produto: 'EXEMPLO-REP12', codigo_componente: 'EXEMPLO-SUS12', quantidade: '1', unidade: 'un', observacao: 'EXEMPLO — nivel 2' },
];

/**
 * Gera `produtos.csv` preenchido com o exemplo da árvore do alto-falante.
 *
 * @returns Conteúdo do arquivo.
 */
export function gerarModeloProdutos(): string {
  return montarCsv(COLUNAS_PRODUTOS, EXEMPLO_PRODUTOS);
}

/**
 * Gera `estrutura.csv` preenchido com o exemplo de dois níveis.
 *
 * @returns Conteúdo do arquivo.
 */
export function gerarModeloEstrutura(): string {
  return montarCsv(COLUNAS_ESTRUTURA, EXEMPLO_ESTRUTURA);
}

/**
 * Gera o texto de ajuda das colunas (usado no manual do usuário e na resposta
 * de `GET /api/catalog-import/modelos`).
 *
 * @returns Descrição de cada coluna dos dois arquivos.
 */
export function descreverColunas(): {
  produtos: { coluna: string; obrigatoria: boolean; ajuda: string }[];
  estrutura: { coluna: string; obrigatoria: boolean; ajuda: string }[];
} {
  const mapear = (colunas: readonly ColumnSpec[]) =>
    colunas.map((coluna) => ({ coluna: coluna.nome, obrigatoria: coluna.obrigatoria, ajuda: coluna.ajuda }));
  return { produtos: mapear(COLUNAS_PRODUTOS), estrutura: mapear(COLUNAS_ESTRUTURA) };
}
