import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Stethoscope, ClipboardList, FileUp, Send, CheckCircle2 } from 'lucide-react';

import * as hrApi from '@/api/hr';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { useEmployeeOptions } from '@/components/hr/useEmployeeOptions';
import { FileUploadDialog } from '@/components/hr/FileUploadDialog';
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
import { DidacticAlert } from '@/components/DidacticAlert';

const TYPE_LABEL: Record<hrApi.TerminationType, string> = {
  pedido: 'Pedido de demissão',
  sem_justa_causa: 'Sem justa causa',
  justa_causa: 'Justa causa',
  termino_experiencia: 'Término de experiência',
  acordo: 'Acordo (Lei 13.467/17)',
};

const STATUS_LABEL: Record<hrApi.TerminationStatus, string> = {
  aberto: 'Aberto',
  aguardando_aso: 'Aguardando ASO',
  aguardando_trct: 'Aguardando TRCT',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

const STATUS_BADGE: Record<hrApi.TerminationStatus, BadgeProps['variant']> = {
  aberto: 'warning',
  aguardando_aso: 'warning',
  aguardando_trct: 'warning',
  concluido: 'success',
  cancelado: 'destructive',
};

/**
 * Aba "Demissão" de `/hr` — UC-70 (RF-RH-017 a 023). O gate real de
 * conclusão (RF-RH-020/030) usa `EmployeeDocument` tipo `aso_demissional`
 * (não o campo do processo — diferente da Admissão, aqui o funcionário já
 * existe), por isso "Confirmar ASO" reaproveita o `FileUploadDialog` para
 * criar esse documento via `POST /api/rh/employee-documents`, além de
 * registrar o resultado no próprio processo (auditoria/UI).
 *
 * Concluir exige nível `rh:approve` (RF-RH-022 — desliga o funcionário e
 * desativa o login no mesmo ato); sem esse nível o botão fica desabilitado
 * com tooltip, e o backend ainda assim recusa com 403 se contornado.
 */
export function TerminationTab() {
  const { hasModuleAccess, hasRole, permissions } = useAuth();
  const canWrite = hasModuleAccess('rh');
  const canApprove = hasRole('admin') || permissions?.rh === 'approve';
  const queryClient = useQueryClient();
  const { employees, employeeName } = useEmployeeOptions();

  const [statusFilter, setStatusFilter] = React.useState<hrApi.TerminationStatus | ''>('');
  const [riskFilter, setRiskFilter] = React.useState(false);
  const [page, setPage] = React.useState(1);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [asoProcess, setAsoProcess] = React.useState<hrApi.TerminationProcess | null>(null);
  const [checklistProcess, setChecklistProcess] = React.useState<hrApi.TerminationProcess | null>(null);
  const [trctProcess, setTrctProcess] = React.useState<hrApi.TerminationProcess | null>(null);
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-termination-processes', statusFilter, riskFilter, page],
    queryFn: () =>
      hrApi.listTerminationProcesses({
        status: statusFilter || undefined,
        payment_deadline_at_risk: riskFilter || undefined,
        page,
        limit: 20,
      }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['hr-termination-processes'] });

  const requestAsoMutation = useMutation({
    mutationFn: hrApi.requestTerminationAso,
    onSuccess: invalidate,
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível solicitar o ASO demissional')),
  });

  const esocialMutation = useMutation({
    mutationFn: hrApi.confirmTerminationEsocial,
    onSuccess: invalidate,
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível confirmar a transmissão do eSocial')),
  });

  const concludeMutation = useMutation({
    mutationFn: hrApi.concludeTerminationProcess,
    onSuccess: invalidate,
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível concluir a demissão', undefined)),
  });

  const colSpan = canWrite ? 7 : 6;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="termination-status-filter">Status</Label>
            <SelectNative
              id="termination-status-filter"
              className="w-52"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as hrApi.TerminationStatus | '');
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
          </div>
          <label className="flex items-center gap-2 pb-1.5 text-sm">
            <input
              type="checkbox"
              className="size-4"
              checked={riskFilter}
              onChange={(event) => {
                setRiskFilter(event.target.checked);
                setPage(1);
              }}
            />
            Só prazo do TRCT em risco (Art. 477 §6º CLT)
          </label>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus /> Nova demissão
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Funcionário</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Aviso</TableHead>
            <TableHead>Data de desligamento</TableHead>
            <TableHead>Prazo TRCT</TableHead>
            <TableHead>Status</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={colSpan} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-destructive">
                Não foi possível carregar os processos de demissão. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((process) => (
            <TableRow key={process.id}>
              <TableCell className="font-medium">{employeeName(process.employee_id)}</TableCell>
              <TableCell>{TYPE_LABEL[process.termination_type]}</TableCell>
              <TableCell>{process.notice_modality === 'trabalhado' ? 'Trabalhado' : 'Indenizado'}</TableCell>
              <TableCell>{formatDate(process.termination_date)}</TableCell>
              <TableCell>{formatDate(process.payment_deadline)}</TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE[process.status]}>{STATUS_LABEL[process.status]}</Badge>
              </TableCell>
              {canWrite && (
                <TableCell className="flex flex-wrap gap-1.5">
                  {process.status !== 'concluido' && process.status !== 'cancelado' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActionError(null);
                          requestAsoMutation.mutate(process.id);
                        }}
                      >
                        <Stethoscope className="size-4" /> Solicitar ASO
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setAsoProcess(process)}>
                        Confirmar ASO
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setChecklistProcess(process)}>
                        <ClipboardList className="size-4" /> Checklist de ativos
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setTrctProcess(process)}>
                        <FileUp className="size-4" /> TRCT
                      </Button>
                      {!process.s2299_confirmed_at && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActionError(null);
                            esocialMutation.mutate(process.id);
                          }}
                        >
                          <Send className="size-4" /> eSocial S-2299
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={!canApprove || concludeMutation.isPending}
                        title={!canApprove ? 'Requer nível de aprovação de RH (rh:approve).' : undefined}
                        onClick={() => {
                          if (!window.confirm('Concluir a demissão desliga o funcionário e desativa o login dele. Confirma?')) return;
                          setActionError(null);
                          concludeMutation.mutate(process.id);
                        }}
                      >
                        <CheckCircle2 className="size-4" /> Concluir
                      </Button>
                    </>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
                Nenhum processo de demissão encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      {actionError && <DidacticAlert error={actionError} />}

      <CreateTerminationDialog open={createOpen} employees={employees} onClose={() => setCreateOpen(false)} />
      <ConfirmTerminationAsoDialog process={asoProcess} onClose={() => setAsoProcess(null)} />
      <AssetChecklistDialog process={checklistProcess} onClose={() => setChecklistProcess(null)} />
      <AttachTrctDialog process={trctProcess} onClose={() => setTrctProcess(null)} />
    </div>
  );
}

function CreateTerminationDialog({
  open,
  employees,
  onClose,
}: {
  open: boolean;
  employees: { id: number; name: string }[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = React.useState<number | ''>('');
  const [terminationType, setTerminationType] = React.useState<hrApi.TerminationType>('sem_justa_causa');
  const [noticeDate, setNoticeDate] = React.useState('');
  const [noticeModality, setNoticeModality] = React.useState<hrApi.NoticeModality>('indenizado');
  const [terminationDate, setTerminationDate] = React.useState('');
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setEmployeeId('');
      setTerminationType('sem_justa_causa');
      setNoticeDate('');
      setNoticeModality('indenizado');
      setTerminationDate('');
      setError(null);
      setValidationError(null);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () =>
      hrApi.createTerminationProcess({
        employee_id: Number(employeeId),
        termination_type: terminationType,
        notice_date: noticeDate,
        notice_modality: noticeModality,
        termination_date: terminationDate || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-termination-processes'] });
      onClose();
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível abrir o processo de demissão')),
  });

  const handleConfirm = () => {
    if (!employeeId || !noticeDate) {
      setValidationError('Selecione o funcionário e informe a data do aviso.');
      return;
    }
    setValidationError(null);
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova demissão</DialogTitle>
          <DialogDescription>
            O prazo do TRCT (Art. 477 §6º CLT) é calculado no servidor a partir da data de desligamento.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="termination-employee">Funcionário *</Label>
            <SelectNative
              id="termination-employee"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value ? Number(event.target.value) : '')}
            >
              <option value="">Selecione...</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="termination-type">Tipo *</Label>
            <SelectNative id="termination-type" value={terminationType} onChange={(event) => setTerminationType(event.target.value as hrApi.TerminationType)}>
              {Object.entries(TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="termination-notice-date">Data do aviso *</Label>
              <Input id="termination-notice-date" type="date" value={noticeDate} onChange={(event) => setNoticeDate(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="termination-notice-modality">Modalidade do aviso</Label>
              <SelectNative
                id="termination-notice-modality"
                value={noticeModality}
                onChange={(event) => setNoticeModality(event.target.value as hrApi.NoticeModality)}
              >
                <option value="indenizado">Indenizado</option>
                <option value="trabalhado">Trabalhado</option>
              </SelectNative>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="termination-date">Data de desligamento</Label>
            <Input id="termination-date" type="date" value={terminationDate} onChange={(event) => setTerminationDate(event.target.value)} />
          </div>
          {validationError && <p className="text-sm text-destructive">{validationError}</p>}
        </div>
        {error && <DidacticAlert error={error} />}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={mutation.isPending}>
            {mutation.isPending ? 'Abrindo...' : 'Abrir processo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmTerminationAsoDialog({ process, onClose }: { process: hrApi.TerminationProcess | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [asoResult, setAsoResult] = React.useState<hrApi.AsoResult>('apto');
  const [validUntil, setValidUntil] = React.useState('');
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  React.useEffect(() => {
    if (process) {
      setAsoResult('apto');
      setValidUntil('');
      setError(null);
    }
  }, [process]);

  const handleSubmit = async (file: File | null) => {
    if (!process) return;
    setIsPending(true);
    setError(null);
    try {
      // O gate real de conclusão lê `EmployeeDocument` (RF-RH-020/030) — cria
      // o documento primeiro e só então sincroniza o snapshot no processo
      // (para exibição/auditoria na lista).
      if (file) {
        await hrApi.createEmployeeDocument({
          employee_id: process.employee_id,
          doc_type: 'aso_demissional',
          fitness_result: asoResult,
          valid_until: validUntil || undefined,
          file,
        });
      }
      await hrApi.confirmTerminationAsoResult(process.id, asoResult);
      queryClient.invalidateQueries({ queryKey: ['hr-termination-processes'] });
      onClose();
    } catch (err) {
      setError(translateApiError(err, 'Não foi possível registrar o resultado do ASO demissional'));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <FileUploadDialog
      open={Boolean(process)}
      title="Confirmar ASO demissional"
      description="Anexe o laudo de aptidão (PDF/imagem) e registre o resultado — é o que libera a conclusão da demissão (RF-RH-020)."
      fileRequired
      error={error}
      isPending={isPending}
      submitLabel="Confirmar ASO"
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="termination-aso-result">Resultado</Label>
          <SelectNative id="termination-aso-result" value={asoResult} onChange={(event) => setAsoResult(event.target.value as hrApi.AsoResult)}>
            <option value="apto">Apto</option>
            <option value="apto_com_restricao">Apto com restrição</option>
            <option value="inapto">Inapto</option>
          </SelectNative>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="termination-aso-valid-until">Válido até</Label>
          <Input id="termination-aso-valid-until" type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
        </div>
      </div>
    </FileUploadDialog>
  );
}

function AssetChecklistDialog({ process, onClose }: { process: hrApi.TerminationProcess | null; onClose: () => void }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-termination-asset-checklist', process?.id],
    queryFn: () => hrApi.getAssetChecklist(process!.id),
    enabled: Boolean(process),
  });

  return (
    <Dialog open={Boolean(process)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Checklist de devolução de ativos/EPI</DialogTitle>
          <DialogDescription>
            Consulta somente leitura de `Asset.responsible_id` (Patrimônio, RF-RH-023). A devolução em si é feita no módulo
            Patrimônio — nenhum ativo pode continuar vinculado ao funcionário para concluir a demissão.
          </DialogDescription>
        </DialogHeader>
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {isError && <p className="text-sm text-destructive">Não foi possível consultar os ativos vinculados.</p>}
        {data && (
          <div className="flex flex-col gap-2">
            <Badge variant={data.pending ? 'destructive' : 'success'}>
              {data.pending ? 'Devolução pendente' : 'Todos os ativos devolvidos'}
            </Badge>
            <ul className="flex flex-col gap-1">
              {data.assets.map((asset) => (
                <li key={asset.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{asset.description}</span>
                  <Badge variant={asset.returned ? 'success' : 'warning'}>{asset.returned ? 'Devolvido' : 'Pendente'}</Badge>
                </li>
              ))}
              {data.assets.length === 0 && <li className="text-sm text-muted-foreground">Nenhum ativo vinculado.</li>}
            </ul>
          </div>
        )}
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AttachTrctDialog({ process, onClose }: { process: hrApi.TerminationProcess | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [paid, setPaid] = React.useState(false);
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  React.useEffect(() => {
    if (process) {
      setPaid(Boolean(process.trct_paid_at));
      setError(null);
    }
  }, [process]);

  const handleSubmit = async (file: File | null) => {
    if (!process) return;
    setIsPending(true);
    setError(null);
    try {
      await hrApi.attachTrct(process.id, { file: file ?? undefined, paid });
      queryClient.invalidateQueries({ queryKey: ['hr-termination-processes'] });
      onClose();
    } catch (err) {
      setError(translateApiError(err, 'Não foi possível anexar o TRCT'));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <FileUploadDialog
      open={Boolean(process)}
      title="Anexar TRCT"
      description="O ERP não calcula verbas rescisórias — apenas arquiva o documento recebido do provedor de folha e controla o prazo do Art. 477 §6º, CLT."
      fileRequired={false}
      error={error}
      isPending={isPending}
      submitLabel="Salvar"
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4" checked={paid} onChange={(event) => setPaid(event.target.checked)} />
        Rescisão paga (marcador informativo — o ERP não processa pagamento)
      </label>
    </FileUploadDialog>
  );
}
