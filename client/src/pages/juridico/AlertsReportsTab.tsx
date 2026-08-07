import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';

import * as jurApi from '@/api/juridico';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ALERT_ORIGIN_LABELS, AlertStatusBadge, formatCurrency, formatDate } from './juridicoShared';

/**
 * Aba Alertas & Relatório Financeiro — `/juridico`, §7/§8.2 do contrato de
 * API. Alertas nunca podem ser "desativados" aqui — só `acknowledge`
 * (marcar como lido/tratado); não existe caminho de escrita para desligar
 * um alerta de prazo fatal (RNF-JUR-04). O relatório financeiro é a versão
 * sanitizada consumida também pelo perfil `financeiro` (nunca expõe dado de
 * processo/contencioso/LGPD/PI, só provisão vigente e custos).
 */
export function AlertsReportsTab({ hasFullAccess }: { hasFullAccess: boolean }) {
  return (
    <div className="flex flex-col gap-8">
      {hasFullAccess && <AlertsSection />}
      <FinancialReportSection />
    </div>
  );
}

function AlertsSection() {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<DidacticError | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['jur-alerts'],
    queryFn: () => jurApi.listAlerts({ status: 'pending', limit: 50 }),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: number) => jurApi.acknowledgeAlert(id),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['jur-alerts'] });
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível reconhecer o alerta')),
  });

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Alertas pendentes</h2>
      {error && <DidacticAlert error={error} />}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Origem</TableHead>
            <TableHead>Subtipo</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={5} />}
          {data?.data.map((alert) => (
            <TableRow key={alert.id}>
              <TableCell>{ALERT_ORIGIN_LABELS[alert.origin_type] ?? alert.origin_type}</TableCell>
              <TableCell>{alert.alert_subtype}</TableCell>
              <TableCell>{formatDate(alert.due_date)}</TableCell>
              <TableCell>
                <AlertStatusBadge status={alert.status} />
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" disabled={acknowledgeMutation.isPending} onClick={() => acknowledgeMutation.mutate(alert.id)}>
                  Reconhecer
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Bell className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum alerta pendente.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function FinancialReportSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['jur-financial-report'],
    queryFn: () => jurApi.getFinancialReport(),
  });

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Relatório financeiro (provisões e custos — versão sanitizada)</h2>
      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {isError && <p className="text-sm text-destructive">Não foi possível carregar o relatório financeiro.</p>}
      {data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total provisionado</p>
              <p className="text-lg font-semibold">{formatCurrency(data.totals.provisioned_total)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Exposição possível</p>
              <p className="text-lg font-semibold">{formatCurrency(data.totals.possible_exposure_total)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Custos pendentes</p>
              <p className="text-lg font-semibold">{formatCurrency(data.totals.costs_total_pending)}</p>
            </div>
          </div>

          <p className="text-sm font-semibold">Provisões vigentes</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referência</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Classe de risco</TableHead>
                <TableHead>Provisionado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.provisions.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.legal_case_reference}</TableCell>
                  <TableCell>{row.case_type}</TableCell>
                  <TableCell>{row.risk_class}</TableCell>
                  <TableCell>{formatCurrency(row.provisioned_amount)}</TableCell>
                </TableRow>
              ))}
              {data.provisions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    Nenhuma provisão vigente.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <p className="text-sm font-semibold">Custos lançados</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referência</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.costs.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.legal_case_reference ?? '-'}</TableCell>
                  <TableCell>{row.entry_type === 'judicial_deposit' ? 'Depósito judicial' : 'Despesa'}</TableCell>
                  <TableCell>{formatCurrency(row.amount)}</TableCell>
                  <TableCell>{formatDate(row.due_date)}</TableCell>
                  <TableCell>{row.status}</TableCell>
                </TableRow>
              ))}
              {data.costs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    Nenhum custo lançado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
