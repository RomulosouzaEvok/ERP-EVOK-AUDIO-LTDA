import * as React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
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
  Settings2,
  PackageCheck,
  FlaskConical,
  DraftingCompass,
  Send,
  Zap,
  Wrench,
  LifeBuoy,
  Contact,
  Landmark,
  ShieldCheck,
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
  badgeKey?: 'recebimento' | 'requisicoes' | 'expedicao' | 'qualidade' | 'compras_devolucoes';
}

interface NavSection {
  label: string;
  items: NavItem[];
}

/**
 * Menu reorganizado por departamento (Bloco E,
 * `docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md`) — segue o desenho
 * final decidido pelo dono do produto: "Logística" e "Operações" (antigas
 * seções que misturavam departamentos) viram uma seção só por área,
 * seguindo o fluxo físico do material; cada departamento com requisição
 * própria (Logística/Produção/Manutenção/Qualidade) ganha seu próprio item
 * de menu (Compras centraliza só aprovação/cotação); "Relatórios" deixa de
 * ser um item genérico solto em Operações e ganha um atalho por área
 * (deep-link `?tab=`, ver `ReportsPage`); Patrimônio se divide em dois
 * departamentos novos (Manutenção interna de máquina vs. Ativos & Garantia
 * — produto vendido que volta com defeito).
 */
const NAV_SECTIONS: NavSection[] = [
  { label: '', items: [{ label: 'Início', to: '/', icon: LayoutDashboard, module: 'dashboard' }] },
  {
    label: 'Logística',
    items: [
      { label: 'Produtos', to: '/products', icon: Package, module: 'produtos' },
      { label: 'Estoque', to: '/logistics/estoque', icon: Warehouse, module: 'estoque' },
      { label: 'Depósitos', to: '/logistics/warehouses', icon: Settings2, module: 'estoque' },
      { label: 'Recebimento', to: '/logistics/recebimento', icon: PackageCheck, module: 'recebimento', badgeKey: 'recebimento' },
      { label: 'Expedição', to: '/logistics/expedicao', icon: Send, module: 'expedicao', badgeKey: 'expedicao' },
      { label: 'Requisições de Logística', to: '/logistics/requisitions', icon: ClipboardList, module: 'estoque' },
      { label: 'Relatórios de Logística', to: '/reports?tab=purchasing', icon: BarChart3, module: 'relatorios.compras' },
    ],
  },
  {
    label: 'Vendas',
    items: [{ label: 'Vendas', to: '/sales', icon: ShoppingCart, module: 'vendas' }],
  },
  {
    label: 'Compras',
    items: [
      { label: 'Compras', to: '/purchases', icon: Truck, module: 'compras', badgeKey: 'compras_devolucoes' },
      { label: 'Fornecedores', to: '/purchases/suppliers', icon: Truck, module: 'compras' },
      { label: 'Fila de aprovação', to: '/purchases/requisitions', icon: ClipboardList, module: 'requisicoes', badgeKey: 'requisicoes' },
      { label: 'Relatórios de Compras', to: '/reports?tab=purchasing', icon: BarChart3, module: 'relatorios.compras' },
    ],
  },
  {
    label: 'Produção',
    items: [
      { label: 'Produção', to: '/production', icon: Factory, module: 'producao' },
      { label: 'Chão de Fábrica', to: '/production/shop-floor', icon: ClipboardList, module: 'chao_de_fabrica' },
      { label: 'Centros de Trabalho', to: '/production/work-centers', icon: Factory, module: 'centros_de_trabalho' },
      { label: 'MRP', to: '/production/mrp', icon: ListTree, module: 'mrp' },
      { label: 'Requisições de Produção', to: '/production/requisitions', icon: ClipboardList, module: 'producao' },
      { label: 'Relatórios de Produção', to: '/reports?tab=production', icon: BarChart3, module: 'relatorios.producao' },
    ],
  },
  {
    label: 'Qualidade & Engenharia',
    items: [
      { label: 'Qualidade', to: '/quality', icon: ShieldAlert, module: 'qualidade', badgeKey: 'qualidade' },
      { label: 'Requisições de Qualidade', to: '/quality/requisitions', icon: ClipboardList, module: 'qualidade' },
      { label: 'Laboratório', to: '/laboratory', icon: FlaskConical, module: 'laboratorio' },
      { label: 'Engenharia', to: '/engineering', icon: DraftingCompass, module: 'engenharia' },
    ],
  },
  {
    label: 'Manutenção',
    items: [
      { label: 'Ordens de Manutenção', to: '/maintenance', icon: Wrench, module: 'manutencao' },
      { label: 'Requisições de Manutenção', to: '/maintenance/requisitions', icon: ClipboardList, module: 'manutencao' },
    ],
  },
  {
    label: 'Ativos & Garantia',
    items: [
      { label: 'Patrimônio', to: '/patrimonio', icon: Boxes, module: 'patrimonio' },
      { label: 'Garantia / Assistência Técnica', to: '/service-orders', icon: LifeBuoy, module: 'garantia' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { label: 'Financeiro', to: '/financial', icon: Wallet, roles: ['admin', 'financial'], module: 'financeiro' },
      { label: 'Relatórios Financeiros', to: '/reports?tab=financial', icon: BarChart3, roles: ['admin', 'financial'], module: 'relatorios.financeiro' },
      { label: 'Rastreabilidade', to: '/traceability', icon: Search, module: 'rastreabilidade' },
    ],
  },
  {
    label: 'Administração',
    items: [
      { label: 'Usuários', to: '/users', icon: Users, roles: ['admin'] },
      { label: 'Perfis de Acesso', to: '/users/access-profiles', icon: KeyRound, roles: ['admin'] },
      // RH: GET /api/employees e /api/departments exigem so sessao
      // autenticada (sem role/module dedicado) — item visivel a qualquer
      // usuario logado, igual o backend; escrita e restrita a admin dentro
      // das proprias abas (ver HrPage.tsx).
      { label: 'RH (Funcionários/Departamentos)', to: '/hr', icon: Contact },
      { label: 'Configuração Fiscal', to: '/settings/fiscal', icon: Landmark, roles: ['admin'] },
      { label: 'Auditor Inteligente', to: '/reports/auditor', icon: ShieldCheck, roles: ['admin'] },
    ],
  },
];

// Trilha de navegação (breadcrumb) por rota — mapeamento explícito porque as
// sub-rotas (ex.: /sales/clients) não seguem um padrão previsível a partir do path.
const BREADCRUMBS: Record<string, string[]> = {
  '/': ['Início'],
  '/change-password': ['Início', 'Trocar senha'],
  '/products': ['Logística', 'Produtos'],
  '/products/inventory-counts': ['Logística', 'Produtos', 'Contagem de inventário'],
  '/logistics/estoque': ['Logística', 'Estoque'],
  '/logistics/recebimento': ['Logística', 'Recebimento'],
  '/logistics/expedicao': ['Logística', 'Expedição'],
  '/logistics/warehouses': ['Logística', 'Depósitos'],
  '/logistics/requisitions': ['Logística', 'Requisições de Logística'],
  '/sales': ['Vendas'],
  '/sales/clients': ['Vendas', 'Clientes'],
  '/purchases': ['Compras'],
  '/purchases/suppliers': ['Compras', 'Fornecedores'],
  '/purchases/requisitions': ['Compras', 'Fila de aprovação'],
  '/production': ['Produção'],
  '/production/bom': ['Produção', 'Estrutura de produto (BOM)'],
  '/production/shop-floor': ['Produção', 'Chão de Fábrica'],
  '/production/work-centers': ['Produção', 'Centros de Trabalho'],
  '/production/mrp': ['Produção', 'MRP'],
  '/production/requisitions': ['Produção', 'Requisições de Produção'],
  '/quality': ['Qualidade & Engenharia', 'Qualidade'],
  '/quality/requisitions': ['Qualidade & Engenharia', 'Requisições de Qualidade'],
  '/laboratory': ['Qualidade & Engenharia', 'Laboratório'],
  '/engineering': ['Qualidade & Engenharia', 'Engenharia'],
  '/maintenance': ['Manutenção', 'Ordens de Manutenção'],
  '/maintenance/requisitions': ['Manutenção', 'Requisições de Manutenção'],
  '/reports': ['Relatórios'],
  '/patrimonio': ['Ativos & Garantia', 'Patrimônio'],
  '/service-orders': ['Ativos & Garantia', 'Garantia / Assistência Técnica'],
  '/financial': ['Gestão', 'Financeiro'],
  '/traceability': ['Gestão', 'Rastreabilidade'],
  '/users': ['Usuários'],
  '/users/access-profiles': ['Usuários', 'Perfis de Acesso'],
  '/audit-logs': ['Usuários', 'Log de auditoria'],
  '/hr': ['Administração', 'RH'],
  '/settings/fiscal': ['Administração', 'Configuração Fiscal'],
  '/reports/auditor': ['Administração', 'Auditor Inteligente'],
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
      case 'compras_devolucoes':
        return handoffs.compras.pending_returns;
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
        <Link to="/" className="flex items-center gap-2.5 border-b bg-brand-dark p-4 transition-opacity hover:opacity-90">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-[0_0_16px_color-mix(in_oklch,var(--brand)_55%,transparent)]">
            <Zap className="size-5" fill="currentColor" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-white">
              EVOK <span className="text-brand">ÁUDIO</span>
            </p>
            <p className="text-xs text-white/50">Gestão integrada</p>
          </div>
        </Link>
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
                        'flex items-center gap-2 rounded-md border-l-2 border-transparent px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground',
                        isActive && 'border-brand bg-brand/10 text-brand',
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
            <div className="flex size-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground">
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
