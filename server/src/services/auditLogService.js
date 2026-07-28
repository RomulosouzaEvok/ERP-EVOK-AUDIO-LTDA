const AuditLog = require('../models/AuditLog');

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
 * @param {import('express').Request} req - Request Express (usada para extrair user, ip, user-agent, rota e método).
 * @param {Object} params - Dados do evento de auditoria.
 * @param {string} params.action - Ação realizada (ex: 'create', 'update', 'status_change', 'login').
 * @param {string} params.entityType - Nome curto da entidade afetada (ex: 'Product', 'Sale').
 * @param {number} [params.entityId] - ID do registro afetado.
 * @param {string} [params.entityDescription] - Descrição legível do registro (ex: código do produto).
 * @param {Object} [params.oldValues] - Subconjunto de campos antes da alteração.
 * @param {Object} [params.newValues] - Subconjunto de campos depois da alteração.
 * @param {string} [params.description] - Descrição livre do evento.
 * @param {boolean} [params.success=true] - Se a ação foi bem-sucedida.
 * @param {string} [params.errorMessage] - Mensagem de erro, quando `success` for `false`.
 * @returns {Promise<void>} Nunca rejeita: falhas de gravação são apenas logadas no console.
 */
function logAction(req, { action, entityType, entityId, entityDescription, oldValues, newValues, description, success = true, errorMessage } = {}) {
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
  }).catch(err => console.error('Erro ao registrar audit log:', err.message));
}

module.exports = { logAction };
