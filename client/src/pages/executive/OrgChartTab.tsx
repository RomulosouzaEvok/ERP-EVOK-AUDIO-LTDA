import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Crown, UserCog, UserX } from 'lucide-react';

import * as directorateApi from '@/api/directorate';
import * as employeesApi from '@/api/employees';
import { useAuth } from '@/context/AuthContext';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DidacticAlert } from '@/components/DidacticAlert';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Aba "Organograma" de `/directorate` — árvore CEO → diretorias →
 * departamentos (`GET /api/directorate/org-chart`, liberado a qualquer
 * autenticado). O provimento/vago de cargo (`PATCH .../manager`) exige
 * `diretoria:approve` — só quem tem esse nível vê o botão de ação.
 */
export function OrgChartTab() {
  const { hasRole, permissions } = useAuth();
  const canWrite = hasRole('admin') || permissions?.diretoria === 'approve';

  const [managerDialogFor, setManagerDialogFor] = React.useState<directorateApi.OrgChartDirectorate | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['directorate-org-chart'],
    queryFn: directorateApi.getOrgChart,
  });

  return (
    <div className="flex flex-col gap-4">
      {isError && (
        <DidacticAlert
          error={{
            title: 'Não foi possível carregar o organograma',
            reasons: ['Falha ao consultar o servidor. Tente novamente.'],
          }}
        />
      )}

      {/* CEO — topo fixo da hierarquia, sempre único. */}
      <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Crown className="size-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">CEO</p>
          <p className="text-xs text-muted-foreground">Topo da hierarquia executiva — as 4 diretorias reportam aqui.</p>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full" />
          ))}
        </div>
      )}

      {!isLoading && !isError && (
        <div className="grid gap-4 md:grid-cols-2">
          {data?.directorates.map((directorate) => (
            <Card key={directorate.id} className={directorate.vacant ? 'border-amber-500/40' : undefined}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{directorate.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{directorate.position_title}</p>
                  </div>
                  <Badge variant="outline">{directorate.code}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  {directorate.vacant ? (
                    <Badge variant="warning">
                      <UserX className="mr-1 size-3" /> CARGO VAGO
                    </Badge>
                  ) : (
                    <div className="text-sm">
                      <p className="font-medium">{directorate.manager?.name}</p>
                      <p className="text-xs text-muted-foreground">{directorate.manager?.position ?? '—'}</p>
                    </div>
                  )}
                  {canWrite && (
                    <Button size="sm" variant="outline" onClick={() => setManagerDialogFor(directorate)}>
                      <UserCog className="size-4" /> {directorate.vacant ? 'Prover cargo' : 'Trocar/Vagar'}
                    </Button>
                  )}
                </div>

                <div className="border-t pt-2">
                  <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Building2 className="size-3.5" /> Departamentos
                  </p>
                  {directorate.departments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum departamento vinculado.</p>
                  ) : (
                    <ul className="flex flex-wrap gap-1.5">
                      {directorate.departments.map((department) => (
                        <li key={department.id}>
                          <Badge variant="secondary">{department.sigla || department.name}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AssignManagerDialog directorate={managerDialogFor} onClose={() => setManagerDialogFor(null)} />
    </div>
  );
}

function AssignManagerDialog({
  directorate,
  onClose,
}: {
  directorate: directorateApi.OrgChartDirectorate | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [managerId, setManagerId] = React.useState<number | ''>('');
  const [error, setError] = React.useState<DidacticError | null>(null);

  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees-active-for-directorate'],
    queryFn: () => employeesApi.listEmployees({ status: 'active', limit: 200 }),
    enabled: Boolean(directorate),
  });
  const activeEmployees = employeesData?.data ?? [];

  React.useEffect(() => {
    if (directorate) {
      setManagerId(directorate.manager?.id ?? '');
      setError(null);
    }
  }, [directorate]);

  const mutation = useMutation({
    mutationFn: (nextManagerId: number | null) => {
      if (!directorate) throw new Error('Diretoria não selecionada');
      return directorateApi.assignDirectorateManager(directorate.id, nextManagerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directorate-org-chart'] });
      onClose();
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível atualizar o cargo de diretor')),
  });

  return (
    <Dialog open={Boolean(directorate)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{directorate?.name}</DialogTitle>
          <DialogDescription>
            Cargo: {directorate?.position_title}. Selecione um funcionário ativo, ou deixe em branco para vagar o cargo.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="directorate-manager">Diretor(a)</Label>
            <SelectNative
              id="directorate-manager"
              value={managerId}
              disabled={employeesLoading}
              onChange={(event) => setManagerId(event.target.value ? Number(event.target.value) : '')}
            >
              <option value="">— Cargo vago —</option>
              {activeEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} {employee.position ? `(${employee.position})` : ''}
                </option>
              ))}
            </SelectNative>
          </div>
        </div>
        {error && <DidacticAlert error={error} />}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => {
              setError(null);
              mutation.mutate(managerId === '' ? null : managerId);
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Salvando...' : managerId === '' ? 'Vagar cargo' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
