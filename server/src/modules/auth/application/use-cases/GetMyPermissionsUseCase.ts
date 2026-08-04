/**
 * Use case: monta o payload de permissões resolvidas do usuário autenticado,
 * para `GET /api/auth/me/permissions` (UC-34).
 *
 * Não faz nenhuma query adicional ao banco — reaproveita o mapa
 * `req.user.permissions` já resolvido por `authenticate`
 * (`server/src/middlewares/auth.ts`), que consulta o `AccessProfile` do
 * usuário junto do próprio `authenticate`, sem N+1 por request.
 *
 * @module modules/auth/application/use-cases/GetMyPermissionsUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ACCESS_MODULES, AccessModuleKey } from '../../../../shared/domain/accessModules';

interface RequestUserLike {
  role: 'admin' | 'operator' | 'financial';
  permissions: Partial<Record<AccessModuleKey, 'operate' | 'approve'>>;
  accessProfileId: number | null;
  accessProfileName: string | null;
}

interface GetMyPermissionsOutput {
  modules: Partial<Record<AccessModuleKey, 'operate' | 'approve'>>;
  profile: { id: number; nome: string } | null;
}

class GetMyPermissionsUseCase extends UseCase<{ user: RequestUserLike }, GetMyPermissionsOutput> {
  /**
   * @param input - `{ user }`, o `req.user` já resolvido por `authenticate`.
   * @returns `{ modules, profile }` — `modules` é o mapa module→nível que o
   *   frontend usa para montar o menu (UC-34); `admin` global recebe todos
   *   os módulos em `'approve'` (menu completo, §3), independente de
   *   `access_profile_id`.
   */
  public async execute({ user }: { user: RequestUserLike }): Promise<GetMyPermissionsOutput> {
    if (user.role === 'admin') {
      const modules: Partial<Record<AccessModuleKey, 'operate' | 'approve'>> = {};
      for (const m of ACCESS_MODULES) {
        modules[m.key] = 'approve';
      }
      return {
        modules,
        profile: user.accessProfileId && user.accessProfileName ? { id: user.accessProfileId, nome: user.accessProfileName } : null,
      };
    }

    return {
      modules: user.permissions,
      profile: user.accessProfileId && user.accessProfileName ? { id: user.accessProfileId, nome: user.accessProfileName } : null,
    };
  }
}

export = GetMyPermissionsUseCase;
