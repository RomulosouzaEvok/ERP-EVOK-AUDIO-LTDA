/**
 * Guarda anti-regressão: a documentação de governança não pode contradizer
 * o banco de dados.
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
 * ## O que este teste afirma (deliberadamente pouco)
 *
 * Só o que é mecanicamente decidível — a interseção entre "o doc afirma X" e
 * "o banco sabe X":
 *
 * 1. Toda migration citada como NÃO aplicada/pendente em um item ABERTO
 *    (`- [ ]`) do `TODO.md` deve estar de fato ausente de `SequelizeMeta`.
 * 2. O inverso não é verificado: item fechado citando migration é histórico,
 *    e histórico não é auditado aqui.
 *
 * Não tenta validar prosa ("tela pendente", "bloqueia o servidor") — juízo
 * humano não é grep. O objetivo é humilde: quando alguém aplicar uma
 * migration, este teste aponta as linhas do TODO.md que ficaram mentirosas,
 * na mesma rodada de teste, e não meses depois numa auditoria manual.
 *
 * Requer Postgres real (roda na suíte de integração, `RUN_INTEGRATION`).
 *
 * @module tests/integration/docs-reality-drift-guard
 */

import * as fs from 'fs';
import * as path from 'path';

const descreveIntegracao = process.env.RUN_INTEGRATION ? describe : describe.skip;

const TODO_PATH = path.resolve(__dirname, '../../../docs/governance/TODO.md');

/**
 * Extrai, de cada item aberto (`- [ ]`) que fala em migration não
 * aplicada/pendente, os nomes de migration citados (`20260810-000034`).
 */
function migrationsCitadasComoPendentes(markdown: string): Array<{ linha: number; migration: string }> {
  const resultado: Array<{ linha: number; migration: string }> = [];
  const linhas = markdown.split(/\r?\n/);

  let dentroDeItemAberto = false;
  linhas.forEach((texto, i) => {
    // Um item de lista novo começa; só nos interessa se for caixa aberta.
    const inicioDeItem = /^\s*- \[([ x])\]/.exec(texto);
    if (inicioDeItem) dentroDeItemAberto = inicioDeItem[1] === ' ';
    if (!dentroDeItemAberto) return;

    // O item precisa alegar pendência de migration nesta linha.
    if (!/(N[AÃ]O APLICADA|MIGRATION N[AÃ]O|pendente)/i.test(texto)) return;

    // Linha já anotada por uma verificação anterior desta guarda: a alegação
    // é prosa histórica reconhecidamente superada (ex.: relatório de
    // auditoria de 08-07 descrevendo o estado daquele dia dentro de um item
    // que continua aberto por outro motivo). Sem esta exceção, prosa
    // histórica exigiria reescrever o diário — exatamente o que não se faz.
    if (texto.includes('✔ aplicada')) return;

    for (const m of texto.matchAll(/20\d{6}-\d{6}/g)) {
      resultado.push({ linha: i + 1, migration: m[0] });
    }
  });

  return resultado;
}

descreveIntegracao('drift entre documentação de governança e banco', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { sequelize } = require('../../src/config/database');

  afterAll(async () => {
    await sequelize.close();
  });

  it('TODO.md não cita como pendente migration que SequelizeMeta diz aplicada', async () => {
    const markdown = fs.readFileSync(TODO_PATH, 'utf8');
    const citadas = migrationsCitadasComoPendentes(markdown);

    const [aplicadasBrutas] = await sequelize.query('SELECT name FROM "SequelizeMeta"');
    const aplicadas: string[] = (aplicadasBrutas as Array<Record<string, string> | string[]>)
      .map((l) => (Array.isArray(l) ? l[0] : l.name))
      .filter(Boolean);

    const mentirosas = citadas.filter(({ migration }) =>
      aplicadas.some((nome) => nome.startsWith(migration)),
    );

    if (mentirosas.length > 0) {
      const detalhe = mentirosas
        .map((m) => `  TODO.md:${m.linha} diz que ${m.migration} está pendente — mas está aplicada`)
        .join('\n');
      throw new Error(
        `Documentação contradiz o banco (${mentirosas.length} ocorrência(s)):\n${detalhe}\n\n` +
        'Corrija o TODO.md: marque o item como resolvido ou remova a alegação.',
      );
    }
  });
});
