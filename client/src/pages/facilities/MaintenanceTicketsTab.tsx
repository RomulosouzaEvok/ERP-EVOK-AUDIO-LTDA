import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Wrench } from 'lucide-react';

import * as facilitiesApi from '@/api/facilities';
import { useAuth } from '@/context/AuthContext';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  FACILITY_SPECIALTY_LABELS,
  MAINTENANCE_TICKET_STATUS_LABELS,
  MaintenanceTicketPriorityBadge,
  MaintenanceTicketStatusBadge,
} from './facilitiesShared';

/**
 * Aba "Manutenção Predial" de `/facilities` — UC-60. Fila de gestão
 * (triagem/execução/encerramento) sobre `maintenance_orders` filtrado por
 * `facility_area_id` (D-1). A abertura de chamado por qualquer funcionário
 * fica em `/chamado-predial` (auto-serviço, fora deste módulo — ver
 * `FacilityTicketPage.tsx`); aqui é só a visão de quem tem o módulo
 * `facilities`/`manutencao`.
 */
export function MaintenanceTicketsTab() {
  const [statusFilter, setStatusFilter] = React.useState<facilitiesApi.MaintenanceTicketStatus | ''>('');
  const [specialtyFilter, setSpecialtyFilter] = React.useState<facilitiesApi.FacilitySpecialty | ''>('');
  const [detailId, setDetailId] = React.useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['facility-maintenance-tickets', statusFilter, specialtyFilter],
    queryFn: () =>
      facilitiesApi.listMaintenanceTickets({
        status: statusFilter || undefined,
        facility_specialty: specialtyFilter || undefined,
        limit: 100,
      }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket-status-filter" className="text-sm text-muted-foreground">
            Status
          </Label>
          <SelectNative
            id="ticket-status-filter"
            className="max-w-48"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as facilitiesApi.MaintenanceTicketStatus | '')}
          >
            <option value="">Todos</option>
            {Object.entries(MAINTENANCE_TICKET_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectNative>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket-specialty-filter" className="text-sm text-muted-foreground">
            Especialidade
          </Label>
          <SelectNative
            id="ticket-specialty-filter"
            className="max-w-48"
            value={specialtyFilter}
            onChange={(event) => setSpecialtyFilter(event.target.value as facilitiesApi.FacilitySpecialty | '')}
          >
            <option value="">Todas</option>
            {Object.entries(FACILITY_SPECIALTY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectNative>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        A abertura de chamados por qualquer funcionário fica em{' '}
        <a href="/chamado-predial" className="text-brand underline underline-offset-2">
          Chamado Predial
        </a>{' '}
        (auto-serviço). Esta tela é a fila de triagem/execução da equipe de Facilities/Manutenção.
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Área</TableHead>
            <TableHead>Especialidade</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-destructive">
                Não foi possível carregar os chamados prediais. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell>{ticket.facility_area?.name ?? (ticket.facility_area_id ? `#${ticket.facility_area_id}` : '-')}</TableCell>
              <TableCell>{ticket.facility_specialty ? FACILITY_SPECIALTY_LABELS[ticket.facility_specialty] : '-'}</TableCell>
              <TableCell className="max-w-64 truncate" title={ticket.description}>
                {ticket.description}
              </TableCell>
              <TableCell>
                <MaintenanceTicketPriorityBadge priority={ticket.priority} />
              </TableCell>
              <TableCell>
                <MaintenanceTicketStatusBadge status={ticket.status} />
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => setDetailId(ticket.id)}>
                  Detalhe
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Wrench className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum chamado predial encontrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <TicketDetailDialog ticketId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function TicketDetailDialog({ ticketId, onClose }: { ticketId: number | null; onClose: () => void }) {
  const { permissions, hasRole } = useAuth();
  const canOperate = hasRole('admin') || permissions?.facilities === 'operate' || permissions?.facilities === 'approve';
  const queryClient = useQueryClient();
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);

  const [priority, setPriority] = React.useState<facilitiesApi.MaintenanceTicketPriority>('normal');
  const [personalSafetyRisk, setPersonalSafetyRisk] = React.useState(false);
  const [servicePerformed, setServicePerformed] = React.useState('');
  const [partsCost, setPartsCost] = React.useState('');
  const [laborCost, setLaborCost] = React.useState('');
  const [frequencyDays, setFrequencyDays] = React.useState('');

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['facility-maintenance-ticket-detail', ticketId],
    queryFn: () => facilitiesApi.getMaintenanceTicket(ticketId!),
    enabled: ticketId != null,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['facility-maintenance-ticket-detail', ticketId] });
    queryClient.invalidateQueries({ queryKey: ['facility-maintenance-tickets'] });
  };

  function useAction<TArgs>(fn: (args: TArgs) => Promise<unknown>, title: string) {
    return useMutation({
      mutationFn: fn,
      onSuccess: () => {
        setActionError(null);
        invalidate();
      },
      onError: (error) => setActionError(translateApiError(error, title)),
    });
  }

  const triageMutation = useAction(
    () => facilitiesApi.triageMaintenanceTicket(ticketId!, { priority, personal_safety_risk: personalSafetyRisk }),
    'Não foi possível triar o chamado',
  );
  const executeMutation = useAction(
    () =>
      facilitiesApi.executeMaintenanceTicket(ticketId!, {
        service_performed: servicePerformed,
        parts_cost: partsCost ? Number(partsCost) : undefined,
        labor_cost: laborCost ? Number(laborCost) : undefined,
      }),
    'Não foi possível registrar a execução do chamado',
  );
  const closeMutation = useAction(() => facilitiesApi.closeMaintenanceTicket(ticketId!), 'Não foi possível encerrar o chamado');
  const preventiveMutation = useAction(
    () => facilitiesApi.generatePreventiveMaintenanceTicket(ticketId!, Number(frequencyDays)),
    'Não foi possível gerar a rotina preventiva',
  );

  React.useEffect(() => {
    if (ticketId != null) {
      setActionError(null);
      setPriority('normal');
      setPersonalSafetyRisk(false);
      setServicePerformed('');
      setPartsCost('');
      setLaborCost('');
      setFrequencyDays('');
    }
  }, [ticketId]);

  return (
    <Dialog open={ticketId != null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Chamado predial #{ticketId}</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {ticket && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <MaintenanceTicketPriorityBadge priority={ticket.priority} />
              <MaintenanceTicketStatusBadge status={ticket.status} />
            </div>
            <p className="text-sm">{ticket.description}</p>

            {actionError && <DidacticAlert error={actionError} />}

            {canOperate && ticket.status === 'open' && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-semibold">Triagem</p>
                <SelectNative value={priority} onChange={(e) => setPriority(e.target.value as facilitiesApi.MaintenanceTicketPriority)}>
                  <option value="low">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                  <option value="emergency">Emergência</option>
                </SelectNative>
                <div className="flex items-center gap-2">
                  <input
                    id="ticket-safety-risk"
                    type="checkbox"
                    checked={personalSafetyRisk}
                    onChange={(e) => setPersonalSafetyRisk(e.target.checked)}
                  />
                  <Label htmlFor="ticket-safety-risk" className="text-sm">
                    Risco à segurança de pessoas (notifica SST)
                  </Label>
                </div>
                <Button size="sm" className="self-start" disabled={triageMutation.isPending} onClick={() => triageMutation.mutate(undefined)}>
                  Confirmar triagem
                </Button>
              </div>
            )}

            {canOperate && (ticket.status === 'scheduled' || ticket.status === 'in_progress' || ticket.status === 'waiting_parts') && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-semibold">Registrar execução</p>
                <Input placeholder="Serviço realizado *" value={servicePerformed} onChange={(e) => setServicePerformed(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" step="0.01" placeholder="Custo de peças" value={partsCost} onChange={(e) => setPartsCost(e.target.value)} />
                  <Input type="number" step="0.01" placeholder="Custo de mão de obra" value={laborCost} onChange={(e) => setLaborCost(e.target.value)} />
                </div>
                <Button
                  size="sm"
                  className="self-start"
                  disabled={!servicePerformed.trim() || executeMutation.isPending}
                  onClick={() => executeMutation.mutate(undefined)}
                >
                  Registrar execução
                </Button>
              </div>
            )}

            {canOperate && ticket.status !== 'completed' && ticket.status !== 'canceled' && (
              <Button size="sm" variant="outline" className="self-start" disabled={closeMutation.isPending} onClick={() => closeMutation.mutate(undefined)}>
                Encerrar chamado
              </Button>
            )}

            {canOperate && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-semibold">Gerar rotina preventiva (chamado recorrente)</p>
                <Input type="number" placeholder="Frequência (dias) *" value={frequencyDays} onChange={(e) => setFrequencyDays(e.target.value)} />
                <Button
                  size="sm"
                  variant="outline"
                  className="self-start"
                  disabled={!frequencyDays || preventiveMutation.isPending}
                  onClick={() => preventiveMutation.mutate(undefined)}
                >
                  Gerar preventiva
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
