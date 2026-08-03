import * as React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
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
  Boxes,
  ChevronRight,
  ClipboardList,
  ListTree,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/api/auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  { label: '', items: [{ label: 'Início', to: '/', icon: LayoutDashboard }] },
  {
    label: 'Operações',
    items: [
      { label: 'Produtos e estoque', to: '/products', icon: Package },
      { label: 'Vendas', to: '/sales', icon: ShoppingCart },
      { label: 'Compras', to: '/purchases', icon: Truck },
      { label: 'Requisições', to: '/purchases/requisitions', icon: ClipboardList },
      { label: 'Produção', to: '/production', icon: Factory },
      { label: 'MRP', to: '/production/mrp', icon: ListTree },
      { label: 'Patrimônio', to: '/patrimonio', icon: Boxes },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { label: 'Financeiro', to: '/financial', icon: Wallet, roles: ['admin', 'financial'] },
      { label: 'Rastreabilidade', to: '/traceability', icon: Search },
    ],
  },
  {
    label: 'Administração',
    items: [{ label: 'Usuários', to: '/users', icon: Users, roles: ['admin'] }],
  },
];

// Trilha de navegação (breadcrumb) por rota — mapeamento explícito porque as
// sub-rotas (ex.: /sales/clients) não seguem um padrão previsível a partir do path.
const BREADCRUMBS: Record<string, string[]> = {
  '/': ['Início'],
  '/change-password': ['Início', 'Trocar senha'],
  '/products': ['Produtos e estoque'],
  '/products/inventory-counts': ['Produtos e estoque', 'Contagem de inventário'],
  '/sales': ['Vendas'],
  '/sales/clients': ['Vendas', 'Clientes'],
  '/purchases': ['Compras'],
  '/purchases/suppliers': ['Compras', 'Fornecedores'],
  '/purchases/requisitions': ['Compras', 'Requisições'],
  '/production': ['Produção'],
  '/production/bom': ['Produção', 'Estrutura de produto (BOM)'],
  '/production/mrp': ['Produção', 'MRP'],
  '/patrimonio': ['Patrimônio'],
  '/financial': ['Financeiro'],
  '/traceability': ['Rastreabilidade'],
  '/users': ['Usuários'],
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

/** Layout autenticado: sidebar com navegação por módulo (filtrada por role) + header. */
export default function AppLayout() {
  const { user, hasRole, logout } = useAuth();

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.roles || hasRole(...item.roles)),
  })).filter((section) => section.items.length > 0);

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
              {section.items.map(({ label, to, icon: Icon }) => (
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
                  {label}
                </NavLink>
              ))}
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
          <Outlet />
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
