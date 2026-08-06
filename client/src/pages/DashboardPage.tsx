import * as React from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ShoppingCart, Truck, Factory, Wallet, LayoutDashboard } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import * as inventoryApi from '@/api/inventory';
import * as purchasesApi from '@/api/purchases';
import * as productionApi from '@/api/production';
import * as financialApi from '@/api/financial';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

/**
 * Painel executivo (KPIs consolidados + estoque baixo + atalhos). Extraído
 * como componente próprio (Home por Perfil, `docs/governance/HANDOFF_CODEX.md`) para
 * ser reaproveitado tanto na rota dedicada `/dashboard` (link direto, sem
 * saudação duplicada) quanto como widget `kpis-executivos` da Home
 * (`client/src/pages/home/widgetRegistry.tsx`), restrito a admin/financial.
 * Nenhuma classe visual foi alterada — apenas o corpo abaixo da saudação foi
 * movido para cá.
 */
export function ExecutiveKpiPanel() {
  const { hasRole, hasModuleAccess, permissionsFetchFailed } = useAuth();

  // Interseção "cards existentes ∩ módulos com acesso" (Bloco 1.3, UC-38):
  // mesmo padrão de fallback usado em `AppLayout.itemVisible` — admin e
  // falha de rede na busca de permissões nunca escondem cards (regra antiga
  // de `role` prevalece nesse caso, para não travar ninguém por bug de
  // infraestrutura).
  const usingRoleFallback = permissionsFetchFailed || hasRole('admin');
  const canSee = (module: Parameters<typeof hasModuleAccess>[0]) => usingRoleFallback || hasModuleAccess(module);

  const canSeeProdutos = canSee('produtos');
  const canSeeCompras = canSee('compras');
  const canSeeProducao = canSee('producao');
  const canSeeFinanceiro = hasRole('admin', 'financial') && canSee('financeiro');

  const { data: lowStock, isLoading: loadingLowStock, isError: errorLowStock } = useQuery({
    queryKey: ['dashboard-low-stock'],
    queryFn: inventoryApi.listLowStock,
    enabled: canSeeProdutos,
  });

  const { data: pendingPurchases, isLoading: loadingPurchases, isError: errorPurchases } = useQuery({
    queryKey: ['dashboard-purchases-pending'],
    queryFn: () => purchasesApi.listPurchases({ status: 'pending', limit: 1 }),
    enabled: canSeeCompras,
  });

  const { data: openProduction, isLoading: loadingProduction, isError: errorProduction } = useQuery({
    queryKey: ['dashboard-production-in-progress'],
    queryFn: () => productionApi.listProductionOrders({ status: 'in_progress', limit: 1 }),
    enabled: canSeeProducao,
  });

  const { data: overduePayables, isLoading: loadingPayables, isError: errorPayables } = useQuery({
    queryKey: ['dashboard-payables-overdue'],
    queryFn: () => financialApi.listPayables({ status: 'overdue', limit: 1 }),
    enabled: canSeeFinanceiro,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {canSeeProdutos && (
          <KpiCard
            to="/products"
            icon={AlertTriangle}
            label="Produtos com estoque baixo"
            value={loadingLowStock ? '...' : errorLowStock ? '—' : String(lowStock?.length ?? 0)}
            tone={errorLowStock ? 'error' : lowStock && lowStock.length > 0 ? 'destructive' : 'default'}
          />
        )}
        {canSeeCompras && (
          <KpiCard
            to="/purchases"
            icon={Truck}
            label="Compras pendentes"
            value={loadingPurchases ? '...' : errorPurchases ? '—' : String(pendingPurchases?.pagination.total ?? 0)}
            tone={errorPurchases ? 'error' : 'default'}
          />
        )}
        {canSeeProducao && (
          <KpiCard
            to="/production"
            icon={Factory}
            label="Ordens em produção"
            value={loadingProduction ? '...' : errorProduction ? '—' : String(openProduction?.pagination.total ?? 0)}
            tone={errorProduction ? 'error' : 'default'}
          />
        )}
        {canSeeFinanceiro && (
          <KpiCard
            to="/financial"
            icon={Wallet}
            label="Contas a pagar atrasadas"
            value={loadingPayables ? '...' : errorPayables ? '—' : String(overduePayables?.pagination.total ?? 0)}
            tone={errorPayables ? 'error' : overduePayables && overduePayables.pagination.total > 0 ? 'destructive' : 'default'}
          />
        )}
      </div>

      {canSeeProdutos && lowStock && lowStock.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" />
              Produtos com estoque baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.slice(0, 10).map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-xs">{product.code}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="size-3" />
                        {Number(product.quantity)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{Number(product.min_quantity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Atalhos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <ShortcutLink to="/sales" icon={ShoppingCart} label="Nova venda" />
            <ShortcutLink to="/purchases" icon={Truck} label="Novo pedido de compra" />
            <ShortcutLink to="/production" icon={Factory} label="Nova ordem de produção" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Página `/dashboard` (link direto, ex.: favoritos/atalhos): mesma
 * saudação + painel executivo de antes da Home por Perfil. A rota `/` agora
 * renderiza `HomePage` (`client/src/pages/home/HomePage.tsx`), que monta o
 * painel executivo como widget `kpis-executivos` (admin/financial).
 */
export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <LayoutDashboard className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Olá, {user?.name?.split(' ')[0]}</h1>
          <p className="text-sm text-muted-foreground">Visão geral do ERP EVOK ÁUDIO.</p>
        </div>
      </div>

      <ExecutiveKpiPanel />
    </div>
  );
}

function ShortcutLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm font-medium transition-all duration-150 hover:border-brand hover:bg-brand/10 hover:text-brand hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

function KpiCard({
  to,
  icon: Icon,
  label,
  value,
  tone = 'default',
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: 'default' | 'destructive' | 'error';
}) {
  // 'error' (falha ao carregar) e visualmente distinto de 'destructive'
  // (dado real que exige atencao, ex.: estoque baixo) — sem isso, uma
  // falha de rede exibia "0 pendencias" identico a um KPI zerado
  // legitimo, escondendo do usuario que os dados estao desatualizados.
  const valueToneClass = tone === 'destructive' ? 'text-destructive' : tone === 'error' ? 'text-muted-foreground' : '';
  const badgeToneClass =
    tone === 'destructive'
      ? 'bg-destructive/10 text-destructive'
      : tone === 'error'
        ? 'bg-muted text-muted-foreground'
        : 'bg-brand/10 text-brand';
  return (
    <Link to={to} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded-xl block">
      <Card className="border-l-4 border-l-transparent shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-l-brand hover:shadow-lg">
        <CardContent className="flex items-center gap-3 pt-6">
          <div className={`flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors ${badgeToneClass}`}>
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className={`text-3xl font-semibold leading-tight tabular-nums ${valueToneClass}`}>{value}</p>
            <p className="truncate text-xs text-muted-foreground">
              {tone === 'error' ? `${label} (falha ao carregar)` : label}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
