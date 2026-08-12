/**
 * Guarda anti-regressão: caminho citado na documentação tem que existir.
 *
 * ## Por que este teste existe (auditoria de 2026-08-11)
 *
 * A auditoria achou drift documental em 12+ arquivos. Uma fatia grande não
 * era prosa desatualizada — era **caminho errado**: `CLAUDE.md` mandava rodar
 * `scripts/comparar-bancos.cjs` (mora em `server/scripts/`),
 * `docs/database/00-INDICE.md` citava a guarda de organograma em
 * `server/tests/unit/` (mora em `client/src/lib/`), quatro docs do Bloco 6
 * apontavam para um `pipeline-modulos-novos.md` que nunca existiu no repo.
 *
 * Esse defeito é mais caro do que parece: quem lê um caminho num documento
 * **não desconfia dele**. Roda o comando, não acha o arquivo, e conclui que o
 * ambiente está quebrado — não que o documento está. Foi exatamente o que
 * aconteceu com a `cross-database-drift-guard` em 2026-08-11.
 *
 * E é a classe de drift mais barata de automatizar: existir arquivo no disco
 * é decidível, não exige juízo, não exige banco. Por isso esta guarda é
 * unitária — roda em todo `npm run test:unit`, sem Postgres.
 *
 * ## O que é verificado
 *
 * Em `docs/**\/*.md` + `CLAUDE.md`, todo trecho em crase que **parece** um
 * caminho do repositório — começa por `docs/`, `server/`, `client/`,
 * `mobile/`, `tv/` ou `scripts/` e termina numa extensão de arquivo real
 * (`.md`, `.ts`, `.tsx`, `.cjs`, `.sql`, `.csv`, `.json`) — precisa existir
 * no disco.
 *
 * `scripts/…` é deliberadamente varrido mesmo sem existir `scripts/` na raiz:
 * a ambiguidade "relativo ao repo ou relativo a `server/`?" é justamente o
 * que enganou o leitor em 2026-08-11. O caminho tem que ser escrito por
 * inteiro (`server/scripts/…`) ou marcado como comando local.
 *
 * ## Convenções de isenção
 *
 * Herdadas de {@link module:tests/helpers/docsGuardConventions}: R1 (banner
 * de arquivo histórico no topo), R2 (linha em citação `>`), R3 (item de
 * checklist fechado). Mais duas, específicas desta guarda:
 *
 * - **R5 — a linha declara que o arquivo ainda não existe.** Vale qualquer uma
 *   das formas já usadas no repositório: `(proposto)` / `(proposta)`,
 *   `a criar` (inclusive `[A CRIAR NO GO-LIVE DAY]`, como o
 *   `GO_LIVE_G6_CHECKLIST.md` já escrevia), `(pendente)` / `[PENDENTE]`,
 *   `(futuro)`, `(sugerido)` e o literal `não existe(m)`. Documento de plano
 *   cita arquivo que ainda não existe **por definição**, e um inventário de
 *   pendências precisa nomear o que falta. O marcador torna isso explícito
 *   para o leitor humano no mesmo movimento em que desarma a guarda — sem
 *   marcador, plano e realidade ficam indistinguíveis.
 * - **R6 — não é um caminho literal.** Padrão glob (`docs/**\/*.md`),
 *   placeholder (`docs/<área>/00-README.md`, `docs/{a,b}/x.md`), reticências
 *   (`server/…/x.ts`) ou curinga `?`. São formas de falar sobre um conjunto,
 *   não sobre um arquivo.
 *
 * ## Nota de projeto: por que não há lista de exceções aqui
 *
 * A guarda não conhece nenhum arquivo pelo nome. Tudo que a isenta está
 * escrito no documento isento — banner no topo ou marcador na linha. Lista de
 * exceções dentro do teste é invisível para quem lê o doc e cresce sem
 * resistência; banner no doc é lido por humano e por teste ao mesmo tempo.
 *
 * @module tests/unit/docs-path-reference-guard
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  documentosSobGuarda,
  ehArquivoHistorico,
  linhasVivasDe,
  RAIZ_REPO,
  type DocumentoSobGuarda,
} from '../helpers/docsGuardConventions';

/**
 * Trecho em crase que começa por um diretório de topo do repo e termina numa
 * extensão de arquivo conhecida. Âncoras de diretório e extensão são o que
 * separa "caminho" de "nome de coisa com barra" na prosa.
 */
const CITACAO_DE_CAMINHO =
  /`((?:docs|server|client|mobile|tv|scripts)\/[^`\s]*\.(?:md|ts|tsx|cjs|sql|csv|json))`/g;

/** R5 — a linha declara que o caminho ainda não existe. */
const MARCADOR_DE_PROPOSTA =
  /[([](?:proposto|proposta|pendente|futuro|sugerido)\b|\ba criar\b|\bn[ãa]o existe[mn]?\b/i;

/** R6 — o "caminho" é padrão/placeholder, não um arquivo. */
const NAO_E_CAMINHO_LITERAL = /[*?<>{}]|\.\.\.|…/;

/** Uma citação de caminho que não resolveu para arquivo no disco. */
interface CaminhoQuebrado {
  documento: string;
  linha: number;
  caminho: string;
}

/**
 * Aplica R5/R6 e a checagem de existência a um conjunto de documentos já
 * filtrado pelas regras R1–R3.
 *
 * Recebe os documentos por parâmetro (em vez de lê-los aqui) só para que o
 * próprio teste possa alimentar documentos sintéticos e provar que a guarda
 * REPROVA quando deve — ver "auto-verificação" no fim deste arquivo.
 *
 * @param documentos Documentos sob guarda.
 * @returns Uma entrada por citação quebrada, em ordem de arquivo e linha.
 */
function caminhosQuebradosEm(documentos: DocumentoSobGuarda[]): CaminhoQuebrado[] {
  const quebrados: CaminhoQuebrado[] = [];

  for (const documento of documentos) {
    for (const { numero, texto } of documento.linhasVivas) {
      if (MARCADOR_DE_PROPOSTA.test(texto)) continue; // R5

      for (const encontrado of texto.matchAll(CITACAO_DE_CAMINHO)) {
        const caminho = encontrado[1];
        if (NAO_E_CAMINHO_LITERAL.test(caminho)) continue; // R6
        if (fs.existsSync(path.join(RAIZ_REPO, caminho))) continue;

        quebrados.push({ documento: documento.relativo, linha: numero, caminho });
      }
    }
  }

  return quebrados;
}

/**
 * Monta um documento sintético a partir de markdown em memória, passando pelas
 * mesmas regras R1–R3 que os arquivos reais atravessam.
 *
 * @param markdown Conteúdo do documento fictício.
 * @returns Documento pronto para {@link caminhosQuebradosEm}, ou `null` se o
 *          markdown se declarou histórico (R1) e portanto sai da varredura.
 */
function documentoSintetico(markdown: string): DocumentoSobGuarda | null {
  if (ehArquivoHistorico(markdown)) return null;
  return {
    absoluto: '(sintético)',
    relativo: 'docs/SINTETICO.md',
    linhasVivas: linhasVivasDe(markdown),
  };
}

/** Caminho que com certeza não existe, para os casos negativos. */
const CAMINHO_INEXISTENTE = 'docs/este-arquivo-nunca-existiu-9b25afe2.md';

describe('guarda de caminhos citados na documentação', () => {
  it('todo caminho de arquivo citado em doc vivo existe no disco', () => {
    const quebrados = caminhosQuebradosEm(documentosSobGuarda());

    if (quebrados.length > 0) {
      const detalhe = quebrados
        .map((q) => `  ${q.documento}:${q.linha} → ${q.caminho}`)
        .join('\n');
      throw new Error(
        `Documentação cita ${quebrados.length} caminho(s) que não existem:\n${detalhe}\n\n` +
        'Três saídas legítimas:\n' +
        '  1. O caminho está errado → corrija (é o caso mais comum: falta o\n' +
        '     prefixo `server/`, ou o arquivo foi renomeado/movido);\n' +
        '  2. O arquivo ainda não existe de propósito (plano, proposta) →\n' +
        '     marque a linha com "(a criar)" / "(proposto)" / "[PENDENTE]";\n' +
        '  3. O documento inteiro é registro datado → banner "SUPERADO" /\n' +
        '     "DOCUMENTO HISTÓRICO" no topo (ver\n' +
        '     server/tests/helpers/docsGuardConventions.ts).',
      );
    }
  });
});

/**
 * Auto-verificação da guarda.
 *
 * Uma guarda documental verde não prova nada se a regex parou de casar ou se
 * uma convenção de isenção ficou larga demais — ela simplesmente deixa de
 * reprovar, em silêncio, e vira decoração. É a mesma classe de defeito das 34
 * suítes de integração que pulavam sem ninguém notar (2026-08-10). Estes
 * casos alimentam documentos sintéticos e exigem que a guarda **reprove**
 * quando deve e **isente** quando deve.
 */
describe('auto-verificação: a guarda de caminhos consegue reprovar', () => {
  /**
   * Roda a guarda sobre um markdown em memória.
   *
   * @param markdown Documento fictício.
   * @returns Quantidade de citações quebradas encontradas.
   */
  function violacoesDe(markdown: string): number {
    const documento = documentoSintetico(markdown);
    return documento ? caminhosQuebradosEm([documento]).length : 0;
  }

  it('reprova caminho inexistente citado em linha viva', () => {
    expect(violacoesDe(`# Doc\n\nVer \`${CAMINHO_INEXISTENTE}\`.\n`)).toBe(1);
  });

  it('aprova caminho que existe de verdade', () => {
    expect(violacoesDe('# Doc\n\nVer `server/tests/helpers/docsGuardConventions.ts`.\n')).toBe(0);
  });

  it('R1 — banner histórico no topo isenta o arquivo inteiro', () => {
    const markdown =
      `# Doc\n\n> ## ⚠️ DOCUMENTO HISTÓRICO — SUPERADO\n>\n> Retrato de outra época.\n\nVer \`${CAMINHO_INEXISTENTE}\`.\n`;
    expect(violacoesDe(markdown)).toBe(0);
  });

  it('R2 — linha em citação é ignorada', () => {
    expect(violacoesDe(`# Doc\n\n> Antigamente: \`${CAMINHO_INEXISTENTE}\`.\n`)).toBe(0);
  });

  it('R3 — item de checklist fechado é ignorado, item aberto não', () => {
    expect(violacoesDe(`# Doc\n\n- [x] Feito, citava \`${CAMINHO_INEXISTENTE}\`\n`)).toBe(0);
    expect(violacoesDe(`# Doc\n\n- [ ] A fazer em \`${CAMINHO_INEXISTENTE}\`\n`)).toBe(1);
  });

  it('R5 — declaração explícita de inexistência isenta a linha', () => {
    for (const marcador of ['(proposto)', '(a criar)', '[PENDENTE]', 'não existe']) {
      expect(violacoesDe(`# Doc\n\nVer \`${CAMINHO_INEXISTENTE}\` ${marcador}.\n`)).toBe(0);
    }
  });

  it('R6 — glob e placeholder não são tratados como arquivo', () => {
    expect(violacoesDe('# Doc\n\nVer `docs/**/*.md` e `docs/<área>/00-README.md`.\n')).toBe(0);
  });

  it('só reconhece caminhos ancorados em diretório de topo do repo', () => {
    // "algo/outro.md" sem prefixo conhecido não é tratado como caminho do repo.
    expect(violacoesDe('# Doc\n\nVer `qualquer/coisa.md`.\n')).toBe(0);
  });
});
