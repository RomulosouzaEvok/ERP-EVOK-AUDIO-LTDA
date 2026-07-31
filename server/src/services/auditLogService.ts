import type { Request } from 'express';
import fs from 'fs';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AuditLog = require('../models/AuditLog');

interface LogActionParams {
  action: string;
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

  console.error(JSON.stringify(entry));

  try {
    fs.mkdirSync(path.dirname(FAILURE_LOG_PATH), { recursive: true });
    fs.appendFileSync(FAILURE_LOG_PATH, `${JSON.stringify(entry)}\n`);
  } catch (fileError) {
    console.error('[auditLogService] Falha ao persistir audit-failures.log:', fileError);
  }

  const webhookUrl = process.env.AUDIT_ALERT_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `[ERP EVOK AUDIO] Falha ao gravar audit log: ${params.action} em ${params.entityType}#${params.entityId ?? '?'} — ${error.message}`,
        }),
      });
    } catch (webhookError) {
      console.error('[auditLogService] Falha ao notificar webhook de alerta:', webhookError);
    }
  }
}

/**
 * Wrapper fino sobre `AuditLog.register` para reduzir repetição nos
 * controllers. Sempre fire-and-forget (não bloqueia a resposta HTTP
 * principal): nunca propaga erro para o chamador. Faz uma tentativa de
 * retry antes de desistir; se ambas falharem, o evento é persistido em
 * `logs/audit-failures.log` e, se configurado, um alerta é disparado via
 * `AUDIT_ALERT_WEBHOOK_URL` — a falha nunca fica só no console.
 *
 * Quando a ação auditada ocorre dentro de uma transaction Sequelize,
 * chame esta função DEPOIS do `t.commit()`, nunca dentro da transaction,
 * para não segurar locks de banco desnecessariamente.
 *
 * @param req - Request Express (usada para extrair user, ip, user-agent, rota e método).
 * @param params - Dados do evento de auditoria.
 * @returns Nunca rejeita.
 */
async function logAction(req: Request, params: LogActionParams): Promise<void> {
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

  const payload = {
    req,
    action,
    entityType,
    entityId,
    entityDescription,
    oldValues,
    newValues,
    description,
    success,
    errorMessage
  };

  try {
    await AuditLog.register(payload);
  } catch (firstError) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));

    try {
      await AuditLog.register(payload);
    } catch (secondError) {
      await persistFailureAndAlert(params, secondError as Error);
    }
  }
}

export = { logAction };
