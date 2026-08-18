import type { Request } from 'express';
import fs from 'fs';
import path from 'path';

import {
  downgradeAuditAction,
  isUnsupportedAuditActionError,
  markAuditActionInDescription,
  resolveAuditAction,
  type AuditActionInput,
} from '../shared/domain/auditActions';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AuditLog = require('../models/AuditLog');

interface LogActionParams {
  /**
   * Verbo do vocabulário fechado (`shared/domain/auditActions`). Não é
   * `string`: era exatamente a tipagem larga que deixava 37 literais fora do
   * `ENUM` passarem pelo `tsc` e sumirem em silêncio no banco.
   */
  action: AuditActionInput;
  entityType: string;
  entityId?: number;
  entityDescription?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  description?: string;
  success?: boolean;
  errorMessage?: string;
}

const FAILURE_LOG_PATH = path.join(process.cwd(), 'logs', 'audit-failures.log');
const RETRY_DELAY_MS = 200;
const DEFAULT_DRAIN_TIMEOUT_MS = 5000;
const WEBHOOK_FETCH_TIMEOUT_MS = 3000;

interface AuditFailureStats {
  totalFailures: number;
  persistedFailures: number;
  fileFailures: number;
  webhookFailures: number;
  lastErrorMessage: string | null;
  lastFailureAt: string | null;
  pendingActions: number;
}

interface AuditDrainResult {
  drained: boolean;
  pendingActions: number;
  timedOut: boolean;
}

const pendingAuditActions = new Set<Promise<void>>();
const auditFailureStats: AuditFailureStats = {
  totalFailures: 0,
  persistedFailures: 0,
  fileFailures: 0,
  webhookFailures: 0,
  lastErrorMessage: null,
  lastFailureAt: null,
  pendingActions: 0,
};

/**
 * Valores canônicos que ESTE banco comprovadamente ainda não conhece
 * (migration `20260810-000036` não aplicada). Preenchido pela primeira
 * rejeição `22P02` e consultado depois para já gravar no valor degradado,
 * sem gastar um `INSERT` que se sabe que vai falhar.
 *
 * Memória de processo, de propósito: reinicia junto com o processo, então
 * assim que a migration for aplicada e o serviço reiniciar, o vocabulário
 * completo volta a ser tentado de primeira. Nenhuma configuração a mudar.
 */
const actionsRejectedByDatabase = new Set<string>();

function updatePendingActionCount(): void {
  auditFailureStats.pendingActions = pendingAuditActions.size;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function safeJsonStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  try {
    return JSON.stringify(value, (_key, currentValue) => {
      if (typeof currentValue === 'bigint') {
        return currentValue.toString();
      }

      if (typeof currentValue === 'function') {
        return `[Function ${currentValue.name || 'anonymous'}]`;
      }

      if (typeof currentValue === 'object' && currentValue !== null) {
        if (seen.has(currentValue)) {
          return '[Circular]';
        }
        seen.add(currentValue);
      }

      return currentValue;
    });
  } catch (serializationError) {
    return JSON.stringify({
      level: 'critical',
      message: 'Falha ao serializar evento de auditoria',
      timestamp: new Date().toISOString(),
      error: errorMessage(serializationError),
    });
  }
}

/**
 * Persiste um evento de auditoria que falhou em gravar mesmo apos retry, em
 * arquivo dedicado (sobrevive a rotacao/perda do log de console) e dispara
 * um alerta via webhook se `AUDIT_ALERT_WEBHOOK_URL` estiver configurado.
 * Nunca lanca: e o ultimo recurso antes de desistir silenciosamente.
 *
 * @param params - Payload do evento de auditoria que falhou.
 * @param error - Erro da ultima tentativa de gravacao.
 * @returns Promise resolvida sempre.
 */
async function persistFailureAndAlert(params: LogActionParams, error: Error): Promise<void> {
  const entry = {
    level: 'critical',
    message: 'Falha ao gravar audit log apos retry',
    timestamp: new Date().toISOString(),
    error: error.message,
    event: params,
  };

  auditFailureStats.totalFailures += 1;
  auditFailureStats.lastErrorMessage = error.message;
  auditFailureStats.lastFailureAt = entry.timestamp;

  const serializedEntry = safeJsonStringify(entry);
  console.error(serializedEntry);

  try {
    fs.mkdirSync(path.dirname(FAILURE_LOG_PATH), { recursive: true });
    fs.appendFileSync(FAILURE_LOG_PATH, `${serializedEntry}\n`);
    auditFailureStats.persistedFailures += 1;
  } catch (fileError) {
    auditFailureStats.fileFailures += 1;
    console.error('[auditLogService] Falha ao persistir audit-failures.log:', fileError);
  }

  const webhookUrl = process.env.AUDIT_ALERT_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(WEBHOOK_FETCH_TIMEOUT_MS),
        body: JSON.stringify({
          text: `[ERP EVOK AUDIO] Falha ao gravar audit log: ${params.action} em ${params.entityType}#${params.entityId ?? '?'} — ${error.message}`,
        }),
      });
    } catch (webhookError) {
      auditFailureStats.webhookFailures += 1;
      console.error('[auditLogService] Falha ao notificar webhook de alerta:', webhookError);
    }
  }
}

function trackAuditAction(promise: Promise<void>): Promise<void> {
  pendingAuditActions.add(promise);
  updatePendingActionCount();

  void promise.finally(() => {
    pendingAuditActions.delete(promise);
    updatePendingActionCount();
  });

  return promise;
}

function getAuditFailureStats(): AuditFailureStats {
  updatePendingActionCount();
  return { ...auditFailureStats };
}

async function waitForPendingAuditLogs(timeoutMs = DEFAULT_DRAIN_TIMEOUT_MS): Promise<AuditDrainResult> {
  if (pendingAuditActions.size === 0) {
    updatePendingActionCount();
    return { drained: true, pendingActions: 0, timedOut: false };
  }

  const pending = Array.from(pendingAuditActions);
  let timedOut = false;
  let timeoutHandle: NodeJS.Timeout | null = null;

  try {
    await Promise.race([
      Promise.allSettled(pending),
      new Promise<void>((resolve) => {
        timeoutHandle = setTimeout(() => {
          timedOut = true;
          resolve();
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
    }
  }

  updatePendingActionCount();

  return {
    drained: pendingAuditActions.size === 0,
    pendingActions: pendingAuditActions.size,
    timedOut,
  };
}

function __resetAuditLogRuntimeStateForTests(): void {
  pendingAuditActions.clear();
  actionsRejectedByDatabase.clear();
  auditFailureStats.totalFailures = 0;
  auditFailureStats.persistedFailures = 0;
  auditFailureStats.fileFailures = 0;
  auditFailureStats.webhookFailures = 0;
  auditFailureStats.lastErrorMessage = null;
  auditFailureStats.lastFailureAt = null;
  auditFailureStats.pendingActions = 0;
}

/**
 * Wrapper fino sobre `AuditLog.register` para reduzir repetição nos
 * controllers. Sempre fire-and-forget (não bloqueia a resposta HTTP
 * principal): nunca propaga erro para o chamador. Faz uma tentativa de
 * retry antes de desistir; se ambas falharem, o evento é persistido em
 * `logs/audit-failures.log` e, se configurado, um alerta é disparado via
 * `AUDIT_ALERT_WEBHOOK_URL` — a falha nunca fica só no console.
 *
 * ## Degradação de vocabulário (2026-08-10)
 *
 * Fire-and-forget é ótimo para não derrubar a resposta HTTP e péssimo para
 * descobrir que o log não está sendo gravado: era assim que 46 call sites
 * escreviam `action` fora do `ENUM` e a trilha simplesmente não existia
 * (`docs/governance/auditorias/VARREDURA_ESCRITA_REAL_2026-08-10.md` §2).
 *
 * Agora, quando o Postgres rejeita o valor por não conhecê-lo ainda
 * (migration `20260810-000036` pendente), o evento **não é descartado**: é
 * regravado com o valor legado equivalente (`AUDIT_ACTION_DB_FALLBACK`) e a
 * `description` recebe o marcador `[verbo]`, de modo que a linha existe,
 * é atribuível e é recuperável. Depois da migration aplicada, a primeira
 * tentativa passa e nada disso é exercitado.
 *
 * Quando a ação auditada ocorre dentro de uma transaction Sequelize,
 * chame esta função DEPOIS do `t.commit()`, nunca dentro da transaction,
 * para não segurar locks de banco desnecessariamente.
 *
 * @param req - Request Express (usada para extrair user, ip, user-agent, rota e método).
 * @param params - Dados do evento de auditoria.
 * @returns Nunca rejeita.
 */
async function performLogAction(req: Request, params: LogActionParams): Promise<void> {
  const {
    action,
    entityType,
    entityId,
    entityDescription,
    oldValues,
    newValues,
    description,
    success = true,
    errorMessage
  } = params;

  const resolved = resolveAuditAction(action);
  const fallback = downgradeAuditAction(resolved.action);

  if (resolved.unknown) {
    console.warn(
      `[auditLogService] action '${resolved.requested}' nao pertence ao vocabulario de auditoria `
      + `(src/shared/domain/auditActions.ts); gravando como '${resolved.action}' com marcador na description.`,
    );
  }

  const basePayload = {
    req,
    entityType,
    entityId,
    entityDescription,
    oldValues,
    newValues,
    success,
    errorMessage
  };

  const payload = { ...basePayload, action, description };

  /**
   * Payload equivalente no valor legado, com o verbo original preservado no
   * início da `description`.
   *
   * @returns Payload pronto para `AuditLog.register`.
   */
  const buildDowngradedPayload = () => ({
    ...basePayload,
    action: fallback!,
    description: markAuditActionInDescription(
      resolved.requested,
      description ?? `${resolved.requested} em ${entityType} #${entityId}`,
    ),
  });

  // Ja sabemos (por rejeicao anterior neste processo) que o banco nao conhece
  // este valor — vai direto no degradado em vez de queimar um INSERT certo de
  // falhar a cada evento.
  if (fallback && actionsRejectedByDatabase.has(resolved.action)) {
    try {
      await AuditLog.register(buildDowngradedPayload());
      return;
    } catch (downgradedError) {
      await persistFailureAndAlert(params, downgradedError as Error);
      return;
    }
  }

  try {
    await AuditLog.register(payload);
  } catch (firstError) {
    if (fallback && isUnsupportedAuditActionError(firstError)) {
      actionsRejectedByDatabase.add(resolved.action);
      console.warn(
        `[auditLogService] enum_audit_logs_action ainda nao aceita '${resolved.action}' `
        + '(migration 20260810-000036 pendente). Gravando como '
        + `'${fallback}' com marcador '[${resolved.requested}]' na description — o evento NAO e perdido.`,
      );

      try {
        await AuditLog.register(buildDowngradedPayload());
        return;
      } catch (downgradedError) {
        await persistFailureAndAlert(params, downgradedError as Error);
        return;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));

    try {
      await AuditLog.register(payload);
    } catch (secondError) {
      await persistFailureAndAlert(params, secondError as Error);
    }
  }
}

function logAction(req: Request, params: LogActionParams): Promise<void> {
  return trackAuditAction(
    performLogAction(req, params).catch(async (error: unknown) => {
      await persistFailureAndAlert(params, error instanceof Error ? error : new Error(errorMessage(error)));
    }),
  );
}

export = {
  logAction,
  getAuditFailureStats,
  waitForPendingAuditLogs,
  __resetAuditLogRuntimeStateForTests,
};
