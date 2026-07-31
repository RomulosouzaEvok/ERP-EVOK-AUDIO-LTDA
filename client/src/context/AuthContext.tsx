import * as React from 'react';

import * as authApi from '@/api/auth';
import { clearStoredToken, getStoredToken, registerUnauthorizedHandler, setStoredToken } from '@/api/httpClient';
import type { AuthUser, UserRole } from '@/api/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

/**
 * Provedor de autenticação: carrega a sessão a partir do token persistido
 * (se houver), expõe `login`/`logout`, e reage a 401 vindo de qualquer
 * chamada de API (token expirado, ou `passwordVersion` desatualizado após
 * troca/revogação de senha em outra aba/dispositivo — SEC-10/SEC-12).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const logout = React.useCallback(() => {
    clearStoredToken();
    setUser(null);
  }, []);

  React.useEffect(() => {
    registerUnauthorizedHandler(logout);
  }, [logout]);

  React.useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    authApi
      .getMe()
      .then(setUser)
      .catch(() => clearStoredToken())
      .finally(() => setIsLoading(false));
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    const { token, user: loggedUser } = await authApi.login(email, password);
    setStoredToken(token);
    setUser(loggedUser);
  }, []);

  const hasRole = React.useCallback(
    (...roles: UserRole[]) => Boolean(user && roles.includes(user.role)),
    [user],
  );

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    login,
    logout,
    hasRole,
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
