import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { getJwtRuntimeConfig, JWT_ISSUER, JWT_AUDIENCE } from '../config/runtimeEnv';
import { AccessModuleKey, AccessModuleLevel } from '../shared/domain/accessModules';
import { applyAuthenticatedRateLimits } from './rateLimitPolicy';

// Models are CommonJS - dynamic require is safest for the current hybrid setup.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { User, AccessProfile, AccessProfilePermission } = require('../models/index');
// `auditLogService` (e, por consequencia, o model `AuditLog`) e carregado
// tardiamente (lazy require dentro de `authorizeModule`), nao no topo do
// modulo: isso preserva a compatibilidade com testes existentes que
// mockam apenas `../models/index` para exercitar `authenticate`
// isoladamente (ex.: `tests/unit/change-password-session-invalidation.test.ts`),
// sem precisar tambem mockar `../config/database`/`AuditLog`.

interface JwtPayload {
  id: number;
  passwordVersion?: number;
  iat?: number;
  exp?: number;
}

/** Mapa module -> nível de permissão do perfil do usuário autenticado. */
export type PermissionsMap = Partial<Record<AccessModuleKey, AccessModuleLevel>>;

interface RequestUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'operator' | 'financial';
  active: boolean;
  accessProfileId: number | null;
  /**
   * Versão da senha do usuário no momento em que `authenticate` validou o
   * token (igual ao `passwordVersion` atual do usuário no banco — token com
   * versão desatualizada já é rejeitado com 401 antes de chegar aqui, ver
   * checagem SEC-10 logo acima). Exposta para uso por
   * `POST /api/auth/refresh` (renovação deslizante): o token renovado deve
   * embutir a MESMA versão, nunca uma versão obsoleta lida de outro lugar.
   */
  passwordVersion: number;
  /**
   * Mapa module -> nível ('operate'|'approve') resolvido a partir do
   * `AccessProfile` do usuário (UC-34/UC-36: consultado no banco a cada
   * `authenticate`, sem cache no payload do JWT — troca de perfil tem
   * efeito quase imediato na API, ver `BUSINESS_RULES.md` §1.2/UC-36).
   * `{}` quando o usuário não tem `access_profile_id` (UC-35-Exceção) ou é
   * `admin` (irrelevante, pois `admin` nunca passa por esta checagem).
   */
  permissions: PermissionsMap;
  /** Nome do perfil de acesso do usuário, para UI (`GET /api/auth/me/permissions`). */
  accessProfileName: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { secret } = getJwtRuntimeConfig();
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Token nao fornecido' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JwtPayload;

    // Carrega o usuario junto do perfil de acesso + matriz de permissoes em
    // uma unica query (evita N+1 por request quando `authorizeModule` roda
    // depois, ver Bloco 1.2/BUSINESS_RULES.md §1.2 desta entrega).
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: AccessProfile,
          as: 'accessProfile',
          required: false,
          include: [{ model: AccessProfilePermission, as: 'permissions', required: false }],
        },
      ],
    });

    if (!user) {
      res.status(401).json({ success: false, error: 'Usuario nao encontrado' });
      return;
    }

    if (!user.active) {
      res.status(401).json({ success: false, error: 'Usuario inativo' });
      return;
    }

    const tokenPasswordVersion = decoded.passwordVersion ?? 1;
    if (tokenPasswordVersion !== user.passwordVersion) {
      res.status(401).json({ success: false, error: 'Sessao invalidada, faca login novamente' });
      return;
    }

    const accessProfile = (user as any).accessProfile ?? null;
    const permissions: PermissionsMap = {};
    if (accessProfile && accessProfile.active) {
      const rows = accessProfile.permissions ?? [];
      for (const row of rows) {
        permissions[row.module as AccessModuleKey] = row.level;
      }
    }

    const requestUser: RequestUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      accessProfileId: user.accessProfileId ?? null,
      passwordVersion: user.passwordVersion,
      permissions,
      accessProfileName: accessProfile && accessProfile.active ? accessProfile.nome : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    (req as any).user = requestUser;
    await applyAuthenticatedRateLimits(req, res, next);
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: 'Token expirado' });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, error: 'Token invalido' });
      return;
    }

    if (error instanceof Error && error.message.includes('JWT_SECRET')) {
      console.error('JWT runtime config error:', error.message);
      res.status(500).json({ success: false, error: 'Erro de configuracao do servidor. Contate o administrador.' });
      return;
    }

    next(error);
  }
}

export function authorize(...roles: string[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!(req as any).user) {
      res.status(401).json({ success: false, error: 'Nao autenticado' });
      return;
    }

    if (!roles.includes((req as any).user.role)) {
      res.status(403).json({ success: false, error: 'Sem permissao para esta acao' });
      return;
    }

    next();
  };
}

/**
 * 🔐 Middleware de autorização por módulo/nível de área (Bloco 1.2, UC-30 a
 * UC-38). Aditivo: NÃO substitui `authenticate`/`authorize` — compõe em
 * camada, sempre APÓS `authenticate` (depende de `req.user.permissions`,
 * já resolvido ali sem query extra) e ANTES de qualquer `authorize(role)`
 * legado que porventura ainda exista no mesmo endpoint (ver risco de
 * convivência documentado em `docs/business/BUSINESS_RULES.md` §8).
 *
 * Decisão de arquitetura (orientação direta do orquestrador para esta
 * entrega, substituindo o desenho original de `users.access_level` ainda
 * pendente de schema): o nível gestor/operador de um usuário dentro de uma
 * área NÃO mora em uma coluna própria do usuário — mora no **perfil**: uma
 * linha de permissão do perfil com `level = 'approve'` no módulo já
 * caracteriza o usuário atribuído àquele perfil como gestor daquele
 * módulo; `level = 'operate'` caracteriza operador. `'approve'` inclui
 * `'operate'` (uma ação de escrita comum passa com qualquer um dos dois
 * níveis); `'operate'` isolado NUNCA autoriza uma ação que exija
 * `'approve'`.
 *
 * Fórmulas aplicadas (equivalentes às de `BUSINESS_RULES.md` §4, com a
 * adaptação acima):
 * - `role === 'admin'` → sempre libera (§3), antes de qualquer outra
 *   checagem (curto-circuito, nenhuma query a perfil é necessária).
 * - sem `access_profile_id` (ou perfil inativo) → 403 `NO_ACCESS_PROFILE`
 *   (UC-35-Exceção).
 * - `requiredLevel = 'operate'` (padrão) → permite se
 *   `permissions[module] IN ('operate','approve')`.
 * - `requiredLevel = 'approve'` → permite apenas se
 *   `permissions[module] === 'approve'`; se o módulo estiver presente com
 *   `'operate'`, responde 403 `APPROVAL_LEVEL_REQUIRED` (mensagem
 *   diferenciada de "módulo ausente", para orientar melhor o usuário —
 *   Padrão de Alerta Didático, `BUSINESS_RULES.md` §13).
 * - módulo ausente da matriz do perfil (`permissions[module]` indefinido)
 *   → 403 `MODULE_ACCESS_DENIED`.
 *
 * Toda tentativa negada (403) é registrada em auditoria (`access_denied`,
 * ver `BUSINESS_RULES.md` §5), fire-and-forget via `logAction` (nunca
 * bloqueia a resposta HTTP).
 *
 * @param moduleKey - Chave do módulo DONO da ação sendo executada (nunca o
 *   módulo de origem do dado — ver UC-37 "Qualidade libera lote do
 *   Recebimento").
 * @param requiredLevel - Nível mínimo exigido: `'operate'` (padrão) ou
 *   `'approve'`.
 * @returns Middleware Express.
 */
export function authorizeModule(
  moduleKey: AccessModuleKey,
  requiredLevel: AccessModuleLevel = 'operate',
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as RequestUser | undefined;

    if (!user) {
      res.status(401).json({ success: false, error: 'Nao autenticado' });
      return;
    }

    // §3 — admin global nunca e bloqueado por perfil de area (curto-circuito).
    if (user.role === 'admin') {
      next();
      return;
    }

    const registerDenied = (reason: string): void => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { logAction } = require('../services/auditLogService');
      logAction(req, {
        action: 'access_denied',
        entityType: 'AccessProfile',
        entityId: user.accessProfileId ?? undefined,
        entityDescription: `${moduleKey} (${requiredLevel})`,
        description: `Acesso negado: usuario ${user.email} - modulo '${moduleKey}' - motivo: ${reason}`,
        success: false,
      });
    };

    // UC-35-Exceção — usuario sem perfil de acesso configurado (ou perfil
    // desativado, refletido em `permissions = {}` por `authenticate`).
    if (!user.accessProfileId || !user.accessProfileName) {
      registerDenied('NO_ACCESS_PROFILE');
      res.status(403).json({
        success: false,
        error: {
          code: 'NO_ACCESS_PROFILE',
          message: 'Seu acesso ainda não foi configurado — procure o administrador.',
        },
      });
      return;
    }

    const level = user.permissions[moduleKey];

    if (!level) {
      registerDenied('MODULE_ACCESS_DENIED');
      res.status(403).json({
        success: false,
        error: {
          code: 'MODULE_ACCESS_DENIED',
          message: `Seu perfil de acesso não tem permissão para o módulo "${moduleKey}". Procure o administrador para solicitar acesso.`,
        },
      });
      return;
    }

    if (requiredLevel === 'approve' && level !== 'approve') {
      registerDenied('APPROVAL_LEVEL_REQUIRED');
      res.status(403).json({
        success: false,
        error: {
          code: 'APPROVAL_LEVEL_REQUIRED',
          message: 'Esta ação exige nível gestor da área.',
        },
      });
      return;
    }

    next();
  };
}

module.exports = authenticate;
module.exports.authenticate = authenticate;
module.exports.authorize = authorize;
module.exports.authorizeModule = authorizeModule;
