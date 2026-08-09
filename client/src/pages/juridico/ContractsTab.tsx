import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus } from 'lucide-react';

import * as jurApi from '@/api/juridico';
import { useAuth } from '@/context/AuthContext';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { extractApiErrorMessage } from '@/api/httpClient';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/Textarea';
import { SelectNative } from '@/components/ui/select-native';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { APPROVER_ROLE_LABELS, CONTRACT_STATUS_LABELS, CONTRACT_TYPE_LABELS, ContractStatusBadge, formatCurrency, formatDate } from './juridicoShared';

const COUNTERPARTY_TYPE_LABELS: Record<jurApi.CounterpartyType, string> = {
  supplier: 'Fornecedor',
  client: 'Cliente',
  employee: 'Funcionário',
  other: 'Avulsa',
};

/** Aba Contratos — `/juridico`, UC-52. Lista/filtros, criação, detalhe com documentos/signatários/checklist/ativação/aditivos/encerramento. */
export function ContractsTab() {
  const [statusFilter, setStatusFilter] = React.useState<jurApi.ContractStatus | ''>('');
  const [typeFilter, setTypeFilter] = React.useState<jurApi.ContractType | ''>('');
  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['jur-contracts', statusFilter, typeFilter],
    queryFn: () => jurApi.listContracts({ status: statusFilter || undefined, type: typeFilter || undefined, limit: 50 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm text-muted-foreground">Status</Label>
            <SelectNative className="max-w-52" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as jurApi.ContractStatus | '')}>
              <option value="">Todos</option>
              {Object.entries(CONTRACT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm text-muted-foreground">Tipo</Label>
            <SelectNative className="max-w-52" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as jurApi.ContractType | '')}>
              <option value="">Todos</option>
              {Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectNative>
          </div>
        </div>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Novo contrato
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Objeto</TableHead>
            <TableHead>Contraparte</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Vigência</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={8} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-destructive">
                Não foi possível carregar os contratos.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((contract) => (
            <TableRow key={contract.id} className="border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5">
              <TableCell className="font-mono text-xs">{contract.contract_number}</TableCell>
              <TableCell>{CONTRACT_TYPE_LABELS[contract.contract_type]}</TableCell>
              <TableCell className="max-w-64 truncate" title={contract.object}>
                {contract.object}
              </TableCell>
              <TableCell>{COUNTERPARTY_TYPE_LABELS[contract.counterparty_type]}</TableCell>
              <TableCell>{formatCurrency(contract.value)}</TableCell>
              <TableCell>
                {formatDate(contract.start_date)} — {contract.end_date ? formatDate(contract.end_date) : 'indeterminado'}
              </TableCell>
              <TableCell>
                <ContractStatusBadge status={contract.status} />
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => setDetailId(contract.id)}>
                  Detalhes
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileText className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum contrato encontrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <CreateContractDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => setDetailId(id)} />
      <ContractDetailDialog contractId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function CreateContractDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [form, setForm] = React.useState<jurApi.CreateContractInput>({
    type: 'supplier',
    object: '',
    counterparty_type: 'supplier',
    supplier_id: null,
    client_id: null,
    employee_id: null,
    counterparty_name: '',
    counterparty_doc: '',
    value: '',
    start_date: '',
    end_date: '',
    renewal_auto: false,
    notice_days: null,
    adjustment_index: 'none',
  });

  React.useEffect(() => {
    if (open) {
      setError(null);
      setForm({
        type: 'supplier',
        object: '',
        counterparty_type: 'supplier',
        supplier_id: null,
        client_id: null,
        employee_id: null,
        counterparty_name: '',
        counterparty_doc: '',
        value: '',
        start_date: '',
        end_date: '',
        renewal_auto: false,
        notice_days: null,
        adjustment_index: 'none',
      });
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: () => {
      const payload: jurApi.CreateContractInput = {
        ...form,
        supplier_id: form.counterparty_type === 'supplier' ? Number(form.supplier_id) : null,
        client_id: form.counterparty_type === 'client' ? Number(form.client_id) : null,
        employee_id: form.counterparty_type === 'employee' ? Number(form.employee_id) : null,
        counterparty_name: form.counterparty_type === 'other' ? form.counterparty_name : null,
        counterparty_doc: form.counterparty_type === 'other' ? form.counterparty_doc : null,
        value: form.value || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      return jurApi.createContract(payload);
    },
    onSuccess: (contract) => {
      queryClient.invalidateQueries({ queryKey: ['jur-contracts'] });
      onCreated(contract.id);
      onClose();
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível criar o contrato')),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Novo contrato</DialogTitle>
        </DialogHeader>

        {error && <DidacticAlert error={error} />}

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <SelectNative value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as jurApi.ContractType }))}>
                {Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Contraparte</Label>
              <SelectNative
                value={form.counterparty_type}
                onChange={(e) => setForm((f) => ({ ...f, counterparty_type: e.target.value as jurApi.CounterpartyType }))}
              >
                {Object.entries(COUNTERPARTY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Objeto</Label>
            <Textarea rows={2} value={form.object} onChange={(e) => setForm((f) => ({ ...f, object: e.target.value }))} />
          </div>

          {form.counterparty_type === 'supplier' && (
            <div className="flex flex-col gap-1.5">
              <Label>ID do fornecedor</Label>
              <Input type="number" value={form.supplier_id ?? ''} onChange={(e) => setForm((f) => ({ ...f, supplier_id: Number(e.target.value) }))} />
            </div>
          )}
          {form.counterparty_type === 'client' && (
            <div className="flex flex-col gap-1.5">
              <Label>ID do cliente</Label>
              <Input type="number" value={form.client_id ?? ''} onChange={(e) => setForm((f) => ({ ...f, client_id: Number(e.target.value) }))} />
            </div>
          )}
          {form.counterparty_type === 'employee' && (
            <div className="flex flex-col gap-1.5">
              <Label>ID do funcionário</Label>
              <Input type="number" value={form.employee_id ?? ''} onChange={(e) => setForm((f) => ({ ...f, employee_id: Number(e.target.value) }))} />
            </div>
          )}
          {form.counterparty_type === 'other' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Nome da contraparte</Label>
                <Input value={form.counterparty_name ?? ''} onChange={(e) => setForm((f) => ({ ...f, counterparty_name: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>CPF/CNPJ</Label>
                <Input value={form.counterparty_doc ?? ''} onChange={(e) => setForm((f) => ({ ...f, counterparty_doc: e.target.value }))} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Valor (R$)</Label>
              <Input type="number" step="any" value={form.value ?? ''} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Início da vigência</Label>
              <Input type="date" value={form.start_date ?? ''} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Fim da vigência</Label>
              <Input type="date" value={form.end_date ?? ''} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="renewal_auto"
              checked={Boolean(form.renewal_auto)}
              onChange={(e) => setForm((f) => ({ ...f, renewal_auto: e.target.checked }))}
            />
            <Label htmlFor="renewal_auto" className="text-sm">
              Renovação automática
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!form.object.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Criar contrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContractDetailDialog({ contractId, onClose }: { contractId: number | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { hasModuleAccess } = useAuth();
  const [error, setError] = React.useState<DidacticError | null>(null);

  const [docUrl, setDocUrl] = React.useState('');
  const [docSigned, setDocSigned] = React.useState(false);
  const [sigName, setSigName] = React.useState('');
  const [sigRole, setSigRole] = React.useState<jurApi.SignatoryRole>('party_a');
  const [addendumType, setAddendumType] = React.useState<jurApi.AddendumType>('term');
  const [addendumDescription, setAddendumDescription] = React.useState('');
  const [addendumNewEndDate, setAddendumNewEndDate] = React.useState('');
  const [addendumNewValue, setAddendumNewValue] = React.useState('');
  const [terminationReason, setTerminationReason] = React.useState('');

  const { data: contract, isLoading } = useQuery({
    queryKey: ['jur-contract-detail', contractId],
    queryFn: () => jurApi.getContract(contractId!),
    enabled: contractId != null,
  });

  /** Alçada de aprovação (RF-JUR-003) — fonte da verdade: `GET /contracts/:id/approvals`. */
  const { data: approvalStatus } = useQuery({
    queryKey: ['jur-contract-approvals', contractId],
    queryFn: () => jurApi.getContractApprovals(contractId!),
    enabled: contractId != null,
  });

  React.useEffect(() => {
    if (contractId != null) {
      setError(null);
      setDocUrl('');
      setDocSigned(false);
      setSigName('');
      setAddendumDescription('');
      setAddendumNewEndDate('');
      setAddendumNewValue('');
      setTerminationReason('');
    }
  }, [contractId]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['jur-contract-detail', contractId] });
    queryClient.invalidateQueries({ queryKey: ['jur-contract-approvals', contractId] });
    queryClient.invalidateQueries({ queryKey: ['jur-contracts'] });
  };

  function useAction<TArgs>(fn: (args: TArgs) => Promise<unknown>, title: string) {
    return useMutation({
      mutationFn: fn,
      onSuccess: () => {
        setError(null);
        invalidate();
      },
      onError: (err) => setError(translateApiError(err, title)),
    });
  }

  const addDocMutation = useAction(
    () => jurApi.addContractDocument(contractId!, { file_url: docUrl, is_signed_version: docSigned }),
    'Não foi possível anexar o documento',
  );
  const addSigMutation = useAction(
    () => jurApi.addContractSignatory(contractId!, { party_type: sigRole, name: sigName }),
    'Não foi possível adicionar o signatário',
  );

  // Enquanto `GET /approvals` não respondeu, cai no cálculo client-side dos
  // papéis exigidos (só desenha a seção; o estado de cada papel vem da query).
  const requiredApproverRoles = approvalStatus?.required_roles ?? (contract ? jurApi.requiredApproverRoles(contract.value) : []);
  const approvedRoles = new Set(approvalStatus?.approvals.map((approval) => approval.approver_role) ?? []);
  const canApproveRole = (role: jurApi.ContractApproverRole) => hasModuleAccess(role === 'diretor' ? 'diretor' : 'financeiro');

  /** `POST /contracts/:id/approve` — registra 1 aprovação de alçada por valor (RF-JUR-003). */
  const approveMutation = useAction(
    (role: jurApi.ContractApproverRole) => jurApi.approveContract(contractId!, role),
    'Não foi possível registrar a aprovação',
  );

  /**
   * `POST /contracts/:id/activate` — quando bloqueado por alçada pendente
   * (RF-JUR-003), mostramos a mensagem exata do backend (que já nomeia os
   * papéis faltantes), sem traduzir/reescrever.
   */
  const activateMutation = useMutation({
    mutationFn: () => jurApi.activateContract(contractId!),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err) => {
      setError({ title: 'Não foi possível ativar o contrato', reasons: [extractApiErrorMessage(err)] });
    },
  });
  const addAddendumMutation = useAction(
    () =>
      jurApi.addContractAddendum(contractId!, {
        change_type: addendumType,
        description: addendumDescription,
        new_end_date: addendumType === 'term' ? addendumNewEndDate : undefined,
        new_value: addendumType === 'value' ? addendumNewValue : undefined,
      }),
    'Não foi possível criar o aditivo',
  );
  const terminateMutation = useAction(
    () => jurApi.terminateContract(contractId!, { resolution: 'terminated', termination_reason: terminationReason }),
    'Não foi possível encerrar o contrato',
  );
  const expireMutation = useAction(() => jurApi.terminateContract(contractId!, { resolution: 'expired' }), 'Não foi possível registrar o vencimento');
  const checklistMutation = useAction(
    (checklist: Record<string, jurApi.ChecklistValue>) => jurApi.updateContractChecklist(contractId!, checklist),
    'Não foi possível salvar o checklist',
  );

  const checklistRequired = contract && ['employment', 'supplier', 'nda'].includes(contract.contract_type);

  return (
    <Dialog open={contractId != null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{contract ? `${contract.contract_number} — ${CONTRACT_TYPE_LABELS[contract.contract_type]}` : 'Contrato'}</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {contract && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <ContractStatusBadge status={contract.status} />
              <span className="text-xs text-muted-foreground">Valor: {formatCurrency(contract.value)}</span>
              <span className="text-xs text-muted-foreground">
                Vigência: {formatDate(contract.start_date)} — {contract.end_date ? formatDate(contract.end_date) : 'indeterminado'}
              </span>
            </div>
            <p className="text-sm">{contract.object}</p>

            {error && <DidacticAlert error={error} />}

            {/* Documentos */}
            <div className="flex flex-col gap-2 rounded-md border p-3">
              <p className="text-sm font-semibold">Documentos ({contract.documents.length})</p>
              <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                {contract.documents.map((doc) => (
                  <li key={doc.id}>
                    v{doc.version_number} — <a href={doc.file_url} target="_blank" rel="noreferrer" className="underline">{doc.file_url}</a>{' '}
                    {doc.is_signed_version && <Badge variant="success">Assinada</Badge>}
                  </li>
                ))}
                {contract.documents.length === 0 && <li>Nenhum documento anexado.</li>}
              </ul>
              <div className="flex flex-wrap items-end gap-2">
                <Input placeholder="URL do arquivo" className="max-w-64" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} />
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input type="checkbox" checked={docSigned} onChange={(e) => setDocSigned(e.target.checked)} />
                  Versão assinada
                </label>
                <Button size="sm" variant="outline" disabled={!docUrl.trim() || addDocMutation.isPending} onClick={() => addDocMutation.mutate(undefined)}>
                  Anexar
                </Button>
              </div>
            </div>

            {/* Signatários */}
            <div className="flex flex-col gap-2 rounded-md border p-3">
              <p className="text-sm font-semibold">Signatários ({contract.signatories.length})</p>
              <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                {contract.signatories.map((sig) => (
                  <li key={sig.id}>
                    {sig.name} — {sig.signatory_role === 'party_a' ? 'Parte A' : sig.signatory_role === 'party_b' ? 'Parte B' : 'Testemunha'}
                  </li>
                ))}
                {contract.signatories.length === 0 && <li>Nenhum signatário cadastrado.</li>}
              </ul>
              <div className="flex flex-wrap items-end gap-2">
                <Input placeholder="Nome" className="max-w-52" value={sigName} onChange={(e) => setSigName(e.target.value)} />
                <SelectNative className="max-w-40" value={sigRole} onChange={(e) => setSigRole(e.target.value as jurApi.SignatoryRole)}>
                  <option value="party_a">Parte A</option>
                  <option value="party_b">Parte B</option>
                  <option value="witness">Testemunha</option>
                </SelectNative>
                <Button size="sm" variant="outline" disabled={!sigName.trim() || addSigMutation.isPending} onClick={() => addSigMutation.mutate(undefined)}>
                  Adicionar
                </Button>
              </div>
            </div>

            {/* Checklist */}
            {checklistRequired && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-semibold">Checklist de cláusulas (obrigatório para ativar)</p>
                {(['pi', 'confidentiality', 'non_compete'] as const).map((key) => (
                  <div key={key} className="flex items-center justify-between gap-2 text-sm">
                    <span>{key === 'pi' ? 'Propriedade Intelectual' : key === 'confidentiality' ? 'Confidencialidade' : 'Não concorrência'}</span>
                    <SelectNative
                      className="max-w-48"
                      value={(contract.clause_checklist?.[key] as jurApi.ChecklistValue) ?? ''}
                      onChange={(e) =>
                        checklistMutation.mutate({ ...(contract.clause_checklist ?? {}), [key]: e.target.value as jurApi.ChecklistValue })
                      }
                    >
                      <option value="">Não respondido</option>
                      <option value="yes">Sim</option>
                      <option value="no">Não</option>
                      <option value="not_applicable">Não se aplica</option>
                    </SelectNative>
                  </div>
                ))}
              </div>
            )}

            {/* Alçada de aprovação por valor (RF-JUR-003) */}
            {requiredApproverRoles.length > 0 && ['draft', 'in_approval', 'approved'].includes(contract.status) && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-semibold">Alçada de aprovação (RF-JUR-003)</p>
                <p className="text-xs text-muted-foreground">
                  Contrato de {formatCurrency(contract.value)} — exige aprovação de:{' '}
                  {requiredApproverRoles.map((role) => APPROVER_ROLE_LABELS[role]).join(', ')}.
                </p>
                <ul className="flex flex-col gap-1.5">
                  {requiredApproverRoles.map((role) => {
                    const approved = approvedRoles.has(role);
                    return (
                      <li key={role} className="flex items-center justify-between gap-2 text-sm">
                        <span>{APPROVER_ROLE_LABELS[role]}</span>
                        <div className="flex items-center gap-2">
                          {approved ? (
                            <Badge variant="success">Aprovado</Badge>
                          ) : (
                            <>
                              <Badge variant="outline">Pendente</Badge>
                              {canApproveRole(role) && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={approveMutation.isPending}
                                  onClick={() => approveMutation.mutate(role)}
                                >
                                  Aprovar como {APPROVER_ROLE_LABELS[role]}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Ativação / Encerramento */}
            {['draft', 'in_approval', 'approved', 'signed'].includes(contract.status) && (
              <div className="flex gap-2">
                <Button type="button" size="sm" disabled={activateMutation.isPending} onClick={() => activateMutation.mutate(undefined)}>
                  Ativar contrato
                </Button>
              </div>
            )}
            {contract.status === 'active' && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-semibold">Encerrar contrato</p>
                <div className="flex flex-wrap items-end gap-2">
                  <Textarea
                    rows={2}
                    placeholder="Motivo da rescisão (obrigatório)"
                    className="max-w-96"
                    value={terminationReason}
                    onChange={(e) => setTerminationReason(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={!terminationReason.trim() || terminateMutation.isPending}
                    onClick={() => terminateMutation.mutate(undefined)}
                  >
                    Rescindir
                  </Button>
                  <Button size="sm" variant="outline" disabled={expireMutation.isPending} onClick={() => expireMutation.mutate(undefined)}>
                    Registrar vencimento natural
                  </Button>
                </div>
              </div>
            )}

            {/* Aditivos */}
            <div className="flex flex-col gap-2 rounded-md border p-3">
              <p className="text-sm font-semibold">Aditivos ({contract.addendums.length})</p>
              <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                {contract.addendums.map((add) => (
                  <li key={add.id}>
                    Aditivo {add.addendum_number} — {add.description}
                    {add.new_end_date && ` · nova vigência: ${formatDate(add.new_end_date)}`}
                    {add.new_value && ` · novo valor: ${formatCurrency(add.new_value)}`}
                  </li>
                ))}
                {contract.addendums.length === 0 && <li>Nenhum aditivo registrado.</li>}
              </ul>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-end gap-2">
                  <SelectNative className="max-w-40" value={addendumType} onChange={(e) => setAddendumType(e.target.value as jurApi.AddendumType)}>
                    <option value="term">Prazo</option>
                    <option value="value">Valor</option>
                    <option value="clause">Cláusula</option>
                    <option value="party">Parte</option>
                    <option value="other">Outro</option>
                  </SelectNative>
                  {addendumType === 'term' && (
                    <Input type="date" value={addendumNewEndDate} onChange={(e) => setAddendumNewEndDate(e.target.value)} />
                  )}
                  {addendumType === 'value' && (
                    <Input type="number" step="any" placeholder="Novo valor" value={addendumNewValue} onChange={(e) => setAddendumNewValue(e.target.value)} />
                  )}
                </div>
                <Textarea rows={2} placeholder="Descrição do aditivo" value={addendumDescription} onChange={(e) => setAddendumDescription(e.target.value)} />
                <Button
                  size="sm"
                  variant="outline"
                  className="self-start"
                  disabled={!addendumDescription.trim() || addAddendumMutation.isPending}
                  onClick={() => addAddendumMutation.mutate(undefined)}
                >
                  Criar aditivo
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
