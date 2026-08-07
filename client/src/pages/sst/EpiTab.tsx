import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, HardHat, Plus, ShieldCheck } from 'lucide-react';

import * as sstApi from '@/api/sst';
import * as employeesApi from '@/api/employees';
import { useAuth } from '@/context/AuthContext';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AmberNoticeBox } from '@/components/AmberNoticeBox';
import { cn } from '@/lib/utils';
import { EPI_MOTIVO_LABELS, EpiStatusBadge, formatDate, toDateInputValue } from './sstShared';

type EpiSubView = 'deliveries' | 'types' | 'matrix';

export function EpiTab() {
  const [subView, setSubView] = React.useState<EpiSubView>('deliveries');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b">
        <SubTabButton active={subView === 'deliveries'} onClick={() => setSubView('deliveries')}>
          Entregas
        </SubTabButton>
        <SubTabButton active={subView === 'types'} onClick={() => setSubView('types')}>
          Tipos de EPI (catálogo)
        </SubTabButton>
        <SubTabButton active={subView === 'matrix'} onClick={() => setSubView('matrix')}>
          Matriz Função × EPI
        </SubTabButton>
      </div>

      {subView === 'deliveries' && <DeliveriesView />}
      {subView === 'types' && <EpiTypesView />}
      {subView === 'matrix' && <EpiMatrixView />}
    </div>
  );
}

function SubTabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-selected={active}
      className={cn(
        'rounded-t-sm border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-brand/5 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
        active && 'border-brand text-brand',
      )}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Entregas
// ---------------------------------------------------------------------------

function DeliveriesView() {
  const { user, permissions } = useAuth();
  const canApprove = user?.role === 'admin' || permissions?.sst === 'approve';
  const [statusFilter, setStatusFilter] = React.useState<sstApi.EpiDeliveryStatus | ''>('');
  const [newDeliveryOpen, setNewDeliveryOpen] = React.useState(false);
  const [evidenceDelivery, setEvidenceDelivery] = React.useState<sstApi.EpiDelivery | null>(null);
  const [returnDelivery, setReturnDelivery] = React.useState<sstApi.EpiDelivery | null>(null);
  const [confirmError, setConfirmError] = React.useState<DidacticError | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sst-epi-deliveries', statusFilter],
    queryFn: () => sstApi.listEpiDeliveries({ status: statusFilter || undefined, limit: 50 }),
  });

  const { data: pendingReport } = useQuery({
    queryKey: ['sst-epi-pending-report'],
    queryFn: sstApi.getEpiPendingReport,
  });

  const confirmMutation = useMutation({
    mutationFn: (id: number) => sstApi.confirmEpiDelivery(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sst-epi-deliveries'] });
      setConfirmError(null);
    },
    onError: (error) => setConfirmError(translateApiError(error, 'Não foi possível confirmar a entrega de EPI')),
  });

  return (
    <div className="flex flex-col gap-4">
      {Boolean(pendingReport?.length) && (
        <AmberNoticeBox icon={AlertTriangle} className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
          <p className="font-semibold">{pendingReport?.length} pendência(s) crítica(s) de EPI</p>
          <p className="text-xs">
            Funcionários ativos em função da Matriz de EPI sem entrega vigente: {pendingReport?.slice(0, 5).map((p) => p.employee_name ?? `#${p.employee_id}`).join(', ')}
            {(pendingReport?.length ?? 0) > 5 ? '…' : ''}
          </p>
        </AmberNoticeBox>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="epi-status-filter" className="text-sm text-muted-foreground">
            Status
          </Label>
          <SelectNative
            id="epi-status-filter"
            className="max-w-48"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as sstApi.EpiDeliveryStatus | '')}
          >
            <option value="">Todos</option>
            <option value="rascunho">Rascunho</option>
            <option value="confirmada">Confirmada</option>
          </SelectNative>
        </div>
        <Button type="button" onClick={() => setNewDeliveryOpen(true)}>
          <Plus className="size-4" />
          Nova entrega
        </Button>
      </div>

      {confirmError && <DidacticAlert error={confirmError} />}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Funcionário</TableHead>
            <TableHead>EPI (CA)</TableHead>
            <TableHead className="text-right">Qtd.</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Entrega</TableHead>
            <TableHead>Próxima troca</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={8} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-destructive">
                Não foi possível carregar as entregas de EPI. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((delivery) => (
            <TableRow key={delivery.id} className="border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5">
              <TableCell>{delivery.employee?.name ?? `#${delivery.employee_id}`}</TableCell>
              <TableCell>
                {delivery.epi_type?.nome ?? `#${delivery.epi_type_id}`}
                {delivery.epi_type?.ca_numero && (
                  <span className="ml-1 font-mono text-xs text-muted-foreground">CA {delivery.epi_type.ca_numero}</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{delivery.quantidade}</TableCell>
              <TableCell>{EPI_MOTIVO_LABELS[delivery.motivo] ?? delivery.motivo}</TableCell>
              <TableCell>{formatDate(delivery.data_entrega)}</TableCell>
              <TableCell>{formatDate(delivery.data_prevista_troca)}</TableCell>
              <TableCell>
                <EpiStatusBadge status={delivery.status} />
              </TableCell>
              <TableCell>
                {delivery.status === 'rascunho' ? (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEvidenceDelivery(delivery)}>
                      {delivery.evidencia ? 'Evidência anexada' : 'Anexar evidência'}
                    </Button>
                    <Button
                      size="sm"
                      disabled={!canApprove || !delivery.evidencia || confirmMutation.isPending}
                      title={!canApprove ? 'Requer nível de aprovação (approve) no módulo SST' : undefined}
                      onClick={() => confirmMutation.mutate(delivery.id)}
                    >
                      Confirmar
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setReturnDelivery(delivery)}>
                    Registrar devolução
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <HardHat className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhuma entrega de EPI encontrada.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <NewDeliveryDialog open={newDeliveryOpen} onClose={() => setNewDeliveryOpen(false)} />
      <EvidenceDialog delivery={evidenceDelivery} onClose={() => setEvidenceDelivery(null)} />
      <ReturnDialog delivery={returnDelivery} onClose={() => setReturnDelivery(null)} />
    </div>
  );
}

const newDeliverySchema = z.object({
  employee_id: z.coerce.number().int().positive('Selecione o funcionário.'),
  epi_type_id: z.coerce.number().int().positive('Selecione o tipo de EPI.'),
  quantidade: z.coerce.number().positive('Informe uma quantidade maior que zero.'),
  motivo: z.enum(['primeira_entrega', 'troca_periodica', 'dano', 'perda', 'mudanca_funcao']),
  data_entrega: z.string().min(1, 'Informe a data de entrega.'),
});

type NewDeliveryFormData = z.infer<typeof newDeliverySchema>;

function NewDeliveryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const { data: employees } = useQuery({
    queryKey: ['employees-active-select'],
    queryFn: () => employeesApi.listEmployees({ limit: 200, status: 'active' }),
    enabled: open,
  });
  const { data: epiTypes } = useQuery({
    queryKey: ['sst-epi-types-select'],
    queryFn: () => sstApi.listEpiTypes({ active: true }),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewDeliveryFormData>({
    resolver: zodResolver(newDeliverySchema),
    defaultValues: { motivo: 'primeira_entrega', data_entrega: toDateInputValue() },
  });

  const mutation = useMutation({
    mutationFn: (values: NewDeliveryFormData) => sstApi.createEpiDelivery(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sst-epi-deliveries'] });
      reset({ motivo: 'primeira_entrega', data_entrega: toDateInputValue() } as never);
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível registrar a entrega de EPI')),
  });

  React.useEffect(() => {
    if (open) {
      reset({ motivo: 'primeira_entrega', data_entrega: toDateInputValue() } as never);
      setFormError(null);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova entrega de EPI</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-delivery-employee">Funcionário</Label>
            <SelectNative id="new-delivery-employee" {...register('employee_id')}>
              <option value="">Selecione...</option>
              {(employees?.data ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </SelectNative>
            {errors.employee_id && <p className="text-sm text-destructive">{errors.employee_id.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-delivery-epi-type">Tipo de EPI</Label>
            <SelectNative id="new-delivery-epi-type" {...register('epi_type_id')}>
              <option value="">Selecione...</option>
              {(epiTypes?.data ?? []).map((epiType) => (
                <option key={epiType.id} value={epiType.id}>
                  {epiType.nome} — CA {epiType.ca_numero}
                </option>
              ))}
            </SelectNative>
            {errors.epi_type_id && <p className="text-sm text-destructive">{errors.epi_type_id.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-delivery-quantidade">Quantidade</Label>
              <Input id="new-delivery-quantidade" type="number" step="any" {...register('quantidade')} />
              {errors.quantidade && <p className="text-sm text-destructive">{errors.quantidade.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-delivery-data">Data de entrega</Label>
              <Input id="new-delivery-data" type="date" {...register('data_entrega')} />
              {errors.data_entrega && <p className="text-sm text-destructive">{errors.data_entrega.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-delivery-motivo">Motivo</Label>
            <SelectNative id="new-delivery-motivo" {...register('motivo')}>
              <option value="primeira_entrega">Primeira entrega</option>
              <option value="troca_periodica">Troca periódica</option>
              <option value="dano">Dano</option>
              <option value="perda">Perda</option>
              <option value="mudanca_funcao">Mudança de função</option>
            </SelectNative>
          </div>
          {formError && <DidacticAlert error={formError} />}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Registrar (rascunho)'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const evidenceSchema = z.object({
  tipo_evidencia: z.enum(['assinatura_digitalizada', 'aceite_eletronico', 'biometria']),
  arquivo_url: z.string().min(1, 'Informe a URL do arquivo/comprovante.'),
});

type EvidenceFormData = z.infer<typeof evidenceSchema>;

function EvidenceDialog({ delivery, onClose }: { delivery: sstApi.EpiDelivery | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EvidenceFormData>({
    resolver: zodResolver(evidenceSchema),
    defaultValues: { tipo_evidencia: 'aceite_eletronico' },
  });

  const mutation = useMutation({
    mutationFn: (values: EvidenceFormData) => sstApi.attachEpiEvidence(delivery!.id, values.tipo_evidencia, values.arquivo_url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sst-epi-deliveries'] });
      reset();
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível anexar a evidência de recebimento')),
  });

  React.useEffect(() => {
    if (delivery) {
      reset({ tipo_evidencia: 'aceite_eletronico', arquivo_url: '' });
      setFormError(null);
    }
  }, [delivery, reset]);

  return (
    <Dialog open={Boolean(delivery)} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Evidência de recebimento</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="evidence-tipo">Tipo</Label>
            <SelectNative id="evidence-tipo" {...register('tipo_evidencia')}>
              <option value="assinatura_digitalizada">Assinatura digitalizada</option>
              <option value="aceite_eletronico">Aceite eletrônico</option>
              <option value="biometria">Biometria</option>
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="evidence-url">URL do arquivo/comprovante</Label>
            <Input id="evidence-url" placeholder="https://..." {...register('arquivo_url')} />
            {errors.arquivo_url && <p className="text-sm text-destructive">{errors.arquivo_url.message}</p>}
          </div>
          {formError && <DidacticAlert error={formError} />}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || !delivery || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Anexar evidência'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const returnSchema = z.object({
  data_devolucao: z.string().min(1, 'Informe a data de devolução.'),
  condicao: z.string().min(1, 'Descreva a condição do EPI devolvido.'),
});

type ReturnFormData = z.infer<typeof returnSchema>;

function ReturnDialog({ delivery, onClose }: { delivery: sstApi.EpiDelivery | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReturnFormData>({ resolver: zodResolver(returnSchema), defaultValues: { data_devolucao: toDateInputValue() } });

  const mutation = useMutation({
    mutationFn: (values: ReturnFormData) => sstApi.returnEpiDelivery(delivery!.id, values.data_devolucao, values.condicao),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sst-epi-deliveries'] });
      reset({ data_devolucao: toDateInputValue(), condicao: '' });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível registrar a devolução do EPI')),
  });

  React.useEffect(() => {
    if (delivery) {
      reset({ data_devolucao: toDateInputValue(), condicao: '' });
      setFormError(null);
    }
  }, [delivery, reset]);

  return (
    <Dialog open={Boolean(delivery)} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar devolução — {delivery?.epi_type?.nome}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="return-data">Data de devolução</Label>
            <Input id="return-data" type="date" {...register('data_devolucao')} />
            {errors.data_devolucao && <p className="text-sm text-destructive">{errors.data_devolucao.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="return-condicao">Condição</Label>
            <Input id="return-condicao" placeholder="Ex.: danificado, íntegro..." {...register('condicao')} />
            {errors.condicao && <p className="text-sm text-destructive">{errors.condicao.message}</p>}
          </div>
          {formError && <DidacticAlert error={formError} />}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || !delivery || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Registrar devolução'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Tipos de EPI (catálogo)
// ---------------------------------------------------------------------------

function EpiTypesView() {
  const [newTypeOpen, setNewTypeOpen] = React.useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['sst-epi-types'],
    queryFn: () => sstApi.listEpiTypes(),
  });

  const today = React.useMemo(() => new Date(), []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setNewTypeOpen(true)}>
          <Plus className="size-4" />
          Novo tipo de EPI
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>CA</TableHead>
            <TableHead>Validade do CA</TableHead>
            <TableHead>Fabricante</TableHead>
            <TableHead className="text-right">Vida útil (dias)</TableHead>
            <TableHead>Situação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-destructive">
                Não foi possível carregar o catálogo de EPI.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((epiType) => {
            const expired = new Date(epiType.ca_validade) < today;
            return (
              <TableRow
                key={epiType.id}
                className="border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5"
              >
                <TableCell>{epiType.nome}</TableCell>
                <TableCell className="font-mono text-xs">{epiType.ca_numero}</TableCell>
                <TableCell className={cn(expired && 'font-medium text-destructive')}>{formatDate(epiType.ca_validade)}</TableCell>
                <TableCell>{epiType.fabricante ?? '-'}</TableCell>
                <TableCell className="text-right tabular-nums">{epiType.vida_util_dias}</TableCell>
                <TableCell>
                  {!epiType.active ? (
                    <span className="text-xs text-muted-foreground">Inativo</span>
                  ) : expired ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                      <AlertTriangle className="size-3.5" /> CA vencido
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                      <ShieldCheck className="size-3.5" /> CA válido
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <HardHat className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum tipo de EPI cadastrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <NewEpiTypeDialog open={newTypeOpen} onClose={() => setNewTypeOpen(false)} />
    </div>
  );
}

const newEpiTypeSchema = z.object({
  nome: z.string().min(1, 'Informe o nome do EPI.'),
  ca_numero: z.string().min(1, 'Informe o número do CA.'),
  ca_validade: z.string().min(1, 'Informe a validade do CA.'),
  fabricante: z.string().optional(),
  vida_util_dias: z.coerce.number().int().positive('Informe a vida útil em dias.'),
});

type NewEpiTypeFormData = z.infer<typeof newEpiTypeSchema>;

function NewEpiTypeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewEpiTypeFormData>({ resolver: zodResolver(newEpiTypeSchema) });

  const mutation = useMutation({
    mutationFn: (values: NewEpiTypeFormData) =>
      sstApi.createEpiType({ ...values, fabricante: values.fabricante || null, active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sst-epi-types'] });
      reset();
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível cadastrar o tipo de EPI')),
  });

  React.useEffect(() => {
    if (open) {
      reset();
      setFormError(null);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo tipo de EPI</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="epi-type-nome">Nome</Label>
            <Input id="epi-type-nome" {...register('nome')} />
            {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="epi-type-ca">Número do CA</Label>
              <Input id="epi-type-ca" {...register('ca_numero')} />
              {errors.ca_numero && <p className="text-sm text-destructive">{errors.ca_numero.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="epi-type-validade">Validade do CA</Label>
              <Input id="epi-type-validade" type="date" {...register('ca_validade')} />
              {errors.ca_validade && <p className="text-sm text-destructive">{errors.ca_validade.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="epi-type-fabricante">Fabricante</Label>
              <Input id="epi-type-fabricante" {...register('fabricante')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="epi-type-vida-util">Vida útil (dias)</Label>
              <Input id="epi-type-vida-util" type="number" {...register('vida_util_dias')} />
              {errors.vida_util_dias && <p className="text-sm text-destructive">{errors.vida_util_dias.message}</p>}
            </div>
          </div>
          {formError && <DidacticAlert error={formError} />}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Matriz Função × EPI
// ---------------------------------------------------------------------------

function EpiMatrixView() {
  const [newEntryOpen, setNewEntryOpen] = React.useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['sst-epi-matrix'],
    queryFn: () => sstApi.listEpiMatrix(),
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Matriz Função/Setor × EPI</CardTitle>
          <CardDescription>Define quais EPIs cada função ou departamento deve receber, e a quantidade padrão.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end pb-3">
            <Button type="button" size="sm" onClick={() => setNewEntryOpen(true)}>
              <Plus className="size-4" />
              Novo vínculo
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Função</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>EPI</TableHead>
                <TableHead className="text-right">Qtd. padrão</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableSkeletonRows columns={5} />}
              {isError && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-destructive">
                    Não foi possível carregar a matriz de EPI.
                  </TableCell>
                </TableRow>
              )}
              {data?.data.map((entry) => (
                <TableRow
                  key={entry.id}
                  className="border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5"
                >
                  <TableCell>{entry.position ?? '-'}</TableCell>
                  <TableCell>{entry.department_id ?? '-'}</TableCell>
                  <TableCell>{entry.epi_type?.nome ?? `#${entry.epi_type_id}`}</TableCell>
                  <TableCell className="text-right tabular-nums">{entry.quantidade_padrao}</TableCell>
                  <TableCell>{entry.observacao ?? '-'}</TableCell>
                </TableRow>
              ))}
              {!isLoading && !isError && data?.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ShieldCheck className="size-8 text-muted-foreground/50" />
                      <p className="text-sm">Nenhum vínculo cadastrado na matriz de EPI.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <NewEpiMatrixDialog open={newEntryOpen} onClose={() => setNewEntryOpen(false)} />
    </div>
  );
}

const newMatrixSchema = z
  .object({
    position: z.string().optional(),
    department_id: z.coerce.number().int().positive().optional(),
    epi_type_id: z.coerce.number().int().positive('Selecione o tipo de EPI.'),
    quantidade_padrao: z.coerce.number().positive('Informe uma quantidade maior que zero.'),
    observacao: z.string().optional(),
  })
  .refine((value) => Boolean(value.position?.trim()) || Boolean(value.department_id), {
    message: 'Informe a função ou o departamento.',
    path: ['position'],
  });

type NewMatrixFormData = z.infer<typeof newMatrixSchema>;

function NewEpiMatrixDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const { data: epiTypes } = useQuery({
    queryKey: ['sst-epi-types-select'],
    queryFn: () => sstApi.listEpiTypes({ active: true }),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewMatrixFormData>({ resolver: zodResolver(newMatrixSchema) });

  const mutation = useMutation({
    mutationFn: (values: NewMatrixFormData) =>
      sstApi.createEpiMatrix({
        position: values.position?.trim() || null,
        department_id: values.department_id || null,
        epi_type_id: values.epi_type_id,
        quantidade_padrao: values.quantidade_padrao,
        observacao: values.observacao?.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sst-epi-matrix'] });
      reset();
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível cadastrar o vínculo da matriz de EPI')),
  });

  React.useEffect(() => {
    if (open) {
      reset();
      setFormError(null);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo vínculo — Matriz de EPI</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <p className="text-xs text-muted-foreground">Informe a função OU o departamento (ao menos um é obrigatório).</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="matrix-position">Função (cargo)</Label>
              <Input id="matrix-position" {...register('position')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="matrix-department">Departamento (ID)</Label>
              <Input id="matrix-department" type="number" {...register('department_id')} />
            </div>
          </div>
          {errors.position && <p className="text-sm text-destructive">{errors.position.message}</p>}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="matrix-epi-type">Tipo de EPI</Label>
            <SelectNative id="matrix-epi-type" {...register('epi_type_id')}>
              <option value="">Selecione...</option>
              {(epiTypes?.data ?? []).map((epiType) => (
                <option key={epiType.id} value={epiType.id}>
                  {epiType.nome}
                </option>
              ))}
            </SelectNative>
            {errors.epi_type_id && <p className="text-sm text-destructive">{errors.epi_type_id.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="matrix-quantidade">Quantidade padrão</Label>
            <Input id="matrix-quantidade" type="number" step="any" {...register('quantidade_padrao')} />
            {errors.quantidade_padrao && <p className="text-sm text-destructive">{errors.quantidade_padrao.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="matrix-observacao">Observação</Label>
            <Textarea id="matrix-observacao" rows={2} {...register('observacao')} />
          </div>
          {formError && <DidacticAlert error={formError} />}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
