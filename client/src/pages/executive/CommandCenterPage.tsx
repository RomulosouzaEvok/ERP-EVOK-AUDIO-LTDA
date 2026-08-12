import * as React from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Crown,
  Gauge,
  PackageCheck,
  Send,
  ShieldAlert,
  Truck,
  Factory,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import { getDashboardHandoffs } from '@/api/dashboard';
import { getCashFlowReport, getOeeReport, getProductionReport, getPurchasingReport } from '@/api/reports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * 👑 Sala de Comando da Diretoria (`/dashboard`).
 *
 * A rota `/dashboard` existia desde que `HomePage` assumiu a `/`, mas ficou
 * **órfã**: nenhum item de menu levava até ela (achado da auditoria de
 * 2026-08-11). Esta página ocupa a rota com o que a diretoria de fato
 * precisa ver — e que nenhuma outra tela do ERP mostra junto: a **cadeia do
 * produto inteira em uma linha**, do pedido de compra ao embarque, com o
 * gargalo apontado.
 *
 * **Princípio de honestidade dos números.** Todo valor exibido vem de um
 * endpoint de relatório real (`/api/reports/*`, `/api/dashboard/handoffs`).
 * Nada é estimado no cliente. Quando o denominador de um indicador é zero,
 * o backend devolve `null` e a tela mostra `—` em vez de `0%` — um zero
 * enganoso numa tela de diretoria é pior que um traço honesto (mesma regra
 * já adotada no OEE, ver `GetOeeReportUseCase`).
 *
 * A mesma regra vale para **falha de leitura**: query com erro mostra `—` e
 * um aviso explícito, nunca `R$ 0` nem o check verde de "nada em circulação".
 * Antes, API fora do ar renderizava "fábrica parada" — um fato de negócio
 * falso (V-2, VARREDURA_DUPLA_2026-08-11.md).
 */

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** `null`/ausente vira `—`; nunca `0%`. */
function formatRate(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const parsed = toNumber(value);
  return `${(parsed * 100).toFixed(1)}%`;
}

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

const PERIODS = [
  { days: 30, label: '30 dias' },
  { days: 60, label: '60 dias' },
  { days: 90, label: '90 dias' },
] as const;

/** Um elo da cadeia do produto. */
interface ChainStage {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  /** Rótulo do que o número significa — a diretoria não deve adivinhar. */
  unit: string;
  to: string;
}

export default function CommandCenterPage() {
  const [days, setDays] = React.useState<number>(30);
  const period = React.useMemo(() => ({ start_date: isoDaysAgo(days), end_date: isoDaysAgo(0) }), [days]);

  const cashFlow = useQuery({ queryKey: ['cmd-cashflow', period], queryFn: () => getCashFlowReport(period) });
  const production = useQuery({ queryKey: ['cmd-production', period], queryFn: () => getProductionReport(period) });
  const purchasing = useQuery({ queryKey: ['cmd-purchasing', period], queryFn: () => getPurchasingReport(period) });
  const oee = useQuery({ queryKey: ['cmd-oee', period], queryFn: () => getOeeReport(period) });
  const handoffs = useQuery({
    queryKey: ['dashboard-handoffs'],
    queryFn: getDashboardHandoffs,
    refetchInterval: 60_000,
  });

  const sales = toNumber(cashFlow.data?.summary.total_sales);
  const purchases = toNumber(cashFlow.data?.summary.total_purchases);
  const balance = toNumber(cashFlow.data?.summary.balance);

  // WIP em andamento: soma das OPs que não estão concluídas nem canceladas.
  const wipInProgress = (production.data?.wip ?? [])
    .filter((row) => row.status !== 'completed' && row.status !== 'cancelled')
    .reduce((total, row) => total + toNumber(row.orders_count), 0);

  const chain: ChainStage[] = [
    {
      key: 'compras',
      label: 'Compras',
      icon: Truck,
      count: toNumber(purchasing.data?.totals.open_orders),
      unit: 'pedidos em aberto',
      to: '/purchases',
    },
    {
      key: 'recebimento',
      label: 'Recebimento',
      icon: PackageCheck,
      count: handoffs.data?.recebimento?.pending ?? 0,
      unit: 'a receber',
      to: '/logistics/recebimento',
    },
    {
      key: 'producao',
      label: 'Produção',
      icon: Factory,
      count: wipInProgress,
      unit: 'ordens em curso',
      to: '/production',
    },
    {
      key: 'qualidade',
      label: 'Qualidade',
      icon: ShieldAlert,
      count: (handoffs.data?.qualidade?.quarantine ?? 0) + (handoffs.data?.qualidade?.open_rncs ?? 0),
      unit: 'retidos + NCs',
      to: '/quality',
    },
    {
      key: 'expedicao',
      label: 'Expedição',
      icon: Send,
      count: handoffs.data?.expedicao?.ready_to_ship ?? 0,
      unit: 'prontos p/ embarque',
      to: '/logistics/expedicao',
    },
  ];

  const chainErrored = purchasing.isError || production.isError || handoffs.isError;
  const chainLoaded =
    !chainErrored && !purchasing.isLoading && !production.isLoading && !handoffs.isLoading;
  const chainTotal = chain.reduce((total, stage) => total + stage.count, 0);
  // Gargalo = elo com o maior acúmulo. Só faz sentido quando há movimento
  // E quando a leitura funcionou; com erro, nenhum diagnóstico é honesto.
  const bottleneck =
    chainLoaded && chainTotal > 0 ? chain.reduce((worst, s) => (s.count > worst.count ? s : worst)) : null;

  const adherence = production.data?.adherence.adherence_rate ?? null;
  const scrapRate = production.data?.adherence.scrap_rate ?? null;
  const oeeValue = oee.data?.aggregate.oee ?? null;

  const topSuppliers = [...(purchasing.data?.by_supplier ?? [])]
    .sort((a, b) => toNumber(b.total_amount) - toNumber(a.total_amount))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-brand/15 via-brand/5 to-transparent p-6">
        <div className="pointer-events-none absolute -right-8 -top-8 opacity-[0.07]">
          <Crown className="size-40" />
        </div>
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Diretoria</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Sala de Comando</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              A cadeia do produto de ponta a ponta, com os números medidos no período — não estimados.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
            {PERIODS.map((option) => (
              <Button
                key={option.days}
                size="sm"
                variant={days === option.days ? 'default' : 'ghost'}
                onClick={() => setDays(option.days)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Faixa de KPIs ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Vendas no período"
          value={cashFlow.isLoading ? '…' : cashFlow.isError ? '—' : BRL.format(sales)}
          icon={TrendingUp}
          tone={cashFlow.isError ? undefined : 'good'}
          hint={cashFlow.isError ? 'Falha ao ler o relatório' : undefined}
        />
        <KpiCard
          label="Compras no período"
          value={cashFlow.isLoading ? '…' : cashFlow.isError ? '—' : BRL.format(purchases)}
          icon={TrendingDown}
          hint={cashFlow.isError ? 'Falha ao ler o relatório' : undefined}
        />
        <KpiCard
          label="Saldo (vendas − compras)"
          value={cashFlow.isLoading ? '…' : cashFlow.isError ? '—' : BRL.format(balance)}
          icon={balance >= 0 ? TrendingUp : TrendingDown}
          tone={cashFlow.isError ? undefined : balance >= 0 ? 'good' : 'bad'}
          hint={cashFlow.isError ? 'Falha ao ler o relatório' : undefined}
        />
        <KpiCard
          label="OEE geral"
          value={oee.isLoading ? '…' : oee.isError ? '—' : formatRate(oeeValue)}
          icon={Gauge}
          hint={oee.isError ? 'Falha ao ler o relatório' : (oee.data?.aggregate.no_data_reason ?? undefined)}
          tone={oee.isError || oeeValue === null ? undefined : toNumber(oeeValue) >= 0.6 ? 'good' : 'warn'}
        />
      </div>

      {/* ── Cadeia do produto (peça central) ──────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cadeia do produto</CardTitle>
          <p className="text-sm text-muted-foreground">
            Do pedido de compra ao embarque. Cada elo mostra o que está parado nele agora.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
            {chain.map((stage, index) => {
              const StageIcon = stage.icon;
              const isBottleneck = bottleneck?.key === stage.key && stage.count > 0;
              return (
                <React.Fragment key={stage.key}>
                  <Link
                    to={stage.to}
                    className={cn(
                      'group flex flex-1 flex-col gap-1 rounded-xl border p-4 transition-all duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                      isBottleneck ? 'border-amber-500/60 bg-amber-500/5' : 'hover:border-brand/40',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <StageIcon
                        className={cn('size-4 shrink-0', isBottleneck ? 'text-amber-600' : 'text-muted-foreground')}
                      />
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {stage.label}
                      </span>
                    </div>
                    <p
                      className={cn(
                        'text-3xl font-bold leading-none tabular-nums',
                        isBottleneck ? 'text-amber-600' : 'text-foreground',
                      )}
                    >
                      {chainErrored ? '—' : chainLoaded ? stage.count : '…'}
                    </p>
                    <p className="text-[11px] leading-snug text-muted-foreground">{stage.unit}</p>
                  </Link>
                  {index < chain.length - 1 && (
                    <div className="hidden items-center px-1 lg:flex" aria-hidden>
                      <ArrowRight className="size-4 text-muted-foreground/40" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Diagnóstico em uma frase — é o que a diretoria lê primeiro. */}
          <div
            className={cn(
              'mt-4 flex items-start gap-2.5 rounded-lg border p-3 text-sm',
              chainErrored
                ? 'border-destructive/40 bg-destructive/5'
                : chainTotal === 0
                  ? 'border-muted bg-muted/40'
                  : 'border-amber-500/40 bg-amber-500/5',
            )}
          >
            {chainErrored ? (
              <>
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <span className="text-destructive">
                  Não foi possível ler um ou mais relatórios — os números acima estão incompletos. Nenhum
                  diagnóstico da cadeia é confiável até a leitura voltar.
                </span>
              </>
            ) : !chainLoaded ? (
              <span className="text-muted-foreground">Carregando a cadeia do produto…</span>
            ) : chainTotal === 0 ? (
              <>
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Nenhum documento em circulação no período. Com o cadastro ainda em carga (sem produto acabado,
                  estrutura ou roteiro), a cadeia não tem o que movimentar — ver{' '}
                  <Link to="/products" className="font-medium text-brand underline-offset-2 hover:underline">
                    Item Mestre
                  </Link>
                  .
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <span>
                  Maior acúmulo em <strong>{bottleneck?.label}</strong>, com {bottleneck?.count} {bottleneck?.unit}.
                  É onde a cadeia está mais lenta agora.
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ── Eficiência industrial ───────────────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Eficiência industrial</CardTitle>
            <p className="text-sm text-muted-foreground">
              OEE decomposto nos três eixos e aderência ao que foi planejado.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <AxisBar label="Disponibilidade" value={oee.data?.aggregate.availability ?? null} />
            <AxisBar label="Performance" value={oee.data?.aggregate.performance ?? null} />
            <AxisBar label="Qualidade" value={oee.data?.aggregate.quality ?? null} />
            <div className="grid gap-3 border-t pt-4 sm:grid-cols-3">
              <MiniStat label="Aderência ao plano" value={formatRate(adherence)} />
              <MiniStat label="Refugo" value={formatRate(scrapRate)} />
              <MiniStat
                label="Horas paradas"
                value={oee.data ? `${toNumber(oee.data.aggregate.downtime_hours).toFixed(1)} h` : '—'}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Fornecedores ────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Maiores fornecedores</CardTitle>
            <p className="text-sm text-muted-foreground">Por valor comprado no período.</p>
          </CardHeader>
          <CardContent>
            {topSuppliers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {purchasing.isLoading
                  ? 'Carregando…'
                  : purchasing.isError
                    ? 'Falha ao ler o relatório de compras.'
                    : 'Nenhuma compra no período.'}
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {topSuppliers.map((supplier) => (
                  <li key={String(supplier.supplier_id)} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{supplier.company_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {toNumber(supplier.orders_count)} pedido(s) · pontualidade{' '}
                        {formatRate(supplier.on_time_rate)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {BRL.format(toNumber(supplier.total_amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Período de {period.start_date.split('-').reverse().join('/')} a{' '}
        {period.end_date.split('-').reverse().join('/')}. Indicadores sem base de cálculo no período aparecem como
        “—”, nunca como zero.
      </p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'good' | 'warn' | 'bad';
  hint?: string;
}) {
  const toneClass =
    tone === 'good' ? 'text-success' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-destructive' : '';
  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardContent className="flex items-start justify-between gap-3 pt-6">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className={cn('mt-1 text-2xl font-bold tabular-nums', toneClass)}>{value}</p>
          {hint && <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</p>}
        </div>
        <Icon className={cn('size-5 shrink-0 opacity-40', toneClass)} />
      </CardContent>
    </Card>
  );
}

/** Eixo do OEE — barra + valor, com `—` quando o backend devolve `null`. */
function AxisBar({ label, value }: { label: string; value: number | string | null }) {
  const hasValue = value !== null && value !== undefined && value !== '';
  const percent = hasValue ? Math.min(100, Math.max(0, toNumber(value) * 100)) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-semibold tabular-nums">{formatRate(value)}</span>
      </div>
      <Progress value={percent} className={cn(!hasValue && 'opacity-40')} />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
