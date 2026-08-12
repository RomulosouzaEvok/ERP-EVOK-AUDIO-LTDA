import * as React from 'react';
import { useQuery } from '@tanstack/react-query';

import * as budgetApi from '@/api/budget';
import { DidacticAlert } from '@/components/DidacticAlert';
import { translateApiError } from '@/lib/translateApiError';
import { formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const CURRENT_YEAR = new Date().getFullYear();


function formatPercent(value: number | null) {
  if (value === null) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

/**
 * Aba "Orçado × Realizado" de `/budget` — relatório derivado (sem tabela
 * própria) que cruza `budget_lines` com o valor já pago de contas a pagar
 * agrupado por centro de custo (reaproveita a mesma agregação de
 * `GET /api/finance/cost-centers/report`, apenas o lado "pagar").
 */
export function BudgetReportTab() {
  const [year, setYear] = React.useState<number>(CURRENT_YEAR);
  const [month, setMonth] = React.useState<number | ''>('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['budget-report', year, month],
    queryFn: () => budgetApi.getBudgetReport({ year, month: month || undefined }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="budget-report-year" className="text-sm text-muted-foreground">
            Ano
          </Label>
          <Input
            id="budget-report-year"
            type="number"
            className="w-28"
            value={year}
            onChange={(event) => setYear(Number(event.target.value) || CURRENT_YEAR)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="budget-report-month" className="text-sm text-muted-foreground">
            Mês
          </Label>
          <SelectNative
            id="budget-report-month"
            className="max-w-48"
            value={month}
            onChange={(event) => setMonth(event.target.value ? Number(event.target.value) : '')}
          >
            <option value="">Ano inteiro</option>
            {MONTH_LABELS.map((label, index) => (
              <option key={label} value={index + 1}>{label}</option>
            ))}
          </SelectNative>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando relatório...</p>}
      {isError && <DidacticAlert error={translateApiError(error, 'Não foi possível carregar o relatório orçado × realizado')} />}

      {data && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Orçado" value={data.totals.planned_amount} />
            <SummaryCard label="Realizado (pago)" value={data.totals.realized_amount} />
            <SummaryCard
              label="Variação"
              value={data.totals.variance}
              tone={data.totals.variance > 0 ? 'negative' : data.totals.variance < 0 ? 'positive' : undefined}
            />
            <div className="flex flex-col gap-1 rounded-xl border p-4">
              <span className="text-xs text-muted-foreground">Variação %</span>
              <span className={`text-xl font-semibold ${data.totals.variance_percent && data.totals.variance_percent > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                {formatPercent(data.totals.variance_percent)}
              </span>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Centro de custo</TableHead>
                <TableHead>Orçado</TableHead>
                <TableHead>Realizado (pago)</TableHead>
                <TableHead>Variação</TableHead>
                <TableHead>Variação %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.groups.map((group) => (
                <TableRow key={group.cost_center_id ?? 'null'}>
                  <TableCell>
                    {group.cost_center_id ? (
                      `${group.code} — ${group.name}`
                    ) : (
                      <Badge variant="secondary">{group.name ?? 'Sem centro de custo'}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(group.planned_amount)}</TableCell>
                  <TableCell>{formatCurrency(group.realized_amount)}</TableCell>
                  <TableCell className={group.variance > 0 ? 'text-destructive' : group.variance < 0 ? 'text-emerald-600' : ''}>
                    {formatCurrency(group.variance)}
                  </TableCell>
                  <TableCell className={group.variance_percent && group.variance_percent > 0 ? 'text-destructive' : 'text-emerald-600'}>
                    {formatPercent(group.variance_percent)}
                  </TableCell>
                </TableRow>
              ))}
              {data.groups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum dado orçado ou realizado para este período.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: 'positive' | 'negative' }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border p-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xl font-semibold ${tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-destructive' : ''}`}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}
