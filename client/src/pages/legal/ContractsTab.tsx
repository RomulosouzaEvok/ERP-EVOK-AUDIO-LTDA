import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, FileText, ListPlus, Plus, Upload } from 'lucide-react';

import * as legalApi from '@/api/legal';
import { useAuth } from '@/context/AuthContext';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/Textarea';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const TYPE_LABELS: Record<legalApi.ContractType, string> = {
  clt_indeterminado: 'CLT (prazo indeterminado)',
  clt_determinado: 'CLT (prazo determinado)',
  experiencia: 'Contrato de experiência',
  estagio: 'Estágio',
  aprendiz: 'Jovem aprendiz',
  distribuicao: 'Distribuição',
  representacao_comercial: 'Representação comercial',
  fornecimento: 'Fornecimento',
  prestacao_servicos: 'Prestação de serviços',
  confidencialidade: 'Confidencialidade (NDA)',
  licenciamento_marca: 'Licenciamento de marca',
  outro: 'Outro',
};

const STATUS_LABELS: Record<legalApi.ContractStatus, string> = {
  draft: 'Rascunho',
  signed: 'Assinado',
  active: 'Ativo',
  expired: 'Vencido',
  terminated: 'Encerrado',
};

const STATUS_VARIANT: Record<legalApi.ContractStatus, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  draft: 'secondary',
  signed: 'secondary',
  active: 'success',
  expired: 'destructive',
  terminated: 'destructive',
};

/** Aba "Contratos" de `/legal` — CRUD de contratos + upload de instrumento + alerta de vencimento próximo. */
export function ContractsTab() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const [statusFilter, setStatusFilter] = React.useState<legalApi.ContractStatus | ''>('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingContract, setEditingContract] = React.useState<legalApi.Contract | null>(null);
  const [uploadingContract, setUploadingContract] = React.useState<legalApi.Contract | null>(null);
  const [detailContract, setDetailContract] = React.useState<legalApi.Contract | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['legal-contracts', statusFilter],
    queryFn: () => legalApi.listContracts({ status: statusFilter || undefined, limit: 100 }),
  });

  const { data: expiring } = useQuery({
    queryKey: ['legal-contracts-expiring'],
    queryFn: () => legalApi.listExpiringContracts(30),
  });

  return (
    <div className="flex flex-col gap-4">
      {Boolean(expiring?.length) && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p className="text-sm">
            <strong>{expiring!.length}</strong> contrato(s) vencendo nos próximos 30 dias (ou já vencidos e ainda não encerrados) — verifique renovação/rescisão.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contract-status-filter" className="text-sm text-muted-foreground">
            Status
          </Label>
          <SelectNative
            id="contract-status-filter"
            className="max-w-48"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as legalApi.ContractStatus | '')}
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SelectNative>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Novo contrato
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Partes</TableHead>
            <TableHead>Vigência</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={7} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-destructive">
                Não foi possível carregar os contratos. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((contract) => (
            <TableRow key={contract.id}>
              <TableCell className="font-medium">{contract.contract_number}</TableCell>
              <TableCell>{contract.title}</TableCell>
              <TableCell className="text-xs">{TYPE_LABELS[contract.contract_type]}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {contract.party_a} × {contract.party_b}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {contract.start_date}
                {contract.end_date ? ` – ${contract.end_date}` : ' (indeterminado)'}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[contract.status]}>{STATUS_LABELS[contract.status]}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setDetailContract(contract)}>
                    <ListPlus className="size-3.5" />
                    Detalhes
                  </Button>
                  {canWrite && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setEditingContract(contract)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setUploadingContract(contract)}>
                        <Upload className="size-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileText className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum contrato cadastrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <ContractDialog mode="create" open={createOpen} contract={null} onClose={() => setCreateOpen(false)} />
      <ContractDialog mode="edit" open={Boolean(editingContract)} contract={editingContract} onClose={() => setEditingContract(null)} />
      <UploadContractFileDialog contract={uploadingContract} onClose={() => setUploadingContract(null)} />
      <ContractDetailDialog contract={detailContract} onClose={() => setDetailContract(null)} />
    </div>
  );
}

const contractSchema = z.object({
  contract_number: z.string().trim().min(1, 'Informe o número do contrato.').max(50),
  contract_type: z.enum([
    'clt_indeterminado', 'clt_determinado', 'experiencia', 'estagio', 'aprendiz',
    'distribuicao', 'representacao_comercial', 'fornecimento', 'prestacao_servicos',
    'confidencialidade', 'licenciamento_marca', 'outro',
  ]),
  title: z.string().trim().min(1, 'Informe o título.').max(200),
  party_a: z.string().trim().min(1, 'Informe a parte A.').max(200),
  party_b: z.string().trim().min(1, 'Informe a parte B.').max(200),
  subject: z.string().trim().max(5000).optional(),
  value: z.coerce.number().min(0).optional().or(z.literal('').transform(() => undefined)),
  start_date: z.string().trim().min(1, 'Informe a data de início.'),
  end_date: z.string().trim().optional(),
  auto_renewal: z.boolean().optional(),
  notice_period_days: z.coerce.number().int().min(0).optional().or(z.literal('').transform(() => undefined)),
  status: z.enum(['draft', 'signed', 'active', 'expired', 'terminated']).default('draft'),
});

type ContractFormData = z.infer<typeof contractSchema>;

function ContractDialog({
  mode,
  open,
  contract,
  onClose,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  contract: legalApi.Contract | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: { contract_number: '', contract_type: 'prestacao_servicos', title: '', party_a: 'EVOK ÁUDIO LTDA', party_b: '', start_date: '', status: 'draft' },
  });

  const mutation = useMutation({
    mutationFn: (values: ContractFormData) =>
      mode === 'create'
        ? legalApi.createContract(values as legalApi.CreateContractInput)
        : legalApi.updateContract(contract!.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['legal-contracts-expiring'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível salvar o contrato')),
  });

  React.useEffect(() => {
    if (open) {
      if (mode === 'edit' && contract) {
        reset({
          contract_number: contract.contract_number,
          contract_type: contract.contract_type,
          title: contract.title,
          party_a: contract.party_a,
          party_b: contract.party_b,
          subject: contract.subject ?? '',
          value: contract.value ? Number(contract.value) : undefined,
          start_date: contract.start_date,
          end_date: contract.end_date ?? '',
          auto_renewal: contract.auto_renewal,
          notice_period_days: contract.notice_period_days ?? undefined,
          status: contract.status,
        });
      } else {
        reset({ contract_number: '', contract_type: 'prestacao_servicos', title: '', party_a: 'EVOK ÁUDIO LTDA', party_b: '', start_date: '', status: 'draft' });
      }
      setFormError(null);
    }
  }, [open, mode, contract, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo contrato' : `Editar contrato — ${contract?.contract_number ?? ''}`}</DialogTitle>
        </DialogHeader>
        <form className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contract-number">Número *</Label>
              <Input id="contract-number" {...register('contract_number')} />
              {errors.contract_number && <p className="text-sm text-destructive">{errors.contract_number.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contract-type">Tipo *</Label>
              <SelectNative id="contract-type" {...register('contract_type')}>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectNative>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contract-title">Título *</Label>
            <Input id="contract-title" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contract-party-a">Parte A *</Label>
              <Input id="contract-party-a" {...register('party_a')} />
              {errors.party_a && <p className="text-sm text-destructive">{errors.party_a.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contract-party-b">Parte B *</Label>
              <Input id="contract-party-b" {...register('party_b')} />
              {errors.party_b && <p className="text-sm text-destructive">{errors.party_b.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contract-subject">Objeto/assunto</Label>
            <Textarea id="contract-subject" rows={2} {...register('subject')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contract-start">Início *</Label>
              <Input id="contract-start" type="date" {...register('start_date')} />
              {errors.start_date && <p className="text-sm text-destructive">{errors.start_date.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contract-end">Fim</Label>
              <Input id="contract-end" type="date" {...register('end_date')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contract-value">Valor (R$)</Label>
              <Input id="contract-value" type="number" step="0.01" {...register('value')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contract-notice">Aviso prévio (dias)</Label>
              <Input id="contract-notice" type="number" {...register('notice_period_days')} />
            </div>
          </div>
          <div className="grid grid-cols-2 items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contract-status">Status</Label>
              <SelectNative id="contract-status" {...register('status')}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectNative>
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" {...register('auto_renewal')} />
              Renovação automática
            </label>
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : mode === 'create' ? 'Criar contrato' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Diálogo dedicado de upload/substituição do instrumento do contrato (`POST /api/legal/contracts/:id/file`). */
function UploadContractFileDialog({ contract, onClose }: { contract: legalApi.Contract | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [file, setFile] = React.useState<File | null>(null);
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  React.useEffect(() => {
    setFile(null);
    setFormError(null);
  }, [contract]);

  const mutation = useMutation({
    mutationFn: () => legalApi.uploadContractFile(contract!.id, file!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-contracts'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível enviar o arquivo')),
  });

  return (
    <Dialog open={Boolean(contract)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar instrumento — {contract?.contract_number ?? ''}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input type="file" accept=".pdf,.doc,.docx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
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

const CHANGE_TYPE_LABELS: Record<legalApi.AddendumChangeType, string> = {
  term: 'Prazo', value: 'Valor', clause: 'Cláusula', party: 'Parte', other: 'Outro',
};

const REMINDER_TYPE_LABELS: Record<legalApi.ReminderType, string> = {
  renewal: 'Renovação', expiration: 'Expiração', notice: 'Aviso prévio', payment: 'Pagamento',
};

/**
 * Diálogo de detalhe do contrato: exibe dados gerais e as duas sub-seções
 * (aditivos e lembretes de prazo) — pedido explícito de não virarem abas
 * próprias no nível de `LegalPage`.
 */
function ContractDetailDialog({ contract, onClose }: { contract: legalApi.Contract | null; onClose: () => void }) {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();
  const [addendumFormOpen, setAddendumFormOpen] = React.useState(false);
  const [reminderFormOpen, setReminderFormOpen] = React.useState(false);

  const { data: addendums } = useQuery({
    queryKey: ['legal-contract-addendums', contract?.id],
    queryFn: () => legalApi.listAddendums({ contract_id: contract!.id, limit: 100 }),
    enabled: Boolean(contract),
  });

  const { data: reminders } = useQuery({
    queryKey: ['legal-contract-reminders', contract?.id],
    queryFn: () => legalApi.listReminders({ contract_id: contract!.id, limit: 100 }),
    enabled: Boolean(contract),
  });

  React.useEffect(() => {
    setAddendumFormOpen(false);
    setReminderFormOpen(false);
  }, [contract]);

  const invalidateSubEntities = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['legal-contract-addendums', contract?.id] });
    queryClient.invalidateQueries({ queryKey: ['legal-contract-reminders', contract?.id] });
  }, [queryClient, contract?.id]);

  return (
    <Dialog open={Boolean(contract)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes do contrato — {contract?.contract_number ?? ''}</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-[70vh] flex-col gap-6 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <p><span className="text-muted-foreground">Título:</span> {contract?.title}</p>
            <p><span className="text-muted-foreground">Tipo:</span> {contract ? TYPE_LABELS[contract.contract_type] : ''}</p>
            <p><span className="text-muted-foreground">Parte A:</span> {contract?.party_a}</p>
            <p><span className="text-muted-foreground">Parte B:</span> {contract?.party_b}</p>
            <p><span className="text-muted-foreground">Vigência:</span> {contract?.start_date}{contract?.end_date ? ` – ${contract.end_date}` : ' (indeterminado)'}</p>
            <p><span className="text-muted-foreground">Status:</span> {contract ? STATUS_LABELS[contract.status] : ''}</p>
          </div>

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Aditivos contratuais</h3>
              {canWrite && (
                <Button size="sm" variant="outline" onClick={() => setAddendumFormOpen((v) => !v)}>
                  <Plus className="size-3.5" />
                  Novo aditivo
                </Button>
              )}
            </div>
            {addendumFormOpen && contract && (
              <AddendumInlineForm contractId={contract.id} onSaved={invalidateSubEntities} onDone={() => setAddendumFormOpen(false)} />
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Assinatura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {addendums?.data.map((addendum) => (
                  <TableRow key={addendum.id}>
                    <TableCell>{addendum.addendum_number}</TableCell>
                    <TableCell className="text-xs">{CHANGE_TYPE_LABELS[addendum.change_type]}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{addendum.description || '-'}</TableCell>
                    <TableCell className="text-xs">{addendum.signed_date || '-'}</TableCell>
                  </TableRow>
                ))}
                {!addendums?.data.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-4 text-center text-xs text-muted-foreground">
                      Nenhum aditivo cadastrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Lembretes de prazo</h3>
              {canWrite && (
                <Button size="sm" variant="outline" onClick={() => setReminderFormOpen((v) => !v)}>
                  <Plus className="size-3.5" />
                  Novo lembrete
                </Button>
              )}
            </div>
            {reminderFormOpen && contract && (
              <ReminderInlineForm contractId={contract.id} onSaved={invalidateSubEntities} onDone={() => setReminderFormOpen(false)} />
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Antecedência</TableHead>
                  <TableHead>Notificado</TableHead>
                  {canWrite && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reminders?.data.map((reminder) => (
                  <ReminderRow key={reminder.id} reminder={reminder} canWrite={canWrite} onSaved={invalidateSubEntities} />
                ))}
                {!reminders?.data.length && (
                  <TableRow>
                    <TableCell colSpan={canWrite ? 5 : 4} className="py-4 text-center text-xs text-muted-foreground">
                      Nenhum lembrete cadastrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </section>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Linha de lembrete com ação de alternar `notified` — componente de topo de
 * módulo (não aninhado dentro de `ContractDetailDialog`) para evitar
 * remontagem indevida a cada re-render do diálogo pai (função redefinida a
 * cada render perderia a identidade/estado do componente filho).
 */
function ReminderRow({ reminder, canWrite, onSaved }: { reminder: legalApi.ContractReminder; canWrite: boolean; onSaved: () => void }) {
  const toggleMutation = useMutation({
    mutationFn: () => legalApi.updateReminder(reminder.id, { notified: !reminder.notified }),
    onSuccess: onSaved,
  });

  return (
    <TableRow>
      <TableCell className="text-xs">{REMINDER_TYPE_LABELS[reminder.reminder_type]}</TableCell>
      <TableCell className="text-xs">{reminder.reminder_date}</TableCell>
      <TableCell className="text-xs">{reminder.days_before} dia(s)</TableCell>
      <TableCell>
        <Badge variant={reminder.notified ? 'success' : 'secondary'}>{reminder.notified ? 'Sim' : 'Não'}</Badge>
      </TableCell>
      {canWrite && (
        <TableCell>
          <Button size="sm" variant="outline" disabled={toggleMutation.isPending} onClick={() => toggleMutation.mutate()}>
            Marcar {reminder.notified ? 'não notificado' : 'notificado'}
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}

/** Formulário inline de novo aditivo (sub-seção do detalhe do contrato). */
function AddendumInlineForm({ contractId, onSaved, onDone }: { contractId: number; onSaved: () => void; onDone: () => void }) {
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const [values, setValues] = React.useState({ addendum_number: '', change_type: 'term' as legalApi.AddendumChangeType, description: '', signed_date: '' });

  const mutation = useMutation({
    mutationFn: () => legalApi.createAddendum({
      contract_id: contractId,
      addendum_number: Number(values.addendum_number),
      change_type: values.change_type,
      description: values.description || undefined,
      signed_date: values.signed_date || undefined,
    }),
    onSuccess: () => {
      onSaved();
      setFormError(null);
      onDone();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível criar o aditivo')),
  });

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Número *</Label>
          <Input type="number" value={values.addendum_number} onChange={(e) => setValues((v) => ({ ...v, addendum_number: e.target.value }))} />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Tipo de mudança *</Label>
          <SelectNative value={values.change_type} onChange={(e) => setValues((v) => ({ ...v, change_type: e.target.value as legalApi.AddendumChangeType }))}>
            {Object.entries(CHANGE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SelectNative>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Data de assinatura</Label>
          <Input type="date" value={values.signed_date} onChange={(e) => setValues((v) => ({ ...v, signed_date: e.target.value }))} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Descrição</Label>
        <Textarea rows={2} value={values.description} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} />
      </div>
      {formError && <DidacticAlert error={formError} />}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onDone}>Cancelar</Button>
        <Button type="button" size="sm" disabled={!values.addendum_number || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? 'Salvando...' : 'Salvar aditivo'}
        </Button>
      </div>
    </div>
  );
}

/** Formulário inline de novo lembrete de prazo (sub-seção do detalhe do contrato). */
function ReminderInlineForm({ contractId, onSaved, onDone }: { contractId: number; onSaved: () => void; onDone: () => void }) {
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const [values, setValues] = React.useState({ reminder_type: 'renewal' as legalApi.ReminderType, reminder_date: '', days_before: '30' });

  const mutation = useMutation({
    mutationFn: () => legalApi.createReminder({
      contract_id: contractId,
      reminder_type: values.reminder_type,
      reminder_date: values.reminder_date,
      days_before: values.days_before ? Number(values.days_before) : undefined,
    }),
    onSuccess: () => {
      onSaved();
      setFormError(null);
      onDone();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível criar o lembrete')),
  });

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Tipo *</Label>
          <SelectNative value={values.reminder_type} onChange={(e) => setValues((v) => ({ ...v, reminder_type: e.target.value as legalApi.ReminderType }))}>
            {Object.entries(REMINDER_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SelectNative>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Data *</Label>
          <Input type="date" value={values.reminder_date} onChange={(e) => setValues((v) => ({ ...v, reminder_date: e.target.value }))} />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Antecedência (dias)</Label>
          <Input type="number" value={values.days_before} onChange={(e) => setValues((v) => ({ ...v, days_before: e.target.value }))} />
        </div>
      </div>
      {formError && <DidacticAlert error={formError} />}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onDone}>Cancelar</Button>
        <Button type="button" size="sm" disabled={!values.reminder_date || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? 'Salvando...' : 'Salvar lembrete'}
        </Button>
      </div>
    </div>
  );
}
