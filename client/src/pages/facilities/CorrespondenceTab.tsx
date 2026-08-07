import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Plus } from 'lucide-react';

import * as facilitiesApi from '@/api/facilities';
import * as employeesApi from '@/api/employees';
import * as departmentsApi from '@/api/departments';
import { useAuth } from '@/context/AuthContext';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CORRESPONDENCE_TYPE_LABELS, formatDateTime } from './facilitiesShared';

/** Aba "Correspondência" de `/facilities` (RF-FAC-048) — registro simples de recebimento/entrega, sem workflow de aprovação. */
export function CorrespondenceTab() {
  const { permissions, hasRole } = useAuth();
  const canWrite = hasRole('admin') || permissions?.facilities === 'operate' || permissions?.facilities === 'approve';
  const [deliveredFilter, setDeliveredFilter] = React.useState<'all' | 'yes' | 'no'>('all');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [deliverId, setDeliverId] = React.useState<number | null>(null);
  const [deliveredTo, setDeliveredTo] = React.useState('');
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['facility-correspondence', deliveredFilter],
    queryFn: () =>
      facilitiesApi.listCorrespondence({
        delivered: deliveredFilter === 'all' ? undefined : deliveredFilter === 'yes',
        limit: 100,
      }),
  });

  const deliverMutation = useMutation({
    mutationFn: () => facilitiesApi.deliverCorrespondence(deliverId!, deliveredTo),
    onSuccess: () => {
      setDeliverId(null);
      setDeliveredTo('');
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['facility-correspondence'] });
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível registrar a entrega')),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="correspondence-delivered-filter" className="text-sm text-muted-foreground">
            Entrega
          </Label>
          <SelectNative
            id="correspondence-delivered-filter"
            className="max-w-48"
            value={deliveredFilter}
            onChange={(event) => setDeliveredFilter(event.target.value as typeof deliveredFilter)}
          >
            <option value="all">Todas</option>
            <option value="no">Pendentes</option>
            <option value="yes">Entregues</option>
          </SelectNative>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nova correspondência
          </Button>
        )}
      </div>

      {actionError && <DidacticAlert error={actionError} />}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Remetente</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Destinatário</TableHead>
            <TableHead>Recebida em</TableHead>
            <TableHead>Entrega</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={canWrite ? 6 : 5} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={canWrite ? 6 : 5} className="text-center text-destructive">
                Não foi possível carregar as correspondências. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.sender ?? '-'}</TableCell>
              <TableCell>{CORRESPONDENCE_TYPE_LABELS[item.type] ?? item.type}</TableCell>
              <TableCell>{item.recipient_employee?.name ?? item.recipient_department?.name ?? '-'}</TableCell>
              <TableCell className="text-xs">{formatDateTime(item.received_at)}</TableCell>
              <TableCell>
                {item.delivered_at ? (
                  <Badge variant="success">Entregue a {item.delivered_to}</Badge>
                ) : (
                  <Badge variant="warning">Pendente</Badge>
                )}
              </TableCell>
              {canWrite && (
                <TableCell>
                  {!item.delivered_at && (
                    <Button size="sm" variant="outline" onClick={() => setDeliverId(item.id)}>
                      Registrar entrega
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={canWrite ? 6 : 5} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Mail className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhuma correspondência registrada.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {deliverId != null && (
        <Dialog open onOpenChange={(v) => !v && setDeliverId(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar entrega</DialogTitle>
            </DialogHeader>
            <Input placeholder="Entregue a (nome, obrigatório)" value={deliveredTo} onChange={(e) => setDeliveredTo(e.target.value)} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeliverId(null)}>
                Cancelar
              </Button>
              <Button type="button" disabled={!deliveredTo.trim() || deliverMutation.isPending} onClick={() => deliverMutation.mutate()}>
                Confirmar entrega
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <CreateCorrespondenceDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

const correspondenceSchema = z.object({
  sender: z.string().trim().max(150).optional(),
  type: z.enum(['letter', 'package', 'document', 'other']),
  recipient_employee_id: z.coerce.number().int().positive().optional().or(z.literal('').transform(() => undefined)),
  recipient_department_id: z.coerce.number().int().positive().optional().or(z.literal('').transform(() => undefined)),
  notes: z.string().trim().max(2000).optional(),
});

type CorrespondenceFormData = z.infer<typeof correspondenceSchema>;

function CreateCorrespondenceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const { data: employees } = useQuery({
    queryKey: ['employees-active-select'],
    queryFn: () => employeesApi.listEmployees({ limit: 200, status: 'active' }),
    enabled: open,
  });
  const { data: departments } = useQuery({ queryKey: ['departments-select'], queryFn: () => departmentsApi.listDepartments(), enabled: open });

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CorrespondenceFormData>({ resolver: zodResolver(correspondenceSchema), defaultValues: { type: 'other' } });

  const mutation = useMutation({
    mutationFn: (values: CorrespondenceFormData) => facilitiesApi.createCorrespondence(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-correspondence'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível registrar a correspondência')),
  });

  React.useEffect(() => {
    if (open) {
      reset({ type: 'other' } as never);
      setFormError(null);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova correspondência</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="correspondence-sender">Remetente</Label>
              <Input id="correspondence-sender" {...register('sender')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="correspondence-type">Tipo</Label>
              <SelectNative id="correspondence-type" {...register('type')}>
                {Object.entries(CORRESPONDENCE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="correspondence-employee">Destinatário (funcionário)</Label>
              <SelectNative id="correspondence-employee" {...register('recipient_employee_id')}>
                <option value="">-</option>
                {(employees?.data ?? []).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="correspondence-department">Destinatário (departamento)</Label>
              <SelectNative id="correspondence-department" {...register('recipient_department_id')}>
                <option value="">-</option>
                {(departments ?? []).map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="correspondence-notes">Observações</Label>
            <Input id="correspondence-notes" {...register('notes')} />
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
