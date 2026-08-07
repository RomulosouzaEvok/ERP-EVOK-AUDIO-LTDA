import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';

import * as marketingApi from '@/api/marketing';
import { DidacticAlert } from '@/components/DidacticAlert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LEAD_SOURCE_LABELS, formatCurrency, formatPercent } from './marketingShared';

/** Aba "Relatórios" de `/marketing` — KPIs de funil (RF-MKT-026) e ROI/custo por lead por evento (RF-MKT-027), UC-66. */
export function ReportsTab() {
  const [campaignId, setCampaignId] = React.useState('');
  const [leadSource, setLeadSource] = React.useState<marketingApi.LeadSource | ''>('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  const { data: campaigns } = useQuery({
    queryKey: ['marketing-campaigns-select-reports'],
    queryFn: () => marketingApi.listCampaigns({ limit: 100 }),
  });

  const { data: funnel, isLoading: funnelLoading, isError: funnelError } = useQuery({
    queryKey: ['marketing-report-funnel', campaignId, leadSource, dateFrom, dateTo],
    queryFn: () =>
      marketingApi.getFunnelReport({
        campaign_id: campaignId ? Number(campaignId) : undefined,
        lead_source: leadSource || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }),
  });

  const { data: eventsReport, isLoading: eventsLoading, isError: eventsError } = useQuery({
    queryKey: ['marketing-report-events'],
    queryFn: () => marketingApi.getEventsReport(),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm text-muted-foreground">Campanha</Label>
          <SelectNative className="max-w-56" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
            <option value="">Todas</option>
            {(campaigns?.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </SelectNative>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm text-muted-foreground">Origem</Label>
          <SelectNative className="max-w-48" value={leadSource} onChange={(e) => setLeadSource(e.target.value as marketingApi.LeadSource | '')}>
            <option value="">Todas</option>
            {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SelectNative>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm text-muted-foreground">De</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm text-muted-foreground">Até</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Funil de Marketing</h2>
        {funnelLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {funnelError && <DidacticAlert error={{ title: 'Não foi possível carregar o relatório de funil', reasons: ['Tente novamente em alguns instantes.'] }} />}
        {funnel && !funnel.has_data && (
          <p className="text-sm text-muted-foreground">Nenhum lead/campanha encontrado para o período/filtro selecionado.</p>
        )}
        {funnel && funnel.has_data && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Custo por Lead (CPL)" value={formatCurrency(funnel.cost_per_lead)} />
            <KpiCard label="Taxa de qualificação" value={formatPercent(funnel.qualification_rate)} />
            <KpiCard label="Taxa de conversão" value={formatPercent(funnel.conversion_rate)} />
            <KpiCard label="Receita atribuída" value={formatCurrency(funnel.attributed_revenue)} />
            <KpiCard label="ROI" value={funnel.roi ?? '-'} />
            <KpiCard label="SLA de handoff (cumprimento)" value={formatPercent(funnel.handoff_sla_compliance_rate)} />
            <KpiCard label="Ciclo do lead (mediana, dias)" value={funnel.median_lead_cycle_days ?? '-'} />
            <KpiCard
              label="Orçado × Realizado"
              value={
                funnel.budget_vs_actual
                  ? `${formatCurrency(funnel.budget_vs_actual.requested)} / ${formatCurrency(funnel.budget_vs_actual.approved)} / ${formatCurrency(funnel.budget_vs_actual.actual)}`
                  : '-'
              }
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">ROI e Custo por Lead — Eventos/Feiras</h2>
        {eventsLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {eventsError && <DidacticAlert error={{ title: 'Não foi possível carregar o relatório de eventos', reasons: ['Tente novamente em alguns instantes.'] }} />}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead>Custo real</TableHead>
              <TableHead>Leads</TableHead>
              <TableHead>Conversões</TableHead>
              <TableHead>Receita atribuída</TableHead>
              <TableHead>Custo por lead</TableHead>
              <TableHead>ROI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(eventsReport ?? []).map((row) => (
              <TableRow key={row.event_id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>{formatCurrency(row.actual_cost)}</TableCell>
                <TableCell>{row.leads_count}</TableCell>
                <TableCell>{row.conversions}</TableCell>
                <TableCell>{formatCurrency(row.attributed_revenue)}</TableCell>
                <TableCell>{formatCurrency(row.cost_per_lead)}</TableCell>
                <TableCell>{row.roi ?? '-'}</TableCell>
              </TableRow>
            ))}
            {!eventsLoading && !eventsError && (eventsReport ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <BarChart3 className="size-8 text-muted-foreground/50" />
                    <p className="text-sm">Nenhum evento com dados de ROI para exibir.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </div>
  );
}
