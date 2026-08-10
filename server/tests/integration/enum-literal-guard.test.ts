/**
 * Guarda anti-regressão — VARIANTE 2: literal de `ENUM` inexistente.
 *
 * ## Por que este teste existe
 *
 * O PostgreSQL rejeita a consulta INTEIRA quando recebe um literal fora do
 * `ENUM` (`invalid input value for enum ...`). Em `where` isso derruba uma
 * leitura; em `create`/`update` isso derruba a escrita com `500`.
 *
 * A classe já apareceu quatro vezes (ver
 * `docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`):
 * - `'escalated'` no widget do Jurídico (`a2947b9`)
 * - `'reservation'` / `'reservation_release'` em reservas (`ed47e10`)
 *
 * Nenhuma rede existente pega isso: `tsc` tipa a coluna como `string`
 * (ver `src/models/AuditLog.ts:20` — `action: string`), a suíte unitária usa
 * repositório dublê, e o boot do servidor não escreve nada.
 *
 * ## O caso concreto que este teste trava hoje
 *
 * `enum_audit_logs_action` tem 15 valores; o código chama `logAction` com
 * 37 literais que não existem no tipo. Como `auditLogService` é
 * fire-and-forget (nunca propaga erro ao chamador), a API responde **200** e
 * o log de auditoria simplesmente **não é gravado** — perda silenciosa de
 * trilha de auditoria, que é requisito fiscal.
 *
 * @module tests/integration/enum-literal-guard
 */

import fs from 'fs';
import path from 'path';

import { integrationEnabled } from '../helpers/testApi';

const describeIntegration = integrationEnabled() ? describe : describe.skip;

const SRC_DIR = path.resolve(__dirname, '..', '..', 'src');

/**
 * Literais aceitos apesar de não pertencerem ao `ENUM` de mesmo nome de
 * coluna. São DTOs de fronteira (contratos de provedor externo, respostas
 * HTTP, objetos de domínio em memória) que NUNCA chegam ao Postgres.
 * Cada entrada precisa de motivo — esta lista não é depósito de exceção
 * silenciosa.
 */
const KNOWN_NON_DB_LITERALS: Array<{ file: RegExp; key: string; reason: string }> = [
  { file: /^src\/routes\/health\.ts$/, key: 'status', reason: 'payload do health check HTTP (ok/ready/not_ready/draining), não é coluna' },
  { file: /^src\/utils\/validators\.ts$/, key: 'type', reason: 'discriminador cpf/cnpj do validador de documento, não é coluna' },
  { file: /^src\/services\/qrCodeService\.ts$/, key: 'type', reason: 'formato de saída do QR (svg/png), não é coluna' },
  { file: /^src\/services\/auditLogService\.ts$/, key: 'level', reason: 'nível do log estruturado (Winston), não é coluna' },
  { file: /^src\/scripts\/backfill\//, key: 'type', reason: 'script de backfill Product→Item; mapeia tipo do schema legado' },
  { file: /modules\/fiscal\//, key: 'status', reason: 'contrato do provedor de NF-e (authorized/denied), traduzido para o enum de sales antes de persistir' },
  { file: /modules\/traceability\//, key: 'tipo', reason: 'discriminador do DTO de linha do tempo, montado em memória' },
  { file: /modules\/juridico\/presentation\/controllers\/contractController\.ts$/, key: 'type', reason: 'tipo de contraparte do DTO de resposta, não é coluna enum' },
  { file: /modules\/quality\/domain\/constants\.ts$/, key: 'reason', reason: 'motivo de bloqueio de liberação em memória (regra G7), não é coluna' },
  { file: /modules\/sst\/application\/use-cases\/epi\//, key: 'reason', reason: 'inventory_movements.reason é VARCHAR livre, não enum' },
  { file: /modules\/(mrp|ti)\//, key: 'origin', reason: 'purchase_requisitions.origin é VARCHAR livre, não enum' },
  { file: /modules\/rh\/application\/use-cases\/admission\//, key: 'contract_type', reason: 'employees.contract_type é VARCHAR livre; o enum homônimo é de jur_contracts' },
  // ⚠️ TEMPORÁRIO — remover quando a migration 20260810-000029 for aplicada.
  // Ela cria `purchase_orders.origin` como ENUM('national','import'); hoje a
  // coluna não existe, então 'national' não casa com nenhum enum `origin`.
  { file: /^src\/models\/Purchase\.ts$|modules\/purchases\/domain\/entities\/PurchaseEntity\.ts$/, key: 'origin', reason: 'coluna criada pela migration pendente 20260810-000029 (purchase-approval-authority-g11)' },
];

function isKnownNonDb(file: string, key: string): boolean {
  return KNOWN_NON_DB_LITERALS.some((e) => e.file.test(file) && e.key === key);
}

/** Lista recursivamente os arquivos `.ts` de um diretório. */
function walk(dir: string, acc: string[] = []): string[] {
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

describeIntegration('Guarda de literal de ENUM × pg_enum', () => {
  let sequelize: any;
  let models: Record<string, any>;
  /** typname → valores válidos */
  let enumValues: Map<string, Set<string>>;
  /** "tabela.coluna" → typname */
  let enumColumn: Map<string, string>;

  beforeAll(async () => {
    sequelize = require('../../src/config/database').sequelize;
    models = require('../../src/models/index');

    const [enumRows]: any = await sequelize.query(`
      SELECT t.typname, e.enumlabel
      FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
      ORDER BY t.typname, e.enumsortorder`);
    enumValues = new Map();
    for (const row of enumRows) {
      if (!enumValues.has(row.typname)) enumValues.set(row.typname, new Set());
      enumValues.get(row.typname)!.add(row.enumlabel);
    }

    const [colRows]: any = await sequelize.query(`
      SELECT table_name, column_name, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND data_type = 'USER-DEFINED'`);
    enumColumn = new Map();
    for (const row of colRows) {
      if (enumValues.has(row.udt_name)) enumColumn.set(`${row.table_name}.${row.column_name}`, row.udt_name);
    }
  });

  afterAll(async () => {
    if (sequelize) await sequelize.close();
  });

  /**
   * Valores que o MODEL declara e o banco não aceita. Um `create` que use
   * um desses valores é um `500` garantido.
   */
  it('nenhum model declara valor de ENUM que o banco não aceita', () => {
    const divergences: string[] = [];

    for (const [modelName, model] of Object.entries(models)) {
      if (!model?.getTableName || !model?.rawAttributes) continue;
      const raw = model.getTableName();
      const table = typeof raw === 'string' ? raw : raw.tableName;

      for (const [attrName, attr] of Object.entries<any>(model.rawAttributes)) {
        const column = attr.field || attrName;
        const typname = enumColumn.get(`${table}.${column}`);
        if (!typname) continue;
        const declared: string[] | undefined = attr.values || attr.type?.values;
        if (!Array.isArray(declared)) continue;

        const allowed = enumValues.get(typname)!;
        const invalid = declared.filter((v) => !allowed.has(v));
        if (invalid.length) {
          divergences.push(
            `${modelName}.${attrName} (${table}.${column} :: ${typname}): model aceita `
            + `[${invalid.join(', ')}] que o banco rejeita — INSERT/UPDATE com esse valor é 500.`,
          );
        }
      }
    }

    expect(divergences).toEqual([]);
  });

  /**
   * O caso mais caro já visto: `audit_logs.action`. `auditLogService.logAction`
   * é fire-and-forget — um literal inválido NÃO gera erro HTTP, apenas
   * silencia a trilha de auditoria. Só um confronto com `pg_enum` acha.
   */
  it('todo literal passado a logAction/AuditLog.register existe em enum_audit_logs_action', () => {
    const allowed = enumValues.get('enum_audit_logs_action');
    expect(allowed).toBeDefined();

    const offenders: string[] = [];
    for (const file of walk(SRC_DIR)) {
      const text = fs.readFileSync(file, 'utf8');
      if (!/logAction\s*\(|AuditLog\.register\s*\(/.test(text)) continue;

      text.split(/\r?\n/).forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        const match = /(?:^|[^\w.'"`])action\s*:\s*(['"])([a-z0-9_]+)\1/.exec(line);
        if (!match) return;
        const literal = match[2];
        if (allowed!.has(literal)) return;
        offenders.push(
          `${path.relative(path.resolve(__dirname, '..', '..'), file).replace(/\\/g, '/')}:${i + 1} `
          + `→ action: '${literal}' não existe em enum_audit_logs_action `
          + `[${[...allowed!].join('|')}] — o audit log NÃO é gravado e a API responde 200.`,
        );
      });
    }

    expect(offenders).toEqual([]);
  });

  /**
   * Varredura ampla e determinística: um literal só é acusado quando NÃO
   * existe em NENHUM `ENUM` do banco cujo nome de coluna seja igual à chave
   * usada no código.
   *
   * Escolha de projeto: a união por nome de coluna (em vez de escopo por
   * model) torna o resultado independente de heurística de "qual model este
   * arquivo escreve" — que produzia falso positivo em massa. O preço é não
   * detectar um literal válido para OUTRA tabela; esse caso residual fica
   * coberto pelo teste dedicado de `audit_logs.action` e pela varredura
   * dinâmica (um POST real por endpoint).
   */
  it('nenhum literal de ENUM usado no código está fora de todos os tipos do banco', () => {
    const byColumnName = new Map<string, Set<string>>();
    for (const [key, typname] of enumColumn) {
      const column = key.slice(key.indexOf('.') + 1);
      if (!byColumnName.has(column)) byColumnName.set(column, new Set());
      for (const value of enumValues.get(typname)!) byColumnName.get(column)!.add(value);
    }

    const offenders: string[] = [];
    for (const file of walk(SRC_DIR)) {
      const text = fs.readFileSync(file, 'utf8');
      const rel = path.relative(path.resolve(__dirname, '..', '..'), file).replace(/\\/g, '/');

      text.split(/\r?\n/).forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        for (const [column, allowed] of byColumnName) {
          // `action` tem teste dedicado acima — não duplicar o relatório.
          if (column === 'action') continue;
          const re = new RegExp(`(?:^|[^\\w.'"\`])${column}\\s*:\\s*(['"])([a-z0-9_]+)\\1`, 'g');
          let m: RegExpExecArray | null;
          while ((m = re.exec(line))) {
            const literal = m[2];
            if (allowed.has(literal) || isKnownNonDb(rel, column)) continue;
            offenders.push(`${rel}:${i + 1} → ${column}: '${literal}' não existe em nenhum ENUM de coluna "${column}"`);
          }
        }
      });
    }

    expect(offenders).toEqual([]);
  });
});
