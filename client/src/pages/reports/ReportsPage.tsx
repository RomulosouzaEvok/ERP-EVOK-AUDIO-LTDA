import * as React from 'react';
import { useQuery } from '@tanstack/react-query';

import * as reportsApi from '@/api/reports';
import { extractApiErrorMessage } from '@/api/httpClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';

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

/** Relatórios de manufatura e compras (item 9 do levantamento). */
export default function ReportsPage() {
  const [tab, setTab] = React.useState<'production' | 'purchasing' | 'costs'>('production');
  const [startInput, setStartInput] = React.useState(isoDaysAgo(30));
  const [endInput, setEndInput] = React.useState(isoDaysAgo(0));
  const [period, setPeriod] = React.useState({ start_date: isoDaysAgo(30), end_date: isoDaysAgo(0) });

  const productionQuery = useQuery({
    queryKey: ['reports-production', period],
    queryFn: () => reportsApi.getProductionReport(period),
    enabled: tab === 'production',
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

  const production = productionQuery.data;
  const purchasing = purchasingQuery.data;
  const costVariance = costVarianceQuery.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex gap-2">
          <Button variant={tab === 'production' ? 'default' : 'outline'} onClick={() => setTab('production')}>
            Produção
          </Button>
          <Button variant={tab === 'purchasing' ? 'default' : 'outline'} onClick={() => setTab('purchasing')}>
            Compras
          </Button>
          <Button variant={tab === 'costs' ? 'default' : 'outline'} onClick={() => setTab('costs')}>
            Custos
          </Button>
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
                        <TableCell className="text-right">{toNumber(row.orders_count)}</TableCell>
                        <TableCell className="text-right">{toNumber(row.total_quantity).toLocaleString('pt-BR')}</TableCell>
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
                          <TableCell className="text-right">{toNumber(row.quantity_good).toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-right">{toNumber(row.quantity_scrapped).toLocaleString('pt-BR')}</TableCell>
                          <TableCell className={`text-right font-medium ${rate > 0.05 ? 'text-destructive' : ''}`}>
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
                          <TableCell className="text-right">{toNumber(row.orders_count)}</TableCell>
                          <TableCell className="text-right">{BRL.format(toNumber(row.total_amount))}</TableCell>
                          <TableCell className="text-right">{formatDays(row.avg_lead_time_days)}</TableCell>
                          <TableCell
                            className={`text-right font-medium ${onTime >= 0.9 ? 'text-emerald-600' : onTime < 0.7 ? 'text-destructive' : ''}`}
                          >
                            {formatRate(onTime)}
                          </TableCell>
                          <TableCell className="text-right">
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
                      const tone = rate > 0.05 ? 'text-destructive' : rate <= 0 ? 'text-emerald-600' : '';
                      return (
                        <TableRow key={String(row.product_id)}>
                          <TableCell className="font-medium">{row.code}</TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell className="text-right">{BRL.format(toNumber(row.standard_cost))}</TableCell>
                          <TableCell className="text-right">{BRL.format(toNumber(row.avg_real_cost))}</TableCell>
                          <TableCell className={`text-right font-medium ${tone}`}>{formatRate(rate)}</TableCell>
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
                      const tone = rate === null ? '' : rate > 0.05 ? 'text-destructive' : rate <= 0 ? 'text-emerald-600' : '';
                      return (
                        <TableRow key={`${row.product_id}-${row.supplier_id}-${index}`}>
                          <TableCell className="font-medium">{row.code} — {row.name}</TableCell>
                          <TableCell>{row.company_name}</TableCell>
                          <TableCell className="text-right">
                            {hasCatalog ? BRL.format(toNumber(row.catalog_price)) : '—'}
                          </TableCell>
                          <TableCell className="text-right">{BRL.format(toNumber(row.avg_paid_price))}</TableCell>
                          <TableCell className={`text-right font-medium ${tone}`}>
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
    </div>
  );
}
