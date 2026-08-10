/**
 * Guarda anti-regressão — VARIANTE 3: nome de coluna inexistente.
 *
 * ## Por que este teste existe
 *
 * Esta é a variante **mais perigosa** das três, porque não produz erro
 * nenhum. O Sequelize descarta em silêncio qualquer chave que não seja
 * atributo do model: o `UPDATE` é emitido sem ela, a API responde `200`, e
 * o dado simplesmente **não é gravado**.
 *
 * Caso catalogado e ainda aberto (ver
 * `docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`):
 * `UpdateNonConformityUseCase` grava `closed_at`, mas a coluna real de
 * `non_conformities` é `closed_date` — **toda RNC fechada fica sem data de
 * fechamento**, e nada acusa.
 *
 * ## O outro lado da mesma moeda
 *
 * Quando o model declara um atributo cuja coluna **não existe** no banco, o
 * efeito é o oposto — barulhento e total: o Sequelize inclui a coluna no
 * `SELECT`, e o Postgres derruba a consulta inteira
 * (`column "x" does not exist`). O model fica ilegível: `findByPk`,
 * `findAll`, `create` e `update` viram `500`. Foi o que a varredura de
 * 2026-08-10 encontrou em `Supplier`, `Purchase`, `LotControl` e
 * `ProductionOrderReservation` — models adiantados em relação às migrations
 * pendentes.
 *
 * @module tests/integration/column-name-drift-guard
 */

import fs from 'fs';
import path from 'path';

import { integrationEnabled } from '../helpers/testApi';

const describeIntegration = integrationEnabled() ? describe : describe.skip;

const SERVER_DIR = path.resolve(__dirname, '..', '..');
const MODULES_DIR = path.join(SERVER_DIR, 'src', 'modules');

/**
 * Chaves aceitas em payload de escrita apesar de não serem atributo de
 * model do módulo. São campos de DTO/consulta que o repositório traduz
 * antes de chegar ao Sequelize. Cada entrada precisa de motivo.
 */
const KNOWN_NON_ATTRIBUTE_KEYS: Array<{ file: RegExp; key: string; reason: string }> = [
  // Vazio de propósito. Ao adicionar, registre também em
  // docs/governance/TODO.md com prazo de resolução.
];

function isKnownKey(file: string, key: string): boolean {
  return KNOWN_NON_ATTRIBUTE_KEYS.some((e) => e.file.test(file) && e.key === key);
}

/** Lista recursivamente os arquivos `.ts` de um diretório. */
function walk(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') walk(full, acc);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

/**
 * Extrai as chaves de primeiro nível de um objeto literal que começa em
 * `text[start]` (que deve ser `{`), respeitando aninhamento e strings.
 *
 * @param text - Código-fonte completo.
 * @param start - Índice da chave de abertura.
 * @returns Chaves de primeiro nível e o índice logo após o `}` de fecho.
 */
function objectKeysAt(text: string, start: number): { keys: Array<{ key: string; index: number }>; end: number } {
  const keys: Array<{ key: string; index: number }> = [];
  let depth = 0;
  let i = start;
  let quote: string | null = null;

  for (; i < text.length; i += 1) {
    const ch = text[i];

    if (quote) {
      if (ch === '\\') { i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{' || ch === '[' || ch === '(') { depth += 1; continue; }
    if (ch === '}' || ch === ']' || ch === ')') {
      depth -= 1;
      if (depth === 0) break;
      continue;
    }
    if (depth === 1) {
      // Uma chave de primeiro nível: início de linha/vírgula, ident, dois-pontos.
      const slice = text.slice(i);
      const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:/.exec(slice);
      if (m && /[{,\s]/.test(text[i - 1] ?? '')) {
        keys.push({ key: m[1], index: i });
        i += m[0].length - 1;
      }
    }
  }
  return { keys, end: i };
}

/** Converte índice de caractere em número de linha (1-based). */
function lineAt(text: string, index: number): number {
  return text.slice(0, index).split(/\n/).length;
}

describeIntegration('Guarda de nome de coluna × schema físico', () => {
  let sequelize: any;
  let models: Record<string, any>;
  /** tabela → colunas físicas */
  let physical: Map<string, Set<string>>;

  beforeAll(async () => {
    sequelize = require('../../src/config/database').sequelize;
    models = require('../../src/models/index');

    const [rows]: any = await sequelize.query(`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public'`);
    physical = new Map();
    for (const row of rows) {
      if (!physical.has(row.table_name)) physical.set(row.table_name, new Set());
      physical.get(row.table_name)!.add(row.column_name);
    }
  });

  afterAll(async () => {
    if (sequelize) await sequelize.close();
  });

  /**
   * Model adiantado em relação ao banco. Quebra TODA leitura do model, não
   * só a escrita — o Sequelize põe a coluna inexistente no `SELECT`.
   */
  it('todo atributo de model corresponde a uma coluna física existente', () => {
    const divergences: string[] = [];

    for (const [modelName, model] of Object.entries(models)) {
      if (!model?.getTableName || !model?.rawAttributes) continue;
      const raw = model.getTableName();
      const table = typeof raw === 'string' ? raw : raw.tableName;

      const columns = physical.get(table);
      if (!columns) {
        divergences.push(`${modelName}: tabela "${table}" não existe no banco — todo uso do model é 500.`);
        continue;
      }

      for (const [attrName, attr] of Object.entries<any>(model.rawAttributes)) {
        const column = attr.field || attrName;
        if (!columns.has(column)) {
          divergences.push(
            `${modelName}.${attrName} → ${table}.${column} não existe no banco — `
            + 'o Sequelize inclui a coluna no SELECT e o Postgres rejeita a consulta inteira (500 em toda leitura).',
          );
        }
      }
    }

    expect(divergences).toEqual([]);
  });

  /**
   * Prova de execução: se o model é legível, uma leitura real não levanta.
   * Mais forte que a comparação de metadados porque também exercita
   * `defaultScope`, `include` e tipos customizados.
   */
  it('todo model responde a uma leitura real sem erro do Postgres', async () => {
    const broken: string[] = [];

    for (const [modelName, model] of Object.entries(models)) {
      if (!model?.findOne || !model?.rawAttributes || !model?.getTableName) continue;
      try {
        await model.findOne({ limit: 1 });
      } catch (error: any) {
        const pg = error?.original?.message ?? error?.message ?? String(error);
        broken.push(`${modelName}.findOne() → ${pg}`);
      }
    }

    expect(broken).toEqual([]);
  });

  /**
   * A variante silenciosa: chave gravada num payload de escrita que NÃO é
   * atributo de nenhum model do módulo. O Sequelize descarta sem avisar.
   *
   * Escopo: apenas objetos que chegam a `.create(...)`/`.update(...)` e
   * variáveis de payload (`*Data`, `*Payload`, `*Values`) dentro de
   * `application/use-cases` e `infrastructure/sequelize` — onde a escrita
   * de fato acontece.
   */
  it('nenhum payload de escrita usa chave que não é atributo do model do módulo', () => {
    const modelAttrs = new Map<string, Set<string>>();
    for (const [name, model] of Object.entries(models)) {
      if (!model?.rawAttributes) continue;
      const set = new Set<string>();
      for (const [attrName, attr] of Object.entries<any>(model.rawAttributes)) {
        set.add(attrName);
        if (attr.field) set.add(attr.field);
      }
      modelAttrs.set(name, set);
    }

    const offenders: string[] = [];
    const moduleNames = fs.existsSync(MODULES_DIR)
      ? fs.readdirSync(MODULES_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
      : [];

    for (const moduleName of moduleNames) {
      const files = walk(path.join(MODULES_DIR, moduleName))
        .filter((f) => /[\\/](application[\\/]use-cases|infrastructure[\\/]sequelize)[\\/]/.test(f));
      if (!files.length) continue;

      // Vocabulário do módulo = atributos de todo model citado em qualquer
      // arquivo do módulo. Deliberadamente generoso: só acusa a chave que
      // não pertence a NENHUM model que o módulo toca.
      const allFiles = walk(path.join(MODULES_DIR, moduleName));
      const vocabulary = new Set<string>();
      for (const file of allFiles) {
        const text = fs.readFileSync(file, 'utf8');
        for (const [name, attrs] of modelAttrs) {
          // O módulo raramente cita o model pelo nome exato: a Clean
          // Architecture o esconde atrás de um repositório
          // (`itemSupplierRepository`). Por isso casamos também a forma
          // camelCase usada como prefixo de identificador — sem isso o
          // vocabulário fica incompleto e o teste acusa falso positivo.
          const lowerFirst = name.charAt(0).toLowerCase() + name.slice(1);
          const re = new RegExp(`\\b${name}(?![A-Za-z0-9_])|\\b${lowerFirst}(?![a-z0-9_])`);
          if (!re.test(text)) continue;
          for (const a of attrs) vocabulary.add(a);
        }
      }
      if (!vocabulary.size) continue;

      for (const file of files) {
        const text = fs.readFileSync(file, 'utf8');
        const rel = path.relative(SERVER_DIR, file).replace(/\\/g, '/');
        const seen = new Set<string>();

        // (a) objeto literal passado direto a .create(...) / .update(...)
        const callRe = /\.(create|update|bulkCreate)\s*\(\s*\{/g;
        let call: RegExpExecArray | null;
        while ((call = callRe.exec(text))) {
          const braceIndex = text.indexOf('{', call.index);
          const { keys } = objectKeysAt(text, braceIndex);
          for (const { key, index } of keys) seen.add(`${key}@${index}`);
        }

        // (b) variável de payload: const xData = { ... }
        const varRe = /\b(?:const|let|var)\s+\w*(?:Data|Payload|Values|Attrs)\b[^=]*=\s*\{/g;
        let v: RegExpExecArray | null;
        while ((v = varRe.exec(text))) {
          const braceIndex = text.indexOf('{', v.index + v[0].length - 1);
          const { keys } = objectKeysAt(text, braceIndex);
          for (const { key, index } of keys) seen.add(`${key}@${index}`);
        }

        // (c) atribuição avulsa: xData.coluna = ...
        const assignRe = /\b\w*(?:Data|Payload|Values|Attrs)\.([A-Za-z_][A-Za-z0-9_]*)\s*=[^=]/g;
        let a: RegExpExecArray | null;
        while ((a = assignRe.exec(text))) seen.add(`${a[1]}@${a.index}`);

        for (const entry of seen) {
          const at = entry.lastIndexOf('@');
          const key = entry.slice(0, at);
          const index = Number(entry.slice(at + 1));
          if (vocabulary.has(key) || isKnownKey(rel, key)) continue;
          // Só acusa nome que PARECE coluna (snake_case) — reduz ruído de
          // opções do Sequelize (transaction, where, include, returning...).
          if (!/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(key)) continue;
          offenders.push(
            `${rel}:${lineAt(text, index)} → "${key}" não é atributo de nenhum model do módulo `
            + `"${moduleName}" — o Sequelize descarta a chave em silêncio e a API responde 200.`,
          );
        }
      }
    }

    expect(offenders.sort()).toEqual([]);
  });
});
