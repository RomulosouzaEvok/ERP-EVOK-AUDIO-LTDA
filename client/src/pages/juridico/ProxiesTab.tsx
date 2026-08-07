import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ScrollText } from 'lucide-react';

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
import { ProxyStatusBadge, formatDate } from './juridicoShared';

/** Aba Procurações — `/juridico`, UC-55: vigência/revogação. Default de listagem exclui revogadas/vencidas. */
export function ProxiesTab() {
  const [statusFilter, setStatusFilter] = React.useState<jurApi.ProxyStatus | ''>('');
  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['jur-proxies', statusFilter],
    queryFn: () => jurApi.listProxies({ status: statusFilter || undefined, limit: 50 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm text-muted-foreground">Status</Label>
          <SelectNative className="max-w-52" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as jurApi.ProxyStatus | '')}>
            <option value="">Vigentes (padrão)</option>
            <option value="active">Ativa</option>
            <option value="revoked">Revogada</option>
            <option value="expired">Vencida</option>
          </SelectNative>
        </div>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Nova procuração
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Outorgado</TableHead>
            <TableHead>Forma</TableHead>
            <TableHead>Emissão</TableHead>
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
                Não foi possível carregar as procurações.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((proxy) => (
            <TableRow key={proxy.id} className="border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5">
              <TableCell>{proxy.grantee_name}</TableCell>
              <TableCell>{proxy.proxy_form === 'public' ? 'Pública' : 'Particular'}</TableCell>
              <TableCell>{formatDate(proxy.issue_date)}</TableCell>
              <TableCell>{proxy.expiration_date ? formatDate(proxy.expiration_date) : 'Indeterminada'}</TableCell>
              <TableCell>
                <ProxyStatusBadge status={proxy.status} />
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => setDetailId(proxy.id)}>
                  Detalhes
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ScrollText className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhuma procuração encontrada.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <CreateProxyDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <ProxyDetailDialog proxyId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function CreateProxyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [granteeName, setGranteeName] = React.useState('');
  const [powersText, setPowersText] = React.useState('');
  const [form, setForm] = React.useState<jurApi.ProxyForm>('private');
  const [issueDate, setIssueDate] = React.useState('');
  const [expirationDate, setExpirationDate] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setError(null);
      setGranteeName('');
      setPowersText('');
      setForm('private');
      setIssueDate('');
      setExpirationDate('');
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: () =>
      jurApi.createProxy({
        grantee_name: granteeName,
        powers_text: powersText,
        form,
        issue_date: issueDate,
        expiration_date: expirationDate || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jur-proxies'] });
      onClose();
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível cadastrar a procuração')),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova procuração</DialogTitle>
        </DialogHeader>

        {error && <DidacticAlert error={error} />}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Outorgado</Label>
            <Input value={granteeName} onChange={(e) => setGranteeName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Poderes</Label>
            <Textarea rows={2} value={powersText} onChange={(e) => setPowersText(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Forma</Label>
              <SelectNative value={form} onChange={(e) => setForm(e.target.value as jurApi.ProxyForm)}>
                <option value="private">Particular</option>
                <option value="public">Pública</option>
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Emissão</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Vencimento</Label>
              <Input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!granteeName.trim() || !powersText.trim() || !issueDate || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProxyDetailDialog({ proxyId, onClose }: { proxyId: number | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [communicationRecord, setCommunicationRecord] = React.useState('');

  const { data: proxy, isLoading } = useQuery({
    queryKey: ['jur-proxy-detail', proxyId],
    queryFn: () => jurApi.getProxy(proxyId!),
    enabled: proxyId != null,
  });

  React.useEffect(() => {
    if (proxyId != null) {
      setError(null);
      setCommunicationRecord('');
    }
  }, [proxyId]);

  const revokeMutation = useMutation({
    mutationFn: () => jurApi.revokeProxy(proxyId!, { communication_record: communicationRecord }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['jur-proxy-detail', proxyId] });
      queryClient.invalidateQueries({ queryKey: ['jur-proxies'] });
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível revogar a procuração')),
  });

  return (
    <Dialog open={proxyId != null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{proxy ? proxy.grantee_name : 'Procuração'}</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {proxy && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <ProxyStatusBadge status={proxy.status} />
              <span className="text-xs text-muted-foreground">
                {formatDate(proxy.issue_date)} — {proxy.expiration_date ? formatDate(proxy.expiration_date) : 'indeterminada'}
              </span>
            </div>
            <p className="text-sm">{proxy.powers_description}</p>
            {proxy.power_tags && <p className="text-xs text-muted-foreground">Tags: {proxy.power_tags}</p>}

            {error && <DidacticAlert error={error} />}

            {proxy.status === 'active' && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-semibold">Revogar procuração</p>
                <Textarea
                  rows={2}
                  placeholder="Registro de comunicação ao outorgado (obrigatório)"
                  value={communicationRecord}
                  onChange={(e) => setCommunicationRecord(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="self-start"
                  disabled={!communicationRecord.trim() || revokeMutation.isPending}
                  onClick={() => revokeMutation.mutate()}
                >
                  Revogar
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
