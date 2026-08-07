import { NextFunction, Request, Response } from 'express';

import { AccessModuleKey, AccessModuleLevel } from '../shared/domain/accessModules';

/**
 * 🔐 Middleware de autorização por posse OU módulo (BLOCO 2 TI, `ti`,
 * `docs/business/BLOCO_2_TI_API.md` §0).
 *
 * Diferente de `authorizeModule` (bloqueia a rota inteira quando o usuário
 * não tem o módulo), este middleware libera a requisição quando QUALQUER
 * uma das três condições é verdadeira:
 * (a) `req.user.role === 'admin'` (curto-circuito, igual `authorizeModule`);
 * (b) `req.user.permissions[moduleKey]` satisfaz `requiredLevel` (mesma
 *     regra de `authorizeModule`); OU
 * (c) `ownershipCheck(req)` resolve `true` — função assíncrona fornecida
 *     pelo chamador que busca o recurso (ex.: `ItTicket` por `:id`) e
 *     decide se `req.user` é o dono (`resource.requester_id === req.user.id`).
 *
 * Diferença crítica para `authorizeModule`: aqui a AUSÊNCIA de módulo NÃO é
 * 403 automático — cai para a checagem de posse (c) antes de negar. A
 * checagem de posse SEMPRE roda no `ownershipCheck` fornecido pelo
 * chamador (nunca inferida de parâmetro de rota/query aqui), conforme
 * exigido pela auditoria cruzada (`docs/business/BLOCO_2_TI_AUDITORIA.md`,
 * "Riscos de segurança/isolamento observados").
 *
 * Uso único no projeto até hoje: rotas de auto-serviço do módulo `ti`
 * (`GET /api/ti/tickets/:id`, `POST /api/ti/tickets/:id/comments`,
 * `.../confirm`, `.../reopen`) — reutilizável por qualquer módulo futuro
 * com a mesma necessidade (RNF-TI-02).
 *
 * @module middlewares/authorizeSelfOrModule
 * @param moduleKey - Chave do módulo dono da ação (ex.: `'ti'`).
 * @param requiredLevel - Nível mínimo exigido via módulo (`'operate'`|`'approve'`).
 * @param ownershipCheck - Função assíncrona `(req) => Promise<boolean>` que resolve
 *   o recurso da rota e decide se `req.user` é o dono. Deve tratar
 *   "recurso não encontrado" devolvendo `false` (o 404 real é responsabilidade
 *   do use case chamado depois, não deste middleware).
 * @returns Middleware Express.
 */
export function authorizeSelfOrModule(
  moduleKey: AccessModuleKey,
  requiredLevel: AccessModuleLevel,
  ownershipCheck: (req: Request) => Promise<boolean>,
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Não autenticado.' } });
      return;
    }

    // (a) admin global — mesmo curto-circuito de authorizeModule.
    if (user.role === 'admin') {
      next();
      return;
    }

    // (b) módulo com nível suficiente.
    const level = user.permissions?.[moduleKey];
    const hasModuleLevel = level === requiredLevel || (requiredLevel === 'operate' && level === 'approve');
    if (hasModuleLevel) {
      next();
      return;
    }

    // (c) posse do recurso — resolvida sempre no use case/repositório
    // fornecido pelo chamador, nunca por parâmetro de rota/query aqui.
    try {
      const isOwner = await ownershipCheck(req);
      if (isOwner) {
        next();
        return;
      }
    } catch (error) {
      next(error);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { logAction } = require('../services/auditLogService');
    logAction(req, {
      action: 'access_denied',
      entityType: 'AccessProfile',
      entityId: user.accessProfileId ?? undefined,
      entityDescription: `${moduleKey} (${requiredLevel}, self-or-module)`,
      description: `Acesso negado: usuario ${user.email} - modulo '${moduleKey}' - motivo: NOT_OWNER_NOR_MODULE`,
      success: false,
    });

    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Você só pode acessar/gerenciar os seus próprios registros, a menos que tenha o módulo correspondente.',
      },
    });
  };
}

module.exports = { authorizeSelfOrModule };
module.exports.authorizeSelfOrModule = authorizeSelfOrModule;
