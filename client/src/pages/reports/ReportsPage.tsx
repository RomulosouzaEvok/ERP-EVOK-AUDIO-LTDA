import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { BarChart3 } from 'lucide-react';

import * as reportsApi from '@/api/reports';
import { listWorkCenters } from '@/api/workCenters';
import { DOWNTIME_REASON_LABEL } from '@/api/productionDowntime';
import { extractApiErrorMessage } from '@/api/httpClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';

type ReportTab = 'production' | 'oee' | 'purchasing' | 'costs' | 'financial';

const TAB_MODULE: Record<ReportTab, 'relatorios.producao' | 'relatorios.compras' | 'relatorios.custos' | 'relatorios.financeiro'> = {
  production: 'relatorios.producao',
  oee: 'relatorios.producao',
  purchasing: 'relatorios.compras',
  costs: 'relatorios.custos',
  financial: 'relatorios.financeiro',
};

const TAB_QUERY_VALUE: Record<ReportTab, string> = {
  production: 'production',
  oee: 'oee',
  purchasing: 'purchasing',
  costs: 'costs',
  financial: 'financial',
};

const OP_STATUS_LABEL: Record<string, string> = {
  planned: 'Planejada',
  released: 'Liberada',
  in_progress: 'Em produção',
  paused: 'Pausada',
  completed: 'Concluída',
  canceled: 'Cancelada',
};

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Fração 0-1 → percentual com 1 casa (ex.: 0.905 → "90,5%"). */
function formatRate(value: number | string | null | undefined): string {
  return `${(toNumber(value) * 100).toFixed(1).replace('.', ',')}%`;
}

function formatDays(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${toNumber(value).toFixed(1).replace('.', ',')} d`;
}

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

/** Tile de indicador com rótulo e valor grande. */
function StatTile({ label, value, tone, hint }: { label: string; value: string; tone?: 'good' | 'warn' | 'bad'; hint?: string }) {
  const toneClass = tone === 'good' ? 'text-success' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-destructive' : '';
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-semibold ${toneClass}`}>{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/**
 * Classifica uma taxa de OEE (ou de um de seus 3 eixos) nos thresholds
 * clássicos da indústria: ≥85% (classe mundial) = verde, 60-85% (típico) =
 * âmbar, <60% (precisa de atenção) = vermelho. `null` (sem dados no
 * período) não recebe cor de alerta — é neutro, não "ruim".
 */
function oeeTone(rate: number | string | null | undefined): 'good' | 'warn' | 'bad' | undefined {
  if (rate === null || rate === undefined) return undefined;
  const value = toNumber(rate);
  if (value >= 0.85) return 'good';
  if (value >= 0.6) return 'warn';
  return 'bad';
}

/** Fração 0-1 → percentual com 1 casa, ou "—" quando `null` (sem dados no período, ver `no_data_reason`). */
function formatRateOrDash(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return formatRate(value);
}

function formatHours(value: number | string | null | undefined): string {
  return `${toNumber(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h`;
}

function SectionError({ message }: { message: string }) {
  return <p className="text-sm text-destructive">{message}</p>;
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center text-muted-foreground">{text}</TableCell>
    </TableRow>
  );
}

/**
 * Relatórios de manufatura, compras e custos (item 9 do levantamento).
 *
 * Bloco E (`docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md`): decisão
 * técnica de manter uma única página com abas (em vez de 3 páginas
 * separadas) — os 3 relatórios compartilham quase todo o layout
 * (tiles/tabelas/período), e o backend já expõe os módulos de RBAC
 * separados (`relatorios.producao`/`relatorios.compras`/`relatorios.custos`).
 * A separação por módulo acontece em duas camadas nesta tela: (1) cada aba
 * só aparece se o usuário tiver acesso ao módulo correspondente; (2) cada
 * seção do menu (Produção/Compras) linka direto para a aba certa via
 * deep-link `?tab=production|purchasing|costs`, preservando a navegação
 * "cada departamento tem seu relatório" pedida pelo dono do produto sem
 * duplicar código de renderização.
 */
export default function ReportsPage() {
  const { hasRole, hasModuleAccess, permissionsFetchFailed } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const canSeeTab = (candidate: ReportTab): boolean =>
    hasRole('admin') || permissionsFetchFailed || hasModuleAccess(TAB_MODULE[candidate]);

  const availableTabs = (['production', 'oee', 'purchasing', 'costs', 'financial'] as const).filter(canSeeTab);

  const tabFromQuery = searchParams.get('tab');
  const initialTab: ReportTab =
    (tabFromQuery === 'purchasing' || tabFromQuery === 'costs' || tabFromQuery === 'production' || tabFromQuery === 'oee' || tabFromQuery === 'financial') &&
    availableTabs.includes(tabFromQuery)
      ? tabFromQuery
      : (availableTabs[0] ?? 'production');

  const [tab, setTabState] = React.useState<ReportTab>(initialTab);

  const setTab = (nextTab: ReportTab) => {
    setTabState(nextTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', TAB_QUERY_VALUE[nextTab]);
      return next;
    });
  };

  const [startInput, setStartInput] = React.useState(isoDaysAgo(30));
  const [endInput, setEndInput] = React.useState(isoDaysAgo(0));
  const [period, setPeriod] = React.useState({ start_date: isoDaysAgo(30), end_date: isoDaysAgo(0) });

  // Filtro de centro de trabalho, exclusivo da aba OEE ('' = todos os centros ativos, agregado geral).
  const [oeeWorkCenterId, setOeeWorkCenterId] = React.useState<string>('');

  const productionQuery = useQuery({
    queryKey: ['reports-production', period],
    queryFn: () => reportsApi.getProductionReport(period),
    enabled: tab === 'production',
  });

  const workCentersQuery = useQuery({
    queryKey: ['work-centers-for-oee'],
    queryFn: () => listWorkCenters({ active: true, limit: 100 }),
    enabled: tab === 'oee',
  });

  const oeeQuery = useQuery({
    queryKey: ['reports-oee', period, oeeWorkCenterId],
    queryFn: () => reportsApi.getOeeReport({ ...period, work_center_id: oeeWorkCenterId || undefined }),
    enabled: tab === 'oee',
  });

  const purchasingQuery = useQuery({
    queryKey: ['reports-purchasing', period],
    queryFn: () => reportsApi.getPurchasingReport(period),
    enabled: tab === 'purchasing',
  });

  const costVarianceQuery = useQuery({
    queryKey: ['reports-cost-variance', period],
    queryFn: () => reportsApi.getCostVarianceReport(period),
    enabled: tab === 'costs',
  });

  const cashFlowQuery = useQuery({
    queryKey: ['reports-cash-flow', period],
    queryFn: () => reportsApi.getCashFlowReport(period),
    enabled: tab === 'financial',
  });

  const production = productionQuery.data;
  const oee = oeeQuery.data;
  const workCenters = workCentersQuery.data?.data ?? [];
  const purchasing = purchasingQuery.data;
  const costVariance = costVarianceQuery.data;
  const cashFlow = cashFlowQuery.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <BarChart3 className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Indicadores de produção, OEE, compras, custos e financeiro.</p>
        </div>
      </div>

      {availableTabs.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Seu perfil de acesso não tem permissão para nenhum relatório. Solicite ao administrador a inclusão de um
          módulo de relatórios (Produção, Compras ou Custos) no seu perfil.
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex gap-2">
          {availableTabs.includes('production') && (
            <Button
              variant={tab === 'production' ? 'default' : 'outline'}
              className={tab !== 'production' ? 'hover:border-brand hover:bg-brand/10 hover:text-brand' : ''}
              onClick={() => setTab('production')}
            >
              Produção
            </Button>
          )}
          {availableTabs.includes('oee') && (
            <Button
              variant={tab === 'oee' ? 'default' : 'outline'}
              className={tab !== 'oee' ? 'hover:border-brand hover:bg-brand/10 hover:text-brand' : ''}
              onClick={() => setTab('oee')}
            >
              OEE
            </Button>
          )}
          {availableTabs.includes('purchasing') && (
            <Button
              variant={tab === 'purchasing' ? 'default' : 'outline'}
              className={tab !== 'purchasing' ? 'hover:border-brand hover:bg-brand/10 hover:text-brand' : ''}
              onClick={() => setTab('purchasing')}
            >
              Compras
            </Button>
          )}
          {availableTabs.includes('costs') && (
            <Button
              variant={tab === 'costs' ? 'default' : 'outline'}
              className={tab !== 'costs' ? 'hover:border-brand hover:bg-brand/10 hover:text-brand' : ''}
              onClick={() => setTab('costs')}
            >
              Custos
            </Button>
          )}
          {availableTabs.includes('financial') && (
            <Button
              variant={tab === 'financial' ? 'default' : 'outline'}
              className={tab !== 'financial' ? 'hover:border-brand hover:bg-brand/10 hover:text-brand' : ''}
              onClick={() => setTab('financial')}
            >
              Financeiro
            </Button>
          )}
        </div>
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setPeriod({ start_date: startInput, end_date: endInput });
          }}
        >
          <div className="flex flex-col gap-1">
            <Label htmlFor="start_date">Início</Label>
            <Input id="start_date" type="date" value={startInput} onChange={(e) => setStartInput(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="end_date">Fim</Label>
            <Input id="end_date" type="date" value={endInput} onChange={(e) => setEndInput(e.target.value)} />
          </div>
          {tab === 'oee' && (
            <div className="flex flex-col gap-1">
              <Label htmlFor="oee_work_center">Centro de trabalho</Label>
              <select
                id="oee_work_center"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={oeeWorkCenterId}
                onChange={(e) => setOeeWorkCenterId(e.target.value)}
              >
                <option value="">Todos (agregado)</option>
                {workCenters.map((wc) => (
                  <option key={String(wc.id)} value={String(wc.id)}>{wc.code} — {wc.name}</option>
                ))}
              </select>
            </div>
          )}
          <Button type="submit">Aplicar</Button>
        </form>
      </div>

      {tab === 'production' && (
        <div className="flex flex-col gap-4">
          {productionQuery.isError && (
            <SectionError message={extractApiErrorMessage(productionQuery.error, 'Falha ao carregar o relatório de produção.')} />
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="OPs concluídas" value={String(toNumber(production?.adherence.orders_completed))} />
            <StatTile
              label="Aderência ao plano"
              value={formatRate(production?.adherence.adherence_rate)}
              tone={toNumber(production?.adherence.adherence_rate) >= 0.9 ? 'good' : undefined}
            />
            <StatTile
              label="Taxa de refugo"
              value={formatRate(production?.adherence.scrap_rate)}
              tone={toNumber(production?.adherence.scrap_rate) > 0.05 ? 'bad' : 'good'}
            />
            <StatTile label="Lead time médio" value={formatDays(production?.lead_time.avg_days)} />
          </div>

          <Card>
            <CardHeader><CardTitle>WIP por status</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">OPs</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productionQuery.isLoading ? (
                    <TableSkeletonRows rows={3} columns={3} />
                  ) : !production || production.wip.length === 0 ? (
                    <EmptyRow colSpan={3} text="Nenhuma OP no período." />
                  ) : (
                    production.wip.map((row) => (
                      <TableRow key={row.status}>
                        <TableCell><Badge variant="secondary">{OP_STATUS_LABEL[row.status] ?? row.status}</Badge></TableCell>
                        <TableCell className="text-right tabular-nums">{toNumber(row.orders_count)}</TableCell>
                        <TableCell className="text-right tabular-nums">{toNumber(row.total_quantity).toLocaleString('pt-BR')}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Refugo por etapa</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Centro de trabalho</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead className="text-right">Boa</TableHead>
                    <TableHead className="text-right">Refugo</TableHead>
                    <TableHead className="text-right">Taxa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productionQuery.isLoading ? (
                    <TableSkeletonRows rows={3} columns={5} />
                  ) : !production || production.scrap_by_step.length === 0 ? (
                    <EmptyRow colSpan={5} text="Nenhum apontamento concluído no período." />
                  ) : (
                    production.scrap_by_step.map((row, index) => {
                      const rate = toNumber(row.scrap_rate);
                      return (
                        <TableRow key={`${row.work_center}-${row.step_name}-${index}`}>
                          <TableCell>{row.work_center ?? 'SEM ROTEIRO'}</TableCell>
                          <TableCell>{row.step_name ?? '—'} (seq. {toNumber(row.sequence)})</TableCell>
                          <TableCell className="text-right tabular-nums">{toNumber(row.quantity_good).toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-right tabular-nums">{toNumber(row.quantity_scrapped).toLocaleString('pt-BR')}</TableCell>
                          <TableCell className={`text-right tabular-nums font-medium ${rate > 0.05 ? 'text-destructive' : ''}`}>
                            {formatRate(rate)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'oee' && (
        <div className="flex flex-col gap-4">
          {oeeQuery.isError && (
            <SectionError message={extractApiErrorMessage(oeeQuery.error, 'Falha ao carregar o relatório de OEE.')} />
          )}
          <p className="text-xs text-muted-foreground">
            Disponibilidade líquida = calendário de turnos do centro de trabalho menos as horas de parada
            registradas em "Chão de fábrica → Registrar parada" (se um centro não tiver turnos cadastrados, usa a
            capacidade padrão h/dia do cadastro). Eixos sem dados no período aparecem como “—”, não como 0%.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatTile
              label="Disponibilidade"
              value={formatRateOrDash(oee?.aggregate.availability)}
              tone={oeeTone(oee?.aggregate.availability)}
              hint={`${formatHours(oee?.aggregate.run_hours)} produzindo / ${formatHours(oee?.aggregate.available_hours)} disponíveis`}
            />
            <StatTile
              label="Horas de parada"
              value={formatHours(oee?.aggregate.downtime_hours)}
              hint={
                (oee?.aggregate.downtime_by_reason.length ?? 0) > 0
                  ? oee!.aggregate.downtime_by_reason
                      .map((row) => `${DOWNTIME_REASON_LABEL[row.reason as keyof typeof DOWNTIME_REASON_LABEL] ?? row.reason}: ${formatHours(row.hours)}`)
                      .join(' · ')
                  : 'Nenhuma parada registrada no período'
              }
            />
            <StatTile
              label="Performance"
              value={formatRateOrDash(oee?.aggregate.performance)}
              tone={oeeTone(oee?.aggregate.performance)}
              hint={`${formatHours(oee?.aggregate.standard_hours)} padrão / ${formatHours(oee?.aggregate.run_hours)} real`}
            />
            <StatTile
              label="Qualidade"
              value={formatRateOrDash(oee?.aggregate.quality)}
              tone={oeeTone(oee?.aggregate.quality)}
              hint={`${toNumber(oee?.aggregate.quantity_good).toLocaleString('pt-BR')} boas / ${toNumber(oee?.aggregate.quantity_scrapped).toLocaleString('pt-BR')} refugo`}
            />
            <StatTile
              label="OEE"
              value={formatRateOrDash(oee?.aggregate.oee)}
              tone={oeeTone(oee?.aggregate.oee)}
              hint={oee?.aggregate.no_data_reason ?? `${toNumber(oee?.aggregate.work_centers_count)} centro(s) de trabalho`}
            />
          </div>

          {(oee?.aggregate.downtime_by_reason.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {oee!.aggregate.downtime_by_reason.map((row) => (
                <Badge key={row.reason} variant="outline">
                  {DOWNTIME_REASON_LABEL[row.reason as keyof typeof DOWNTIME_REASON_LABEL] ?? row.reason}: {formatHours(row.hours)}
                </Badge>
              ))}
            </div>
          )}

          <Card>
            <CardHeader><CardTitle>OEE por centro de trabalho</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Centro</TableHead>
                    <TableHead className="text-right">Horas disp.</TableHead>
                    <TableHead className="text-right">Horas parada</TableHead>
                    <TableHead className="text-right">Horas produzindo</TableHead>
                    <TableHead className="text-right">Disponibilidade</TableHead>
                    <TableHead className="text-right">Horas padrão</TableHead>
                    <TableHead className="text-right">Performance</TableHead>
                    <TableHead className="text-right">Boas</TableHead>
                    <TableHead className="text-right">Refugo</TableHead>
                    <TableHead className="text-right">Qualidade</TableHead>
                    <TableHead className="text-right">OEE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oeeQuery.isLoading ? (
                    <TableSkeletonRows rows={4} columns={11} />
                  ) : !oee || oee.by_work_center.length === 0 ? (
                    <EmptyRow colSpan={11} text="Nenhum centro de trabalho ativo encontrado." />
                  ) : (
                    oee.by_work_center.map((row) => (
                      <TableRow
                        key={String(row.work_center_id)}
                        title={
                          row.downtime_by_reason.length > 0
                            ? row.downtime_by_reason
                                .map((d) => `${DOWNTIME_REASON_LABEL[d.reason as keyof typeof DOWNTIME_REASON_LABEL] ?? d.reason}: ${formatHours(d.hours)}`)
                                .join(' · ')
                            : row.no_data_reason ?? undefined
                        }
                      >
                        <TableCell className="font-medium">{row.code} — {row.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatHours(row.available_hours)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatHours(row.downtime_hours)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatHours(row.run_hours)}</TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${oeeTone(row.availability) === 'good' ? 'text-success' : oeeTone(row.availability) === 'warn' ? 'text-amber-600' : oeeTone(row.availability) === 'bad' ? 'text-destructive' : ''}`}>
                          {formatRateOrDash(row.availability)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatHours(row.standard_hours)}</TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${oeeTone(row.performance) === 'good' ? 'text-success' : oeeTone(row.performance) === 'warn' ? 'text-amber-600' : oeeTone(row.performance) === 'bad' ? 'text-destructive' : ''}`}>
                          {formatRateOrDash(row.performance)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{toNumber(row.quantity_good).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right tabular-nums">{toNumber(row.quantity_scrapped).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${oeeTone(row.quality) === 'good' ? 'text-success' : oeeTone(row.quality) === 'warn' ? 'text-amber-600' : oeeTone(row.quality) === 'bad' ? 'text-destructive' : ''}`}>
                          {formatRateOrDash(row.quality)}
                        </TableCell>
                        <TableCell className={`text-right tabular-nums font-semibold ${oeeTone(row.oee) === 'good' ? 'text-success' : oeeTone(row.oee) === 'warn' ? 'text-amber-600' : oeeTone(row.oee) === 'bad' ? 'text-destructive' : ''}`}>
                          {formatRateOrDash(row.oee)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'purchasing' && (
        <div className="flex flex-col gap-4">
          {purchasingQuery.isError && (
            <SectionError message={extractApiErrorMessage(purchasingQuery.error, 'Falha ao carregar o relatório de compras.')} />
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Pedidos no período" value={String(toNumber(purchasing?.totals.orders_count))} />
            <StatTile label="Valor total" value={BRL.format(toNumber(purchasing?.totals.total_amount))} />
            <StatTile label="Pedidos em aberto" value={String(toNumber(purchasing?.totals.open_orders))} />
          </div>

          <Card>
            <CardHeader><CardTitle>Compras por fornecedor</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Lead time médio</TableHead>
                    <TableHead className="text-right">No prazo</TableHead>
                    <TableHead className="text-right">RNCs</TableHead>
                    <TableHead>Última compra</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchasingQuery.isLoading ? (
                    <TableSkeletonRows rows={4} columns={7} />
                  ) : !purchasing || purchasing.by_supplier.length === 0 ? (
                    <EmptyRow colSpan={7} text="Nenhuma compra no período." />
                  ) : (
                    purchasing.by_supplier.map((row) => {
                      const onTime = toNumber(row.on_time_rate);
                      const rncCount = toNumber(row.rnc_count);
                      return (
                        <TableRow key={String(row.supplier_id)}>
                          <TableCell className="font-medium">{row.company_name}</TableCell>
                          <TableCell className="text-right tabular-nums">{toNumber(row.orders_count)}</TableCell>
                          <TableCell className="text-right tabular-nums">{BRL.format(toNumber(row.total_amount))}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatDays(row.avg_lead_time_days)}</TableCell>
                          <TableCell
                            className={`text-right font-medium ${onTime >= 0.9 ? 'text-success' : onTime < 0.7 ? 'text-destructive' : ''}`}
                          >
                            {formatRate(onTime)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {rncCount > 0
                              ? <Badge className="border-transparent bg-destructive text-destructive-foreground">{rncCount}</Badge>
                              : <span className="text-muted-foreground">0</span>}
                          </TableCell>
                          <TableCell>{row.last_order_date ? new Date(`${row.last_order_date}T00:00:00`).toLocaleDateString('pt-BR') : '—'}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'costs' && (
        <div className="flex flex-col gap-4">
          {costVarianceQuery.isError && (
            <SectionError message={extractApiErrorMessage(costVarianceQuery.error, 'Falha ao carregar o relatório de custos.')} />
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <StatTile
              label="Produtos com variância > 5%"
              value={String(toNumber(costVariance?.totals.products_with_variance))}
              tone={toNumber(costVariance?.totals.products_with_variance) > 0 ? 'bad' : 'good'}
            />
            <StatTile label="Variância média ponderada" value={formatRate(costVariance?.totals.avg_variance_rate)} />
          </div>

          <Card>
            <CardHeader><CardTitle>Custo real vs padrão</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-right">Padrão</TableHead>
                    <TableHead className="text-right">Real médio</TableHead>
                    <TableHead className="text-right">Variância</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costVarianceQuery.isLoading ? (
                    <TableSkeletonRows rows={4} columns={5} />
                  ) : !costVariance || costVariance.by_product.length === 0 ? (
                    <EmptyRow colSpan={5} text="Nenhum custo real registrado no período." />
                  ) : (
                    costVariance.by_product.map((row) => {
                      const rate = toNumber(row.variance_rate);
                      const tone = rate > 0.05 ? 'text-destructive' : rate <= 0 ? 'text-success' : '';
                      return (
                        <TableRow key={String(row.product_id)}>
                          <TableCell className="font-medium">{row.code}</TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell className="text-right tabular-nums">{BRL.format(toNumber(row.standard_cost))}</TableCell>
                          <TableCell className="text-right tabular-nums">{BRL.format(toNumber(row.avg_real_cost))}</TableCell>
                          <TableCell className={`text-right tabular-nums font-medium ${tone}`}>{formatRate(rate)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Preço de compra vs catálogo</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Catálogo</TableHead>
                    <TableHead className="text-right">Pago médio</TableHead>
                    <TableHead className="text-right">Variância</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costVarianceQuery.isLoading ? (
                    <TableSkeletonRows rows={4} columns={5} />
                  ) : !costVariance || costVariance.purchase_price_variance.length === 0 ? (
                    <EmptyRow colSpan={5} text="Nenhuma compra com preço de catálogo no período." />
                  ) : (
                    costVariance.purchase_price_variance.map((row, index) => {
                      const hasCatalog = row.catalog_price !== null && row.catalog_price !== undefined;
                      const rate = hasCatalog ? toNumber(row.variance_rate) : null;
                      const tone = rate === null ? '' : rate > 0.05 ? 'text-destructive' : rate <= 0 ? 'text-success' : '';
                      return (
                        <TableRow key={`${row.product_id}-${row.supplier_id}-${index}`}>
                          <TableCell className="font-medium">{row.code} — {row.name}</TableCell>
                          <TableCell>{row.company_name}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {hasCatalog ? BRL.format(toNumber(row.catalog_price)) : '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{BRL.format(toNumber(row.avg_paid_price))}</TableCell>
                          <TableCell className={`text-right tabular-nums font-medium ${tone}`}>
                            {rate === null ? '—' : formatRate(rate)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'financial' && (
        <div className="flex flex-col gap-4">
          {cashFlowQuery.isError && (
            <SectionError message={extractApiErrorMessage(cashFlowQuery.error, 'Falha ao carregar o relatório financeiro.')} />
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Total de vendas" value={BRL.format(toNumber(cashFlow?.summary.total_sales))} />
            <StatTile label="Total de compras" value={BRL.format(toNumber(cashFlow?.summary.total_purchases))} />
            <StatTile
              label="Saldo (vendas - compras)"
              value={BRL.format(toNumber(cashFlow?.summary.balance))}
              tone={toNumber(cashFlow?.summary.balance) >= 0 ? 'good' : 'bad'}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Fluxo de caixa agregado do período selecionado — sem série diária (mesma limitação do relatório de origem).
          </p>
        </div>
      )}
    </div>
  );
}
