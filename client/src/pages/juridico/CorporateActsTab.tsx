import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Landmark, Plus } from 'lucide-react';

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
import { CORPORATE_ACT_TYPE_LABELS, CorporateActStatusBadge, formatDate } from './juridicoShared';

/**
 * Aba Atos Societários — `/juridico`, RF-JUR-030 (correção 2026-08-08).
 * Registro de assembleias/reuniões de sócios/alterações de contrato social
 * (Secretaria/Governança). Um ato criado sempre entra em `draft`; a
 * transição para `registered` só acontece ao informar
 * `registration_protocol` + `registered_at` juntos em uma edição — a partir
 * daí o registro fica IMUTÁVEL (a tela desabilita a edição, não só o
 * backend rejeita).
 */
export function CorporateActsTab() {
  const [typeFilter, setTypeFilter] = React.useState<jurApi.CorporateActType | ''>('');
  const [statusFilter, setStatusFilter] = React.useState<jurApi.CorporateActStatus | ''>('');
  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['jur-corporate-acts', typeFilter, statusFilter],
    queryFn: () => jurApi.listCorporateActs({ act_type: typeFilter || undefined, status: statusFilter || undefined, limit: 50 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm text-muted-foreground">Tipo</Label>
            <SelectNative className="max-w-56" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as jurApi.CorporateActType | '')}>
              <option value="">Todos</option>
              {Object.entries(CORPORATE_ACT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm text-muted-foreground">Status</Label>
            <SelectNative className="max-w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as jurApi.CorporateActStatus | '')}>
              <option value="">Todos</option>
              <option value="draft">Rascunho</option>
              <option value="registered">Registrado</option>
            </SelectNative>
          </div>
        </div>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Novo ato societário
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Data do ato</TableHead>
            <TableHead>Protocolo de registro</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-destructive">
                Não foi possível carregar os atos societários.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((act) => (
            <TableRow key={act.id} className="border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5">
              <TableCell className="max-w-64 truncate" title={act.title}>
                {act.title}
              </TableCell>
              <TableCell>{CORPORATE_ACT_TYPE_LABELS[act.act_type]}</TableCell>
              <TableCell>{formatDate(act.act_date)}</TableCell>
              <TableCell>{act.registration_protocol ?? '-'}</TableCell>
              <TableCell>
                <CorporateActStatusBadge status={act.status} />
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => setDetailId(act.id)}>
                  Detalhes
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Landmark className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum ato societário encontrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <CreateCorporateActDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => setDetailId(id)} />
      <CorporateActDetailDialog actId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function CreateCorporateActDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [actType, setActType] = React.useState<jurApi.CorporateActType>('general_assembly');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [actDate, setActDate] = React.useState('');
  const [documentPath, setDocumentPath] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setError(null);
      setActType('general_assembly');
      setTitle('');
      setDescription('');
      setActDate('');
      setDocumentPath('');
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: () =>
      jurApi.createCorporateAct({
        act_type: actType,
        title,
        description: description || null,
        act_date: actDate,
        document_file_path: documentPath || null,
      }),
    onSuccess: (act) => {
      queryClient.invalidateQueries({ queryKey: ['jur-corporate-acts'] });
      onCreated(act.id);
      onClose();
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível cadastrar o ato societário')),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo ato societário</DialogTitle>
        </DialogHeader>

        {error && <DidacticAlert error={error} />}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Tipo</Label>
            <SelectNative value={actType} onChange={(e) => setActType(e.target.value as jurApi.CorporateActType)}>
              {Object.entries(CORPORATE_ACT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Descrição</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Data do ato</Label>
              <Input type="date" value={actDate} onChange={(e) => setActDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Documento (referência)</Label>
              <Input placeholder="Caminho/URL do arquivo" value={documentPath} onChange={(e) => setDocumentPath(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            O ato é criado como rascunho. O registro (protocolo + data) é informado depois, na tela de detalhes.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" disabled={!title.trim() || !actDate || createMutation.isPending} onClick={() => createMutation.mutate()}>
            Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CorporateActDetailDialog({ actId, onClose }: { actId: number | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<DidacticError | null>(null);

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [actDate, setActDate] = React.useState('');
  const [documentPath, setDocumentPath] = React.useState('');
  const [registrationProtocol, setRegistrationProtocol] = React.useState('');
  const [registeredAt, setRegisteredAt] = React.useState('');

  const { data: act, isLoading } = useQuery({
    queryKey: ['jur-corporate-act-detail', actId],
    queryFn: () => jurApi.getCorporateAct(actId!),
    enabled: actId != null,
  });

  React.useEffect(() => {
    if (act) {
      setTitle(act.title);
      setDescription(act.description ?? '');
      setActDate(act.act_date?.slice(0, 10) ?? '');
      setDocumentPath(act.document_file_path ?? '');
      setRegistrationProtocol(act.registration_protocol ?? '');
      setRegisteredAt(act.registered_at?.slice(0, 10) ?? '');
    }
  }, [act]);

  React.useEffect(() => {
    if (actId != null) setError(null);
  }, [actId]);

  const isRegistered = act?.status === 'registered';

  const saveMutation = useMutation({
    mutationFn: () =>
      jurApi.updateCorporateAct(actId!, {
        title,
        description: description || null,
        act_date: actDate,
        document_file_path: documentPath || null,
      }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['jur-corporate-act-detail', actId] });
      queryClient.invalidateQueries({ queryKey: ['jur-corporate-acts'] });
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível salvar o ato societário')),
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      jurApi.updateCorporateAct(actId!, {
        registration_protocol: registrationProtocol,
        registered_at: registeredAt,
      }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['jur-corporate-act-detail', actId] });
      queryClient.invalidateQueries({ queryKey: ['jur-corporate-acts'] });
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível registrar o ato societário')),
  });

  return (
    <Dialog open={actId != null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{act ? act.title : 'Ato societário'}</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {act && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <CorporateActStatusBadge status={act.status} />
              <span className="text-xs text-muted-foreground">{CORPORATE_ACT_TYPE_LABELS[act.act_type]}</span>
            </div>

            {isRegistered && (
              <p className="rounded-md border border-muted bg-muted/40 p-2 text-xs text-muted-foreground">
                Ato registrado em {formatDate(act.registered_at)} (protocolo {act.registration_protocol}) — não pode mais ser editado.
              </p>
            )}

            {error && <DidacticAlert error={error} />}

            <div className="flex flex-col gap-3 rounded-md border p-3">
              <p className="text-sm font-semibold">Dados do ato</p>
              <div className="flex flex-col gap-1.5">
                <Label>Título</Label>
                <Input disabled={isRegistered} value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Descrição</Label>
                <Textarea disabled={isRegistered} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Data do ato</Label>
                  <Input disabled={isRegistered} type="date" value={actDate} onChange={(e) => setActDate(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Documento (referência)</Label>
                  <Input disabled={isRegistered} value={documentPath} onChange={(e) => setDocumentPath(e.target.value)} />
                </div>
              </div>
              {!isRegistered && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="self-start"
                  disabled={!title.trim() || !actDate || saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  Salvar alterações
                </Button>
              )}
            </div>

            {!isRegistered && (
              <div className="flex flex-col gap-3 rounded-md border p-3">
                <p className="text-sm font-semibold">Registrar na Junta Comercial</p>
                <p className="text-xs text-muted-foreground">
                  Informe o protocolo e a data de registro juntos para concluir o registro — a partir daí o ato fica imutável.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Protocolo de registro</Label>
                    <Input value={registrationProtocol} onChange={(e) => setRegistrationProtocol(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Data de registro</Label>
                    <Input type="date" value={registeredAt} onChange={(e) => setRegisteredAt(e.target.value)} />
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="self-start"
                  disabled={!registrationProtocol.trim() || !registeredAt || registerMutation.isPending}
                  onClick={() => registerMutation.mutate()}
                >
                  Confirmar registro
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
