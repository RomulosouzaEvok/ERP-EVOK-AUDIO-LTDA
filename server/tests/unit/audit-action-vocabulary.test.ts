/**
 * Vocabulário de `audit_logs.action` — integridade da SSOT e cobertura real
 * dos call sites.
 *
 * ## Por que este teste vive na suíte UNITÁRIA
 *
 * A guarda `tests/integration/enum-literal-guard.test.ts` confronta os
 * literais com o `pg_enum` real e é a autoridade final. Mas ela só roda com
 * banco (`npm run test:integration`), e o defeito que ela existe para pegar
 * — 46 call sites gravando `action` fora do `ENUM`, com a API respondendo
 * `200` e a trilha não sendo gravada — nasceu justamente porque a rede que
 * roda o tempo todo não o via.
 *
 * Este teste é a metade que **não precisa de banco**: verifica que todo
 * literal do código pertence ao vocabulário ou à tabela de sinônimos, e que
 * a tabela de sinônimos e a de degradação são internamente consistentes.
 * Roda em milissegundos junto com os outros ~1.700 unitários, então a
 * regressão aparece no minuto em que for escrita.
 *
 * O que ele NÃO substitui: só a guarda de integração sabe quais valores o
 * banco de fato aceita hoje.
 *
 * ## Contexto do defeito
 *
 * `docs/governance/auditorias/VARREDURA_ESCRITA_REAL_2026-08-10.md` §2.
 *
 * @module tests/unit/audit-action-vocabulary
 */

import fs from 'fs';
import path from 'path';

import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_ALIASES,
  AUDIT_ACTION_DB_FALLBACK,
  LEGACY_AUDIT_ACTIONS,
  NEW_AUDIT_ACTIONS,
  NEW_AUDIT_ACTION_RATIONALE,
  downgradeAuditAction,
  isUnsupportedAuditActionError,
  markAuditActionInDescription,
  resolveAuditAction,
} from '../../src/shared/domain/auditActions';

const SRC_DIR = path.resolve(__dirname, '..', '..', 'src');
const SERVER_DIR = path.resolve(__dirname, '..', '..');

/**
 * Lista recursivamente os arquivos `.ts` de um diretório.
 *
 * @param dir - Diretório raiz.
 * @param acc - Acumulador (uso interno da recursão).
 * @returns Caminhos absolutos dos arquivos `.ts`.
 */
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

/**
 * Coleta todo literal de `action` usado em arquivos que chamam
 * `logAction`/`AuditLog.register` — mesma extração da guarda de integração,
 * para que as duas não possam discordar.
 *
 * @returns Literais encontrados, com arquivo e linha.
 */
function collectActionLiterals(): Array<{ literal: string; where: string }> {
  const found: Array<{ literal: string; where: string }> = [];

  for (const file of walk(SRC_DIR)) {
    const text = fs.readFileSync(file, 'utf8');
    if (!/logAction\s*\(|AuditLog\.register\s*\(/.test(text)) continue;

    text.split(/\r?\n/).forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      const match = /(?:^|[^\w.'"`])action\s*:\s*(['"])([a-z0-9_]+)\1/.exec(line);
      if (!match) return;
      found.push({
        literal: match[2],
        where: `${path.relative(SERVER_DIR, file).replace(/\\/g, '/')}:${i + 1}`,
      });
    });
  }

  return found;
}

describe('Vocabulário de audit_logs.action (SSOT shared/domain/auditActions)', () => {
  const canonical = new Set<string>(AUDIT_ACTIONS);
  const legacy = new Set<string>(LEGACY_AUDIT_ACTIONS);

  /**
   * O defeito original em uma frase: literal que não pertence ao vocabulário
   * some em silêncio. Aqui ele vira falha de build.
   */
  it('todo literal de action no código pertence ao vocabulário ou à tabela de sinônimos', () => {
    const aliases = AUDIT_ACTION_ALIASES as Record<string, string | undefined>;
    const offenders = collectActionLiterals()
      .filter(({ literal }) => !canonical.has(literal) && !aliases[literal])
      .map(({ literal, where }) => `${where} → action: '${literal}' não é valor canônico nem sinônimo conhecido`);

    expect(offenders).toEqual([]);
  });

  /** Sanidade da extração: se o regex parar de casar, o teste acima vira vácuo. */
  it('a varredura de literais encontra os call sites reais (não é vácuo)', () => {
    expect(collectActionLiterals().length).toBeGreaterThan(40);
  });

  it('todo sinônimo aponta para um valor canônico', () => {
    const broken = Object.entries(AUDIT_ACTION_ALIASES)
      .filter(([, target]) => !canonical.has(target))
      .map(([alias, target]) => `${alias} → '${target}' não é valor canônico`);

    expect(broken).toEqual([]);
  });

  it('nenhum sinônimo colide com um valor canônico', () => {
    const colliding = Object.keys(AUDIT_ACTION_ALIASES).filter((alias) => canonical.has(alias));
    expect(colliding).toEqual([]);
  });

  /**
   * É este invariante que permite a correção ficar VERDE contra o banco atual
   * (migration `20260810-000036` pendente): todo valor novo tem para onde
   * degradar, e o destino é um valor que o banco já aceita hoje.
   */
  it('todo valor novo tem degradação para um valor legado válido', () => {
    const problems: string[] = [];

    for (const action of NEW_AUDIT_ACTIONS) {
      const fallback = downgradeAuditAction(action);
      if (!fallback) {
        problems.push(`${action}: sem degradação — o evento seria PERDIDO enquanto a migration não é aplicada`);
        continue;
      }
      if (!legacy.has(fallback)) {
        problems.push(`${action} → '${fallback}' não é um valor legado aceito pelo banco atual`);
      }
    }

    expect(problems).toEqual([]);
    expect(Object.keys(AUDIT_ACTION_DB_FALLBACK).sort()).toEqual([...NEW_AUDIT_ACTIONS].sort());
  });

  it('valor legado não degrada (a rejeição, se houver, não é de vocabulário)', () => {
    for (const action of LEGACY_AUDIT_ACTIONS) {
      expect(downgradeAuditAction(action)).toBeNull();
    }
  });

  /**
   * Degradar um evento não-mutante para um valor de escrita seria pior que
   * não gravar: uma leitura passaria a contar como alteração no relatório de
   * auditoria. A regra é explícita para não se perder numa edição futura.
   */
  it('evento não-mutante nunca degrada para um valor de mutação', () => {
    const nonMutating = new Set(['access_denied', 'read', 'read_sensitive']);
    const nonMutatingLegacy = new Set(['reject', 'export', 'print', 'login', 'logout']);

    for (const action of NEW_AUDIT_ACTIONS) {
      if (!nonMutating.has(action)) continue;
      expect(nonMutatingLegacy.has(downgradeAuditAction(action)!)).toBe(true);
    }
  });

  it('todo valor novo tem justificativa registrada no código', () => {
    for (const action of NEW_AUDIT_ACTIONS) {
      expect(NEW_AUDIT_ACTION_RATIONALE[action]?.length ?? 0).toBeGreaterThan(40);
    }
  });

  it('o vocabulário preserva os 15 valores legados e acrescenta 9', () => {
    expect(LEGACY_AUDIT_ACTIONS).toHaveLength(15);
    expect(NEW_AUDIT_ACTIONS).toHaveLength(9);
    expect(AUDIT_ACTIONS).toHaveLength(24);
    // Nenhum valor legado pode sumir: linhas antigas de audit_logs os usam.
    for (const action of LEGACY_AUDIT_ACTIONS) expect(canonical.has(action)).toBe(true);
  });
});

describe('resolveAuditAction', () => {
  it('deixa valor canônico intacto e não marca tradução', () => {
    expect(resolveAuditAction('create')).toEqual({
      action: 'create', requested: 'create', translated: false, unknown: false,
    });
    expect(resolveAuditAction('access_denied')).toEqual({
      action: 'access_denied', requested: 'access_denied', translated: false, unknown: false,
    });
  });

  it('traduz sinônimo de módulo preservando o verbo pedido', () => {
    expect(resolveAuditAction('award')).toEqual({
      action: 'approve', requested: 'award', translated: true, unknown: false,
    });
    expect(resolveAuditAction('mrp_auto_convert_to_requisition').action).toBe('create');
    expect(resolveAuditAction('assign').action).toBe('permission_change');
  });

  /** Verbo desconhecido não pode derrubar nem sumir: vira genérico marcado. */
  it('degrada verbo desconhecido para genérico, sinalizando unknown', () => {
    const resolved = resolveAuditAction('verbo_que_ninguem_declarou');
    expect(resolved.action).toBe('update');
    expect(resolved.unknown).toBe(true);
    expect(resolved.requested).toBe('verbo_que_ninguem_declarou');
  });
});

describe('markAuditActionInDescription', () => {
  it('prefixa o verbo original de forma consultável', () => {
    expect(markAuditActionInDescription('award', 'RFQ 12 adjudicada'))
      .toBe('[award] RFQ 12 adjudicada');
  });

  it('não duplica um marcador já presente', () => {
    expect(markAuditActionInDescription('award', '[award] RFQ 12 adjudicada'))
      .toBe('[award] RFQ 12 adjudicada');
  });
});

describe('isUnsupportedAuditActionError', () => {
  /**
   * Forma exata confirmada em 2026-08-10 contra o Postgres real: o Sequelize
   * NÃO valida `DataTypes.ENUM` no lado JS, então o valor chega ao banco e
   * volta como `SequelizeDatabaseError` + `parent.code = '22P02'`.
   */
  it('reconhece a rejeição de enum do Postgres', () => {
    const error: any = new Error('invalid input value for enum enum_audit_logs_action: "access_denied"');
    error.parent = { code: '22P02', message: 'invalid input value for enum enum_audit_logs_action: "access_denied"' };
    expect(isUnsupportedAuditActionError(error)).toBe(true);
  });

  it('não confunde falha de infraestrutura com rejeição de vocabulário', () => {
    expect(isUnsupportedAuditActionError(new Error('banco indisponivel'))).toBe(false);
    expect(isUnsupportedAuditActionError(new Error('invalid input value for enum enum_sales_status: "x"'))).toBe(false);
    expect(isUnsupportedAuditActionError(null)).toBe(false);
    expect(isUnsupportedAuditActionError(undefined)).toBe(false);
  });
});
