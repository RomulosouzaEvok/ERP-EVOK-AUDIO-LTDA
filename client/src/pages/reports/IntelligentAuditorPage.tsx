import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, RefreshCw } from 'lucide-react';

import * as auditorApi from '@/api/intelligentAuditor';
import { extractApiErrorMessage } from '@/api/httpClient';
import { useAuth } from '@/context/AuthContext';
import { AccessDeniedPage } from '@/pages/AccessDeniedPage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR');
}

/** Tile de indicador com rótulo e valor grande. `tone='bad'` destaca achados que exigem ação. */
function StatTile({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  const toneClass = tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-destructive' : '';
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-semibold ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
      <span>{message}</span>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center text-muted-foreground">{text}</TableCell>
    </TableRow>
  );
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  received: 'Recebido',
  partial: 'Parcial',
  cancelled: 'Cancelado',
  paid: 'Pago',
};

/**
 * `/reports/auditor` — Auditor Inteligente (UC mencionado em `CLAUDE.md`
 * §4 "Relatórios & Dashboard"). Dashboard read-only que roda 4 auditorias
 * agregadas ao vivo contra o banco (`GET /api/auditor/{stock,sales,purchases,financial}`,
 * módulo `intelligentAuditor`), sem paginação e sem filtro de período — os
 * achados típicos (estoque negativo, compras paradas, contas vencidas) são
 * de baixo volume por natureza.
 *
 * Restrito a `admin` no backend (`authorize('admin')` nas 4 rotas) — não
 * existe nível de módulo (`AccessModuleKey`) próprio para este recurso, por
 * isso a gate aqui é por role, não por `hasModuleAccess`.
 */
export default function IntelligentAuditorPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');

  const stockQuery = useQuery({ queryKey: ['auditor-stock'], queryFn: auditorApi.auditStock, enabled: isAdmin });
  const salesQuery = useQuery({ queryKey: ['auditor-sales'], queryFn: auditorApi.auditSales, enabled: isAdmin });
  const purchasesQuery = useQuery({ queryKey: ['auditor-purchases'], queryFn: auditorApi.auditPurchases, enabled: isAdmin });
  const financialQuery = useQuery({ queryKey: ['auditor-financial'], queryFn: auditorApi.auditFinancial, enabled: isAdmin });

  if (!isAdmin) {
    return <AccessDeniedPage variant="accessDenied" />;
  }

  const stock = stockQuery.data;
  const sales = salesQuery.data;
  const purchases = purchasesQuery.data;
  const financial = financialQuery.data;

  const isRefreshing =
    stockQuery.isFetching || salesQuery.isFetching || purchasesQuery.isFetching || financialQuery.isFetching;

  const refreshAll = () => {
    stockQuery.refetch();
    salesQuery.refetch();
    purchasesQuery.refetch();
    financialQuery.refetch();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Auditor Inteligente</h1>
            <p className="text-sm text-muted-foreground">
              Achados automáticos de consistência em estoque, vendas, compras e financeiro — leitura direta do banco,
              sem período configurável.
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={refreshAll} disabled={isRefreshing}>
          <RefreshCw className={isRefreshing ? 'animate-spin' : undefined} /> Atualizar
        </Button>
      </div>

      {/* Estoque */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Estoque</h2>
        {stockQuery.isError && (
          <SectionError
            message={extractApiErrorMessage(stockQuery.error, 'Falha ao carregar a auditoria de estoque.')}
            onRetry={() => stockQuery.refetch()}
          />
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label="Produtos com estoque negativo"
            value={String(toNumber(stock?.summary.total_negative))}
            tone={toNumber(stock?.summary.total_negative) > 0 ? 'bad' : 'good'}
          />
          <StatTile
            label="Produtos sem nenhuma movimentação"
            value={String(toNumber(stock?.summary.total_no_movement))}
            tone={toNumber(stock?.summary.total_no_movement) > 0 ? 'bad' : undefined}
          />
          <StatTile label="Produtos auditados" value={String(toNumber(stock?.summary.products_audited))} />
        </div>

        <Card>
          <CardHeader><CardTitle>Estoque negativo</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockQuery.isLoading ? (
                  <TableSkeletonRows rows={3} columns={3} />
                ) : !stock || stock.negative_stock.length === 0 ? (
                  <EmptyRow colSpan={3} text="Nenhum produto com estoque negativo." />
                ) : (
                  stock.negative_stock.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{row.code}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        {toNumber(row.quantity).toLocaleString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Produtos com estoque positivo sem movimentação registrada</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockQuery.isLoading ? (
                  <TableSkeletonRows rows={3} columns={3} />
                ) : !stock || stock.no_movement.length === 0 ? (
                  <EmptyRow colSpan={3} text="Todos os produtos com estoque têm movimentação registrada." />
                ) : (
                  stock.no_movement.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{row.code}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell className="text-right">{toNumber(row.quantity).toLocaleString('pt-BR')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Vendas */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Vendas</h2>
        {salesQuery.isError && (
          <SectionError
            message={extractApiErrorMessage(salesQuery.error, 'Falha ao carregar a auditoria de vendas.')}
            onRetry={() => salesQuery.refetch()}
          />
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <StatTile
            label="Vendas confirmadas com recebíveis incompletos"
            value={String(toNumber(sales?.incomplete_receivables))}
            tone={toNumber(sales?.incomplete_receivables) > 0 ? 'bad' : 'good'}
          />
          <StatTile
            label="Vendas sem nenhum item"
            value={String(toNumber(sales?.sales_without_items))}
            tone={toNumber(sales?.sales_without_items) > 0 ? 'bad' : 'good'}
          />
        </div>
      </div>

      {/* Compras */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Compras</h2>
        {purchasesQuery.isError && (
          <SectionError
            message={extractApiErrorMessage(purchasesQuery.error, 'Falha ao carregar a auditoria de compras.')}
            onRetry={() => purchasesQuery.refetch()}
          />
        )}
        <StatTile
          label="Pedidos parados há mais de 30 dias"
          value={String(toNumber(purchases?.purchases_stalled))}
          tone={toNumber(purchases?.purchases_stalled) > 0 ? 'bad' : 'good'}
        />
        <Card>
          <CardHeader><CardTitle>Pedidos parados</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchasesQuery.isLoading ? (
                  <TableSkeletonRows rows={3} columns={4} />
                ) : !purchases || purchases.details.length === 0 ? (
                  <EmptyRow colSpan={4} text="Nenhum pedido de compra parado há mais de 30 dias." />
                ) : (
                  purchases.details.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.order_number}</TableCell>
                      <TableCell><Badge variant="secondary">{STATUS_LABEL[row.status] ?? row.status}</Badge></TableCell>
                      <TableCell className="text-right">{BRL.format(toNumber(row.total_amount))}</TableCell>
                      <TableCell>{formatDate(row.createdAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Financeiro */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Financeiro</h2>
        {financialQuery.isError && (
          <SectionError
            message={extractApiErrorMessage(financialQuery.error, 'Falha ao carregar a auditoria financeira.')}
            onRetry={() => financialQuery.refetch()}
          />
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <StatTile
            label="Contas a receber vencidas"
            value={`${toNumber(financial?.overdue_receivable.count)} · ${BRL.format(toNumber(financial?.overdue_receivable.total))}`}
            tone={toNumber(financial?.overdue_receivable.count) > 0 ? 'bad' : 'good'}
          />
          <StatTile
            label="Contas a pagar vencidas"
            value={`${toNumber(financial?.overdue_payable.count)} · ${BRL.format(toNumber(financial?.overdue_payable.total))}`}
            tone={toNumber(financial?.overdue_payable.count) > 0 ? 'bad' : 'good'}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Contas a receber por status</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financialQuery.isLoading ? (
                    <TableSkeletonRows rows={3} columns={2} />
                  ) : !financial || financial.receivable_by_status.length === 0 ? (
                    <EmptyRow colSpan={2} text="Nenhuma conta a receber cadastrada." />
                  ) : (
                    financial.receivable_by_status.map((row) => (
                      <TableRow key={row.status}>
                        <TableCell><Badge variant="secondary">{STATUS_LABEL[row.status] ?? row.status}</Badge></TableCell>
                        <TableCell className="text-right">{BRL.format(toNumber(row.total))}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Contas a pagar por status</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financialQuery.isLoading ? (
                    <TableSkeletonRows rows={3} columns={2} />
                  ) : !financial || financial.payable_by_status.length === 0 ? (
                    <EmptyRow colSpan={2} text="Nenhuma conta a pagar cadastrada." />
                  ) : (
                    financial.payable_by_status.map((row) => (
                      <TableRow key={row.status}>
                        <TableCell><Badge variant="secondary">{STATUS_LABEL[row.status] ?? row.status}</Badge></TableCell>
                        <TableCell className="text-right">{BRL.format(toNumber(row.total))}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
