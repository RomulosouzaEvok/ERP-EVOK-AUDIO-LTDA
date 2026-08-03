import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Play, CheckCircle2, Plus, Search } from 'lucide-react';

import * as productionApi from '@/api/production';
import * as trackingApi from '@/api/productionTracking';
import * as employeesApi from '@/api/employees';
import { extractApiErrorMessage } from '@/api/httpClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const TRACKING_STATUS_LABEL: Record<trackingApi.ProductionTrackingStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  paused: 'Pausada',
  completed: 'Concluída',
  skipped: 'Pulada',
};

const TRACKING_STATUS_VARIANT: Record<trackingApi.ProductionTrackingStatus, 'secondary' | 'warning' | 'success' | 'outline'> = {
  pending: 'secondary',
  in_progress: 'warning',
  paused: 'outline',
  completed: 'success',
  skipped: 'outline',
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  released: 'Liberada',
  in_progress: 'Em produção',
};

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
}

/**
 * `FE6`: apontamento de chão de fábrica — bancada/tablet.
 *
 * Lista OPs liberadas/em produção; ao selecionar uma OP, exibe as etapas de
 * rastreamento (`ProductionOrderTracking`) ordenadas por sequência, com
 * ações de iniciar, concluir e adicionar etapa manual.
 */
export default function ShopFloorPage() {
  const [search, setSearch] = React.useState('');
  const [selectedOrderId, setSelectedOrderId] = React.useState<number | null>(null);
  const [startingTracking, setStartingTracking] = React.useState<trackingApi.ProductionOrderTracking | null>(null);
  const [completingTracking, setCompletingTracking] = React.useState<trackingApi.ProductionOrderTracking | null>(null);
  const [addStepOpen, setAddStepOpen] = React.useState(false);

  const { data: releasedOrders, isLoading: loadingReleased } = useQuery({
    queryKey: ['production-orders', 'shop-floor', 'released'],
    queryFn: () => productionApi.listProductionOrders({ status: 'released', limit: 50 }),
  });
  const { data: inProgressOrders, isLoading: loadingInProgress } = useQuery({
    queryKey: ['production-orders', 'shop-floor', 'in_progress'],
    queryFn: () => productionApi.listProductionOrders({ status: 'in_progress', limit: 50 }),
  });

  const orders = React.useMemo(() => {
    const combined = [...(inProgressOrders?.data ?? []), ...(releasedOrders?.data ?? [])];
    if (!search.trim()) return combined;
    const term = search.trim().toLowerCase();
    return combined.filter((order) => {
      const label = `${order.order_number ?? order.id} ${order.product?.name ?? ''} ${order.product?.code ?? ''}`.toLowerCase();
      return label.includes(term);
    });
  }, [releasedOrders, inProgressOrders, search]);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;

  const {
    data: steps,
    isLoading: loadingSteps,
    isError: errorSteps,
  } = useQuery({
    queryKey: ['production-tracking', selectedOrderId],
    queryFn: () => trackingApi.listProductionTracking(selectedOrderId!),
    enabled: Boolean(selectedOrderId),
  });

  const totalGood = React.useMemo(
    () => (steps ?? []).reduce((sum, step) => sum + Number(step.quantity_good ?? 0), 0),
    [steps],
  );

  const isLoadingOrders = loadingReleased || loadingInProgress;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <Card className="w-full lg:w-96 lg:shrink-0">
        <CardHeader>
          <CardTitle className="text-xl">Ordens ativas</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-12 pl-9 text-base"
              placeholder="Buscar por ordem ou produto..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {isLoadingOrders && <p className="text-sm text-muted-foreground">Carregando ordens...</p>}
          {!isLoadingOrders && orders.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma ordem liberada ou em produção encontrada.</p>
          )}
          {orders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => setSelectedOrderId(order.id)}
              className={`flex min-h-12 flex-col gap-1 rounded-lg border p-3 text-left transition-colors ${
                selectedOrderId === order.id ? 'border-primary bg-accent' : 'border-input hover:bg-accent/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-semibold">{order.order_number ?? `OP #${order.id}`}</span>
                <Badge variant="secondary">{ORDER_STATUS_LABEL[order.status] ?? order.status}</Badge>
              </div>
              <span className="text-sm text-muted-foreground">{order.product?.name ?? `Produto #${order.product_id}`}</span>
              <span className="text-sm text-muted-foreground">
                Produzido: {order.quantity_produced ?? 0} / {order.quantity}
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="flex w-full flex-col gap-4">
        {!selectedOrder && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Selecione uma ordem de produção para ver as etapas de apontamento.
            </CardContent>
          </Card>
        )}

        {selectedOrder && (
          <>
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">
                    {selectedOrder.order_number ?? `OP #${selectedOrder.id}`} — {selectedOrder.product?.name ?? selectedOrder.product_id}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Total bom acumulado: <span className="font-semibold text-foreground">{totalGood}</span> de{' '}
                    <span className="font-semibold text-foreground">{selectedOrder.quantity}</span> planejados
                  </p>
                </div>
                <Button className="min-h-12" onClick={() => setAddStepOpen(true)}>
                  <Plus /> Adicionar etapa
                </Button>
              </CardHeader>
            </Card>

            <div className="flex flex-col gap-3">
              {loadingSteps && <p className="text-sm text-muted-foreground">Carregando etapas...</p>}
              {errorSteps && <p className="text-sm text-destructive">Não foi possível carregar as etapas desta ordem.</p>}
              {!loadingSteps && !errorSteps && (steps ?? []).length === 0 && (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    Nenhuma etapa cadastrada ainda. Use "Adicionar etapa" para iniciar o apontamento.
                  </CardContent>
                </Card>
              )}
              {(steps ?? []).map((step) => (
                <TrackingStepCard
                  key={step.id}
                  step={step}
                  onStart={() => setStartingTracking(step)}
                  onComplete={() => setCompletingTracking(step)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <StartTrackingDialog tracking={startingTracking} onClose={() => setStartingTracking(null)} />
      <CompleteTrackingDialog tracking={completingTracking} onClose={() => setCompletingTracking(null)} />
      {selectedOrderId && (
        <AddStepDialog
          productionOrderId={selectedOrderId}
          open={addStepOpen}
          onClose={() => setAddStepOpen(false)}
        />
      )}
    </div>
  );
}

function TrackingStepCard({
  step,
  onStart,
  onComplete,
}: {
  step: trackingApi.ProductionOrderTracking;
  onStart: () => void;
  onComplete: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">Etapa {step.sequence}</span>
            <Badge variant={TRACKING_STATUS_VARIANT[step.status]}>{TRACKING_STATUS_LABEL[step.status]}</Badge>
          </div>
          <span className="text-sm text-muted-foreground">
            {step.routeStep ? `${step.routeStep.name}${step.routeStep.work_center ? ` — ${step.routeStep.work_center}` : ''}` : 'Etapa manual'}
          </span>
          <span className="text-sm text-muted-foreground">Operador: {step.operator?.name ?? 'Não atribuído'}</span>
          <span className="text-sm text-muted-foreground">
            Início: {formatDateTime(step.started_at)} · Fim: {formatDateTime(step.finished_at)}
          </span>
          {step.status === 'completed' && (
            <span className="text-sm text-muted-foreground">
              Boas: {step.quantity_good ?? 0} · Refugadas: {step.quantity_scrapped ?? 0}
            </span>
          )}
          {step.notes && <span className="text-sm text-muted-foreground">Obs.: {step.notes}</span>}
        </div>
        <div className="flex gap-2">
          {step.status === 'pending' && (
            <Button className="min-h-12 flex-1 sm:flex-none" onClick={onStart}>
              <Play /> Iniciar
            </Button>
          )}
          {step.status === 'in_progress' && (
            <Button className="min-h-12 flex-1 sm:flex-none" onClick={onComplete}>
              <CheckCircle2 /> Concluir
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StartTrackingDialog({
  tracking,
  onClose,
}: {
  tracking: trackingApi.ProductionOrderTracking | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [operatorId, setOperatorId] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.listEmployees({ limit: 200 }),
    enabled: Boolean(tracking),
  });

  React.useEffect(() => {
    if (tracking) {
      setOperatorId('');
      setError(null);
    }
  }, [tracking]);

  const mutation = useMutation({
    mutationFn: () =>
      trackingApi.startProductionTracking(tracking!.id, operatorId ? { operator_id: Number(operatorId) } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-tracking', tracking?.production_order_id] });
      onClose();
    },
    onError: (err) => setError(extractApiErrorMessage(err, 'Não foi possível iniciar a etapa.')),
  });

  return (
    <Dialog open={Boolean(tracking)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Iniciar etapa {tracking?.sequence}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="operator_id">Operador</Label>
            <SelectNative
              id="operator_id"
              className="h-12 text-base"
              value={operatorId}
              onChange={(event) => setOperatorId(event.target.value)}
              disabled={loadingEmployees}
            >
              <option value="">Não atribuir agora</option>
              {employees?.data.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </SelectNative>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button className="min-h-12 w-full" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Iniciando...' : 'Iniciar etapa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompleteTrackingDialog({
  tracking,
  onClose,
}: {
  tracking: trackingApi.ProductionOrderTracking | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [quantityGood, setQuantityGood] = React.useState('');
  const [quantityScrapped, setQuantityScrapped] = React.useState('0');
  const [notes, setNotes] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (tracking) {
      setQuantityGood('');
      setQuantityScrapped('0');
      setNotes('');
      setError(null);
    }
  }, [tracking]);

  const mutation = useMutation({
    mutationFn: () => {
      const good = Number(quantityGood);
      const scrapped = Number(quantityScrapped);
      if (quantityGood === '' || Number.isNaN(good) || good < 0) {
        throw new Error('Informe a quantidade boa (maior ou igual a zero).');
      }
      if (quantityScrapped === '' || Number.isNaN(scrapped) || scrapped < 0) {
        throw new Error('Informe a quantidade refugada (maior ou igual a zero).');
      }
      return trackingApi.completeProductionTracking(tracking!.id, {
        quantity_good: good,
        quantity_scrapped: scrapped,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-tracking', tracking?.production_order_id] });
      onClose();
    },
    onError: (err) => setError(extractApiErrorMessage(err, 'Não foi possível concluir a etapa.')),
  });

  return (
    <Dialog open={Boolean(tracking)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Concluir etapa {tracking?.sequence}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quantity_good">Quantidade boa</Label>
              <Input
                id="quantity_good"
                className="h-12 text-base"
                type="number"
                step="any"
                min="0"
                value={quantityGood}
                onChange={(event) => setQuantityGood(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quantity_scrapped">Quantidade refugada</Label>
              <Input
                id="quantity_scrapped"
                className="h-12 text-base"
                type="number"
                step="any"
                min="0"
                value={quantityScrapped}
                onChange={(event) => setQuantityScrapped(event.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Input id="notes" className="h-12 text-base" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button className="min-h-12 w-full" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Concluindo...' : 'Concluir etapa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const addStepSchema = z.object({
  sequence: z.coerce.number().int().positive('Sequência deve ser maior que zero.'),
  notes: z.string().optional(),
});

type AddStepFormData = z.infer<typeof addStepSchema>;

function AddStepDialog({
  productionOrderId,
  open,
  onClose,
}: {
  productionOrderId: number;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddStepFormData>({ resolver: zodResolver(addStepSchema) });

  const mutation = useMutation({
    mutationFn: (values: AddStepFormData) =>
      trackingApi.createProductionTracking(productionOrderId, {
        sequence: values.sequence,
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-tracking', productionOrderId] });
      reset();
      setError(null);
      onClose();
    },
    onError: (err) => setError(extractApiErrorMessage(err, 'Não foi possível adicionar a etapa.')),
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar etapa manual</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sequence">Sequência</Label>
            <Input id="sequence" className="h-12 text-base" type="number" step="1" min="1" {...register('sequence')} />
            {errors.sequence && <p className="text-sm text-destructive">{errors.sequence.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stepNotes">Observações</Label>
            <Input id="stepNotes" className="h-12 text-base" {...register('notes')} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" className="min-h-12 w-full" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Adicionando...' : 'Adicionar etapa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
