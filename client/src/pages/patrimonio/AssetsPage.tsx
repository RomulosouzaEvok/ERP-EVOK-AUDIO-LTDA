import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Camera, QrCode, Boxes, AlertTriangle } from 'lucide-react';

import * as assetsApi from '@/api/assets';
import { getUploadUrl } from '@/api/httpClient';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
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
  license: 'Licença de software',
  other: 'Outro',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  in_maintenance: 'Em manutenção',
  decommissioned: 'Baixado',
  lost: 'Perdido',
  returned_to_supplier: 'Devolvido ao fornecedor',
};

/** Dias de antecedência para o alerta de licença perto do vencimento (Bloco F, TODO_REORGANIZACAO_DEPARTAMENTOS.md). */
const LICENSE_EXPIRY_WARNING_DAYS = 30;

const assetSchema = z.object({
  tag: z.string().trim().min(1, 'Informe a tag/plaqueta.').max(20, 'Máximo de 20 caracteres.'),
  name: z.string().trim().min(1, 'Informe o nome.'),
  asset_type: z.enum(['machine', 'equipment', 'tool', 'furniture', 'vehicle', 'it', 'license', 'other']).optional(),
  location: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  license_expires_at: z.string().optional(),
  notes: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetSchema>;

/** Dias restantes até `dateStr` (negativo se já venceu). */
function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Badge de status da licença: usa o mesmo vocabulário visual dos outros
 * alertas de vencimento do sistema (badge simples, não o `DidacticAlert` —
 * este último é voltado a erros de mutation com ação corretiva; aqui é só
 * um aviso informativo de prazo, então um badge direto na linha da tabela
 * comunica melhor sem exigir um componente de erro).
 */
function LicenseExpiryBadge({ expiresAt }: { expiresAt: string }) {
  const days = daysUntil(expiresAt);
  const formatted = new Date(`${expiresAt}T00:00:00`).toLocaleDateString('pt-BR');

  if (days < 0) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="size-3" /> Vencida em {formatted}
      </Badge>
    );
  }
  if (days <= LICENSE_EXPIRY_WARNING_DAYS) {
    return (
      <Badge variant="warning" className="gap-1">
        <AlertTriangle className="size-3" /> Vence em {days}d ({formatted})
      </Badge>
    );
  }
  return <span className="text-xs text-muted-foreground">Vence em {formatted}</span>;
}

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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AssetFormData>({ resolver: zodResolver(assetSchema) });

  const selectedAssetType = watch('asset_type');
  const isLicense = selectedAssetType === 'license';

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
                onSubmit={handleSubmit((values) =>
                  createMutation.mutate({
                    ...values,
                    license_expires_at: values.asset_type === 'license' ? values.license_expires_at || undefined : undefined,
                  }),
                )}
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
                {isLicense && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="license_expires_at">Vencimento da licença</Label>
                    <Input id="license_expires_at" type="date" {...register('license_expires_at')} />
                    <p className="text-xs text-muted-foreground">
                      Só se aplica a licença perpétua/multianual capitalizada como ativo — assinatura de curto prazo
                      (SaaS) não deve virar registro de Patrimônio.
                    </p>
                  </div>
                )}
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
            <TableHead>Licença</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={8} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-destructive">
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
              <TableCell className="font-mono text-xs">
                {asset.tag}
                {asset.purchase_item_id && (
                  <p className="mt-0.5 font-sans text-[10px] font-normal text-muted-foreground">
                    Origem: compra #{asset.purchase_item_id}
                  </p>
                )}
              </TableCell>
              <TableCell>{asset.name}</TableCell>
              <TableCell>{ASSET_TYPE_LABEL[asset.asset_type] ?? asset.asset_type}</TableCell>
              <TableCell>{asset.location ?? '-'}</TableCell>
              <TableCell>
                {asset.asset_type === 'license' && asset.license_expires_at ? (
                  <LicenseExpiryBadge expiresAt={asset.license_expires_at} />
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </TableCell>
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
              <TableCell colSpan={8} className="text-center text-muted-foreground">
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
