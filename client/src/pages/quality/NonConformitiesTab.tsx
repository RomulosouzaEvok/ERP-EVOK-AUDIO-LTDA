import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';

import * as nonConformitiesApi from '@/api/nonConformities';
import * as productsApi from '@/api/products';
import * as suppliersApi from '@/api/suppliers';
import { extractApiErrorMessage } from '@/api/httpClient';
import { useAuth } from '@/context/AuthContext';
import { HandoffDot } from '@/components/HandoffDot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';

export interface NonConformityPrefill {
  product_id?: number;
  product_label?: string;
  supplier_id?: number;
  lot_number?: string;
  description?: string;
  origin?: nonConformitiesApi.NonConformityOrigin;
}

const SEVERITY_LABEL: Record<nonConformitiesApi.NonConformitySeverity, string> = {
  critical: 'Crítica',
  major: 'Maior',
  minor: 'Menor',
};

const SEVERITY_BADGE: Record<nonConformitiesApi.NonConformitySeverity, BadgeProps['variant']> = {
  critical: 'destructive',
  major: 'warning',
  minor: 'secondary',
};

const STATUS_LABEL: Record<nonConformitiesApi.NonConformityStatus, string> = {
  open: 'Aberta',
  analysis: 'Em análise',
  corrective_action: 'Ação corretiva',
  effectiveness_check: 'Verificação de eficácia',
  closed: 'Encerrada',
  canceled: 'Cancelada',
};

const STATUS_BADGE: Record<nonConformitiesApi.NonConformityStatus, BadgeProps['variant']> = {
  open: 'warning',
  analysis: 'secondary',
  corrective_action: 'secondary',
  effectiveness_check: 'secondary',
  closed: 'success',
  canceled: 'destructive',
};

const ORIGIN_LABEL: Record<nonConformitiesApi.NonConformityOrigin, string> = {
  incoming: 'Recebimento',
  in_process: 'Em processo',
  final: 'Inspeção final',
  audit: 'Auditoria',
  customer_complaint: 'Reclamação de cliente',
  supplier: 'Fornecedor',
};

const DEFECT_TYPE_LABEL: Record<nonConformitiesApi.NonConformityDefectType, string> = {
  dimensional: 'Dimensional',
  visual: 'Visual',
  electrical: 'Elétrico',
  acoustic: 'Acústico',
  material: 'Material',
  packaging: 'Embalagem',
  other: 'Outro',
};

const IMMEDIATE_ACTION_LABEL: Record<nonConformitiesApi.NonConformityImmediateAction, string> = {
  rework: 'Retrabalho',
  scrap: 'Sucateamento',
  return_supplier: 'Devolução ao fornecedor',
  use_as_is: 'Uso como está',
  sorting: 'Triagem/Seleção',
  other: 'Outro',
};


const nonConformitySchema = z.object({
  origin: z.enum(['incoming', 'in_process', 'final', 'audit', 'customer_complaint', 'supplier']),
  defect_type: z.enum(['dimensional', 'visual', 'electrical', 'acoustic', 'material', 'packaging', 'other']),
  severity: z.enum(['critical', 'major', 'minor']),
  description: z.string().min(3, 'Descreva a não-conformidade (mínimo 3 caracteres).'),
  immediate_action: z.enum(['rework', 'scrap', 'return_supplier', 'use_as_is', 'sorting', 'other']),
  immediate_action_desc: z.string().optional(),
  product_id: z.string().optional(),
  supplier_id: z.string().optional(),
  lot_number: z.string().optional(),
  quantity_affected: z.coerce.number().min(0).optional(),
});

type NonConformityFormData = z.infer<typeof nonConformitySchema>;

const EMPTY_DEFAULTS: NonConformityFormData = {
  origin: 'in_process',
  defect_type: 'other',
  severity: 'minor',
  description: '',
  immediate_action: 'rework',
  immediate_action_desc: '',
  product_id: '',
  supplier_id: '',
  lot_number: '',
  quantity_affected: undefined,
};

/** Aba B: registro e acompanhamento de não-conformidades (RNC). */
export function NonConformitiesTab({
  prefill,
  onPrefillConsumed,
}: {
  prefill: NonConformityPrefill | null;
  onPrefillConsumed: () => void;
}) {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();

  const [open, setOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<nonConformitiesApi.NonConformityStatus | ''>('');
  const [severityFilter, setSeverityFilter] = React.useState<nonConformitiesApi.NonConformitySeverity | ''>('');
  const [page, setPage] = React.useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['non-conformities', page, statusFilter, severityFilter],
    queryFn: () =>
      nonConformitiesApi.listNonConformities({
        limit: 20,
        page,
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
      }),
  });

  const { data: products } = useQuery({
    queryKey: ['products-all-for-nc'],
    queryFn: () => productsApi.listProducts({ limit: 200 }),
    enabled: open,
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-all-for-nc'],
    queryFn: () => suppliersApi.listSuppliers({ limit: 200 }),
    enabled: open,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NonConformityFormData>({
    resolver: zodResolver(nonConformitySchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  // Ao chegar um prefill (vindo do bloqueio de lote na aba de inspeção), abre
  // o dialog já com os campos preenchidos.
  React.useEffect(() => {
    if (prefill) {
      reset({
        ...EMPTY_DEFAULTS,
        origin: prefill.origin ?? ('incoming' as nonConformitiesApi.NonConformityOrigin),
        description: prefill.description ?? '',
        product_id: prefill.product_id ? String(prefill.product_id) : '',
        supplier_id: prefill.supplier_id ? String(prefill.supplier_id) : '',
        lot_number: prefill.lot_number ?? '',
      });
      setOpen(true);
      onPrefillConsumed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['non-conformities'] });

  const createMutation = useMutation({
    mutationFn: (values: NonConformityFormData) =>
      nonConformitiesApi.createNonConformity({
        origin: values.origin,
        defect_type: values.defect_type,
        severity: values.severity,
        description: values.description,
        immediate_action: values.immediate_action,
        immediate_action_desc: values.immediate_action_desc || undefined,
        product_id: values.product_id ? Number(values.product_id) : undefined,
        supplier_id: values.supplier_id ? Number(values.supplier_id) : undefined,
        lot_number: values.lot_number || undefined,
        quantity_affected: values.quantity_affected,
      }),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['quality-lots'] });
      setOpen(false);
      reset(EMPTY_DEFAULTS);
      setFormError(null);
    },
    onError: (error) => setFormError(extractApiErrorMessage(error, 'Não foi possível registrar a não-conformidade.')),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor="nc-status-filter" className="text-sm text-muted-foreground">
            Status
          </Label>
          <SelectNative
            id="nc-status-filter"
            className="max-w-48"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as nonConformitiesApi.NonConformityStatus | '');
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectNative>

          <Label htmlFor="nc-severity-filter" className="text-sm text-muted-foreground">
            Severidade
          </Label>
          <SelectNative
            id="nc-severity-filter"
            className="max-w-40"
            value={severityFilter}
            onChange={(event) => {
              setSeverityFilter(event.target.value as nonConformitiesApi.NonConformitySeverity | '');
              setPage(1);
            }}
          >
            <option value="">Todas</option>
            {Object.entries(SEVERITY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectNative>
        </div>

        {canWrite && (
          <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
              setOpen(nextOpen);
              if (nextOpen) reset(EMPTY_DEFAULTS);
              if (!nextOpen) setFormError(null);
            }}
          >
            <Button onClick={() => setOpen(true)}>
              <Plus /> Nova RNC
            </Button>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nova não-conformidade</DialogTitle>
              </DialogHeader>
              <form
                className="flex flex-col gap-3"
                onSubmit={handleSubmit((values) => createMutation.mutate(values))}
                noValidate
              >
                <p className="text-sm text-muted-foreground">
                  O número da RNC é gerado automaticamente pelo sistema.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="origin">Origem *</Label>
                    <SelectNative id="origin" {...register('origin')}>
                      {Object.entries(ORIGIN_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="defect_type">Tipo de defeito *</Label>
                    <SelectNative id="defect_type" {...register('defect_type')}>
                      {Object.entries(DEFECT_TYPE_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="severity">Severidade *</Label>
                    <SelectNative id="severity" {...register('severity')}>
                      {Object.entries(SEVERITY_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="description">Descrição *</Label>
                  <textarea
                    id="description"
                    className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...register('description')}
                  />
                  {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="immediate_action">Ação imediata *</Label>
                    <SelectNative id="immediate_action" {...register('immediate_action')}>
                      {Object.entries(IMMEDIATE_ACTION_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="quantity_affected">Quantidade afetada</Label>
                    <Input id="quantity_affected" type="number" step="any" min="0" {...register('quantity_affected')} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="immediate_action_desc">Detalhe da ação imediata</Label>
                  <Input id="immediate_action_desc" {...register('immediate_action_desc')} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="product_id">Produto (opcional)</Label>
                    <Controller
                      control={control}
                      name="product_id"
                      render={({ field }) => (
                        <SelectNative id="product_id" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)}>
                          <option value="">Nenhum</option>
                          {products?.data.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.code} — {product.name}
                            </option>
                          ))}
                        </SelectNative>
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="supplier_id">Fornecedor (opcional)</Label>
                    <Controller
                      control={control}
                      name="supplier_id"
                      render={({ field }) => (
                        <SelectNative id="supplier_id" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)}>
                          <option value="">Nenhum</option>
                          {suppliers?.data.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.trade_name || supplier.company_name}
                            </option>
                          ))}
                        </SelectNative>
                      )}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lot_number">Nº do lote (opcional)</Label>
                  <Input id="lot_number" {...register('lot_number')} />
                  <p className="text-xs text-muted-foreground">
                    Se o produto e o número do lote informados corresponderem a um lote existente, o sistema bloqueia
                    esse lote automaticamente ao registrar a RNC.
                  </p>
                </div>

                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                    {isSubmitting || createMutation.isPending ? 'Salvando...' : 'Registrar RNC'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-6" />
            <TableHead>RNC</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Severidade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={7} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-destructive">
                Não foi possível carregar as não-conformidades. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((nc) => (
            <TableRow key={nc.id}>
              <TableCell>{nc.handoff_signal && <HandoffDot signal={nc.handoff_signal} />}</TableCell>
              <TableCell className="font-medium">{nc.nc_number}</TableCell>
              <TableCell>{nc.product ? `${nc.product.code} — ${nc.product.name}` : '-'}</TableCell>
              <TableCell>{ORIGIN_LABEL[nc.origin]}</TableCell>
              <TableCell>
                <Badge variant={SEVERITY_BADGE[nc.severity]}>{SEVERITY_LABEL[nc.severity]}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE[nc.status]}>{STATUS_LABEL[nc.status]}</Badge>
              </TableCell>
              <TableCell>{new Date(nc.report_date ?? nc.createdAt).toLocaleDateString('pt-BR')}</TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Nenhuma não-conformidade registrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />
    </div>
  );
}
