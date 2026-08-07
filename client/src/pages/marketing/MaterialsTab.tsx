import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Image, Plus, Upload } from 'lucide-react';

import * as marketingApi from '@/api/marketing';
import * as itemsApi from '@/api/items';
import { useAuth } from '@/context/AuthContext';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MATERIAL_TYPE_LABELS } from './marketingShared';

/** Aba "Materiais" de `/marketing` — CRUD de materiais de divulgação, upload de arquivo e aprovação dedicada (nível `approve`, RF-MKT-039). */
export function MaterialsTab() {
  const { hasRole, permissions } = useAuth();
  const canWrite = hasRole('admin') || permissions?.marketing === 'operate' || permissions?.marketing === 'approve';
  const canApprove = hasRole('admin') || permissions?.marketing === 'approve';
  const [typeFilter, setTypeFilter] = React.useState<marketingApi.MaterialType | ''>('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingMaterial, setEditingMaterial] = React.useState<marketingApi.Material | null>(null);
  const [uploadingMaterial, setUploadingMaterial] = React.useState<marketingApi.Material | null>(null);
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);

  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['marketing-materials', typeFilter],
    queryFn: () => marketingApi.listMaterials({ material_type: typeFilter || undefined, limit: 100 }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => marketingApi.approveMaterial(id),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['marketing-materials'] });
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível aprovar o material')),
  });

  const colCount = canWrite ? 7 : 6;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="material-type-filter" className="text-sm text-muted-foreground">
            Tipo
          </Label>
          <SelectNative
            id="material-type-filter"
            className="max-w-48"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as marketingApi.MaterialType | '')}
          >
            <option value="">Todos</option>
            {Object.entries(MATERIAL_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SelectNative>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Novo material
          </Button>
        )}
      </div>

      {actionError && <DidacticAlert error={actionError} />}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Versão</TableHead>
            <TableHead>Arquivo</TableHead>
            <TableHead>Aprovado</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={colCount} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={colCount} className="text-center text-destructive">
                Não foi possível carregar os materiais. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((material) => (
            <TableRow key={material.id}>
              <TableCell className="font-medium">{material.title}</TableCell>
              <TableCell>{MATERIAL_TYPE_LABELS[material.material_type]}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {material.product ? `${material.product.codigo} — ${material.product.descricao}` : '-'}
              </TableCell>
              <TableCell>{material.version}</TableCell>
              <TableCell>
                {material.file_path ? (
                  <a
                    href={`/${material.file_path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand underline"
                  >
                    Ver arquivo
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">Sem arquivo</span>
                )}
              </TableCell>
              <TableCell>
                {material.approved ? (
                  <Badge variant="success">
                    <CheckCircle2 className="size-3" />
                    Aprovado
                  </Badge>
                ) : (
                  <Badge variant="secondary">Pendente</Badge>
                )}
              </TableCell>
              {canWrite && (
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setEditingMaterial(material)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setUploadingMaterial(material)}>
                      <Upload className="size-3.5" />
                    </Button>
                    {canApprove && !material.approved && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(material.id)}
                      >
                        Aprovar
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={colCount} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Image className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum material cadastrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <MaterialDialog mode="create" open={createOpen} material={null} onClose={() => setCreateOpen(false)} />
      <MaterialDialog mode="edit" open={Boolean(editingMaterial)} material={editingMaterial} onClose={() => setEditingMaterial(null)} />
      <UploadMaterialFileDialog material={uploadingMaterial} onClose={() => setUploadingMaterial(null)} />
    </div>
  );
}

const materialSchema = z.object({
  title: z.string().trim().min(1, 'Informe o título.').max(200),
  material_type: z.enum(['catalog', 'flyer', 'banner', 'video', 'manual', 'technical_sheet', 'presentation']),
  product_id: z.string().trim().optional(),
  stock_item_id: z.string().trim().optional(),
  version: z.string().trim().max(10).optional(),
});

type MaterialFormData = z.infer<typeof materialSchema>;

function MaterialDialog({
  mode,
  open,
  material,
  onClose,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  material: marketingApi.Material | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const [productSearch, setProductSearch] = React.useState('');
  const [stockSearch, setStockSearch] = React.useState('');

  const { data: items } = useQuery({
    queryKey: ['items-select-marketing', productSearch],
    queryFn: () => itemsApi.listItems({ search: productSearch || undefined, limit: 20 }),
    enabled: open,
  });

  const { data: stockItems } = useQuery({
    queryKey: ['items-select-marketing-stock', stockSearch],
    queryFn: () => itemsApi.listItems({ search: stockSearch || undefined, limit: 20 }),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: { title: '', material_type: 'catalog' },
  });

  const mutation = useMutation({
    mutationFn: (values: MaterialFormData) => {
      const payload = { ...values, product_id: values.product_id || undefined, stock_item_id: values.stock_item_id || undefined };
      return mode === 'create'
        ? marketingApi.createMaterial(payload as marketingApi.CreateMaterialInput)
        : marketingApi.updateMaterial(material!.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-materials'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível salvar o material')),
  });

  React.useEffect(() => {
    if (open) {
      if (mode === 'edit' && material) {
        reset({
          title: material.title,
          material_type: material.material_type,
          product_id: material.product_id ?? '',
          stock_item_id: material.stock_item_id ?? '',
          version: material.version,
        });
      } else {
        reset({ title: '', material_type: 'catalog' });
      }
      setFormError(null);
      setProductSearch('');
      setStockSearch('');
    }
  }, [open, mode, material, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo material' : `Editar material — ${material?.title ?? ''}`}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="material-title">Título *</Label>
            <Input id="material-title" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="material-type">Tipo *</Label>
              <SelectNative id="material-type" {...register('material_type')}>
                {Object.entries(MATERIAL_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="material-version">Versão</Label>
              <Input id="material-version" placeholder="01" {...register('version')} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="material-product-search">Produto retratado (opcional)</Label>
            <Input
              id="material-product-search"
              placeholder="Buscar por código/descrição..."
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
            />
            <SelectNative id="material-product" {...register('product_id')}>
              <option value="">-</option>
              {(items?.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>{item.codigo} — {item.descricao}</option>
              ))}
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="material-stock-search">Item de estoque (material físico, opcional)</Label>
            <Input
              id="material-stock-search"
              placeholder="Buscar por código/descrição..."
              value={stockSearch}
              onChange={(event) => setStockSearch(event.target.value)}
            />
            <SelectNative id="material-stock-item" {...register('stock_item_id')}>
              <option value="">-</option>
              {(stockItems?.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>{item.codigo} — {item.descricao}</option>
              ))}
            </SelectNative>
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : mode === 'create' ? 'Criar material' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Diálogo dedicado de upload/substituição do arquivo do material — nova versão sobre material aprovado reverte `approved=false` (RF-MKT-040). */
function UploadMaterialFileDialog({ material, onClose }: { material: marketingApi.Material | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [file, setFile] = React.useState<File | null>(null);
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  React.useEffect(() => {
    setFile(null);
    setFormError(null);
  }, [material]);

  const mutation = useMutation({
    mutationFn: () => marketingApi.uploadMaterialFile(material!.id, file!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-materials'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível enviar o arquivo')),
  });

  return (
    <Dialog open={Boolean(material)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar arquivo — {material?.title ?? ''}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {material?.approved && (
            <p className="text-xs text-muted-foreground">
              Este material já está aprovado — enviar uma nova versão reverte a aprovação, exigindo nova análise.
            </p>
          )}
          <Input
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.mp4,.mov,.ppt,.pptx,.doc,.docx"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          {formError && <DidacticAlert error={formError} />}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" disabled={!file || mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? 'Enviando...' : 'Enviar arquivo'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
