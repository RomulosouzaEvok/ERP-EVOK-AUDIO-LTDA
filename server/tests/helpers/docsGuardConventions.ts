/**
 * Convenção mecânica compartilhada pelas guardas de documentação.
 *
 * ## O problema que esta convenção resolve
 *
 * A documentação do projeto mistura, no mesmo diretório, dois gêneros que
 * exigem tratamentos opostos:
 *
 * - **Documento vivo** (`CLAUDE.md`, `docs/arquitetura/API.md`,
 *   `docs/database/00-INDICE.md`): descreve o estado ATUAL. Se contradiz o
 *   banco ou cita um arquivo que não existe, é um defeito — deve reprovar.
 * - **Registro datado** (relatório de auditoria de 2026-08-07, entrada de
 *   diário, handoff append-only): descreve o estado de UM DIA. Reescrevê-lo
 *   para "ficar verdadeiro hoje" destrói a evidência que ele existe para
 *   guardar. Corrigir um relatório de auditoria é falsificá-lo.
 *
 * A auditoria de 2026-08-11 achou drift em 12+ arquivos e a limpeza do mesmo
 * dia mostrou o caminho: em vez de reescrever histórico, **anotar**. Esta
 * convenção transforma aquela prática manual em regra mecânica.
 *
 * ## As regras (todas declaradas NO PRÓPRIO DOCUMENTO, nunca no teste)
 *
 * Princípio de projeto: a guarda **não** carrega lista de arquivos isentos.
 * Um documento se declara histórico escrevendo isso no seu topo — o leitor
 * humano vê o mesmo aviso que o teste. Lista no teste envelhece invisível;
 * banner no doc envelhece à vista.
 *
 * 1. **R1 — arquivo histórico declarado.** Se as primeiras
 *    {@link LINHAS_DE_CABECALHO} linhas contêm `SUPERADO`,
 *    `DOCUMENTO HISTÓRICO`, `REGISTRO APPEND-ONLY` ou `REGISTRO DATADO`, o
 *    arquivo inteiro sai da varredura. Formato do banner já em uso no repo:
 *    um blockquote `> ## ⚠️ ...` logo abaixo do `#` do título, dizendo o que
 *    superou e para onde ir buscar o estado atual.
 * 2. **R2 — linha em citação.** Linha começando com `>` (até 3 espaços de
 *    indentação) é ignorada. A limpeza de 2026-08-11 preservou frases antigas
 *    exatamente assim: a frase original vira citação e a nota de superação
 *    vem ao lado.
 * 3. **R3 — item de checklist fechado.** As linhas de um item `- [x]` (até o
 *    próximo item de mesmo nível) são ignoradas. Regra herdada da versão
 *    original desta guarda: caixa marcada é registro do que foi feito, não
 *    afirmação sobre o presente. Caixa ABERTA (`- [ ]`) continua sob guarda —
 *    é ela que promete algo ao leitor.
 *
 * As regras específicas de cada guarda (contra-afirmação "já aplicada" na
 * guarda de migrations; marcador `(a criar)` na guarda de caminhos) ficam
 * documentadas nos respectivos testes.
 *
 * @module tests/helpers/docsGuardConventions
 */

import * as fs from 'fs';
import * as path from 'path';

/** Quantas linhas do topo do arquivo são inspecionadas em busca do banner (R1). */
export const LINHAS_DE_CABECALHO = 30;

/**
 * Marcadores que, no cabeçalho de um `.md`, declaram o arquivo inteiro como
 * registro datado — fora do alcance das guardas (R1).
 */
export const MARCADOR_ARQUIVO_HISTORICO =
  /SUPERADO|DOCUMENTO HIST[OÓ]RICO|REGISTRO APPEND-ONLY|REGISTRO DATADO/i;

/** Raiz do repositório (duas pastas acima de `server/tests/`). */
export const RAIZ_REPO = path.resolve(__dirname, '../../..');

/** Uma linha de markdown já classificada como viva (sob guarda). */
export interface LinhaViva {
  /** Número da linha, base 1 — o mesmo que o editor mostra. */
  numero: number;
  /** Conteúdo bruto da linha. */
  texto: string;
}

/** Um arquivo de documentação sob guarda, já lido e classificado. */
export interface DocumentoSobGuarda {
  /** Caminho absoluto no disco. */
  absoluto: string;
  /** Caminho relativo à raiz do repo, com `/` — o formato citado nos docs. */
  relativo: string;
  /** Só as linhas que as regras R1–R3 deixaram passar. */
  linhasVivas: LinhaViva[];
}

/**
 * Lista recursivamente os arquivos `.md` de um diretório.
 *
 * @param dir Diretório a varrer.
 * @param acumulador Usado na recursão; não passar na chamada externa.
 * @returns Caminhos absolutos de todos os `.md` encontrados.
 */
function listarMarkdown(dir: string, acumulador: string[] = []): string[] {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const alvo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) listarMarkdown(alvo, acumulador);
    else if (entrada.name.endsWith('.md')) acumulador.push(alvo);
  }
  return acumulador;
}

/**
 * O universo varrido pelas duas guardas: todo `docs/**\/*.md` mais os dois
 * arquivos de instrução da raiz (`CLAUDE.md` e `AGENTS.md`), que são lidos
 * por agentes a cada sessão e por isso são os que mais custam quando mentem.
 *
 * @returns Caminhos absolutos, em ordem estável.
 */
export function arquivosDeDocumentacao(): string[] {
  const arquivos = listarMarkdown(path.join(RAIZ_REPO, 'docs'));
  for (const raiz of ['CLAUDE.md', 'AGENTS.md']) {
    const alvo = path.join(RAIZ_REPO, raiz);
    if (fs.existsSync(alvo)) arquivos.push(alvo);
  }
  return arquivos.sort();
}

/**
 * Aplica R1 (banner de arquivo histórico).
 *
 * @param markdown Conteúdo completo do arquivo.
 * @returns `true` se o arquivo se declarou registro datado.
 */
export function ehArquivoHistorico(markdown: string): boolean {
  const cabecalho = markdown.split(/\r?\n/).slice(0, LINHAS_DE_CABECALHO).join('\n');
  return MARCADOR_ARQUIVO_HISTORICO.test(cabecalho);
}

/**
 * Aplica R2 e R3 a um arquivo já lido, devolvendo só as linhas sob guarda.
 *
 * @param markdown Conteúdo completo do arquivo.
 * @returns Linhas vivas, com o número original preservado.
 */
export function linhasVivasDe(markdown: string): LinhaViva[] {
  const vivas: LinhaViva[] = [];
  let dentroDeItemFechado = false;

  markdown.split(/\r?\n/).forEach((texto, indice) => {
    // R3: um item de checklist novo redefine o contexto. Só reabre a guarda
    // quando a caixa está vazia.
    const caixa = /^\s*[-*] \[([ xX])\]/.exec(texto);
    if (caixa) dentroDeItemFechado = caixa[1] !== ' ';
    if (dentroDeItemFechado) return;

    // R2: citação — histórico preservado à vista, não afirmação corrente.
    if (/^\s{0,3}>/.test(texto)) return;

    vivas.push({ numero: indice + 1, texto });
  });

  return vivas;
}

/**
 * Carrega o universo de documentação já filtrado pelas regras R1–R3.
 *
 * @returns Um {@link DocumentoSobGuarda} por arquivo vivo (arquivos
 *          inteiramente históricos não aparecem na lista).
 */
export function documentosSobGuarda(): DocumentoSobGuarda[] {
  const documentos: DocumentoSobGuarda[] = [];

  for (const absoluto of arquivosDeDocumentacao()) {
    const markdown = fs.readFileSync(absoluto, 'utf8');
    if (ehArquivoHistorico(markdown)) continue;
    documentos.push({
      absoluto,
      relativo: path.relative(RAIZ_REPO, absoluto).replace(/\\/g, '/'),
      linhasVivas: linhasVivasDe(markdown),
    });
  }

  return documentos;
}
