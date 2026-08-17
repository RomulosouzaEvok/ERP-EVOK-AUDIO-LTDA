import fs from 'fs';
import path from 'path';

jest.mock('../../src/config/database', () => {
  const { Sequelize } = require('sequelize');

  return {
    sequelize: new Sequelize('erp_test', 'user', 'pass', {
      host: '127.0.0.1',
      dialect: 'postgres',
      logging: false,
    }),
  };
});

const migrationPath = path.resolve(
  __dirname,
  '../../migrations/20260814-000049-audit-logs-immutable-case-009.cjs'
);

const cleanupScriptPath = path.resolve(
  __dirname,
  '../../scripts/limpar-dados-transacionais.cjs'
);

function normalizeSql(source: string): string {
  return source.replace(/\s+/g, ' ').trim();
}

describe('CASE-009 audit_logs immutability migration', () => {
  let source: string;
  let sql: string;

  beforeAll(() => {
    source = fs.readFileSync(migrationPath, 'utf8');
    sql = normalizeSql(source);
  });

  it('blocks UPDATE and DELETE directly on public.audit_logs', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.audit_logs_prevent_update_delete_case009()');
    expect(sql).toContain('CREATE TRIGGER trg_audit_logs_immutable_case009');
    expect(sql).toContain('BEFORE UPDATE OR DELETE ON public.audit_logs');
    expect(sql).toContain('FOR EACH ROW EXECUTE FUNCTION public.audit_logs_prevent_update_delete_case009()');
  });

  it('keeps the trigger enabled even for replication-role maintenance sessions', () => {
    expect(sql).toContain('ALTER TABLE public.audit_logs ENABLE ALWAYS TRIGGER trg_audit_logs_immutable_case009');
  });

  it('raises an explicit protected-by-design error instead of silently preserving the table', () => {
    expect(source).toContain('audit_logs is immutable and protected by design');
    expect(source).toContain('UPDATE is not allowed');
    expect(source).toContain('DELETE is not allowed');
  });

  it('rolls back by dropping the trigger before dropping the function', () => {
    const triggerDropIndex = source.indexOf('DROP TRIGGER IF EXISTS trg_audit_logs_immutable_case009');
    const functionDropIndex = source.indexOf('DROP FUNCTION IF EXISTS public.audit_logs_prevent_update_delete_case009');

    expect(triggerDropIndex).toBeGreaterThan(-1);
    expect(functionDropIndex).toBeGreaterThan(-1);
    expect(triggerDropIndex).toBeLessThan(functionDropIndex);
  });
});

describe('CASE-009 transaction cleanup behavior', () => {
  it('does not add audit_logs to PRESERVAR_EXATO for silent skip semantics', () => {
    const source = fs.readFileSync(cleanupScriptPath, 'utf8');
    const exactPreservation = /const PRESERVAR_EXATO = new Set\(\[([\s\S]*?)\]\);/.exec(source);

    expect(exactPreservation).not.toBeNull();
    expect(exactPreservation?.[1]).not.toContain("'audit_logs'");
    expect(exactPreservation?.[1]).not.toContain('"audit_logs"');
  });

  it('continues to exercise trigger bypass risk through session_replication_role, now neutralized by ENABLE ALWAYS', () => {
    const source = fs.readFileSync(cleanupScriptPath, 'utf8');

    expect(source).toContain("SET LOCAL session_replication_role = 'replica'");
  });
});

describe('CASE-009 legitimate audit append path', () => {
  it('keeps AuditLog.register append-only through create()', async () => {
    const AuditLog = require('../../src/models/AuditLog');
    const createSpy = jest.spyOn(AuditLog, 'create').mockResolvedValue({
      id: 'audit-log-id',
      user_id: 'user-id',
      action: 'LOGIN',
      entity_type: 'auth',
      entity_id: 'session-id',
      timestamp: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });

    await AuditLog.register({
      userId: 123,
      action: 'create',
      entityType: 'auth',
      entityId: 456,
    });

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 123,
      action: 'create',
      entity_type: 'auth',
      entity_id: 456,
    }));
  });
});
