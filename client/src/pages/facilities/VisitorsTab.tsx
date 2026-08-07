import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Users } from 'lucide-react';

import * as facilitiesApi from '@/api/facilities';
import * as employeesApi from '@/api/employees';
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
import { VisitStatusBadge, formatDateTime } from './facilitiesShared';

/**
 * Aba "Visitantes" de `/facilities` — UC-61. Check-in/check-out de
 * portaria; dados pessoais (`document`/`phone`) mascarados em listagem
 * (LGPD, aplicação no backend — `GET /visitors`) e alerta de permanência
 * além do horário-limite (`onsite-overdue`).
 */
export function VisitorsTab() {
  const { permissions, hasRole } = useAuth();
  const canWrite = hasRole('admin') || permissions?.facilities === 'operate' || permissions?.facilities === 'approve';
  const [statusFilter, setStatusFilter] = React.useState<facilitiesApi.VisitStatus | ''>('');
  const [checkinOpen, setCheckinOpen] = React.useState(false);

  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['facility-visits', statusFilter],
    queryFn: () => facilitiesApi.listVisits({ status: statusFilter || undefined, limit: 100 }),
  });

  const { data: overdue } = useQuery({
    queryKey: ['facility-visits-onsite-overdue'],
    queryFn: () => facilitiesApi.listOnsiteOverdueVisits(),
  });

  const checkoutMutation = useMutation({
    mutationFn: (id: number) => facilitiesApi.checkoutVisit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-visits'] });
      queryClient.invalidateQueries({ queryKey: ['facility-visits-onsite-overdue'] });
    },
  });

  const overdueCount = overdue?.filter((v) => v.overdue).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {overdueCount > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {overdueCount} visitante(s) sem check-out além do horário-limite. Confirme a saída física ou investigue.
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="visit-status-filter" className="text-sm text-muted-foreground">
            Status
          </Label>
          <SelectNative
            id="visit-status-filter"
            className="max-w-48"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as facilitiesApi.VisitStatus | '')}
          >
            <option value="">Todos</option>
            <option value="scheduled">Agendada</option>
            <option value="onsite">No local</option>
            <option value="completed">Concluída</option>
            <option value="no_show">Não compareceu</option>
            <option value="canceled">Cancelada</option>
          </SelectNative>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCheckinOpen(true)}>
            <Plus className="size-4" />
            Novo check-in
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Visitante</TableHead>
            <TableHead>Anfitrião</TableHead>
            <TableHead>Crachá</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead>Check-out</TableHead>
            <TableHead>Status</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={canWrite ? 7 : 6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={canWrite ? 7 : 6} className="text-center text-destructive">
                Não foi possível carregar as visitas. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((visit) => (
            <TableRow key={visit.id}>
              <TableCell>{visit.visitor?.name ?? `#${visit.visitor_id}`}</TableCell>
              <TableCell>{visit.host?.name ?? `#${visit.host_employee_id}`}</TableCell>
              <TableCell className="font-mono text-xs">{visit.badge_number ?? '-'}</TableCell>
              <TableCell className="text-xs">{formatDateTime(visit.checkin_at)}</TableCell>
              <TableCell className="text-xs">{formatDateTime(visit.checkout_at)}</TableCell>
              <TableCell>
                <VisitStatusBadge status={visit.status} />
              </TableCell>
              {canWrite && (
                <TableCell>
                  {visit.status === 'onsite' && (
                    <Button size="sm" variant="outline" disabled={checkoutMutation.isPending} onClick={() => checkoutMutation.mutate(visit.id)}>
                      Check-out
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={canWrite ? 7 : 6} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Users className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhuma visita registrada.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <CheckinDialog open={checkinOpen} onClose={() => setCheckinOpen(false)} />
    </div>
  );
}

const checkinSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do visitante.').max(150),
  document: z.string().trim().min(1, 'Informe o documento do visitante.').max(30),
  company: z.string().trim().max(150).optional(),
  phone: z.string().trim().max(20).optional(),
  host_employee_id: z.coerce.number().int().positive('Selecione o anfitrião.'),
  badge_number: z.string().trim().max(20).optional(),
  purpose: z.string().trim().max(200).optional(),
});

type CheckinFormData = z.infer<typeof checkinSchema>;

function CheckinDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const { data: employees } = useQuery({
    queryKey: ['employees-active-select'],
    queryFn: () => employeesApi.listEmployees({ limit: 200, status: 'active' }),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CheckinFormData>({ resolver: zodResolver(checkinSchema) });

  const mutation = useMutation({
    mutationFn: (values: CheckinFormData) =>
      facilitiesApi.createVisit({
        visitor: { name: values.name, document: values.document, company: values.company, phone: values.phone },
        host_employee_id: values.host_employee_id,
        badge_number: values.badge_number,
        purpose: values.purpose,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-visits'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível registrar o check-in')),
  });

  React.useEffect(() => {
    if (open) {
      reset({});
      setFormError(null);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Check-in de visitante</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="visitor-name">Nome *</Label>
              <Input id="visitor-name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="visitor-document">Documento *</Label>
              <Input id="visitor-document" {...register('document')} />
              {errors.document && <p className="text-sm text-destructive">{errors.document.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="visitor-company">Empresa</Label>
              <Input id="visitor-company" {...register('company')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="visitor-phone">Telefone</Label>
              <Input id="visitor-phone" {...register('phone')} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="visitor-host">Anfitrião *</Label>
            <SelectNative id="visitor-host" {...register('host_employee_id')}>
              <option value="">Selecione...</option>
              {(employees?.data ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </SelectNative>
            {errors.host_employee_id && <p className="text-sm text-destructive">{errors.host_employee_id.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="visitor-badge">Crachá</Label>
              <Input id="visitor-badge" {...register('badge_number')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="visitor-purpose">Motivo da visita</Label>
              <Input id="visitor-purpose" {...register('purpose')} />
            </div>
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Registrar check-in'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
