import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IdCard, Plus } from 'lucide-react';

import * as facilitiesApi from '@/api/facilities';
import * as employeesApi from '@/api/employees';
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
import { DeadlineBadge } from './facilitiesShared';

/** Painel "Condutores" (dentro da aba Frota) — cadastro/autorização/suspensão de condutores (CNH). */
export function DriversPanel() {
  const { permissions, hasRole } = useAuth();
  const canWrite = hasRole('admin') || permissions?.facilities === 'operate' || permissions?.facilities === 'approve';
  const canApprove = hasRole('admin') || permissions?.facilities === 'approve';
  const [authorizedFilter, setAuthorizedFilter] = React.useState<'all' | 'yes' | 'no'>('all');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [suspendId, setSuspendId] = React.useState<number | null>(null);
  const [suspendReason, setSuspendReason] = React.useState('');
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['facility-drivers', authorizedFilter],
    queryFn: () =>
      facilitiesApi.listDrivers({
        authorized: authorizedFilter === 'all' ? undefined : authorizedFilter === 'yes',
        limit: 100,
      }),
  });

  const authorizeMutation = useMutation({
    mutationFn: (id: number) => facilitiesApi.authorizeDriver(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['facility-drivers'] }),
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível autorizar o condutor')),
  });

  const suspendMutation = useMutation({
    mutationFn: () => facilitiesApi.suspendDriver(suspendId!, suspendReason),
    onSuccess: () => {
      setSuspendId(null);
      setSuspendReason('');
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['facility-drivers'] });
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível suspender o condutor')),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="driver-authorized-filter" className="text-sm text-muted-foreground">
            Autorização
          </Label>
          <SelectNative
            id="driver-authorized-filter"
            className="max-w-48"
            value={authorizedFilter}
            onChange={(event) => setAuthorizedFilter(event.target.value as typeof authorizedFilter)}
          >
            <option value="all">Todos</option>
            <option value="yes">Autorizados</option>
            <option value="no">Não autorizados</option>
          </SelectNative>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Novo condutor
          </Button>
        )}
      </div>

      {actionError && <DidacticAlert error={actionError} />}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Funcionário</TableHead>
            <TableHead>CNH</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Autorizado</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={canWrite ? 6 : 5} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={canWrite ? 6 : 5} className="text-center text-destructive">
                Não foi possível carregar os condutores. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((driver) => (
            <TableRow key={driver.id}>
              <TableCell>{driver.employee?.name ?? `#${driver.employee_id}`}</TableCell>
              <TableCell className="font-mono text-xs">{driver.cnh_number}</TableCell>
              <TableCell>{driver.cnh_category}</TableCell>
              <TableCell>
                <DeadlineBadge dueDate={driver.cnh_valid_until} />
              </TableCell>
              <TableCell>
                {driver.authorized ? <Badge variant="success">Sim</Badge> : <Badge variant="secondary">Não</Badge>}
              </TableCell>
              {canWrite && (
                <TableCell className="flex flex-wrap gap-2">
                  {!driver.authorized && (
                    <Button size="sm" variant="outline" disabled={authorizeMutation.isPending} onClick={() => authorizeMutation.mutate(driver.id)}>
                      Autorizar
                    </Button>
                  )}
                  {driver.authorized && canApprove && (
                    <Button size="sm" variant="outline" onClick={() => setSuspendId(driver.id)}>
                      Suspender
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
                  <IdCard className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum condutor cadastrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {suspendId != null && (
        <Dialog open onOpenChange={(v) => !v && setSuspendId(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Suspender autorização de condução</DialogTitle>
            </DialogHeader>
            <Input placeholder="Motivo da suspensão (obrigatório)" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSuspendId(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!suspendReason.trim() || suspendMutation.isPending}
                onClick={() => suspendMutation.mutate()}
              >
                Confirmar suspensão
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <CreateDriverDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

const driverSchema = z.object({
  employee_id: z.coerce.number().int().positive('Selecione o funcionário.'),
  cnh_number: z.string().trim().min(1, 'Informe o número da CNH.').max(20),
  cnh_category: z.string().trim().min(1, 'Informe a categoria.').max(5),
  cnh_valid_until: z.string().trim().min(1, 'Informe o vencimento.'),
  cnh_file_path: z.string().trim().max(500).optional(),
});

type DriverFormData = z.infer<typeof driverSchema>;

function CreateDriverDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
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
  } = useForm<DriverFormData>({ resolver: zodResolver(driverSchema) });

  const mutation = useMutation({
    mutationFn: (values: DriverFormData) => facilitiesApi.createDriver(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-drivers'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível cadastrar o condutor')),
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
          <DialogTitle>Novo condutor</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="driver-employee">Funcionário *</Label>
            <SelectNative id="driver-employee" {...register('employee_id')}>
              <option value="">Selecione...</option>
              {(employees?.data ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </SelectNative>
            {errors.employee_id && <p className="text-sm text-destructive">{errors.employee_id.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="driver-cnh-number">Número da CNH *</Label>
              <Input id="driver-cnh-number" {...register('cnh_number')} />
              {errors.cnh_number && <p className="text-sm text-destructive">{errors.cnh_number.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="driver-cnh-category">Categoria *</Label>
              <Input id="driver-cnh-category" placeholder="Ex.: AB" {...register('cnh_category')} />
              {errors.cnh_category && <p className="text-sm text-destructive">{errors.cnh_category.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="driver-cnh-valid-until">Vencimento da CNH *</Label>
            <Input id="driver-cnh-valid-until" type="date" {...register('cnh_valid_until')} />
            {errors.cnh_valid_until && <p className="text-sm text-destructive">{errors.cnh_valid_until.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="driver-cnh-file">Anexo (URL/caminho)</Label>
            <Input id="driver-cnh-file" {...register('cnh_file_path')} />
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Criar condutor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
