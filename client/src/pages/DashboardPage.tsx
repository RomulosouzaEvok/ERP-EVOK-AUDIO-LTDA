import * as React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ShoppingCart, Truck, Factory, Wallet } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import * as inventoryApi from '@/api/inventory';
import * as purchasesApi from '@/api/purchases';
import * as productionApi from '@/api/production';
import * as financialApi from '@/api/financial';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

/** Página inicial pós-login: KPIs reais consolidados dos módulos operacionais. */
export default function DashboardPage() {
  const { user, hasRole } = useAuth();

  const { data: lowStock, isLoading: loadingLowStock } = useQuery({
    queryKey: ['dashboard-low-stock'],
    queryFn: inventoryApi.listLowStock,
  });

  const { data: pendingPurchases, isLoading: loadingPurchases } = useQuery({
    queryKey: ['dashboard-purchases-pending'],
    queryFn: () => purchasesApi.listPurchases({ status: 'pending', limit: 1 }),
  });

  const { data: openProduction, isLoading: loadingProduction } = useQuery({
    queryKey: ['dashboard-production-in-progress'],
    queryFn: () => productionApi.listProductionOrders({ status: 'in_progress', limit: 1 }),
  });

  const { data: overduePayables, isLoading: loadingPayables } = useQuery({
    queryKey: ['dashboard-payables-overdue'],
    queryFn: () => financialApi.listPayables({ status: 'overdue', limit: 1 }),
    enabled: hasRole('admin', 'financial'),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Olá, {user?.name?.split(' ')[0]}</h1>
        <p className="text-muted-foreground">Visão geral do ERP EVOK ÁUDIO.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          to="/products"
          icon={AlertTriangle}
          label="Produtos com estoque baixo"
          value={loadingLowStock ? '...' : String(lowStock?.length ?? 0)}
          tone={lowStock && lowStock.length > 0 ? 'destructive' : 'default'}
        />
        <KpiCard
          to="/purchases"
          icon={Truck}
          label="Compras pendentes"
          value={loadingPurchases ? '...' : String(pendingPurchases?.pagination.total ?? 0)}
        />
        <KpiCard
          to="/production"
          icon={Factory}
          label="Ordens em produção"
          value={loadingProduction ? '...' : String(openProduction?.pagination.total ?? 0)}
        />
        {hasRole('admin', 'financial') && (
          <KpiCard
            to="/financial"
            icon={Wallet}
            label="Contas a pagar atrasadas"
            value={loadingPayables ? '...' : String(overduePayables?.pagination.total ?? 0)}
            tone={overduePayables && overduePayables.pagination.total > 0 ? 'destructive' : 'default'}
          />
        )}
      </div>

      {lowStock && lowStock.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Produtos com estoque baixo</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Mínimo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.slice(0, 10).map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.code}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{Number(product.quantity)}</Badge>
                    </TableCell>
                    <TableCell>{Number(product.min_quantity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Atalhos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link to="/sales" className="text-sm text-primary underline-offset-4 hover:underline">
              <ShoppingCart className="mr-1 inline size-4" /> Nova venda
            </Link>
            <Link to="/purchases" className="text-sm text-primary underline-offset-4 hover:underline">
              <Truck className="mr-1 inline size-4" /> Novo pedido de compra
            </Link>
            <Link to="/production" className="text-sm text-primary underline-offset-4 hover:underline">
              <Factory className="mr-1 inline size-4" /> Nova ordem de produção
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
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
  tone?: 'default' | 'destructive';
}) {
  return (
    <Link to={to}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="flex items-center gap-3 pt-6">
          <Icon className={tone === 'destructive' ? 'size-8 text-destructive' : 'size-8 text-muted-foreground'} />
          <div>
            <p className={tone === 'destructive' ? 'text-2xl font-semibold text-destructive' : 'text-2xl font-semibold'}>
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
