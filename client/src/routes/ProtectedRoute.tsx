import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/api/auth';

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
