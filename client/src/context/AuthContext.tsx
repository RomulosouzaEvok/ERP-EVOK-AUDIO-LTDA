import * as React from 'react';

import * as authApi from '@/api/auth';
import * as accessProfilesApi from '@/api/accessProfiles';
import type { AccessModuleKey, AccessModuleLevel } from '@/api/accessProfiles';
import { clearStoredToken, getStoredToken, registerUnauthorizedHandler, setStoredToken } from '@/api/httpClient';
import type { AuthUser, UserRole } from '@/api/auth';

/** Mapa module→nível resolvido para o usuário autenticado (UC-34), usado para montar o menu dinâmico. */
export type PermissionsMap = Partial<Record<AccessModuleKey, AccessModuleLevel>>;

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
  /** Mapa module→nível do usuário logado (UC-34). `null` enquanto ainda não resolvido/carregando. */
  permissions: PermissionsMap | null;
  /** Perfil de acesso de área atualmente atribuído ao usuário (UC-33/UC-34), ou `null` se nenhum. */
  accessProfile: { id: number; nome: string } | null;
  /** `true` enquanto `GET /api/auth/me/permissions` ainda não respondeu (nem sucesso, nem fallback). */
  isPermissionsLoading: boolean;
  /**
   * `true` quando a busca de permissões falhou (erro de rede/500) e o
   * AppLayout está usando o fallback de segurança "menu por role antiga"
   * (ver `hasModuleAccess`/nota de fallback abaixo) em vez do menu por
   * perfil de área.
   */
  permissionsFetchFailed: boolean;
  /**
   * Verifica se o usuário tem acesso (qualquer nível) a um módulo,
   * combinando role admin (sempre libera) + mapa de permissões resolvido.
   * Não deve ser usada como guard de segurança real — apenas UX (a API
   * já aplica `authorizeModule` no backend).
   */
  hasModuleAccess: (module: AccessModuleKey) => boolean;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

/**
 * Provedor de autenticação: carrega a sessão a partir do token persistido
 * (se houver), expõe `login`/`logout`, e reage a 401 vindo de qualquer
 * chamada de API (token expirado, ou `passwordVersion` desatualizado após
 * troca/revogação de senha em outra aba/dispositivo — SEC-10/SEC-12).
 *
 * Também resolve o mapa de permissões por módulo (UC-34, `GET
 * /api/auth/me/permissions`) logo após identificar o usuário (bootstrap por
 * token persistido, ou `login()`). **Fallback de segurança documentado**:
 * se essa chamada falhar (erro de rede/500 — não é o caso normal de
 * "usuário sem perfil", que responde 200 com `modules: {}`), `permissions`
 * fica `null` e `permissionsFetchFailed = true`; o `AppLayout` deve, nesse
 * caso, voltar a filtrar o menu pela regra antiga de `role` (nunca travar
 * todo mundo por um bug de rede/backend). Isso é intencional e não deve ser
 * "corrigido" para bloquear o menu em caso de falha.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [permissions, setPermissions] = React.useState<PermissionsMap | null>(null);
  const [accessProfile, setAccessProfile] = React.useState<{ id: number; nome: string } | null>(null);
  const [isPermissionsLoading, setIsPermissionsLoading] = React.useState(false);
  const [permissionsFetchFailed, setPermissionsFetchFailed] = React.useState(false);

  const logout = React.useCallback(() => {
    clearStoredToken();
    setUser(null);
    setPermissions(null);
    setAccessProfile(null);
    setPermissionsFetchFailed(false);
  }, []);

  React.useEffect(() => {
    registerUnauthorizedHandler(logout);
  }, [logout]);

  const loadPermissions = React.useCallback(async () => {
    setIsPermissionsLoading(true);
    try {
      const result = await accessProfilesApi.getMyPermissions();
      setPermissions(result.modules);
      setAccessProfile(result.profile);
      setPermissionsFetchFailed(false);
    } catch (error) {
      // Fallback de segurança (ver JSDoc acima): erro de rede/500 nunca deve
      // travar o usuário fora do sistema — mantém o menu pela regra antiga
      // de role, apenas registrando o problema no console para diagnóstico.
      console.error('Falha ao carregar permissões (GET /api/auth/me/permissions). Aplicando fallback por role.', error);
      setPermissions(null);
      setAccessProfile(null);
      setPermissionsFetchFailed(true);
    } finally {
      setIsPermissionsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    authApi
      .getMe()
      .then((loadedUser) => {
        setUser(loadedUser);
        return loadPermissions();
      })
      .catch(() => clearStoredToken())
      .finally(() => setIsLoading(false));
  }, [loadPermissions]);

  const login = React.useCallback(
    async (email: string, password: string) => {
      const { token, user: loggedUser } = await authApi.login(email, password);
      setStoredToken(token);
      setUser(loggedUser);
      await loadPermissions();
    },
    [loadPermissions],
  );

  const hasRole = React.useCallback(
    (...roles: UserRole[]) => Boolean(user && roles.includes(user.role)),
    [user],
  );

  const hasModuleAccess = React.useCallback(
    (module: AccessModuleKey) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      return Boolean(permissions && permissions[module]);
    },
    [user, permissions],
  );

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    login,
    logout,
    hasRole,
    permissions,
    accessProfile,
    isPermissionsLoading,
    permissionsFetchFailed,
    hasModuleAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook de acesso ao contexto de autenticação. Deve ser usado dentro de `<AuthProvider>`. */
export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  }
  return ctx;
}
