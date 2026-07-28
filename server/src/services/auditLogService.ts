import type { Request } from 'express';

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

/**
 * Wrapper fino sobre `AuditLog.register` para reduzir repetição nos
 * controllers. Sempre fire-and-forget (não bloqueia a resposta HTTP
 * principal): erros de gravação do log são apenas logados no console,
 * nunca propagados para o chamador.
 *
 * Quando a ação auditada ocorre dentro de uma transaction Sequelize,
 * chame esta função DEPOIS do `t.commit()`, nunca dentro da transaction,
 * para não segurar locks de banco desnecessariamente.
 *
 * @param req - Request Express (usada para extrair user, ip, user-agent, rota e método).
 * @param params - Dados do evento de auditoria.
 * @returns Nunca rejeita: falhas de gravação são apenas logadas no console.
 */
function logAction(
  req: Request,
  {
    action,
    entityType,
    entityId,
    entityDescription,
    oldValues,
    newValues,
    description,
    success = true,
    errorMessage
  }: LogActionParams
): Promise<void> {
  return AuditLog.register({
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
  }).catch((err: Error) => console.error('Erro ao registrar audit log:', err.message));
}

export = { logAction };
