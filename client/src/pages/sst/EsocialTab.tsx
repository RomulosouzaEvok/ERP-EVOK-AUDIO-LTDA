import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Send } from 'lucide-react';

import * as sstApi from '@/api/sst';
import { useAuth } from '@/context/AuthContext';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { EsocialStatusBadge, formatDateTime } from './sstShared';

/**
 * Fila somente-leitura de eventos eSocial SST (S-2210/S-2220/S-2240). Eventos
 * nascem como efeito colateral de outras ações (CAT, ASO, vínculo GES) — a
 * única escrita direta é o reenvio de eventos `rejeitado` (nível `approve`).
 */
export function EsocialTab() {
  const { user, permissions } = useAuth();
  const canApprove = user?.role === 'admin' || permissions?.sst === 'approve';
  const [tipoFilter, setTipoFilter] = React.useState<sstApi.EsocialEventTipo | ''>('');
  const [statusFilter, setStatusFilter] = React.useState<sstApi.EsocialEventStatus | ''>('');
  const [resendError, setResendError] = React.useState<DidacticError | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sst-esocial-events', tipoFilter, statusFilter],
    queryFn: () => sstApi.listEsocialEvents({ tipo: tipoFilter || undefined, status: statusFilter || undefined }),
  });

  const resendMutation = useMutation({
    mutationFn: (id: number) => sstApi.resendEsocialEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sst-esocial-events'] });
      setResendError(null);
    },
    onError: (error) => setResendError(translateApiError(error, 'Não foi possível reenviar o evento eSocial')),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="esocial-tipo-filter" className="text-sm text-muted-foreground">
            Tipo
          </Label>
          <SelectNative
            id="esocial-tipo-filter"
            className="max-w-40"
            value={tipoFilter}
            onChange={(event) => setTipoFilter(event.target.value as sstApi.EsocialEventTipo | '')}
          >
            <option value="">Todos</option>
            <option value="S-2210">S-2210 (CAT)</option>
            <option value="S-2220">S-2220 (ASO)</option>
            <option value="S-2240">S-2240 (Exposição)</option>
          </SelectNative>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="esocial-status-filter" className="text-sm text-muted-foreground">
            Status
          </Label>
          <SelectNative
            id="esocial-status-filter"
            className="max-w-40"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as sstApi.EsocialEventStatus | '')}
          >
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="enviado">Enviado</option>
            <option value="aceito">Aceito</option>
            <option value="rejeitado">Rejeitado</option>
          </SelectNative>
        </div>
      </div>

      {resendError && <DidacticAlert error={resendError} />}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Prazo legal</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Recibo</TableHead>
            <TableHead>Tentativas</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={7} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-destructive">
                Não foi possível carregar a fila de eventos eSocial.
              </TableCell>
            </TableRow>
          )}
          {data?.map((event) => (
            <TableRow
              key={event.id}
              className={cn(
                'border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5',
                event.status === 'rejeitado' && 'border-l-destructive/40',
              )}
            >
              <TableCell className="font-mono text-xs">{event.tipo}</TableCell>
              <TableCell>
                {event.entidade_origem.tipo} #{event.entidade_origem.id}
              </TableCell>
              <TableCell className="font-medium">{formatDateTime(event.prazo_legal)}</TableCell>
              <TableCell>
                <EsocialStatusBadge status={event.status} />
              </TableCell>
              <TableCell className="font-mono text-xs">{event.recibo ?? '-'}</TableCell>
              <TableCell className="text-right tabular-nums">{event.tentativas}</TableCell>
              <TableCell>
                {event.status === 'rejeitado' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canApprove || resendMutation.isPending}
                    title={!canApprove ? 'Requer nível de aprovação (approve) no módulo SST' : undefined}
                    onClick={() => resendMutation.mutate(event.id)}
                  >
                    <RefreshCw className="size-3.5" />
                    Reenviar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Send className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum evento na fila eSocial.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
