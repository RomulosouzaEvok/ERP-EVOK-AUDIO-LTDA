/**
 * `auditLogService`: o evento de auditoria nunca é perdido por vocabulário.
 *
 * ## O defeito que estes testes travam
 *
 * `logAction` é fire-and-forget por desenho — nunca propaga erro ao chamador.
 * Combinado com um literal fora de `enum_audit_logs_action`, isso produzia o
 * pior resultado possível: **API respondendo `200` e trilha de auditoria
 * inexistente**, em 46 call sites. Entre eles `access_denied` — tentativa de
 * acesso indevido sem rastro nenhum.
 * (`docs/governance/auditorias/VARREDURA_ESCRITA_REAL_2026-08-10.md` §2.)
 *
 * A migration `20260810-000036` acrescenta os 9 valores novos, mas **não pode
 * ser aplicada agora** (fila pendente aguardando o dono). Estes testes
 * provam o comportamento nos DOIS estados do banco.
 *
 * @module tests/unit/audit-log-action-downgrade
 */

import fs from 'fs';
import path from 'path';

const FAILURE_LOG_PATH = path.join(process.cwd(), 'logs', 'audit-failures.log');

jest.mock('../../src/models/AuditLog', () => ({
  register: jest.fn(),
}));

/**
 * Erro que o Postgres devolve quando o `ENUM` não conhece o valor.
 * Forma confirmada empiricamente em 2026-08-10 contra `erp_evok_audio_test`.
 *
 * @param value - Valor rejeitado.
 * @returns Erro no formato do Sequelize (`parent.code = '22P02'`).
 */
function enumRejection(value: string): Error {
  const message = `invalid input value for enum enum_audit_logs_action: "${value}"`;
  const error: any = new Error(message);
  error.name = 'SequelizeDatabaseError';
  error.parent = { code: '22P02', message };
  return error;
}

describe('auditLogService: degradação de vocabulário de action', () => {
  const originalWarn = console.warn;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    console.warn = jest.fn();
    if (fs.existsSync(FAILURE_LOG_PATH)) fs.unlinkSync(FAILURE_LOG_PATH);
    delete process.env.AUDIT_ALERT_WEBHOOK_URL;
  });

  afterAll(() => {
    console.warn = originalWarn;
    if (fs.existsSync(FAILURE_LOG_PATH)) fs.unlinkSync(FAILURE_LOG_PATH);
  });

  /**
   * ANTES da migration: o banco rejeita `access_denied`. O evento tem que
   * continuar existindo — é achado de segurança, não pode virar silêncio.
   *
   * @returns Promise resolvida após validar a regravação degradada.
   */
  it('grava o evento com valor legado quando o banco ainda não conhece o valor novo', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AuditLog = require('../../src/models/AuditLog');
    AuditLog.register
      .mockRejectedValueOnce(enumRejection('access_denied'))
      .mockResolvedValueOnce(undefined);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { logAction } = require('../../src/services/auditLogService');

    await logAction({} as any, {
      action: 'access_denied',
      entityType: 'Route',
      entityId: 7,
      description: 'Acesso negado a /api/purchases',
      success: false,
    });

    expect(AuditLog.register).toHaveBeenCalledTimes(2);

    const degraded = AuditLog.register.mock.calls[1][0];
    // `reject` (não `update`): degradar um evento não-mutante para escrita
    // faria uma negativa de acesso contar como alteração no relatório.
    expect(degraded.action).toBe('reject');
    // O verbo verdadeiro fica consultável: description LIKE '[access_denied]%'
    expect(degraded.description).toBe('[access_denied] Acesso negado a /api/purchases');
    expect(degraded.entityType).toBe('Route');
    expect(degraded.entityId).toBe(7);
    expect(degraded.success).toBe(false);

    // Silenciar não é opção: a pendência da migration aparece no log.
    expect(fs.existsSync(FAILURE_LOG_PATH)).toBe(false);
    expect((console.warn as jest.Mock).mock.calls.flat().join(' ')).toContain('20260810-000036');
  });

  /**
   * Sem `description` do chamador, o marcador tem que aparecer na descrição
   * default — senão o verbo real se perderia justamente no caso mais comum.
   *
   * @returns Promise resolvida após validar a descrição default marcada.
   */
  it('marca o verbo real também na descrição default', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AuditLog = require('../../src/models/AuditLog');
    AuditLog.register
      .mockRejectedValueOnce(enumRejection('settle'))
      .mockResolvedValueOnce(undefined);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { logAction } = require('../../src/services/auditLogService');

    await logAction({} as any, { action: 'settle', entityType: 'TreasuryFinancialOperation', entityId: 3 });

    const degraded = AuditLog.register.mock.calls[1][0];
    expect(degraded.action).toBe('status_change');
    expect(degraded.description).toBe('[settle] settle em TreasuryFinancialOperation #3');
  });

  /**
   * Um `INSERT` que se sabe que vai falhar não deve ser repetido a cada
   * evento: a segunda ocorrência do mesmo valor já sai degradada.
   *
   * @returns Promise resolvida após validar a memoização.
   */
  it('memoriza o valor rejeitado e não repete o INSERT condenado', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AuditLog = require('../../src/models/AuditLog');
    AuditLog.register
      .mockRejectedValueOnce(enumRejection('read_sensitive'))
      .mockResolvedValue(undefined);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { logAction } = require('../../src/services/auditLogService');

    await logAction({} as any, { action: 'read_sensitive', entityType: 'ItSoftwareLicenseDetail', entityId: 1 });
    expect(AuditLog.register).toHaveBeenCalledTimes(2);

    await logAction({} as any, { action: 'read_sensitive', entityType: 'ItSoftwareLicenseDetail', entityId: 2 });
    // Terceira chamada no total: a segunda ocorrência foi direto ao degradado.
    expect(AuditLog.register).toHaveBeenCalledTimes(3);
    expect(AuditLog.register.mock.calls[2][0].action).toBe('export');
    expect(AuditLog.register.mock.calls[2][0].description).toBe(
      '[read_sensitive] read_sensitive em ItSoftwareLicenseDetail #2',
    );
  });

  /**
   * DEPOIS da migration: nada disso é exercitado — uma tentativa, valor
   * exato, zero degradação.
   *
   * @returns Promise resolvida após validar o caminho feliz.
   */
  it('grava o valor exato quando o banco já conhece o valor novo', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AuditLog = require('../../src/models/AuditLog');
    AuditLog.register.mockResolvedValue(undefined);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { logAction } = require('../../src/services/auditLogService');

    await logAction({} as any, { action: 'access_denied', entityType: 'Route', entityId: 9 });

    expect(AuditLog.register).toHaveBeenCalledTimes(1);
    expect(AuditLog.register.mock.calls[0][0].action).toBe('access_denied');
  });

  /**
   * Falha de infraestrutura continua no caminho antigo (retry + persistência
   * + alerta). Confundir os dois transformaria uma queda de banco em
   * degradação silenciosa de vocabulário.
   *
   * @returns Promise resolvida após validar que o retry clássico foi usado.
   */
  it('não degrada em falha de infraestrutura — mantém retry e alerta', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AuditLog = require('../../src/models/AuditLog');
    AuditLog.register.mockRejectedValue(new Error('banco indisponivel'));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { logAction } = require('../../src/services/auditLogService');

    await logAction({} as any, { action: 'cancel', entityType: 'ImportProcess', entityId: 2 });

    expect(AuditLog.register).toHaveBeenCalledTimes(2);
    expect(AuditLog.register.mock.calls[0][0].action).toBe('cancel');
    expect(AuditLog.register.mock.calls[1][0].action).toBe('cancel');
    expect(fs.existsSync(FAILURE_LOG_PATH)).toBe(true);
  });
});
