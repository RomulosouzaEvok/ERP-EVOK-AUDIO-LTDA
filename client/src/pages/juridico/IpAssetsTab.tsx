import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copyright, Plus } from 'lucide-react';

import * as jurApi from '@/api/juridico';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/Textarea';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IP_TYPE_LABELS, IpStatusBadge, formatDate } from './juridicoShared';

/**
 * Aba Propriedade Intelectual — `/juridico`, RF-JUR-031 a 034. `trade_secret`
 * nunca aparece na listagem nem no detalhe para quem não é `role==='admin'`
 * (§6.3) — a API já filtra/rejeita, aqui só refletimos o resultado.
 */
export function IpAssetsTab() {
  const [typeFilter, setTypeFilter] = React.useState<jurApi.IpType | ''>('');
  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['jur-ip-assets', typeFilter],
    queryFn: () => jurApi.listIpAssets({ type: typeFilter || undefined, limit: 50 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm text-muted-foreground">Tipo</Label>
          <SelectNative className="max-w-52" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as jurApi.IpType | '')}>
            <option value="">Todos</option>
            {Object.entries(IP_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectNative>
        </div>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Novo ativo
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Nº registro</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-destructive">
                Não foi possível carregar os ativos de PI.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((asset) => (
            <TableRow key={asset.id} className="border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5">
              <TableCell>{asset.title}</TableCell>
              <TableCell>{IP_TYPE_LABELS[asset.ip_type]}</TableCell>
              <TableCell>{asset.registration_number ?? '-'}</TableCell>
              <TableCell>{asset.expiration_date ? formatDate(asset.expiration_date) : asset.next_annuity_date ? formatDate(asset.next_annuity_date) : '-'}</TableCell>
              <TableCell>
                <IpStatusBadge status={asset.status} />
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => setDetailId(asset.id)}>
                  Detalhes
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Copyright className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum ativo de PI encontrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <CreateIpAssetDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => setDetailId(id)} />
      <IpAssetDetailDialog assetId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function CreateIpAssetDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [type, setType] = React.useState<jurApi.IpType>('trademark');
  const [title, setTitle] = React.useState('');
  const [registrationNumber, setRegistrationNumber] = React.useState('');
  const [holdingArea, setHoldingArea] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [expirationDate, setExpirationDate] = React.useState('');
  const [responsibleUserId, setResponsibleUserId] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setError(null);
      setType('trademark');
      setTitle('');
      setRegistrationNumber('');
      setHoldingArea('');
      setDescription('');
      setExpirationDate('');
      setResponsibleUserId('');
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: () =>
      jurApi.createIpAsset({
        type,
        title: type === 'trade_secret' ? undefined : title,
        registration_number: registrationNumber || undefined,
        holding_area: type === 'trade_secret' ? holdingArea : undefined,
        description: description || undefined,
        expiration_date: expirationDate || undefined,
        responsible_user_id: Number(responsibleUserId),
      }),
    onSuccess: (asset) => {
      queryClient.invalidateQueries({ queryKey: ['jur-ip-assets'] });
      onCreated(asset.id);
      onClose();
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível cadastrar o ativo de PI')),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo ativo de Propriedade Intelectual</DialogTitle>
        </DialogHeader>

        {error && <DidacticAlert error={error} />}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Tipo</Label>
            <SelectNative value={type} onChange={(e) => setType(e.target.value as jurApi.IpType)}>
              {Object.entries(IP_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectNative>
          </div>
          {type !== 'trade_secret' && (
            <div className="flex flex-col gap-1.5">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          )}
          {type === 'trade_secret' && (
            <div className="flex flex-col gap-1.5">
              <Label>Área detentora</Label>
              <Input value={holdingArea} onChange={(e) => setHoldingArea(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                O conteúdo do segredo nunca é armazenado — apenas metadados (RF-JUR-033).
              </p>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>Descrição</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Nº registro</Label>
              <Input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Vencimento</Label>
              <Input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>ID do responsável</Label>
              <Input type="number" value={responsibleUserId} onChange={(e) => setResponsibleUserId(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" disabled={!responsibleUserId || createMutation.isPending} onClick={() => createMutation.mutate()}>
            Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IpAssetDetailDialog({ assetId, onClose }: { assetId: number | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [contractId, setContractId] = React.useState('');

  const { data: asset, isLoading } = useQuery({
    queryKey: ['jur-ip-asset-detail', assetId],
    queryFn: () => jurApi.getIpAsset(assetId!),
    enabled: assetId != null,
  });

  React.useEffect(() => {
    if (assetId != null) {
      setError(null);
      setContractId('');
    }
  }, [assetId]);

  const linkMutation = useMutation({
    mutationFn: () => jurApi.linkIpAssetContract(assetId!, Number(contractId)),
    onSuccess: () => {
      setError(null);
      setContractId('');
      queryClient.invalidateQueries({ queryKey: ['jur-ip-asset-detail', assetId] });
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível vincular o contrato')),
  });

  return (
    <Dialog open={assetId != null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{asset ? asset.title : 'Ativo de PI'}</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {asset && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <IpStatusBadge status={asset.status} />
              <span className="text-xs text-muted-foreground">{IP_TYPE_LABELS[asset.ip_type]}</span>
            </div>
            {asset.description && <p className="text-sm">{asset.description}</p>}

            {error && <DidacticAlert error={error} />}

            <div className="flex flex-col gap-2 rounded-md border p-3">
              <p className="text-sm font-semibold">Contratos vinculados (NDA/licenciamento)</p>
              <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                {asset.contractLinks?.map((link) => (
                  <li key={link.id}>{link.contract?.contract_number ?? `Contrato #${link.contract_id}`}</li>
                ))}
                {(!asset.contractLinks || asset.contractLinks.length === 0) && <li>Nenhum contrato vinculado.</li>}
              </ul>
              <div className="flex gap-2">
                <Input type="number" placeholder="ID do contrato" value={contractId} onChange={(e) => setContractId(e.target.value)} />
                <Button size="sm" variant="outline" disabled={!contractId || linkMutation.isPending} onClick={() => linkMutation.mutate()}>
                  Vincular
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
