import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Gavel, Plus } from 'lucide-react';

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
import {
  CASE_ROLE_LABELS,
  CASE_TYPE_LABELS,
  CaseStatusBadge,
  RISK_CLASS_LABELS,
  RiskClassBadge,
  formatCurrency,
  formatDateTime,
} from './juridicoShared';

/** Aba Contencioso — `/juridico`, UC-53: processos, andamentos, provisões, custos, encerramento. */
export function LegalCasesTab() {
  const [statusFilter, setStatusFilter] = React.useState<jurApi.CaseStatus | ''>('');
  const [typeFilter, setTypeFilter] = React.useState<jurApi.CaseType | ''>('');
  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [lawyersOpen, setLawyersOpen] = React.useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['jur-legal-cases', statusFilter, typeFilter],
    queryFn: () => jurApi.listLegalCases({ status: statusFilter || undefined, type: typeFilter || undefined, limit: 50 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm text-muted-foreground">Status</Label>
            <SelectNative className="max-w-48" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as jurApi.CaseStatus | '')}>
              <option value="">Todos</option>
              <option value="active">Ativo</option>
              <option value="won">Ganho</option>
              <option value="lost">Perdido</option>
              <option value="settled">Acordo</option>
              <option value="archived">Arquivado</option>
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm text-muted-foreground">Tipo</Label>
            <SelectNative className="max-w-48" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as jurApi.CaseType | '')}>
              <option value="">Todos</option>
              {Object.entries(CASE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectNative>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setLawyersOpen(true)}>
            Advogados externos
          </Button>
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Novo processo
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nº do processo</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead>Valor da causa</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-destructive">
                Não foi possível carregar os processos.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((legalCase) => (
            <TableRow key={legalCase.id} className="border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5">
              <TableCell className="font-mono text-xs">{legalCase.case_number}</TableCell>
              <TableCell>{CASE_TYPE_LABELS[legalCase.case_type]}</TableCell>
              <TableCell>{CASE_ROLE_LABELS[legalCase.case_role] ?? legalCase.case_role}</TableCell>
              <TableCell>{formatCurrency(legalCase.claim_value)}</TableCell>
              <TableCell>
                <CaseStatusBadge status={legalCase.status} />
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => setDetailId(legalCase.id)}>
                  Detalhes
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Gavel className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum processo encontrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <CreateLegalCaseDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => setDetailId(id)} />
      <LegalCaseDetailDialog legalCaseId={detailId} onClose={() => setDetailId(null)} />
      <ExternalLawyersDialog open={lawyersOpen} onClose={() => setLawyersOpen(false)} />
    </div>
  );
}

function ExternalLawyersDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [fullName, setFullName] = React.useState('');
  const [oab, setOab] = React.useState('');
  const [lawFirm, setLawFirm] = React.useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['jur-external-lawyers'],
    queryFn: () => jurApi.listExternalLawyers({ limit: 100 }),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: () => jurApi.createExternalLawyer({ full_name: fullName, oab_number: oab, law_firm: lawFirm || undefined }),
    onSuccess: () => {
      setError(null);
      setFullName('');
      setOab('');
      setLawFirm('');
      queryClient.invalidateQueries({ queryKey: ['jur-external-lawyers'] });
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível cadastrar o advogado externo')),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Advogados externos</DialogTitle>
        </DialogHeader>

        {error && <DidacticAlert error={error} />}

        <div className="flex max-h-48 flex-col gap-1 overflow-y-auto text-sm">
          {isLoading && <p className="text-muted-foreground">Carregando...</p>}
          {data?.data.map((lawyer) => (
            <div key={lawyer.id} className="rounded-md border p-2">
              <p className="font-medium">{lawyer.full_name}</p>
              <p className="text-xs text-muted-foreground">
                OAB {lawyer.oab_number}
                {lawyer.law_firm && ` · ${lawyer.law_firm}`}
              </p>
            </div>
          ))}
          {!isLoading && data?.data.length === 0 && <p className="text-muted-foreground">Nenhum advogado externo cadastrado.</p>}
        </div>

        <div className="flex flex-col gap-2 border-t pt-3">
          <p className="text-sm font-semibold">Cadastrar novo</p>
          <Input placeholder="Nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input placeholder="OAB" value={oab} onChange={(e) => setOab(e.target.value)} />
          <Input placeholder="Escritório (opcional)" value={lawFirm} onChange={(e) => setLawFirm(e.target.value)} />
          <Button size="sm" disabled={!fullName.trim() || !oab.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>
            Cadastrar
          </Button>
        </div>

        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}

function CreateLegalCaseDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [form, setForm] = React.useState<jurApi.CreateLegalCaseInput>({
    case_number_cnj: '',
    type: 'labor',
    role: 'defendant',
    court: '',
    claim_value: '',
    internal_responsible_user_id: 0,
  });

  React.useEffect(() => {
    if (open) {
      setError(null);
      setForm({ case_number_cnj: '', type: 'labor', role: 'defendant', court: '', claim_value: '', internal_responsible_user_id: 0 });
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: () => jurApi.createLegalCase(form),
    onSuccess: (legalCase) => {
      queryClient.invalidateQueries({ queryKey: ['jur-legal-cases'] });
      onCreated(legalCase.id);
      onClose();
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível cadastrar o processo')),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Novo processo judicial/administrativo</DialogTitle>
        </DialogHeader>

        {error && <DidacticAlert error={error} />}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Número CNJ</Label>
            <Input value={form.case_number_cnj} onChange={(e) => setForm((f) => ({ ...f, case_number_cnj: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <SelectNative value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as jurApi.CaseType }))}>
                {Object.entries(CASE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Papel</Label>
              <SelectNative value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as jurApi.CaseRole }))}>
                <option value="plaintiff">Autor</option>
                <option value="defendant">Réu</option>
                <option value="third_party">Terceiro</option>
              </SelectNative>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Vara/tribunal</Label>
            <Input value={form.court ?? ''} onChange={(e) => setForm((f) => ({ ...f, court: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Valor da causa (R$)</Label>
              <Input type="number" step="any" value={form.claim_value ?? ''} onChange={(e) => setForm((f) => ({ ...f, claim_value: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>ID do responsável interno</Label>
              <Input
                type="number"
                value={form.internal_responsible_user_id || ''}
                onChange={(e) => setForm((f) => ({ ...f, internal_responsible_user_id: Number(e.target.value) }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!form.case_number_cnj.trim() || !form.internal_responsible_user_id || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Cadastrar processo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LegalCaseDetailDialog({ legalCaseId, onClose }: { legalCaseId: number | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<DidacticError | null>(null);

  const [eventType, setEventType] = React.useState<jurApi.LegalEventType>('hearing');
  const [eventDescription, setEventDescription] = React.useState('');
  const [riskClass, setRiskClass] = React.useState<jurApi.RiskClass>('possible');
  const [provisionedAmount, setProvisionedAmount] = React.useState('');
  const [claimAmount, setClaimAmount] = React.useState('');
  const [rationale, setRationale] = React.useState('');
  const [costType, setCostType] = React.useState<jurApi.LegalCostEntryType>('expense');
  const [costDescription, setCostDescription] = React.useState('');
  const [costAmount, setCostAmount] = React.useState('');
  const [costDueDate, setCostDueDate] = React.useState('');
  const [closeResolution, setCloseResolution] = React.useState<'won' | 'lost' | 'settled' | 'archived'>('won');
  const [settlementAmount, setSettlementAmount] = React.useState('');
  const [installments, setInstallments] = React.useState('1');

  const { data: legalCase, isLoading } = useQuery({
    queryKey: ['jur-legal-case-detail', legalCaseId],
    queryFn: () => jurApi.getLegalCase(legalCaseId!),
    enabled: legalCaseId != null,
  });

  const { data: currentProvision } = useQuery({
    queryKey: ['jur-legal-case-current-provision', legalCaseId],
    queryFn: () => jurApi.getCurrentLegalCaseProvision(legalCaseId!),
    enabled: legalCaseId != null,
  });

  React.useEffect(() => {
    if (legalCaseId != null) {
      setError(null);
      setEventDescription('');
      setProvisionedAmount('');
      setClaimAmount('');
      setRationale('');
      setCostDescription('');
      setCostAmount('');
      setCostDueDate('');
      setSettlementAmount('');
      setInstallments('1');
    }
  }, [legalCaseId]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['jur-legal-case-detail', legalCaseId] });
    queryClient.invalidateQueries({ queryKey: ['jur-legal-case-current-provision', legalCaseId] });
    queryClient.invalidateQueries({ queryKey: ['jur-legal-cases'] });
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

  const addEventMutation = useAction(
    () => jurApi.addLegalCaseEvent(legalCaseId!, { event_type: eventType, description: eventDescription }),
    'Não foi possível registrar o andamento',
  );
  const addProvisionMutation = useAction(
    () =>
      jurApi.addLegalCaseProvision(legalCaseId!, {
        risk_class: riskClass,
        provisioned_amount: provisionedAmount || undefined,
        claim_amount: claimAmount || undefined,
        rationale: rationale || undefined,
      }),
    'Não foi possível registrar a avaliação de risco',
  );
  const registerCostMutation = useAction(
    () => jurApi.registerLegalCaseCost(legalCaseId!, { entry_type: costType, description: costDescription, amount: costAmount, due_date: costDueDate }),
    'Não foi possível lançar o custo',
  );
  const closeMutation = useAction(
    () =>
      jurApi.closeLegalCase(legalCaseId!, {
        resolution: closeResolution,
        settlement_amount: closeResolution === 'settled' ? settlementAmount : undefined,
        installments: closeResolution === 'settled' ? Number(installments) : undefined,
      }),
    'Não foi possível encerrar o processo',
  );

  return (
    <Dialog open={legalCaseId != null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{legalCase ? legalCase.case_number : 'Processo'}</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {legalCase && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <CaseStatusBadge status={legalCase.status} />
              <span className="text-xs text-muted-foreground">Valor da causa: {formatCurrency(legalCase.claim_value)}</span>
              <span className="text-xs text-muted-foreground">Vara: {legalCase.court ?? '-'}</span>
            </div>

            <div className="flex items-center gap-2 rounded-md border p-3">
              <span className="text-sm font-semibold">Avaliação de risco vigente:</span>
              <RiskClassBadge riskClass={currentProvision?.risk_class} />
              {currentProvision && <span className="text-xs text-muted-foreground">Provisionado: {formatCurrency(currentProvision.provisioned_amount)}</span>}
            </div>

            {error && <DidacticAlert error={error} />}

            {/* Andamentos */}
            <div className="flex flex-col gap-2 rounded-md border p-3">
              <p className="text-sm font-semibold">Andamentos ({legalCase.events.length})</p>
              <ul className="flex max-h-32 flex-col gap-1 overflow-y-auto text-xs text-muted-foreground">
                {legalCase.events.map((event) => (
                  <li key={event.id}>
                    {formatDateTime(event.occurred_at)} — {event.event_type}: {event.description}
                  </li>
                ))}
                {legalCase.events.length === 0 && <li>Nenhum andamento registrado.</li>}
              </ul>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-end gap-2">
                  <SelectNative className="max-w-44" value={eventType} onChange={(e) => setEventType(e.target.value as jurApi.LegalEventType)}>
                    <option value="petition">Petição</option>
                    <option value="hearing">Audiência</option>
                    <option value="decision">Decisão</option>
                    <option value="appeal">Recurso</option>
                    <option value="deposit">Depósito</option>
                    <option value="other">Outro</option>
                  </SelectNative>
                </div>
                <Textarea rows={2} placeholder="Descrição do andamento" value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} />
                <Button
                  size="sm"
                  variant="outline"
                  className="self-start"
                  disabled={!eventDescription.trim() || addEventMutation.isPending}
                  onClick={() => addEventMutation.mutate(undefined)}
                >
                  Registrar andamento
                </Button>
              </div>
            </div>

            {/* Provisão */}
            <div className="flex flex-col gap-2 rounded-md border p-3">
              <p className="text-sm font-semibold">Nova avaliação de risco / provisão</p>
              <div className="grid grid-cols-3 gap-2">
                <SelectNative value={riskClass} onChange={(e) => setRiskClass(e.target.value as jurApi.RiskClass)}>
                  {Object.entries(RISK_CLASS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectNative>
                <Input type="number" step="any" placeholder="Provisionado (R$)" value={provisionedAmount} onChange={(e) => setProvisionedAmount(e.target.value)} />
                <Input type="number" step="any" placeholder="Valor da causa (R$)" value={claimAmount} onChange={(e) => setClaimAmount(e.target.value)} />
              </div>
              <Textarea rows={2} placeholder="Justificativa (obrigatória se provável)" value={rationale} onChange={(e) => setRationale(e.target.value)} />
              <Button
                size="sm"
                variant="outline"
                className="self-start"
                disabled={addProvisionMutation.isPending}
                onClick={() => addProvisionMutation.mutate(undefined)}
              >
                Registrar avaliação
              </Button>
            </div>

            {/* Custos */}
            <div className="flex flex-col gap-2 rounded-md border p-3">
              <p className="text-sm font-semibold">Lançar custo do processo</p>
              <div className="grid grid-cols-2 gap-2">
                <SelectNative value={costType} onChange={(e) => setCostType(e.target.value as jurApi.LegalCostEntryType)}>
                  <option value="expense">Despesa (honorário/custas/perícia)</option>
                  <option value="judicial_deposit">Depósito judicial/recursal</option>
                </SelectNative>
                <Input type="date" value={costDueDate} onChange={(e) => setCostDueDate(e.target.value)} />
              </div>
              <Input placeholder="Descrição" value={costDescription} onChange={(e) => setCostDescription(e.target.value)} />
              <Input type="number" step="any" placeholder="Valor (R$)" value={costAmount} onChange={(e) => setCostAmount(e.target.value)} />
              <Button
                size="sm"
                variant="outline"
                className="self-start"
                disabled={!costDescription.trim() || !costAmount || !costDueDate || registerCostMutation.isPending}
                onClick={() => registerCostMutation.mutate(undefined)}
              >
                Lançar custo (gera Conta a Pagar)
              </Button>
            </div>

            {/* Encerramento */}
            {legalCase.status === 'active' && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-semibold">Encerrar processo</p>
                <div className="grid grid-cols-2 gap-2">
                  <SelectNative value={closeResolution} onChange={(e) => setCloseResolution(e.target.value as typeof closeResolution)}>
                    <option value="won">Ganho</option>
                    <option value="lost">Perdido</option>
                    <option value="settled">Acordo</option>
                    <option value="archived">Arquivado</option>
                  </SelectNative>
                  {closeResolution === 'settled' && (
                    <div className="flex gap-2">
                      <Input type="number" step="any" placeholder="Valor do acordo" value={settlementAmount} onChange={(e) => setSettlementAmount(e.target.value)} />
                      <Input type="number" placeholder="Parcelas" value={installments} onChange={(e) => setInstallments(e.target.value)} />
                    </div>
                  )}
                </div>
                <Button size="sm" variant="destructive" className="self-start" disabled={closeMutation.isPending} onClick={() => closeMutation.mutate(undefined)}>
                  Encerrar processo
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
