import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus, ShieldAlert } from 'lucide-react';

import * as jurApi from '@/api/juridico';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/Textarea';
import { SelectNative } from '@/components/ui/select-native';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  COMMUNICATION_DECISION_LABELS,
  DATA_SUBJECT_REQUEST_TYPE_LABELS,
  DataSubjectRequestStatusBadge,
  IncidentStatusBadge,
  LEGAL_BASIS_LABELS,
  formatDate,
  formatDateTime,
} from './juridicoShared';

type LgpdSubTab = 'ropa' | 'requests' | 'incidents';

/** Aba LGPD — `/juridico`, UC-56: RoPA, solicitações de titular (com SLA de 15 dias) e incidentes. */
export function LgpdTab() {
  const [subTab, setSubTab] = React.useState<LgpdSubTab>('requests');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1 border-b">
        <SubTabButton active={subTab === 'requests'} onClick={() => setSubTab('requests')}>
          Solicitações de titular
        </SubTabButton>
        <SubTabButton active={subTab === 'ropa'} onClick={() => setSubTab('ropa')}>
          RoPA (Registro de Tratamento)
        </SubTabButton>
        <SubTabButton active={subTab === 'incidents'} onClick={() => setSubTab('incidents')}>
          Incidentes
        </SubTabButton>
      </div>

      {subTab === 'requests' && <DataSubjectRequestsPanel />}
      {subTab === 'ropa' && <RopaPanel />}
      {subTab === 'incidents' && <IncidentsPanel />}
    </div>
  );
}

function SubTabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-selected={active}
      className={cn(
        'rounded-none border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground',
        active && 'border-brand text-brand',
      )}
    >
      {children}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Solicitações de titular
// ---------------------------------------------------------------------------

function DataSubjectRequestsPanel() {
  const [criticalOnly, setCriticalOnly] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<jurApi.DataSubjectRequestStatus | ''>('');
  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  const { data: listData, isLoading: isListLoading } = useQuery({
    queryKey: ['jur-lgpd-requests', statusFilter],
    queryFn: () => jurApi.listDataSubjectRequests({ status: statusFilter || undefined, limit: 50 }),
    enabled: !criticalOnly,
  });
  const { data: criticalData, isLoading: isCriticalLoading } = useQuery({
    queryKey: ['jur-lgpd-requests-critical'],
    queryFn: () => jurApi.listPendingCriticalDataSubjectRequests(),
    enabled: criticalOnly,
  });

  const rows = criticalOnly ? criticalData : listData?.data;
  const isLoading = criticalOnly ? isCriticalLoading : isListLoading;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm text-muted-foreground">Status</Label>
            <SelectNative
              className="max-w-56"
              value={statusFilter}
              disabled={criticalOnly}
              onChange={(e) => setStatusFilter(e.target.value as jurApi.DataSubjectRequestStatus | '')}
            >
              <option value="">Todos</option>
              <option value="received">Recebida</option>
              <option value="verifying">Verificando identidade</option>
              <option value="in_progress">Em andamento</option>
              <option value="answered">Respondida</option>
              <option value="rejected_justified">Recusada (justificada)</option>
            </SelectNative>
          </div>
          <Button type="button" variant={criticalOnly ? 'default' : 'outline'} size="sm" onClick={() => setCriticalOnly((v) => !v)}>
            <AlertTriangle className="size-4" />
            Só críticas (D-5/vencidas)
          </Button>
        </div>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Nova solicitação
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Recebida em</TableHead>
            <TableHead>Prazo (15 dias)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={5} />}
          {rows?.map((request) => (
            <TableRow key={request.id} className="border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5">
              <TableCell>{DATA_SUBJECT_REQUEST_TYPE_LABELS[request.request_type] ?? request.request_type}</TableCell>
              <TableCell>{formatDate(request.received_at)}</TableCell>
              <TableCell>{formatDate(request.due_date)}</TableCell>
              <TableCell>
                <DataSubjectRequestStatusBadge status={request.status} />
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => setDetailId(request.id)}>
                  Detalhes
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && rows?.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                Nenhuma solicitação encontrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <CreateDataSubjectRequestDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => setDetailId(id)} />
      <DataSubjectRequestDetailDialog requestId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function CreateDataSubjectRequestDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [type, setType] = React.useState<jurApi.DataSubjectRequestType>('access');
  const [requesterName, setRequesterName] = React.useState('');
  const [requesterDocument, setRequesterDocument] = React.useState('');
  const [requesterContact, setRequesterContact] = React.useState('');
  const [subjectCategory, setSubjectCategory] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setError(null);
      setType('access');
      setRequesterName('');
      setRequesterDocument('');
      setRequesterContact('');
      setSubjectCategory('');
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: () =>
      jurApi.createDataSubjectRequest({
        type,
        requester_name: requesterName || undefined,
        requester_document: requesterDocument || undefined,
        requester_contact: requesterContact || undefined,
        subject_category: subjectCategory || undefined,
      }),
    onSuccess: (request) => {
      queryClient.invalidateQueries({ queryKey: ['jur-lgpd-requests'] });
      queryClient.invalidateQueries({ queryKey: ['jur-lgpd-requests-critical'] });
      onCreated(request.id);
      onClose();
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível registrar a solicitação')),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova solicitação de titular (LGPD art. 18)</DialogTitle>
        </DialogHeader>

        {error && <DidacticAlert error={error} />}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Tipo</Label>
            <SelectNative value={type} onChange={(e) => setType(e.target.value as jurApi.DataSubjectRequestType)}>
              {Object.entries(DATA_SUBJECT_REQUEST_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Nome do titular</Label>
              <Input value={requesterName} onChange={(e) => setRequesterName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Documento</Label>
              <Input value={requesterDocument} onChange={(e) => setRequesterDocument(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Contato (e-mail)</Label>
              <Input value={requesterContact} onChange={(e) => setRequesterContact(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Categoria do titular</Label>
              <Input placeholder="cliente / funcionário / fornecedor" value={subjectCategory} onChange={(e) => setSubjectCategory(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">O prazo de resposta (15 dias, LGPD art. 19 II) é calculado automaticamente.</p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DataSubjectRequestDetailDialog({ requestId, onClose }: { requestId: number | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [verificationNotes, setVerificationNotes] = React.useState('');
  const [resolutionNotes, setResolutionNotes] = React.useState('');
  const [rejectionJustification, setRejectionJustification] = React.useState('');

  const { data: request, isLoading } = useQuery({
    queryKey: ['jur-lgpd-request-detail', requestId],
    queryFn: () => jurApi.getDataSubjectRequest(requestId!),
    enabled: requestId != null,
  });

  React.useEffect(() => {
    if (requestId != null) {
      setError(null);
      setVerificationNotes('');
      setResolutionNotes('');
      setRejectionJustification('');
    }
  }, [requestId]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['jur-lgpd-request-detail', requestId] });
    queryClient.invalidateQueries({ queryKey: ['jur-lgpd-requests'] });
    queryClient.invalidateQueries({ queryKey: ['jur-lgpd-requests-critical'] });
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

  const verifyMutation = useAction(
    () => jurApi.verifyDataSubjectRequestIdentity(requestId!, true, verificationNotes || undefined),
    'Não foi possível verificar a identidade',
  );
  const resolveMutation = useAction(
    () => jurApi.resolveDataSubjectRequest(requestId!, resolutionNotes),
    'Não foi possível registrar o desfecho',
  );
  const rejectMutation = useAction(
    () => jurApi.rejectDataSubjectRequest(requestId!, rejectionJustification),
    'Não foi possível recusar a solicitação',
  );

  return (
    <Dialog open={requestId != null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Solicitação de titular</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {request && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <DataSubjectRequestStatusBadge status={request.status} />
              <span className="text-xs text-muted-foreground">
                Recebida: {formatDate(request.received_at)} · Prazo: {formatDate(request.due_date)}
              </span>
            </div>
            <p className="text-sm">
              {DATA_SUBJECT_REQUEST_TYPE_LABELS[request.request_type] ?? request.request_type} — {request.requester_name}
            </p>

            {error && <DidacticAlert error={error} />}

            {request.status === 'received' || request.status === 'verifying' ? (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-semibold">Verificar identidade (obrigatório para avançar)</p>
                <Input placeholder="Notas de verificação" value={verificationNotes} onChange={(e) => setVerificationNotes(e.target.value)} />
                <Button size="sm" className="self-start" disabled={verifyMutation.isPending} onClick={() => verifyMutation.mutate(undefined)}>
                  Confirmar identidade verificada
                </Button>
              </div>
            ) : null}

            {request.status === 'in_progress' && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-semibold">Registrar desfecho</p>
                <Textarea rows={2} placeholder="Notas de resolução" value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} />
                <Button
                  size="sm"
                  className="self-start"
                  disabled={!resolutionNotes.trim() || resolveMutation.isPending}
                  onClick={() => resolveMutation.mutate(undefined)}
                >
                  Marcar como respondida
                </Button>
              </div>
            )}

            {['received', 'verifying', 'in_progress'].includes(request.status) && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-semibold">Recusar (nível approve)</p>
                <Textarea
                  rows={2}
                  placeholder="Justificativa da recusa (obrigatória)"
                  value={rejectionJustification}
                  onChange={(e) => setRejectionJustification(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="self-start"
                  disabled={!rejectionJustification.trim() || rejectMutation.isPending}
                  onClick={() => rejectMutation.mutate(undefined)}
                >
                  Recusar solicitação
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

// ---------------------------------------------------------------------------
// RoPA
// ---------------------------------------------------------------------------

function RopaPanel() {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['jur-lgpd-ropa'],
    queryFn: () => jurApi.listProcessingActivities({ limit: 50 }),
  });

  const reviewMutation = useMutation({
    mutationFn: (id: number) => jurApi.reviewProcessingActivity(id),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['jur-lgpd-ropa'] });
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível registrar a revisão')),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Nova atividade de tratamento
        </Button>
      </div>

      {error && <DidacticAlert error={error} />}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Finalidade</TableHead>
            <TableHead>Base legal</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead>Próxima revisão</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={5} />}
          {data?.data.map((activity) => (
            <TableRow key={activity.id}>
              <TableCell className="max-w-64 truncate" title={activity.purpose}>
                {activity.purpose}
              </TableCell>
              <TableCell>{LEGAL_BASIS_LABELS[activity.legal_basis] ?? activity.legal_basis}</TableCell>
              <TableCell>#{activity.department_id}</TableCell>
              <TableCell>{formatDate(activity.next_review_due_at)}</TableCell>
              <TableCell>
                <Button size="sm" variant="outline" disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate(activity.id)}>
                  Registrar revisão
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                Nenhuma atividade de tratamento cadastrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <CreateProcessingActivityDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function CreateProcessingActivityDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [purpose, setPurpose] = React.useState('');
  const [legalBasis, setLegalBasis] = React.useState<jurApi.LegalBasis>('legal_obligation');
  const [dataCategories, setDataCategories] = React.useState('');
  const [dataSubjectCategories, setDataSubjectCategories] = React.useState('');
  const [departmentId, setDepartmentId] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setError(null);
      setPurpose('');
      setLegalBasis('legal_obligation');
      setDataCategories('');
      setDataSubjectCategories('');
      setDepartmentId('');
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: () =>
      jurApi.createProcessingActivity({
        purpose,
        legal_basis: legalBasis,
        data_categories: dataCategories,
        data_subject_categories: dataSubjectCategories,
        department_id: Number(departmentId),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jur-lgpd-ropa'] });
      onClose();
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível cadastrar a atividade')),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova atividade de tratamento (RoPA)</DialogTitle>
        </DialogHeader>

        {error && <DidacticAlert error={error} />}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Finalidade</Label>
            <Textarea rows={2} value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Base legal</Label>
            <SelectNative value={legalBasis} onChange={(e) => setLegalBasis(e.target.value as jurApi.LegalBasis)}>
              {Object.entries(LEGAL_BASIS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Categorias de dados (separadas por vírgula)</Label>
            <Input value={dataCategories} onChange={(e) => setDataCategories(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Categorias de titulares (separadas por vírgula)</Label>
            <Input value={dataSubjectCategories} onChange={(e) => setDataSubjectCategories(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>ID do departamento</Label>
            <Input type="number" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!purpose.trim() || !dataCategories.trim() || !dataSubjectCategories.trim() || !departmentId || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Incidentes
// ---------------------------------------------------------------------------

function IncidentsPanel() {
  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['jur-lgpd-incidents'],
    queryFn: () => jurApi.listIncidents({ limit: 50 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Abrir incidente
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Detectado em</TableHead>
            <TableHead>Avaliação de risco</TableHead>
            <TableHead>Decisão de comunicação</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={5} />}
          {data?.data.map((incident) => (
            <TableRow key={incident.id}>
              <TableCell>{formatDateTime(incident.detected_at)}</TableCell>
              <TableCell>{incident.risk_assessment}</TableCell>
              <TableCell>
                {incident.communication_decision ? COMMUNICATION_DECISION_LABELS[incident.communication_decision] : 'Pendente'}
              </TableCell>
              <TableCell>
                <IncidentStatusBadge status={incident.status} />
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => setDetailId(incident.id)}>
                  Detalhes
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ShieldAlert className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum incidente registrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <CreateIncidentDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => setDetailId(id)} />
      <IncidentDetailDialog incidentId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function CreateIncidentDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [detectedAt, setDetectedAt] = React.useState('');
  const [occurredAt, setOccurredAt] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [riskAssessment, setRiskAssessment] = React.useState('');
  const [actionPlan, setActionPlan] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setError(null);
      setDetectedAt('');
      setOccurredAt('');
      setDescription('');
      setRiskAssessment('');
      setActionPlan('');
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: () =>
      jurApi.createIncident({
        detected_at: detectedAt,
        occurred_at: occurredAt || null,
        description,
        risk_assessment: riskAssessment,
        action_plan: actionPlan || undefined,
      }),
    onSuccess: (incident) => {
      queryClient.invalidateQueries({ queryKey: ['jur-lgpd-incidents'] });
      onCreated(incident.id);
      onClose();
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível abrir o incidente')),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Abrir incidente de segurança (LGPD art. 48)</DialogTitle>
        </DialogHeader>

        {error && <DidacticAlert error={error} />}

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Detectado em</Label>
              <Input type="datetime-local" value={detectedAt} onChange={(e) => setDetectedAt(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Ocorrido em (se conhecido)</Label>
              <Input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Descrição</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Avaliação de risco</Label>
            <Input value={riskAssessment} onChange={(e) => setRiskAssessment(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Plano de ação</Label>
            <Textarea rows={2} value={actionPlan} onChange={(e) => setActionPlan(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!detectedAt || !description.trim() || !riskAssessment.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Abrir incidente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IncidentDetailDialog({ incidentId, onClose }: { incidentId: number | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [notifyAnpd, setNotifyAnpd] = React.useState(false);
  const [notifyAnpdJustification, setNotifyAnpdJustification] = React.useState('');
  const [notifySubjects, setNotifySubjects] = React.useState(false);
  const [notifySubjectsJustification, setNotifySubjectsJustification] = React.useState('');

  const { data: incident, isLoading } = useQuery({
    queryKey: ['jur-lgpd-incident-detail', incidentId],
    queryFn: () => jurApi.getIncident(incidentId!),
    enabled: incidentId != null,
  });

  React.useEffect(() => {
    if (incidentId != null) {
      setError(null);
      setNotifyAnpd(false);
      setNotifyAnpdJustification('');
      setNotifySubjects(false);
      setNotifySubjectsJustification('');
    }
  }, [incidentId]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['jur-lgpd-incident-detail', incidentId] });
    queryClient.invalidateQueries({ queryKey: ['jur-lgpd-incidents'] });
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

  const decideMutation = useAction(
    () =>
      jurApi.decideIncident(incidentId!, {
        notify_anpd: notifyAnpd,
        notify_anpd_justification: notifyAnpdJustification,
        notify_data_subjects: notifySubjects,
        notify_data_subjects_justification: notifySubjectsJustification,
      }),
    'Não foi possível registrar a decisão de comunicação',
  );
  const closeMutation = useAction(() => jurApi.closeIncident(incidentId!), 'Não foi possível encerrar o incidente');

  return (
    <Dialog open={incidentId != null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Incidente de segurança</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {incident && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <IncidentStatusBadge status={incident.status} />
              <span className="text-xs text-muted-foreground">Detectado: {formatDateTime(incident.detected_at)}</span>
            </div>
            <p className="text-sm">{incident.description}</p>
            <p className="text-xs text-muted-foreground">Risco: {incident.risk_assessment}</p>

            {error && <DidacticAlert error={error} />}

            {incident.status !== 'closed' && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-semibold">Decisão de comunicação (nível approve) — justificativa obrigatória mesmo se "não comunicar"</p>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={notifyAnpd} onChange={(e) => setNotifyAnpd(e.target.checked)} />
                  Comunicar à ANPD
                </label>
                <Input placeholder="Justificativa ANPD" value={notifyAnpdJustification} onChange={(e) => setNotifyAnpdJustification(e.target.value)} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={notifySubjects} onChange={(e) => setNotifySubjects(e.target.checked)} />
                  Comunicar aos titulares
                </label>
                <Input
                  placeholder="Justificativa titulares"
                  value={notifySubjectsJustification}
                  onChange={(e) => setNotifySubjectsJustification(e.target.value)}
                />
                <Button
                  size="sm"
                  className="self-start"
                  disabled={!notifyAnpdJustification.trim() || !notifySubjectsJustification.trim() || decideMutation.isPending}
                  onClick={() => decideMutation.mutate(undefined)}
                >
                  Registrar decisão
                </Button>
              </div>
            )}

            {incident.status === 'investigating' && (
              <Button type="button" size="sm" variant="destructive" disabled={closeMutation.isPending} onClick={() => closeMutation.mutate(undefined)}>
                Encerrar incidente
              </Button>
            )}
          </div>
        )}

        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
