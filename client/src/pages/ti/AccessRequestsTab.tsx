import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, Plus, ShieldAlert } from 'lucide-react';

import * as tiApi from '@/api/ti';
import * as employeesApi from '@/api/employees';
import * as departmentsApi from '@/api/departments';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/Textarea';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ACCESS_REQUEST_TYPE_LABELS,
  AccessRequestStatusBadge,
  formatDateTime,
  refName,
} from './tiShared';

/** Solicitações de Acesso — Onboarding/Change/Offboarding (UC-51) — `/ti`, aba "Acessos". */
export function AccessRequestsTab() {
  const [statusFilter, setStatusFilter] = React.useState<tiApi.AccessRequestStatus | ''>('');
  const [newRequestOpen, setNewRequestOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ti-access-requests', statusFilter],
    queryFn: () => tiApi.listAccessRequests({ status: statusFilter || undefined, limit: 50 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="access-status-filter" className="text-sm text-muted-foreground">
            Status
          </Label>
          <SelectNative
            id="access-status-filter"
            className="max-w-48"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as tiApi.AccessRequestStatus | '')}
          >
            <option value="">Todos</option>
            <option value="pending">Pendente</option>
            <option value="approved">Aprovada</option>
            <option value="done">Concluída</option>
            <option value="rejected">Rejeitada</option>
            <option value="canceled">Cancelada</option>
          </SelectNative>
        </div>
        <Button type="button" onClick={() => setNewRequestOpen(true)}>
          <Plus className="size-4" />
          Nova solicitação
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nº</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Funcionário</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead>Aberta em</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={7} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-destructive">
                Não foi possível carregar as solicitações de acesso.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((request) => (
            <TableRow key={request.id} className="border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5">
              <TableCell className="font-mono text-xs">{request.request_number}</TableCell>
              <TableCell>{ACCESS_REQUEST_TYPE_LABELS[request.type]}</TableCell>
              <TableCell>{refName(request.employee)}</TableCell>
              <TableCell>{refName(request.department)}</TableCell>
              <TableCell>{formatDateTime(request.createdAt)}</TableCell>
              <TableCell>
                <AccessRequestStatusBadge status={request.status} />
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => setDetailId(request.id)}>
                  Gerenciar
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <KeyRound className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhuma solicitação de acesso encontrada.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <NewAccessRequestDialog open={newRequestOpen} onClose={() => setNewRequestOpen(false)} />
      <AccessRequestDetailDialog id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

const newRequestSchema = z
  .object({
    type: z.enum(['grant', 'change', 'revoke']),
    employee_id: z.coerce.number().int().positive('Selecione o funcionário.'),
    department_id: z.union([z.coerce.number().int().positive(), z.literal('')]).optional(),
    requested_profile_id: z.union([z.coerce.number().int().positive(), z.literal('')]).optional(),
    justification: z.string().min(1, 'Informe a justificativa.'),
    corporate_email: z.string().optional(),
  })
  .refine((value) => value.type === 'revoke' || Boolean(value.requested_profile_id), {
    message: 'Informe o perfil de acesso sugerido (ID).',
    path: ['requested_profile_id'],
  });

type NewRequestFormData = z.infer<typeof newRequestSchema>;

function NewAccessRequestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const { data: employees } = useQuery({
    queryKey: ['employees-active-select'],
    queryFn: () => employeesApi.listEmployees({ limit: 200, status: 'active' }),
    enabled: open,
  });
  const { data: departments } = useQuery({
    queryKey: ['departments-select'],
    queryFn: departmentsApi.listDepartments,
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<NewRequestFormData>({ resolver: zodResolver(newRequestSchema), defaultValues: { type: 'grant' } });

  const type = watch('type');

  const mutation = useMutation({
    mutationFn: (values: NewRequestFormData) =>
      tiApi.createAccessRequest({
        type: values.type,
        employee_id: values.employee_id,
        department_id: values.department_id ? Number(values.department_id) : undefined,
        requested_profile_id: values.requested_profile_id ? Number(values.requested_profile_id) : undefined,
        justification: values.justification,
        corporate_email: values.corporate_email || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ti-access-requests'] });
      reset({ type: 'grant' } as never);
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível registrar a solicitação de acesso')),
  });

  React.useEffect(() => {
    if (open) {
      reset({ type: 'grant' } as never);
      setFormError(null);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova solicitação de acesso</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="access-type">Tipo</Label>
            <SelectNative id="access-type" {...register('type')}>
              <option value="grant">Admissão (grant)</option>
              <option value="change">Mudança de função (change)</option>
              <option value="revoke">Desligamento (revoke)</option>
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="access-employee">Funcionário</Label>
            <SelectNative id="access-employee" {...register('employee_id')}>
              <option value="">Selecione...</option>
              {(employees?.data ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </SelectNative>
            {errors.employee_id && <p className="text-sm text-destructive">{errors.employee_id.message}</p>}
          </div>
          {type !== 'revoke' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="access-department">Departamento</Label>
                  <SelectNative id="access-department" {...register('department_id')}>
                    <option value="">Selecione...</option>
                    {(departments ?? []).map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </SelectNative>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="access-profile">Perfil de acesso sugerido (ID)</Label>
                  <Input id="access-profile" type="number" {...register('requested_profile_id')} />
                  {errors.requested_profile_id && <p className="text-sm text-destructive">{errors.requested_profile_id.message}</p>}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="access-email">E-mail corporativo</Label>
                <Input id="access-email" type="email" placeholder="nome@evokaudio.com" {...register('corporate_email')} />
              </div>
            </>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="access-justification">Justificativa</Label>
            <Textarea id="access-justification" rows={2} {...register('justification')} />
            {errors.justification && <p className="text-sm text-destructive">{errors.justification.message}</p>}
          </div>
          {formError && <DidacticAlert error={formError} />}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Enviando...' : 'Registrar solicitação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const CHECKLIST_LABELS: Record<string, string> = {
  user_deactivated: 'Usuário desativado',
  email_revoked: 'E-mail revogado',
  equipment_collected: 'Equipamentos recolhidos',
  files_transferred: 'Arquivos transferidos',
};

function AccessRequestDetailDialog({ id, onClose }: { id: number | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState('');

  const { data: request, isLoading } = useQuery({
    queryKey: ['ti-access-request-detail', id],
    queryFn: () => tiApi.getAccessRequest(id!),
    enabled: id != null,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ti-access-request-detail', id] });
    queryClient.invalidateQueries({ queryKey: ['ti-access-requests'] });
  };

  const approveMutation = useMutation({
    mutationFn: () => tiApi.approveAccessRequest(id!),
    onSuccess: () => {
      setActionError(null);
      invalidate();
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível aprovar a solicitação')),
  });

  const rejectMutation = useMutation({
    mutationFn: () => tiApi.rejectAccessRequest(id!, rejectionReason),
    onSuccess: () => {
      setActionError(null);
      invalidate();
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível rejeitar a solicitação')),
  });

  const executeMutation = useMutation({
    mutationFn: () => tiApi.executeAccessRequest(id!),
    onSuccess: () => {
      setActionError(null);
      invalidate();
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível executar a solicitação')),
  });

  const cancelMutation = useMutation({
    mutationFn: () => tiApi.cancelAccessRequest(id!),
    onSuccess: () => {
      setActionError(null);
      invalidate();
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível cancelar a solicitação')),
  });

  const checklistMutation = useMutation({
    mutationFn: (input: { field: string; value: boolean }) => tiApi.updateAccessRequestChecklist(id!, input.field, input.value),
    onSuccess: () => {
      setActionError(null);
      invalidate();
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível atualizar o checklist')),
  });

  React.useEffect(() => {
    if (id != null) {
      setActionError(null);
      setRejectionReason('');
    }
  }, [id]);

  const pendingTerms = React.useMemo(() => {
    if (!actionError) return null;
    const details = (actionError as unknown as { reasons: string[] }).reasons;
    return details;
  }, [actionError]);

  return (
    <Dialog open={id != null} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{request ? `${request.request_number} — ${ACCESS_REQUEST_TYPE_LABELS[request.type]}` : 'Solicitação'}</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {request && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <AccessRequestStatusBadge status={request.status} />
              <span className="text-xs text-muted-foreground">Funcionário: {refName(request.employee)}</span>
              <span className="text-xs text-muted-foreground">Departamento: {refName(request.department)}</span>
            </div>
            <p className="text-sm">{request.justification}</p>
            {request.corporate_email && <p className="text-xs text-muted-foreground">E-mail corporativo: {request.corporate_email}</p>}
            {request.rejection_reason && (
              <p className="text-xs text-destructive">Motivo da rejeição: {request.rejection_reason}</p>
            )}

            {request.type === 'revoke' && (
              <div className="flex flex-col gap-1.5 rounded-md border p-3">
                <p className="text-sm font-semibold">Checklist de desligamento</p>
                {Object.entries(CHECKLIST_LABELS).map(([field, label]) => (
                  <label key={field} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(request.checklist?.[field])}
                      disabled={checklistMutation.isPending}
                      onChange={(event) => checklistMutation.mutate({ field, value: event.target.checked })}
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}

            {actionError && (
              <div className="flex flex-col gap-2">
                <DidacticAlert error={actionError} />
                {pendingTerms && pendingTerms.length > 0 && (
                  <div
                    role="alert"
                    className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150 flex items-start gap-2 rounded-md border-2 border-destructive/40 bg-destructive/[0.06] p-3"
                  >
                    <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-semibold text-destructive">
                        Desligamento bloqueado — termo(s) de responsabilidade ativo(s)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Este funcionário ainda possui equipamento sob termo ativo. Registre a devolução ou marque
                        como perdido na aba <strong>Termos de Responsabilidade</strong> antes de executar o
                        desligamento.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {request.status === 'pending' && request.type !== 'revoke' && (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate()}>
                    Aprovar
                  </Button>
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      placeholder="Motivo da rejeição"
                      value={rejectionReason}
                      onChange={(event) => setRejectionReason(event.target.value)}
                      className="h-9"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={!rejectionReason.trim() || rejectMutation.isPending}
                      onClick={() => rejectMutation.mutate()}
                    >
                      Rejeitar
                    </Button>
                  </div>
                </div>
              )}

              {(request.status === 'pending' || request.status === 'approved') && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={request.type === 'revoke' ? 'destructive' : 'default'}
                    disabled={executeMutation.isPending}
                    onClick={() => executeMutation.mutate()}
                  >
                    {request.type === 'revoke' ? 'Executar desligamento' : 'Executar'}
                  </Button>
                  <Button type="button" size="sm" variant="outline" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>
                    Cancelar solicitação
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
