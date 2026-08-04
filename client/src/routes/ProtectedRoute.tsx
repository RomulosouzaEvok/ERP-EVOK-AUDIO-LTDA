import { Navigate, Outlet, useLocation } from 'react-router';

import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/api/auth';
import type { AccessModuleKey } from '@/api/accessProfiles';
import { AccessDeniedPage } from '@/pages/AccessDeniedPage';

/**
 * Bloqueia acesso a rotas filhas se não houver sessão autenticada.
 * Guarda a rota de origem em `location.state.from` para redirecionar de
 * volta após o login.
 */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

/**
 * Bloqueia acesso a rotas filhas se o usuário autenticado não tiver um dos
 * `roles` permitidos. Usa isso APENAS para esconder/ajustar a UI — a
 * autorização de verdade continua sendo sempre a da API (`authorize()` no
 * backend), nunca confiar só nesta checagem client-side.
 */
export function RoleRoute({ roles }: { roles: UserRole[] }) {
  const { hasRole } = useAuth();

  if (!hasRole(...roles)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

/**
 * Guard de rota por módulo de perfil de acesso (UC-34/UC-35). Bloqueia a
 * navegação direta por URL a um módulo fora do perfil do usuário, exibindo
 * a tela "Acesso Negado" (não a página do módulo — nunca tenta renderizar
 * dados parciais).
 *
 * Regras de liberação (mesma lógica de `hasModuleAccess`, ver
 * `AuthContext`):
 * - `role = admin` sempre libera (nunca bloqueado por perfil de área, §3);
 * - `permissionsFetchFailed = true` (fallback de segurança de rede/500)
 *   também libera — nunca trava o usuário por um bug de infraestrutura,
 *   documentado em `AuthContext`;
 * - caso contrário, exige o módulo presente no mapa de permissões
 *   resolvido (`GET /api/auth/me/permissions`).
 */
export function ModuleRoute({ module }: { module: AccessModuleKey }) {
  const { hasModuleAccess, permissionsFetchFailed, isPermissionsLoading } = useAuth();

  if (isPermissionsLoading) {
    return <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">Carregando...</div>;
  }

  if (!hasModuleAccess(module) && !permissionsFetchFailed) {
    return <AccessDeniedPage variant="accessDenied" />;
  }

  return <Outlet />;
}
