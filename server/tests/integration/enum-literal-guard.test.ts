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
 * ## O caso concreto que este teste travou (e como foi resolvido)
 *
 * `enum_audit_logs_action` tinha 15 valores; o código chamava `logAction` com
 * 37 literais que não existiam no tipo, em 46 call sites. Como
 * `auditLogService` é fire-and-forget (nunca propaga erro ao chamador), a API
 * respondia **200** e o log de auditoria simplesmente **não era gravado** —
 * inclusive `access_denied`, ou seja, tentativa de acesso indevido sem rastro.
 *
 * A correção (2026-08-10) tem duas metades:
 *
 * 1. **Vocabulário fechado** em `src/shared/domain/auditActions.ts`: 9 valores
 *    novos (os que mudam a pergunta do auditor) + 29 sinônimos de módulo
 *    traduzidos para o vocabulário, preservando o verbo original como marcador
 *    `[verbo]` na `description`.
 * 2. **Degradação segura**: os 9 valores novos só existem no banco depois da
 *    migration `20260810-000036`, que está na fila de pendentes. Até lá,
 *    `auditLogService` capta o `22P02` do Postgres e **regrava a mesma linha**
 *    com o valor legado equivalente (`AUDIT_ACTION_DB_FALLBACK`) + marcador.
 *
 * ## ⚠️ O que este teste passou a afirmar — e por quê
 *
 * A pergunta original era *"o literal está no `ENUM` hoje?"*. Ela é uma
 * **aproximação** da pergunta que importa, que é *"o evento chega ao banco?"*.
 * As duas coincidiam enquanto não havia caminho de degradação; agora não mais.
 *
 * O teste passou a afirmar a pergunta real, e isso o deixou **mais forte**,
 * não mais fraco:
 *
 * - continua reprovando qualquer literal que não seja valor canônico nem
 *   sinônimo declarado (o caso "alguém inventou um verbo novo");
 * - passou a reprovar também **sinônimo quebrado** (aponta para valor que não
 *   existe) e **degradação quebrada** (valor novo sem destino válido no banco
 *   atual) — duas falhas que a versão anterior não enxergava;
 * - a tolerância é **estritamente limitada** a valores com degradação provada
 *   contra o `pg_enum` REAL desta conexão. Se a migration `000036` estiver
 *   aplicada, não há nada a tolerar e o teste se aperta sozinho, sem edição.
 *
 * O que se perde: este arquivo, sozinho, não avisa mais que a migration está
 * pendente. Isso passou a ser dito em voz alta pelo `console.warn` de cada
 * teste e pelo `auditLogService` em runtime.
 *
 * @module tests/integration/enum-literal-guard
 */

import fs from 'fs';
import path from 'path';

import { integrationEnabled } from '../helpers/testApi';
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_ALIASES,
  downgradeAuditAction,
  resolveAuditAction,
  type AuditAction,
} from '../../src/shared/domain/auditActions';

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
  // As 3 entradas abaixo são discriminadores de RETORNO em memória, tipados
  // como union de string no próprio arquivo (`reason: 'created' | 'zero_amount'
  // | ...`) e devolvidos ao chamador — nenhuma delas chega a `.create()`/
  // `.update()`. Conferido linha a linha em 2026-08-10; os models envolvidos
  // não têm sequer coluna `reason` (`MasterProductionPlan` tem `cancel_reason`).
  // São falso positivo estrutural da união por nome de coluna, que é a
  // limitação já documentada no cabeçalho do 3º teste.
  { file: /^src\/services\/saleReceivableService\.ts$/, key: 'reason', reason: 'discriminador do retorno de criação de contas a receber (DTO em memória), não é coluna' },
  { file: /modules\/purchases\/application\/use-cases\/ReceivePurchaseItemsUseCase\.ts$/, key: 'reason', reason: 'discriminador do retorno de criação de conta a pagar (DTO em memória), não é coluna' },
  { file: /modules\/masterProduction\//, key: 'reason', reason: 'motivo de bloqueio de liberação do plano mestre (DTO em memória); o model tem cancel_reason, não reason' },
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
   * `true` quando `action` é gravável neste banco: ou o `ENUM` já a conhece,
   * ou existe degradação declarada para um valor que ele conhece.
   *
   * @param action - Valor canônico do vocabulário.
   * @param allowed - Valores de `enum_audit_logs_action` nesta conexão.
   * @returns Se o evento chega ao banco.
   */
  function auditActionIsWritable(action: AuditAction, allowed: Set<string>): boolean {
    if (allowed.has(action)) return true;
    const fallback = downgradeAuditAction(action);
    return fallback !== null && allowed.has(fallback);
  }

  /**
   * Valores que o MODEL declara e o banco não aceita. Em regra é `500`
   * garantido em qualquer `create`/`update` com esse valor.
   *
   * Única exceção tolerada, e por um motivo verificado aqui mesmo contra o
   * `pg_enum`: `audit_logs.action`, cujos valores novos têm degradação
   * declarada em `AUDIT_ACTION_DB_FALLBACK` para um valor que ESTE banco
   * aceita. Nesse caso não há `500` nem perda — há regravação com marcador.
   * Qualquer outro model/coluna continua reprovando sem exceção, e quando a
   * migration `20260810-000036` for aplicada a exceção deixa de ser exercida
   * sozinha.
   */
  it('nenhum model declara valor de ENUM que o banco não aceita', () => {
    const divergences: string[] = [];
    const tolerated: string[] = [];

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
        if (!invalid.length) continue;

        const isAuditAction = table === 'audit_logs' && column === 'action';
        const covered = isAuditAction
          && invalid.every((v) => auditActionIsWritable(v as AuditAction, allowed));

        if (covered) {
          tolerated.push(...invalid);
          continue;
        }

        divergences.push(
          `${modelName}.${attrName} (${table}.${column} :: ${typname}): model aceita `
          + `[${invalid.join(', ')}] que o banco rejeita — INSERT/UPDATE com esse valor é 500.`,
        );
      }
    }

    if (tolerated.length) {
      console.warn(
        `[enum-literal-guard] migration 20260810-000036 PENDENTE neste banco: ${tolerated.join(', ')} `
        + 'sao gravados no valor legado equivalente + marcador [verbo] na description. '
        + 'Aplique a migration para gravar o valor exato.',
      );
    }

    expect(divergences).toEqual([]);
  });

  /**
   * O caso mais caro já visto: `audit_logs.action`. `auditLogService.logAction`
   * é fire-and-forget — um literal inválido NÃO gera erro HTTP, apenas
   * silencia a trilha de auditoria. Só um confronto com `pg_enum` acha.
   *
   * A afirmação é **"o evento chega ao banco"**, que é o que importa, e não
   * "o literal está no ENUM hoje". Um literal reprova quando:
   *
   * - não é valor canônico nem sinônimo declarado (verbo inventado); ou
   * - resolve para um valor que este banco não aceita **e** não tem
   *   degradação válida (aí sim o evento seria perdido).
   */
  it('todo literal passado a logAction/AuditLog.register chega ao banco', () => {
    const allowed = enumValues.get('enum_audit_logs_action');
    expect(allowed).toBeDefined();

    const offenders: string[] = [];
    const degraded = new Set<string>();

    for (const file of walk(SRC_DIR)) {
      const text = fs.readFileSync(file, 'utf8');
      if (!/logAction\s*\(|AuditLog\.register\s*\(/.test(text)) continue;

      text.split(/\r?\n/).forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        const match = /(?:^|[^\w.'"`])action\s*:\s*(['"])([a-z0-9_]+)\1/.exec(line);
        if (!match) return;

        const literal = match[2];
        const where = `${path.relative(path.resolve(__dirname, '..', '..'), file).replace(/\\/g, '/')}:${i + 1}`;
        const resolved = resolveAuditAction(literal);

        if (resolved.unknown) {
          offenders.push(
            `${where} → action: '${literal}' não é valor canônico nem sinônimo declarado em `
            + 'src/shared/domain/auditActions.ts — seria gravado como genérico e a granularidade se perde. '
            + 'Declare o sinônimo (ou justifique um valor canônico novo) antes de usar o verbo.',
          );
          return;
        }

        if (!auditActionIsWritable(resolved.action, allowed!)) {
          offenders.push(
            `${where} → action: '${literal}' resolve para '${resolved.action}', que não existe em `
            + `enum_audit_logs_action [${[...allowed!].join('|')}] e não tem degradação válida — `
            + 'o audit log NÃO é gravado e a API responde 200.',
          );
          return;
        }

        if (!allowed!.has(resolved.action)) degraded.add(`${literal} → ${resolved.action}`);
      });
    }

    if (degraded.size) {
      console.warn(
        `[enum-literal-guard] gravando em modo degradado (migration 20260810-000036 pendente): ${[...degraded].join(', ')}`,
      );
    }

    expect(offenders).toEqual([]);
  });

  /**
   * A prova de que a tolerância acima é segura, e não um "allowlist de
   * conveniência": TODO valor canônico que este banco ainda não conhece tem
   * que ter para onde degradar, e o destino tem que ser um valor que este
   * banco aceita.
   *
   * Se alguém acrescentar um valor ao vocabulário e esquecer a degradação,
   * este teste reprova — antes que a trilha volte a sumir em silêncio.
   * Depois da migration `20260810-000036` aplicada, ele passa a ser vácuo
   * (nada a degradar), que é o estado desejado.
   */
  it('todo valor canônico que o banco ainda não conhece tem degradação válida', () => {
    const allowed = enumValues.get('enum_audit_logs_action')!;
    const problems: string[] = [];

    for (const action of AUDIT_ACTIONS) {
      if (allowed.has(action)) continue;
      const fallback = downgradeAuditAction(action);
      if (!fallback) {
        problems.push(`'${action}' não existe no banco e não tem degradação — o evento seria PERDIDO.`);
      } else if (!allowed.has(fallback)) {
        problems.push(`'${action}' degrada para '${fallback}', que o banco também não aceita.`);
      }
    }

    expect(problems).toEqual([]);
  });

  /**
   * Deriva do mesmo princípio, no sentido inverso: sinônimo que aponta para
   * um valor inexistente no vocabulário grava lixo silenciosamente. O
   * `satisfies` do TypeScript já cobre isso em compilação; aqui é a rede de
   * runtime, que continua valendo se alguém contornar a tipagem.
   */
  it('todo sinônimo de módulo aponta para um valor canônico gravável', () => {
    const allowed = enumValues.get('enum_audit_logs_action')!;
    const canonical = new Set<string>(AUDIT_ACTIONS);
    const problems: string[] = [];

    for (const [alias, target] of Object.entries(AUDIT_ACTION_ALIASES)) {
      if (!canonical.has(target)) {
        problems.push(`sinônimo '${alias}' aponta para '${target}', que não é valor canônico.`);
        continue;
      }
      if (!auditActionIsWritable(target as AuditAction, allowed)) {
        problems.push(`sinônimo '${alias}' → '${target}' não é gravável neste banco nem por degradação.`);
      }
    }

    expect(problems).toEqual([]);
  });

  /**
   * Deriva reversa: valor que existe no `ENUM` do banco e sumiu do
   * vocabulário do código. Não quebra escrita, mas deixa linhas antigas de
   * `audit_logs` fora de qualquer classificação conhecida — e é o sintoma de
   * alguém ter "limpado" a lista sem olhar o dado gravado.
   */
  it('todo valor do ENUM do banco está declarado no vocabulário do código', () => {
    const allowed = enumValues.get('enum_audit_logs_action')!;
    const canonical = new Set<string>(AUDIT_ACTIONS);

    const orphans = [...allowed].filter((value) => !canonical.has(value));

    expect(orphans).toEqual([]);
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
