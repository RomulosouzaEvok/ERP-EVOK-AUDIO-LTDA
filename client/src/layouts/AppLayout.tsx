import * as React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Factory,
  Wallet,
  Search,
  Users,
  KeyRound,
  LogOut,
  BarChart3,
  Boxes,
  ChevronRight,
  ClipboardList,
  ListTree,
  ShieldAlert,
  Warehouse,
  PackageCheck,
  FlaskConical,
  DraftingCompass,
  Send,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/api/auth';
import type { AccessModuleKey } from '@/api/accessProfiles';
import { getDashboardHandoffs } from '@/api/dashboard';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AccessDeniedPage } from '@/pages/AccessDeniedPage';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
  /**
   * Módulo dono do item (UC-34/UC-35), usado para o menu dinâmico —
   * chaves de `server/src/shared/domain/accessModules.ts`. Itens sem
   * `module` (ex.: Início) sempre aparecem para qualquer usuário
   * autenticado, independente de perfil.
   */
  module?: AccessModuleKey;
  /**
   * Chave do contador de handoffs (UC-40, Bloco 3, ponto do dono ainda não
   * respondido — versão mínima e reversível implementada nesta entrega, ver
   * `docs/governance/TODO.md` rodapé). Mapeia para um valor numérico
   * derivado de `GET /api/dashboard/handoffs`. Itens sem `badgeKey` nunca
   * mostram badge.
   */
  badgeKey?: 'recebimento' | 'requisicoes' | 'expedicao' | 'qualidade';
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  { label: '', items: [{ label: 'Início', to: '/', icon: LayoutDashboard, module: 'dashboard' }] },
  {
    label: 'Logística',
    items: [
      { label: 'Estoque', to: '/logistics/estoque', icon: Warehouse, module: 'estoque' },
      { label: 'Recebimento', to: '/logistics/recebimento', icon: PackageCheck, module: 'recebimento', badgeKey: 'recebimento' },
      { label: 'Expedição', to: '/logistics/expedicao', icon: Send, module: 'expedicao', badgeKey: 'expedicao' },
    ],
  },
  {
    label: 'Operações',
    items: [
      { label: 'Produtos e estoque', to: '/products', icon: Package, module: 'produtos' },
      { label: 'Vendas', to: '/sales', icon: ShoppingCart, module: 'vendas' },
      { label: 'Compras', to: '/purchases', icon: Truck, module: 'compras' },
      { label: 'Requisições', to: '/purchases/requisitions', icon: ClipboardList, module: 'requisicoes', badgeKey: 'requisicoes' },
      { label: 'Produção', to: '/production', icon: Factory, module: 'producao' },
      { label: 'Chão de Fábrica', to: '/production/shop-floor', icon: ClipboardList, module: 'chao_de_fabrica' },
      { label: 'Centros de Trabalho', to: '/production/work-centers', icon: Factory, module: 'centros_de_trabalho' },
      { label: 'MRP', to: '/production/mrp', icon: ListTree, module: 'mrp' },
      { label: 'Qualidade', to: '/quality', icon: ShieldAlert, module: 'qualidade', badgeKey: 'qualidade' },
      { label: 'Laboratório', to: '/laboratory', icon: FlaskConical, module: 'laboratorio' },
      { label: 'Engenharia', to: '/engineering', icon: DraftingCompass, module: 'engenharia' },
      { label: 'Relatórios', to: '/reports', icon: BarChart3, module: 'relatorios.producao' },
      { label: 'Patrimônio', to: '/patrimonio', icon: Boxes, module: 'patrimonio' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { label: 'Financeiro', to: '/financial', icon: Wallet, roles: ['admin', 'financial'], module: 'financeiro' },
      { label: 'Rastreabilidade', to: '/traceability', icon: Search, module: 'rastreabilidade' },
    ],
  },
  {
    label: 'Administração',
    items: [
      { label: 'Usuários', to: '/users', icon: Users, roles: ['admin'] },
      { label: 'Perfis de Acesso', to: '/users/access-profiles', icon: KeyRound, roles: ['admin'] },
    ],
  },
];

// Trilha de navegação (breadcrumb) por rota — mapeamento explícito porque as
// sub-rotas (ex.: /sales/clients) não seguem um padrão previsível a partir do path.
const BREADCRUMBS: Record<string, string[]> = {
  '/': ['Início'],
  '/change-password': ['Início', 'Trocar senha'],
  '/products': ['Produtos e estoque'],
  '/products/inventory-counts': ['Produtos e estoque', 'Contagem de inventário'],
  '/logistics/estoque': ['Logística', 'Estoque'],
  '/logistics/recebimento': ['Logística', 'Recebimento'],
  '/logistics/expedicao': ['Logística', 'Expedição'],
  '/sales': ['Vendas'],
  '/sales/clients': ['Vendas', 'Clientes'],
  '/purchases': ['Compras'],
  '/purchases/suppliers': ['Compras', 'Fornecedores'],
  '/purchases/requisitions': ['Compras', 'Requisições'],
  '/production': ['Produção'],
  '/production/bom': ['Produção', 'Estrutura de produto (BOM)'],
  '/production/shop-floor': ['Produção', 'Chão de Fábrica'],
  '/production/work-centers': ['Produção', 'Centros de Trabalho'],
  '/production/mrp': ['Produção', 'MRP'],
  '/quality': ['Qualidade'],
  '/laboratory': ['Laboratório'],
  '/engineering': ['Engenharia'],
  '/reports': ['Relatórios'],
  '/patrimonio': ['Patrimônio'],
  '/financial': ['Financeiro'],
  '/traceability': ['Rastreabilidade'],
  '/users': ['Usuários'],
  '/users/access-profiles': ['Usuários', 'Perfis de Acesso'],
  '/audit-logs': ['Usuários', 'Log de auditoria'],
};

function Breadcrumbs() {
  const { pathname } = useLocation();
  const trail = BREADCRUMBS[pathname] ?? [pathname];

  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Trilha de navegação">
      {trail.map((label, index) => (
        <React.Fragment key={label}>
          {index > 0 && <ChevronRight className="size-3.5" />}
          <span className={index === trail.length - 1 ? 'font-medium text-foreground' : ''}>{label}</span>
        </React.Fragment>
      ))}
    </nav>
  );
}

/**
 * Layout autenticado: sidebar com navegação dinâmica por perfil de acesso
 * (UC-34/UC-35) + header.
 *
 * Regras de visibilidade de cada item (combinadas — `roles` E `module`,
 * quando ambos presentes):
 * - `role = admin`: sempre vê tudo (menu completo, §3), como hoje;
 * - demais roles: item aparece se `!item.module` (item sem módulo
 *   associado, ex.: Início/Usuários controlados só por `roles`) OU se o
 *   módulo está presente no mapa de permissões resolvido
 *   (`hasModuleAccess`);
 * - **Fallback de segurança** (`permissionsFetchFailed`, ver
 *   `AuthContext`): se `GET /api/auth/me/permissions` falhar por erro de
 *   rede/500, o menu volta a ser filtrado só pela regra antiga de `roles`
 *   — nunca trava todo mundo por um bug de infraestrutura.
 * - Usuário `role != admin` sem perfil atribuído e sem falha de rede: menu
 *   fica vazio e a tela mostra o aviso didático "Seu acesso ainda não foi
 *   configurado" (UC-35-Exceção), com apenas o atalho para Trocar senha no
 *   header.
 */
export default function AppLayout() {
  const { user, hasRole, hasModuleAccess, permissions, permissionsFetchFailed, isPermissionsLoading, logout } = useAuth();

  const isAdmin = hasRole('admin');
  const usingRoleFallback = permissionsFetchFailed || isAdmin;

  // Bloco 3 (UC-40, ponto do dono ainda não respondido — versão mínima e
  // reversível): badge numérico discreto no menu, só para quem tem acesso
  // ao módulo `dashboard`. Falha da chamada nunca quebra o menu — `data`
  // fica `undefined` e nenhum badge é exibido (nenhum `onError`/retry
  // agressivo necessário, `useQuery` já não lança).
  const hasDashboardAccess = usingRoleFallback || hasModuleAccess('dashboard');
  const { data: handoffs } = useQuery({
    queryKey: ['dashboard-handoffs'],
    queryFn: getDashboardHandoffs,
    enabled: hasDashboardAccess,
    refetchInterval: 60_000,
    retry: false,
  });

  const badgeCount = (key?: NavItem['badgeKey']): number | undefined => {
    if (!key || !handoffs) return undefined;
    switch (key) {
      case 'recebimento':
        return handoffs.recebimento.pending;
      case 'requisicoes':
        return handoffs.requisicoes.awaiting_approval;
      case 'expedicao':
        return handoffs.expedicao.ready_to_ship;
      case 'qualidade':
        return handoffs.qualidade.quarantine + handoffs.qualidade.open_rncs;
      default:
        return undefined;
    }
  };

  const itemVisible = (item: NavItem): boolean => {
    if (item.roles && !hasRole(...item.roles)) return false;
    if (!item.module) return true;
    if (usingRoleFallback) return true;
    return hasModuleAccess(item.module);
  };

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(itemVisible),
  })).filter((section) => section.items.length > 0);

  // UC-35-Exceção: usuário não-admin, sem perfil atribuído, sem falha de
  // rede (fallback não ativo) — bloqueio total com aviso didático.
  const hasNoProfileConfigured =
    !isAdmin && !permissionsFetchFailed && !isPermissionsLoading && (!permissions || Object.keys(permissions).length === 0);

  return (
    <div className="flex min-h-svh">
      <aside className="flex w-64 shrink-0 flex-col border-r bg-card">
        <div className="flex items-center gap-2 border-b p-4">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            EA
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">ERP EVOK ÁUDIO</p>
            <p className="text-xs text-muted-foreground">Gestão integrada</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-2 py-3">
          {visibleSections.map((section) => (
            <div key={section.label || 'root'} className="flex flex-col gap-1">
              {section.label && (
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => {
                const { label, to, icon: Icon, badgeKey } = item;
                const count = badgeCount(badgeKey);
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                        isActive && 'bg-accent text-accent-foreground',
                      )
                    }
                  >
                    <Icon className="size-4" />
                    <span className="flex-1">{label}</span>
                    {Boolean(count) && (
                      <span
                        className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground"
                        title={`${count} pendente(s)`}
                      >
                        {count}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3">
          <Breadcrumbs />
          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <p className="font-medium leading-tight">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{roleLabel(user?.role)}</p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
              {initials(user?.name)}
            </div>
            <Button asChild variant="ghost" size="icon" title="Trocar senha">
              <Link to="/change-password">
                <KeyRound className="size-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" title="Sair" onClick={logout}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {hasNoProfileConfigured ? <AccessDeniedPage variant="noProfile" /> : <Outlet />}
        </main>
      </div>
    </div>
  );
}

function initials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function roleLabel(role?: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'financial':
      return 'Financeiro';
    case 'operator':
      return 'Operador';
    default:
      return '';
  }
}
