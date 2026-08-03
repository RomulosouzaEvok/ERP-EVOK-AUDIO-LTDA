import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, CheckCircle2, Ban } from 'lucide-react';

import * as engineeringApi from '@/api/engineering';
import * as productsApi from '@/api/products';
import { extractApiErrorMessage } from '@/api/httpClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';

const DRAWING_TYPE_LABEL: Record<engineeringApi.ProductDrawingType, string> = {
  assembly: 'Montagem',
  detail: 'Detalhe',
  exploded: 'Explodido',
  schematic: 'Esquemático',
  bom: 'Estrutura (BOM)',
};

const DRAWING_STATUS_LABEL: Record<engineeringApi.ProductDrawingStatus, string> = {
  draft: 'Rascunho',
  released: 'Liberado',
  obsolete: 'Obsoleto',
  canceled: 'Cancelado',
};

const DRAWING_STATUS_BADGE: Record<engineeringApi.ProductDrawingStatus, BadgeProps['variant']> = {
  draft: 'secondary',
  released: 'success',
  obsolete: 'warning',
  canceled: 'destructive',
};

const drawingSchema = z.object({
  product_id: z.string().min(1, 'Selecione o produto.'),
  drawing_number: z.string().trim().min(1, 'Informe o número do desenho.').max(50),
  revision: z.string().optional(),
  title: z.string().trim().min(1, 'Informe o título.').max(200),
  drawing_type: z.enum(['assembly', 'detail', 'exploded', 'schematic', 'bom']),
  material_spec: z.string().optional(),
  dimensions: z.string().optional(),
  tolerances: z.string().optional(),
  notes: z.string().optional(),
});

type DrawingFormData = z.infer<typeof drawingSchema>;

const EMPTY_DEFAULTS: DrawingFormData = {
  product_id: '',
  drawing_number: '',
  revision: '',
  title: '',
  drawing_type: 'detail',
  material_spec: '',
  dimensions: '',
  tolerances: '',
  notes: '',
};

/** Aba B: Desenhos técnicos — CRUD + liberação/obsolescência (admin). */
export function DrawingsTab() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const canApprove = hasRole('admin');
  const queryClient = useQueryClient();

  const [productFilter, setProductFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<engineeringApi.ProductDrawingStatus | ''>('');
  const [page, setPage] = React.useState(1);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<engineeringApi.ProductDrawing | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [confirmAction, setConfirmAction] = React.useState<{
    drawing: engineeringApi.ProductDrawing;
    type: 'release' | 'obsolete';
  } | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['engineering-drawings', page, productFilter, statusFilter],
    queryFn: () =>
      engineeringApi.listProductDrawings({
        page,
        limit: 20,
        product_id: productFilter ? Number(productFilter) : undefined,
        status: statusFilter || undefined,
      }),
  });

  const { data: products } = useQuery({
    queryKey: ['products-all-for-eng-drawing'],
    queryFn: () => productsApi.listProducts({ limit: 200 }),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DrawingFormData>({
    resolver: zodResolver(drawingSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['engineering-drawings'] });

  const createMutation = useMutation({
    mutationFn: (values: DrawingFormData) =>
      engineeringApi.createProductDrawing({
        product_id: Number(values.product_id),
        drawing_number: values.drawing_number,
        revision: values.revision || undefined,
        title: values.title,
        drawing_type: values.drawing_type,
        material_spec: values.material_spec || undefined,
        dimensions: values.dimensions || undefined,
        tolerances: values.tolerances || undefined,
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      invalidate();
      closeDialog();
    },
    onError: (error) => setFormError(extractApiErrorMessage(error, 'Não foi possível criar o desenho técnico.')),
  });

  const updateMutation = useMutation({
    mutationFn: (values: DrawingFormData) =>
      engineeringApi.updateProductDrawing(editing!.id, {
        drawing_number: values.drawing_number,
        revision: values.revision || undefined,
        title: values.title,
        drawing_type: values.drawing_type,
        material_spec: values.material_spec || null,
        dimensions: values.dimensions || null,
        tolerances: values.tolerances || null,
        notes: values.notes || null,
      }),
    onSuccess: () => {
      invalidate();
      closeDialog();
    },
    onError: (error) => setFormError(extractApiErrorMessage(error, 'Não foi possível atualizar o desenho técnico.')),
  });

  const releaseMutation = useMutation({
    mutationFn: (id: number) => engineeringApi.releaseProductDrawing(id),
    onSuccess: () => {
      invalidate();
      setConfirmAction(null);
      setActionError(null);
    },
    onError: (error) => setActionError(extractApiErrorMessage(error, 'Não foi possível liberar o desenho.')),
  });

  const obsoleteMutation = useMutation({
    mutationFn: (id: number) => engineeringApi.obsoleteProductDrawing(id),
    onSuccess: () => {
      invalidate();
      setConfirmAction(null);
      setActionError(null);
    },
    onError: (error) => setActionError(extractApiErrorMessage(error, 'Não foi possível tornar o desenho obsoleto.')),
  });

  function closeDialog() {
    setOpen(false);
    setEditing(null);
    setFormError(null);
    reset(EMPTY_DEFAULTS);
  }

  function openCreate() {
    setEditing(null);
    reset(EMPTY_DEFAULTS);
    setFormError(null);
    setOpen(true);
  }

  function openEdit(drawing: engineeringApi.ProductDrawing) {
    setEditing(drawing);
    reset({
      product_id: String(drawing.product_id),
      drawing_number: drawing.drawing_number,
      revision: drawing.revision ?? '',
      title: drawing.title,
      drawing_type: drawing.drawing_type ?? 'detail',
      material_spec: drawing.material_spec ?? '',
      dimensions: drawing.dimensions ?? '',
      tolerances: drawing.tolerances ?? '',
      notes: drawing.notes ?? '',
    });
    setFormError(null);
    setOpen(true);
  }

  function handleConfirm() {
    if (!confirmAction) return;
    if (confirmAction.type === 'release') releaseMutation.mutate(confirmAction.drawing.id);
    else obsoleteMutation.mutate(confirmAction.drawing.id);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor="draw-product-filter" className="text-sm text-muted-foreground">
            Produto
          </Label>
          <SelectNative
            id="draw-product-filter"
            className="max-w-56"
            value={productFilter}
            onChange={(event) => {
              setProductFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {products?.data.map((product) => (
              <option key={product.id} value={product.id}>
                {product.code} — {product.name}
              </option>
            ))}
          </SelectNative>

          <Label htmlFor="draw-status-filter" className="text-sm text-muted-foreground">
            Status
          </Label>
          <SelectNative
            id="draw-status-filter"
            className="max-w-40"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as engineeringApi.ProductDrawingStatus | '');
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {Object.entries(DRAWING_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectNative>
        </div>

        {canWrite && (
          <Button onClick={openCreate}>
            <Plus /> Novo desenho
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Rev.</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Status</TableHead>
            {(canWrite || canApprove) && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={canWrite || canApprove ? 7 : 6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={canWrite || canApprove ? 7 : 6} className="text-center text-destructive">
                Não foi possível carregar os desenhos técnicos. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((drawing) => (
            <TableRow key={drawing.id}>
              <TableCell className="font-medium">{drawing.drawing_number}</TableCell>
              <TableCell>{drawing.revision ?? '-'}</TableCell>
              <TableCell>{drawing.title}</TableCell>
              <TableCell>{drawing.product ? `${drawing.product.code} — ${drawing.product.name}` : '-'}</TableCell>
              <TableCell>{drawing.drawing_type ? DRAWING_TYPE_LABEL[drawing.drawing_type] : '-'}</TableCell>
              <TableCell>
                <Badge variant={DRAWING_STATUS_BADGE[drawing.status]}>{DRAWING_STATUS_LABEL[drawing.status]}</Badge>
              </TableCell>
              {(canWrite || canApprove) && (
                <TableCell className="flex flex-wrap gap-2">
                  {canWrite && drawing.status === 'draft' && (
                    <Button size="sm" variant="outline" onClick={() => openEdit(drawing)}>
                      <Pencil className="size-4" /> Editar
                    </Button>
                  )}
                  {canApprove && drawing.status === 'draft' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActionError(null);
                        setConfirmAction({ drawing, type: 'release' });
                      }}
                    >
                      <CheckCircle2 className="size-4" /> Liberar
                    </Button>
                  )}
                  {canApprove && drawing.status === 'released' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setActionError(null);
                        setConfirmAction({ drawing, type: 'obsolete' });
                      }}
                    >
                      <Ban className="size-4" /> Tornar obsoleto
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={canWrite || canApprove ? 7 : 6} className="text-center text-muted-foreground">
                Nenhum desenho técnico registrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : closeDialog())}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar desenho ${editing.drawing_number}` : 'Novo desenho técnico'}</DialogTitle>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={handleSubmit((values) =>
              editing ? updateMutation.mutate(values) : createMutation.mutate(values),
            )}
            noValidate
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product_id">Produto *</Label>
                <Controller
                  control={control}
                  name="product_id"
                  render={({ field }) => (
                    <SelectNative
                      id="product_id"
                      value={field.value}
                      disabled={Boolean(editing)}
                      onChange={(e) => field.onChange(e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {products?.data.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.code} — {product.name}
                        </option>
                      ))}
                    </SelectNative>
                  )}
                />
                {errors.product_id && <p className="text-sm text-destructive">{errors.product_id.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="drawing_type">Tipo</Label>
                <SelectNative id="drawing_type" {...register('drawing_type')}>
                  {Object.entries(DRAWING_TYPE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectNative>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="drawing_number">Número do desenho *</Label>
                <Input id="drawing_number" {...register('drawing_number')} />
                {errors.drawing_number && <p className="text-sm text-destructive">{errors.drawing_number.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="revision">Revisão</Label>
                <Input id="revision" {...register('revision')} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Título *</Label>
              <Input id="title" {...register('title')} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dimensions">Dimensões</Label>
                <Input id="dimensions" {...register('dimensions')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tolerances">Tolerâncias</Label>
                <Input id="tolerances" {...register('tolerances')} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="material_spec">Especificação de material</Label>
              <textarea
                id="material_spec"
                className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register('material_spec')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Observações</Label>
              <textarea
                id="notes"
                className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register('notes')}
              />
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
                {isSubmitting || createMutation.isPending || updateMutation.isPending
                  ? 'Salvando...'
                  : editing
                    ? 'Salvar alterações'
                    : 'Criar desenho'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === 'release'
                ? `Liberar desenho ${confirmAction.drawing.drawing_number}`
                : `Tornar obsoleto o desenho ${confirmAction?.drawing.drawing_number}`}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === 'release'
                ? 'O desenho passará de rascunho para liberado, ficando disponível para uso em produção.'
                : 'O desenho liberado deixará de ser válido para uso em produção. Esta ação não pode ser desfeita.'}
            </DialogDescription>
          </DialogHeader>
          {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={releaseMutation.isPending || obsoleteMutation.isPending}>
              Cancelar
            </Button>
            <Button
              variant={confirmAction?.type === 'obsolete' ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={releaseMutation.isPending || obsoleteMutation.isPending}
            >
              {releaseMutation.isPending || obsoleteMutation.isPending ? 'Processando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
