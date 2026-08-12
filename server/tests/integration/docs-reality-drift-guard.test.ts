/**
 * Guarda anti-regressão: a documentação não pode contradizer o banco.
 *
 * ## Por que este teste existe (auditoria de 2026-08-10)
 *
 * `docs/governance/TODO.md` afirmava, no mesmo dia da verificação:
 * - "MIGRATION NÃO APLICADA — 20260810-000032/33/34/35" → as 4 aplicadas;
 * - "`purchase_orders.requester_id` é NULL-able" → `NOT NULL` desde a 000040;
 * - "tela do roteiro/Plano Mestre pendente" → ambas existem em `client/`.
 *
 * A causa é estrutural: o arquivo é um diário append-only E um checklist
 * vivo ao mesmo tempo. A caixa `- [ ]` é verdadeira quando escrita e ninguém
 * volta 2.000 linhas para marcá-la quando um commit posterior resolve. Havia
 * quatro guardas para drift de CÓDIGO e zero para drift de DOCUMENTAÇÃO —
 * e documentação sem guarda desatualiza, como o código já provou 4 vezes.
 *
 * ## Ampliação de 2026-08-12
 *
 * A primeira versão olhava só o `TODO.md`. A auditoria de 2026-08-11 mostrou
 * que a mesma classe de mentira vivia em 12+ arquivos — inclusive no
 * `CLAUDE.md`, que todo agente lê antes de decidir o que fazer. A varredura
 * passou a cobrir **todo `docs/**\/*.md` + `CLAUDE.md` + `AGENTS.md`**, com a
 * convenção de isenção de {@link module:tests/helpers/docsGuardConventions}
 * (R1 banner de arquivo histórico, R2 citação, R3 caixa fechada).
 *
 * ## O que este teste afirma (deliberadamente pouco)
 *
 * Só o que é mecanicamente decidível — a interseção entre "o doc afirma X" e
 * "o banco sabe X":
 *
 * 1. Migration citada como NÃO aplicada/pendente numa linha VIVA de qualquer
 *    documento deve estar de fato ausente de `SequelizeMeta`.
 * 2. O número de migrations dos DOIS pontos de medição canônica
 *    (`CLAUDE.md` §1 e `docs/database/00-INDICE.md`) deve bater com
 *    `SequelizeMeta`. Esses dois pontos são, por decisão de 2026-08-11, os
 *    únicos lugares do projeto autorizados a carregar o número — todos os
 *    outros apontam para eles. Guardar dois pontos é barato; era a
 *    repetição do número em N documentos que produzia contagens divergentes.
 *
 * Não tenta validar prosa ("tela pendente", "bloqueia o servidor") — juízo
 * humano não é grep.
 *
 * ### Regra R4, específica desta guarda: linha auto-corrigida
 *
 * Uma linha que cita a migration como pendente E, na mesma linha, carrega a
 * contra-afirmação ("✔ aplicada — conferido contra `SequelizeMeta`",
 * "já aplicada", "aplicada ao banco") é ignorada. Foi a convenção escolhida
 * na limpeza de 2026-08-11 para diários append-only: nenhum leitor é enganado
 * quando a correção está na mesma linha da alegação, e o rastro do que se
 * acreditava na época sobrevive.
 *
 * Requer Postgres real (roda na suíte de integração, `RUN_INTEGRATION`).
 *
 * @module tests/integration/docs-reality-drift-guard
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

const descreveIntegracao = process.env.RUN_INTEGRATION ? describe : describe.skip;

/** Padrão do nome de migration usado no projeto: `20260811-000044`. */
const NOME_DE_MIGRATION = /20\d{6}-\d{6}/g;

/** A linha alega que a migration não chegou ao banco. */
const ALEGA_PENDENCIA = /(N[AÃ]O APLICAD|MIGRATION N[AÃ]O|pendente|aguardando aplica)/i;

/**
 * R4 — a própria linha desmente a alegação. Ver o cabeçalho deste módulo.
 */
const CONTRA_AFIRMACAO = /(✔|✅)\s*aplicad|j[áa] aplicad|todas aplicadas|aplicad[ao]s? ao banco/i;

/** Uma alegação de pendência localizada num documento. */
interface AlegacaoDePendencia {
  documento: string;
  linha: number;
  migration: string;
  trecho: string;
}

/**
 * Extrai de um documento as migrations citadas como pendentes em linhas vivas.
 *
 * @param documento Documento já filtrado pelas regras R1–R3.
 * @returns Uma entrada por par (linha, migration citada).
 */
function alegacoesDePendencia(documento: DocumentoSobGuarda): AlegacaoDePendencia[] {
  const alegacoes: AlegacaoDePendencia[] = [];

  for (const { numero, texto } of documento.linhasVivas) {
    if (!ALEGA_PENDENCIA.test(texto)) continue;
    if (CONTRA_AFIRMACAO.test(texto)) continue; // R4

    for (const encontrado of texto.matchAll(NOME_DE_MIGRATION)) {
      alegacoes.push({
        documento: documento.relativo,
        linha: numero,
        migration: encontrado[0],
        trecho: texto.trim().slice(0, 120),
      });
    }
  }

  return alegacoes;
}

/**
 * Lê o número de migrations declarado num ponto de medição canônica.
 *
 * @param relativo Caminho do documento, relativo à raiz do repo.
 * @param ancora Regex com UM grupo de captura contendo o número.
 * @returns O número declarado.
 * @throws Se o marcador canônico sumiu do documento — perder o marcador é
 *         tão grave quanto errar o número, porque desarma a guarda em
 *         silêncio.
 */
function numeroCanonicoDeMigrations(relativo: string, ancora: RegExp): number {
  const markdown = fs.readFileSync(path.join(RAIZ_REPO, relativo), 'utf8');
  const encontrado = ancora.exec(markdown);

  if (!encontrado) {
    throw new Error(
      `Marcador de medição canônica não encontrado em ${relativo} (regex ${ancora}).\n` +
      'Os dois pontos canônicos são CLAUDE.md §1 e docs/database/00-INDICE.md.\n' +
      'Se o texto foi reescrito, restaure o marcador "medição canônica" — sem ele ' +
      'esta guarda para de conferir o número e ninguém percebe.',
    );
  }

  return Number(encontrado[1]);
}

descreveIntegracao('drift entre documentação e banco', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { sequelize } = require('../../src/config/database');

  /** Nomes de migration presentes em `SequelizeMeta`. */
  let aplicadas: string[] = [];

  beforeAll(async () => {
    const [linhas] = await sequelize.query('SELECT name FROM "SequelizeMeta"');
    aplicadas = (linhas as Array<Record<string, string> | string[]>)
      .map((l) => (Array.isArray(l) ? l[0] : l.name))
      .filter(Boolean);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('nenhum documento cita como pendente migration que SequelizeMeta diz aplicada', () => {
    const alegacoes = documentosSobGuarda().flatMap(alegacoesDePendencia);

    const mentirosas = alegacoes.filter(({ migration }) =>
      aplicadas.some((nome) => nome.startsWith(migration)),
    );

    if (mentirosas.length > 0) {
      const detalhe = mentirosas
        .map((m) => `  ${m.documento}:${m.linha} — ${m.migration} já está aplicada\n      ${m.trecho}`)
        .join('\n');
      throw new Error(
        `Documentação contradiz o banco (${mentirosas.length} ocorrência(s)):\n${detalhe}\n\n` +
        'Três saídas legítimas, em ordem de preferência:\n' +
        '  1. O documento é vivo → corrija a frase (é um defeito de verdade);\n' +
        '  2. É diário append-only → anote a linha com "(✔ aplicada — conferido\n' +
        '     contra `SequelizeMeta` em AAAA-MM-DD)" ou mova a frase para citação `>`;\n' +
        '  3. O arquivo inteiro é registro datado → banner "SUPERADO" / "DOCUMENTO\n' +
        '     HISTÓRICO" no topo (ver server/tests/helpers/docsGuardConventions.ts).',
      );
    }
  });

  /**
   * Auto-verificação: guarda documental verde não prova nada se a regex parou
   * de casar. Alimenta documentos sintéticos e exige que a detecção reprove
   * quando deve e isente quando deve — mesma preocupação que motivou
   * `assert-jest-no-skips.cjs` em 2026-08-10.
   */
  describe('auto-verificação da detecção', () => {
    /**
     * Roda só o extrator de alegações sobre markdown em memória.
     *
     * @param markdown Documento fictício.
     * @returns Quantidade de alegações de pendência detectadas.
     */
    function alegacoesDe(markdown: string): number {
      if (ehArquivoHistorico(markdown)) return 0;
      return alegacoesDePendencia({
        absoluto: '(sintético)',
        relativo: 'docs/SINTETICO.md',
        linhasVivas: linhasVivasDe(markdown),
      }).length;
    }

    const CITACAO = '20260811-000044';

    it('detecta alegação de pendência em linha viva', () => {
      expect(alegacoesDe(`# Doc\n\nA migration \`${CITACAO}\` NÃO APLICADA.\n`)).toBe(1);
    });

    it('R1 — banner histórico isenta o arquivo inteiro', () => {
      expect(
        alegacoesDe(`# Doc\n\n> ## ⚠️ REGISTRO DATADO\n>\n> De outra época.\n\n\`${CITACAO}\` não aplicada.\n`),
      ).toBe(0);
    });

    it('R2/R3 — citação e caixa fechada são ignoradas', () => {
      expect(alegacoesDe(`# Doc\n\n> \`${CITACAO}\` não aplicada.\n`)).toBe(0);
      expect(alegacoesDe(`# Doc\n\n- [x] \`${CITACAO}\` não aplicada\n`)).toBe(0);
      expect(alegacoesDe(`# Doc\n\n- [ ] \`${CITACAO}\` não aplicada\n`)).toBe(1);
    });

    it('R4 — contra-afirmação na mesma linha isenta', () => {
      expect(
        alegacoesDe(`# Doc\n\n- [ ] \`${CITACAO}\` não aplicada *(✔ aplicada — conferido em 2026-08-12)*\n`),
      ).toBe(0);
    });
  });

  it('os dois pontos de medição canônica declaram o total real de migrations', () => {
    const total = aplicadas.length;

    const declarados = [
      {
        documento: 'CLAUDE.md',
        valor: numeroCanonicoDeMigrations(
          'CLAUDE.md',
          /MEDI[ÇC][ÃA]O CAN[ÔO]NICA[^:]*:\s*\*{0,2}(\d+)\*{0,2}\s*migrations/i,
        ),
      },
      {
        documento: 'docs/database/00-INDICE.md',
        valor: numeroCanonicoDeMigrations(
          'docs/database/00-INDICE.md',
          /Medi[çc][ãa]o can[ôo]nica[\s\S]{0,600}?\|\s*Migrations aplicadas\s*\|\s*\*{0,2}(\d+)\*{0,2}\s*\|/i,
        ),
      },
    ];

    const divergentes = declarados.filter((d) => d.valor !== total);

    if (divergentes.length > 0) {
      const detalhe = divergentes
        .map((d) => `  ${d.documento} declara ${d.valor}, SequelizeMeta tem ${total}`)
        .join('\n');
      throw new Error(
        `Medição canônica de migrations desatualizada:\n${detalhe}\n\n` +
        'Quem aplica migration atualiza os DOIS pontos canônicos na mesma rodada. ' +
        'Nenhum outro documento deve repetir esse número — deve apontar para cá.',
      );
    }
  });
});
