/**
 * 🔐 Middleware de autorização por QUALQUER UM de dois ou mais módulos
 * (composição OR), usado quando um mesmo recurso é legitimamente
 * consultado/operado por mais de uma área (ex.: chamado de manutenção
 * predial, visível tanto por `manutencao` quanto por `facilities` — BLOCO
 * 4 FAC, §0.3 do contrato de API).
 *
 * Achado 9 da auditoria do BLOCO 4 FAC: `authorizeModule()`
 * (`server/src/middlewares/auth.ts`) só aceita **um** `moduleKey` por
 * chamada — não havia primitivo de composição "módulo A OU módulo B" no
 * projeto. Este middleware fecha essa lacuna, reaproveitando a MESMA
 * fórmula de decisão de `authorizeModule` (admin sempre libera, nível
 * `approve` inclui `operate`, `approve` isolado nunca é satisfeito por
 * `operate`) para cada módulo candidato, com curto-circuito no primeiro
 * que autorizar.
 *
 * @module middlewares/authorizeAnyModule
 */

import { NextFunction, Request, Response } from 'express';

import { AccessModuleKey, AccessModuleLevel } from '../shared/domain/accessModules';

interface RequestUserLike {
  id: number;
  email: string;
  role: 'admin' | 'operator' | 'financial';
  accessProfileId: number | null;
  accessProfileName: string | null;
  permissions: Partial<Record<AccessModuleKey, AccessModuleLevel>>;
}

/** Um módulo candidato + o nível mínimo exigido nele. */
export interface AnyModuleCandidate {
  moduleKey: AccessModuleKey;
  requiredLevel?: AccessModuleLevel;
}

function satisfies(level: AccessModuleLevel | undefined, requiredLevel: AccessModuleLevel): boolean {
  if (!level) return false;
  if (requiredLevel === 'approve') return level === 'approve';
  return level === 'operate' || level === 'approve';
}

/**
 * Autoriza a requisição se o usuário satisfizer o nível exigido em
 * QUALQUER UM dos módulos informados (OR lógico, curto-circuito no
 * primeiro que autorizar). `role === 'admin'` sempre libera (mesmo
 * curto-circuito de `authorizeModule`). Registra `access_denied` em
 * auditoria apenas se NENHUM candidato autorizar.
 *
 * @param candidates - Lista de `{ moduleKey, requiredLevel }` (nível padrão `'operate'`). Deve ter ao menos 2 elementos — para um único módulo, use `authorizeModule` diretamente.
 * @returns Middleware Express.
 */
export function authorizeAnyModule(
  candidates: AnyModuleCandidate[],
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as RequestUserLike | undefined;

    if (!user) {
      res.status(401).json({ success: false, error: 'Nao autenticado' });
      return;
    }

    if (user.role === 'admin') {
      next();
      return;
    }

    if (!user.accessProfileId || !user.accessProfileName) {
      res.status(403).json({
        success: false,
        error: {
          code: 'NO_ACCESS_PROFILE',
          message: 'Seu acesso ainda não foi configurado — procure o administrador.',
        },
      });
      return;
    }

    const authorized = candidates.some(({ moduleKey, requiredLevel = 'operate' }) =>
      satisfies(user.permissions[moduleKey], requiredLevel),
    );

    if (authorized) {
      next();
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { logAction } = require('../services/auditLogService');
    const moduleList = candidates.map((c) => `${c.moduleKey}(${c.requiredLevel ?? 'operate'})`).join(' OU ');
    logAction(req, {
      action: 'access_denied',
      entityType: 'AccessProfile',
      entityId: user.accessProfileId ?? undefined,
      entityDescription: moduleList,
      description: `Acesso negado: usuario ${user.email} - nenhum dos modulos [${moduleList}] autorizado`,
      success: false,
    });

    res.status(403).json({
      success: false,
      error: {
        code: 'MODULE_ACCESS_DENIED',
        message: 'Seu perfil de acesso não tem permissão para este recurso. Procure o administrador para solicitar acesso.',
      },
    });
  };
}

module.exports = { authorizeAnyModule };
module.exports.authorizeAnyModule = authorizeAnyModule;
