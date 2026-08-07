import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ClipboardCheck, Package, Plus } from 'lucide-react';

import * as tiApi from '@/api/ti';
import * as employeesApi from '@/api/employees';
import * as assetsApi from '@/api/assets';
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
import { formatDate, refName, TermStatusBadge } from './tiShared';

/** Termo de Responsabilidade de Equipamento (UC-50) — `/ti`, aba "Termos". */
export function TermsTab() {
  const { user, permissions } = useAuth();
  const canApprove = user?.role === 'admin' || permissions?.ti === 'approve';
  const [statusFilter, setStatusFilter] = React.useState<tiApi.TermStatus | ''>('active');
  const [newTermOpen, setNewTermOpen] = React.useState(false);
  const [returnTerm, setReturnTerm] = React.useState<tiApi.ResponsibilityTerm | null>(null);
  const [lostTerm, setLostTerm] = React.useState<tiApi.ResponsibilityTerm | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ti-terms', statusFilter],
    queryFn: () => tiApi.listResponsibilityTerms({ status: statusFilter || undefined, limit: 50 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="term-status-filter" className="text-sm text-muted-foreground">
            Status
          </Label>
          <SelectNative
            id="term-status-filter"
            className="max-w-48"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as tiApi.TermStatus | '')}
          >
            <option value="">Todos</option>
            <option value="active">Ativo</option>
            <option value="returned">Devolvido</option>
            <option value="lost">Perdido</option>
          </SelectNative>
        </div>
        <Button type="button" onClick={() => setNewTermOpen(true)}>
          <Plus className="size-4" />
          Registrar entrega
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Termo</TableHead>
            <TableHead>Ativo</TableHead>
            <TableHead>Funcionário</TableHead>
            <TableHead>Entrega</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-destructive">
                Não foi possível carregar os termos de responsabilidade.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((term) => (
            <TableRow key={term.id} className="border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5">
              <TableCell className="font-mono text-xs">{term.term_number}</TableCell>
              <TableCell>
                {term.asset.name ?? `#${term.asset.id}`}
                {term.asset.tag && <span className="ml-1 text-xs text-muted-foreground">({term.asset.tag})</span>}
              </TableCell>
              <TableCell>{refName(term.employee)}</TableCell>
              <TableCell>{formatDate(term.delivered_at)}</TableCell>
              <TableCell>
                <TermStatusBadge status={term.status} />
              </TableCell>
              <TableCell>
                {term.status === 'active' && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setReturnTerm(term)}>
                      Devolução
                    </Button>
                    <Button size="sm" variant="destructive" disabled={!canApprove} title={!canApprove ? 'Requer nível approve no módulo TI' : undefined} onClick={() => setLostTerm(term)}>
                      Marcar perdido
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Package className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum termo encontrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <NewTermDialog open={newTermOpen} onClose={() => setNewTermOpen(false)} />
      <ReturnTermDialog term={returnTerm} onClose={() => setReturnTerm(null)} />
      <MarkLostDialog term={lostTerm} onClose={() => setLostTerm(null)} />
    </div>
  );
}

const newTermSchema = z.object({
  asset_id: z.coerce.number().int().positive('Selecione o ativo.'),
  employee_id: z.coerce.number().int().positive('Selecione o funcionário.'),
  condition_on_delivery: z.string().min(1, 'Descreva a condição de entrega.'),
  accessories: z.string().optional(),
  acceptance_type: z.enum(['physical_signature', 'digital_ack']),
});

type NewTermFormData = z.infer<typeof newTermSchema>;

function NewTermDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const { data: employees } = useQuery({
    queryKey: ['employees-active-select'],
    queryFn: () => employeesApi.listEmployees({ limit: 200, status: 'active' }),
    enabled: open,
  });
  const { data: itAssets } = useQuery({
    queryKey: ['ti-assets-select'],
    queryFn: () => assetsApi.listAssets({ limit: 200 }),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewTermFormData>({ resolver: zodResolver(newTermSchema), defaultValues: { acceptance_type: 'digital_ack' } });

  const mutation = useMutation({
    mutationFn: (values: NewTermFormData) =>
      tiApi.createResponsibilityTerm({
        asset_id: values.asset_id,
        employee_id: values.employee_id,
        condition_on_delivery: values.condition_on_delivery,
        accessories: values.accessories,
        acceptance_type: values.acceptance_type,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ti-terms'] });
      reset({ acceptance_type: 'digital_ack' } as never);
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível registrar a entrega do equipamento')),
  });

  React.useEffect(() => {
    if (open) {
      reset({ acceptance_type: 'digital_ack' } as never);
      setFormError(null);
    }
  }, [open, reset]);

  const itAssetOptions = (itAssets?.data ?? []).filter((asset) => asset.asset_type === 'it');

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar entrega de equipamento</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="term-asset">Ativo de TI</Label>
              <SelectNative id="term-asset" {...register('asset_id')}>
                <option value="">Selecione...</option>
                {itAssetOptions.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.tag} — {asset.name}
                  </option>
                ))}
              </SelectNative>
              {errors.asset_id && <p className="text-sm text-destructive">{errors.asset_id.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="term-employee">Funcionário destinatário</Label>
              <SelectNative id="term-employee" {...register('employee_id')}>
                <option value="">Selecione...</option>
                {(employees?.data ?? []).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </SelectNative>
              {errors.employee_id && <p className="text-sm text-destructive">{errors.employee_id.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="term-condition">Condição na entrega</Label>
            <Textarea id="term-condition" rows={2} {...register('condition_on_delivery')} />
            {errors.condition_on_delivery && <p className="text-sm text-destructive">{errors.condition_on_delivery.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="term-accessories">Acessórios entregues</Label>
            <Input id="term-accessories" placeholder="Ex.: carregador, mochila, mouse" {...register('accessories')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="term-acceptance">Tipo de aceite</Label>
            <SelectNative id="term-acceptance" {...register('acceptance_type')}>
              <option value="digital_ack">Aceite eletrônico</option>
              <option value="physical_signature">Assinatura física</option>
            </SelectNative>
          </div>
          {formError && <DidacticAlert error={formError} />}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Registrar entrega'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const returnSchema = z.object({
  condition_on_return: z.enum(['ok', 'damaged', 'incomplete']),
  return_notes: z.string().optional(),
});

type ReturnFormData = z.infer<typeof returnSchema>;

function ReturnTermDialog({ term, onClose }: { term: tiApi.ResponsibilityTerm | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ReturnFormData>({ resolver: zodResolver(returnSchema), defaultValues: { condition_on_return: 'ok' } });

  const mutation = useMutation({
    mutationFn: (values: ReturnFormData) => tiApi.returnResponsibilityTerm(term!.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ti-terms'] });
      reset({ condition_on_return: 'ok' } as never);
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível registrar a devolução do equipamento')),
  });

  React.useEffect(() => {
    if (term) {
      reset({ condition_on_return: 'ok' } as never);
      setFormError(null);
    }
  }, [term, reset]);

  return (
    <Dialog open={Boolean(term)} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar devolução — {term?.term_number}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="return-condition">Condição na devolução</Label>
            <SelectNative id="return-condition" {...register('condition_on_return')}>
              <option value="ok">Íntegro (ok)</option>
              <option value="damaged">Danificado</option>
              <option value="incomplete">Incompleto</option>
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="return-notes">Observações</Label>
            <Textarea id="return-notes" rows={2} {...register('return_notes')} />
          </div>
          {formError && <DidacticAlert error={formError} />}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || !term || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Registrar devolução'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MarkLostDialog({ term, onClose }: { term: tiApi.ResponsibilityTerm | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [justification, setJustification] = React.useState('');
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const mutation = useMutation({
    mutationFn: () => tiApi.markResponsibilityTermLost(term!.id, justification),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ti-terms'] });
      setJustification('');
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível marcar o termo como perdido')),
  });

  React.useEffect(() => {
    if (term) {
      setJustification('');
      setFormError(null);
    }
  }, [term]);

  return (
    <Dialog open={Boolean(term)} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="size-4" />
            Marcar como perdido — {term?.term_number}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lost-justification">Justificativa (obrigatória)</Label>
            <Textarea
              id="lost-justification"
              rows={3}
              placeholder="Ex.: Notebook furtado em viagem a trabalho, B.O. nº..."
              value={justification}
              onChange={(event) => setJustification(event.target.value)}
            />
          </div>
          {formError && <DidacticAlert error={formError} />}
          <DialogFooter>
            <Button type="button" variant="destructive" disabled={!justification.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? 'Salvando...' : 'Confirmar perda'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
