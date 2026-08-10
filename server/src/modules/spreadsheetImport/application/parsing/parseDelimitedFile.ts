/**
 * Leitura de arquivo delimitado (CSV) gerado pelo Excel brasileiro.
 *
 * Trata os três problemas que o Excel pt-BR cria e que fazem uma importação
 * "quase funcionar":
 *
 * 1. **Codificação.** "CSV UTF-8" grava com BOM; "CSV (separado por
 *    vírgulas)" grava em Windows-1252. Sem detecção, "Ímã" vira "Ãmã" ou
 *    "�m�" — e o cadastro nasce com o nome errado.
 * 2. **Separador.** No Windows em português o separador de lista é `;`, não
 *    `,` — mas quem exporta de um sistema estrangeiro manda `,`.
 * 3. **Aspas.** Campos com `;` ou quebra de linha vêm entre aspas duplas,
 *    com aspas internas duplicadas (RFC 4180).
 *
 * @module modules/spreadsheetImport/application/parsing/parseDelimitedFile
 */

/** Uma linha lida, com o número que o Excel mostraria (1 = cabeçalho). */
export interface LinhaBruta {
  /** Número da linha na planilha (1-based, contando o cabeçalho). */
  numero: number;
  /** Células já sem aspas e sem espaços nas pontas. */
  celulas: string[];
}

/** Resultado da leitura de um arquivo delimitado. */
export interface ArquivoDelimitado {
  /** Cabeçalhos exatamente como vieram no arquivo. */
  cabecalhos: string[];
  /** Linhas de dados (cabeçalho já removido; linhas totalmente vazias descartadas). */
  linhas: LinhaBruta[];
  /** Separador detectado, para diagnóstico. */
  separador: string;
  /** Codificação usada na decodificação, para diagnóstico. */
  codificacao: 'utf-8' | 'windows-1252';
}

/** Separadores considerados na detecção automática, em ordem de preferência. */
const SEPARADORES_CANDIDATOS = [';', ',', '\t'];

/**
 * Decodifica o buffer do arquivo, escolhendo entre UTF-8 e Windows-1252.
 *
 * A decisão é feita pelo resultado, não pelo `Content-Type`: se a leitura
 * como UTF-8 produzir o caractere de substituição (U+FFFD), o arquivo não era
 * UTF-8 válido e recai para Windows-1252 (o padrão do Excel pt-BR).
 *
 * @param buffer - Conteúdo bruto do arquivo enviado.
 * @returns Texto decodificado (sem BOM) e a codificação escolhida.
 */
export function decodificarPlanilha(buffer: Buffer): { texto: string; codificacao: 'utf-8' | 'windows-1252' } {
  const comoUtf8 = buffer.toString('utf8');
  if (!comoUtf8.includes('�')) {
    return { texto: removerBom(comoUtf8), codificacao: 'utf-8' };
  }
  // 'latin1' no Node é ISO-8859-1; Windows-1252 difere apenas na faixa
  // 0x80–0x9F (aspas tipográficas, travessão). Para nome de peça e código de
  // item isso é suficiente e não exige dependência de conversão de charset.
  return { texto: removerBom(buffer.toString('latin1')), codificacao: 'windows-1252' };
}

/**
 * Remove o BOM inicial, quando presente.
 *
 * @param texto - Texto decodificado.
 * @returns Texto sem o marcador de ordem de bytes.
 */
function removerBom(texto: string): string {
  return texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
}

/**
 * Detecta o separador de colunas olhando apenas a primeira linha lógica.
 *
 * @param texto - Conteúdo completo do arquivo.
 * @returns Separador com maior número de ocorrências fora de aspas; `;` no empate.
 */
export function detectarSeparador(texto: string): string {
  const primeiraLinha = texto.split(/\r?\n/, 1)[0] ?? '';
  let melhor = ';';
  let melhorContagem = -1;

  for (const candidato of SEPARADORES_CANDIDATOS) {
    let contagem = 0;
    let dentroDeAspas = false;
    for (const caractere of primeiraLinha) {
      if (caractere === '"') dentroDeAspas = !dentroDeAspas;
      else if (caractere === candidato && !dentroDeAspas) contagem += 1;
    }
    if (contagem > melhorContagem) {
      melhor = candidato;
      melhorContagem = contagem;
    }
  }

  return melhor;
}

/**
 * Faz o parse de um texto delimitado conforme a RFC 4180.
 *
 * @param texto - Conteúdo já decodificado.
 * @param separador - Separador de colunas.
 * @returns Matriz de células, uma entrada por linha física/lógica.
 */
function parseMatriz(texto: string, separador: string): string[][] {
  const linhas: string[][] = [];
  let celulas: string[] = [];
  let atual = '';
  let dentroDeAspas = false;

  for (let i = 0; i < texto.length; i += 1) {
    const caractere = texto[i];

    if (dentroDeAspas) {
      if (caractere === '"') {
        if (texto[i + 1] === '"') {
          atual += '"';
          i += 1;
        } else {
          dentroDeAspas = false;
        }
      } else {
        atual += caractere;
      }
      continue;
    }

    if (caractere === '"') {
      dentroDeAspas = true;
      continue;
    }

    if (caractere === separador) {
      celulas.push(atual);
      atual = '';
      continue;
    }

    if (caractere === '\r') continue;

    if (caractere === '\n') {
      celulas.push(atual);
      linhas.push(celulas);
      celulas = [];
      atual = '';
      continue;
    }

    atual += caractere;
  }

  if (atual !== '' || celulas.length > 0) {
    celulas.push(atual);
    linhas.push(celulas);
  }

  return linhas;
}

/**
 * Lê um arquivo delimitado completo: decodifica, detecta o separador, faz o
 * parse e separa cabeçalho de dados.
 *
 * @param buffer - Conteúdo bruto do upload.
 * @returns Cabeçalhos, linhas de dados numeradas e diagnóstico da leitura.
 * @throws {Error} Se o arquivo estiver vazio ou não tiver cabeçalho.
 */
export function lerArquivoDelimitado(buffer: Buffer): ArquivoDelimitado {
  const { texto, codificacao } = decodificarPlanilha(buffer);

  if (texto.trim() === '') {
    throw Object.assign(new Error('O arquivo está vazio.'), { statusCode: 422 });
  }

  const separador = detectarSeparador(texto);
  const matriz = parseMatriz(texto, separador);

  if (matriz.length === 0) {
    throw Object.assign(new Error('O arquivo não tem nenhuma linha legível.'), { statusCode: 422 });
  }

  const cabecalhos = (matriz[0] ?? []).map((celula) => celula.trim());
  const linhas: LinhaBruta[] = [];

  for (let indice = 1; indice < matriz.length; indice += 1) {
    const celulas = (matriz[indice] ?? []).map((celula) => celula.trim());
    // Linha em branco no meio ou no fim do arquivo é comum quando se apaga
    // uma linha no Excel; ignorar em silêncio é o comportamento esperado.
    if (celulas.every((celula) => celula === '')) continue;
    linhas.push({ numero: indice + 1, celulas });
  }

  return { cabecalhos, linhas, separador, codificacao };
}
