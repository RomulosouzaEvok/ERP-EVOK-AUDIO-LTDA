import * as React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
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

const NAV_ITEMS: NavItem[] = [
  { label: 'Início', to: '/', icon: LayoutDashboard },
  { label: 'Produtos e estoque', to: '/products', icon: Package },
  { label: 'Vendas', to: '/sales', icon: ShoppingCart },
  { label: 'Compras', to: '/purchases', icon: Truck },
  { label: 'Produção', to: '/production', icon: Factory },
  { label: 'Patrimônio', to: '/patrimonio', icon: Boxes },
  { label: 'Financeiro', to: '/financial', icon: Wallet, roles: ['admin', 'financial'] },
  { label: 'Rastreabilidade', to: '/traceability', icon: Search },
  { label: 'Usuários', to: '/users', icon: Users, roles: ['admin'] },
];

/** Layout autenticado: sidebar com navegação por módulo (filtrada por role) + header. */
export default function AppLayout() {
  const { user, hasRole, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || hasRole(...item.roles));

  return (
    <div className="flex min-h-svh">
      <aside className="flex w-64 shrink-0 flex-col border-r bg-card">
        <div className="border-b p-4">
          <p className="font-semibold">ERP EVOK ÁUDIO</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {visibleItems.map(({ label, to, icon: Icon }) => (
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
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3">
          <div />
          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <p className="font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{roleLabel(user?.role)}</p>
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
