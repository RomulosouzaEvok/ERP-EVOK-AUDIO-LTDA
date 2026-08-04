import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Camera, QrCode, Boxes } from 'lucide-react';

import * as assetsApi from '@/api/assets';
import { extractApiErrorMessage, getUploadUrl } from '@/api/httpClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QrCodeDialog } from '@/components/QrCodeDialog';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';

const ASSET_TYPE_LABEL: Record<string, string> = {
  machine: 'Máquina',
  equipment: 'Equipamento',
  tool: 'Ferramenta',
  furniture: 'Móvel',
  vehicle: 'Veículo',
  it: 'TI',
  other: 'Outro',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  in_maintenance: 'Em manutenção',
  decommissioned: 'Baixado',
  lost: 'Perdido',
};

const assetSchema = z.object({
  tag: z.string().trim().min(1, 'Informe a tag/plaqueta.').max(20, 'Máximo de 20 caracteres.'),
  name: z.string().trim().min(1, 'Informe o nome.'),
  asset_type: z.enum(['machine', 'equipment', 'tool', 'furniture', 'vehicle', 'it', 'other']).optional(),
  location: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  notes: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetSchema>;

/** Patrimônio: cadastro de ativos fixos, com foto e QR Code para etiquetagem física. */
export default function AssetsPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [photoAssetId, setPhotoAssetId] = React.useState<number | null>(null);
  const [qrCodeAsset, setQrCodeAsset] = React.useState<assetsApi.Asset | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [page, setPage] = React.useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['assets', page],
    queryFn: () => assetsApi.listAssets({ limit: 20, page }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssetFormData>({ resolver: zodResolver(assetSchema) });

  const createMutation = useMutation({
    mutationFn: assetsApi.createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setCreateOpen(false);
      reset();
      setFormError(null);
    },
    onError: (error) => setFormError(extractApiErrorMessage(error)),
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => assetsApi.uploadAssetPhoto(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setPhotoAssetId(null);
    },
    onError: (error) => window.alert(extractApiErrorMessage(error)),
  });

  const handlePhotoButtonClick = (assetId: number) => {
    setPhotoAssetId(assetId);
    // Aciona o input de arquivo nativo (escondido) logo em seguida.
    requestAnimationFrame(() => fileInputRef.current?.click());
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || photoAssetId === null) return;
    uploadPhotoMutation.mutate({ id: photoAssetId, file });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Boxes className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Patrimônio</h1>
            <p className="text-sm text-muted-foreground">Cadastro de ativos fixos, com foto e QR Code para etiquetagem física.</p>
          </div>
        </div>
        {canWrite && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus /> Novo ativo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo ativo</DialogTitle>
              </DialogHeader>
              <form
                className="flex flex-col gap-3"
                onSubmit={handleSubmit((values) => createMutation.mutate(values))}
                noValidate
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="tag">Tag/Plaqueta</Label>
                    <Input id="tag" {...register('tag')} />
                    {errors.tag && <p className="text-sm text-destructive">{errors.tag.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="asset_type">Tipo</Label>
                    <SelectNative id="asset_type" {...register('asset_type')}>
                      {Object.entries(ASSET_TYPE_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="brand">Marca</Label>
                    <Input id="brand" {...register('brand')} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="model">Modelo</Label>
                    <Input id="model" {...register('model')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="location">Localização</Label>
                    <Input id="location" {...register('location')} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="serial_number">Nº de série</Label>
                    <Input id="serial_number" {...register('serial_number')} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="notes">Observações</Label>
                  <Input id="notes" {...register('notes')} />
                </div>
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                    {isSubmitting ? 'Salvando...' : 'Criar ativo'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Input de arquivo escondido, compartilhado entre todas as linhas da tabela. */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Foto</TableHead>
            <TableHead>Tag</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Localização</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={7} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-destructive">
                Não foi possível carregar o patrimônio. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((asset) => (
            <TableRow key={asset.id}>
              <TableCell>
                {asset.photo_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getUploadUrl(asset.photo_path)} alt={asset.name} className="size-10 rounded object-cover" />
                ) : (
                  <div className="flex size-10 items-center justify-center rounded bg-muted text-muted-foreground">
                    <Camera className="size-4" />
                  </div>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs">{asset.tag}</TableCell>
              <TableCell>{asset.name}</TableCell>
              <TableCell>{ASSET_TYPE_LABEL[asset.asset_type] ?? asset.asset_type}</TableCell>
              <TableCell>{asset.location ?? '-'}</TableCell>
              <TableCell>
                <Badge variant={asset.status === 'active' ? 'success' : 'secondary'}>
                  {STATUS_LABEL[asset.status] ?? asset.status}
                </Badge>
              </TableCell>
              <TableCell className="flex gap-2">
                {canWrite && (
                  <Button size="sm" variant="outline" onClick={() => handlePhotoButtonClick(asset.id)}>
                    <Camera className="size-4" /> Foto
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setQrCodeAsset(asset)}>
                  <QrCode className="size-4" /> QR Code
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Nenhum ativo cadastrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      {qrCodeAsset && (
        <QrCodeDialog
          open={Boolean(qrCodeAsset)}
          onOpenChange={(open) => !open && setQrCodeAsset(null)}
          title={`${qrCodeAsset.tag} — ${qrCodeAsset.name}`}
          queryKey={['asset-qrcode', qrCodeAsset.id]}
          fetchQrCode={() => assetsApi.getAssetQrCode(qrCodeAsset.id)}
        />
      )}
    </div>
  );
}
