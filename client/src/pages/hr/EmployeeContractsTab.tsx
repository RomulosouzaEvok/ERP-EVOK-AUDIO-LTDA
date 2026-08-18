import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, XCircle } from 'lucide-react';

import * as hrApi from '@/api/hr';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { useEmployeeOptions } from '@/components/hr/useEmployeeOptions';
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

const TYPE_LABEL: Record<hrApi.ContractType, string> = {
  indeterminado: 'Prazo indeterminado',
  experiencia: 'Experiência',
  aprendiz: 'Aprendiz',
  estagio: 'Estágio',
};

const STATUS_LABEL: Record<hrApi.ContractStatus, string> = {
  ativo: 'Ativo',
  prorrogado: 'Prorrogado',
  efetivado: 'Efetivado',
  indeterminado_automatico: 'Vencido sem decisão',
  rescindido: 'Rescindido',
};

const STATUS_BADGE: Record<hrApi.ContractStatus, BadgeProps['variant']> = {
  ativo: 'secondary',
  prorrogado: 'warning',
  efetivado: 'success',
  indeterminado_automatico: 'destructive',
  rescindido: 'destructive',
};

/**
 * Aba "Contratos" de `/hr` — UC-68 (RF-RH-013 a 016, **P0**). Não existe
 * criação avulsa: o contrato de experiência nasce sempre dentro de
 * "Concluir admissão" (aba Admissão). Aqui: listar, prorrogar (única vez,
 * Art. 451 CLT) e decidir (efetivar/prorrogar/rescindir).
 *
 * `decision: 'rescindir'` exige nível `rh:approve` no backend — o botão
 * fica desabilitado com tooltip explicativo para quem só tem `operate`
 * (a listagem continua liberada, RBAC do bloco só bloqueia a ação).
 */
export function EmployeeContractsTab() {
  const { hasModuleAccess, hasRole, permissions } = useAuth();
  const canWrite = hasModuleAccess('rh');
  const canApprove = hasRole('admin') || permissions?.rh === 'approve';
  const queryClient = useQueryClient();
  const { employees, employeeName } = useEmployeeOptions();

  const [employeeFilter, setEmployeeFilter] = React.useState<number | ''>('');
  const [statusFilter, setStatusFilter] = React.useState<hrApi.ContractStatus | ''>('');
  const [page, setPage] = React.useState(1);

  const [extendingContract, setExtendingContract] = React.useState<hrApi.EmployeeContract | null>(null);
  const [decidingContract, setDecidingContract] = React.useState<hrApi.EmployeeContract | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-employee-contracts', employeeFilter, statusFilter, page],
    queryFn: () =>
      hrApi.listEmployeeContracts({
        employee_id: employeeFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: 20,
      }),
  });

  const colSpan = canWrite ? 7 : 6;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contract-employee-filter">Funcionário</Label>
          <SelectNative
            id="contract-employee-filter"
            className="w-56"
            value={employeeFilter}
            onChange={(event) => {
              setEmployeeFilter(event.target.value ? Number(event.target.value) : '');
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </SelectNative>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contract-status-filter">Status</Label>
          <SelectNative
            id="contract-status-filter"
            className="w-52"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as hrApi.ContractStatus | '');
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
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Funcionário</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>1º período até</TableHead>
            <TableHead>2º período até</TableHead>
            <TableHead>Status</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={colSpan} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-destructive">
                Não foi possível carregar os contratos. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((contract) => (
            <TableRow key={contract.id}>
              <TableCell className="font-medium">{employeeName(contract.employee_id)}</TableCell>
              <TableCell>{TYPE_LABEL[contract.type]}</TableCell>
              <TableCell>{formatDate(contract.start_date)}</TableCell>
              <TableCell>{formatDate(contract.period_1_end_date)}</TableCell>
              <TableCell>{formatDate(contract.period_2_end_date)}</TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE[contract.status]}>{STATUS_LABEL[contract.status]}</Badge>
              </TableCell>
              {canWrite && (
                <TableCell className="flex flex-wrap gap-1.5">
                  {contract.type === 'experiencia' && (contract.status === 'ativo' || contract.status === 'prorrogado') && (
                    <>
                      {contract.status === 'ativo' && !contract.period_2_end_date && (
                        <Button size="sm" variant="outline" onClick={() => setExtendingContract(contract)}>
                          <CalendarClock className="size-4" /> Prorrogar
                        </Button>
                      )}
                      <Button size="sm" onClick={() => setDecidingContract(contract)}>
                        Decidir
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
                Nenhum contrato encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <ExtendContractDialog
        contract={extendingContract}
        onClose={() => setExtendingContract(null)}
        onDone={() => queryClient.invalidateQueries({ queryKey: ['hr-employee-contracts'] })}
      />
      <DecideContractDialog
        contract={decidingContract}
        canApprove={canApprove}
        employeeName={decidingContract ? employeeName(decidingContract.employee_id) : ''}
        onClose={() => setDecidingContract(null)}
        onDone={() => queryClient.invalidateQueries({ queryKey: ['hr-employee-contracts'] })}
      />
    </div>
  );
}

function ExtendContractDialog({
  contract,
  onClose,
  onDone,
}: {
  contract: hrApi.EmployeeContract | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [periodEndDate, setPeriodEndDate] = React.useState('');
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [error, setError] = React.useState<DidacticError | null>(null);

  React.useEffect(() => {
    if (contract) {
      setPeriodEndDate('');
      setValidationError(null);
      setError(null);
    }
  }, [contract]);

  const mutation = useMutation({
    mutationFn: () => hrApi.extendEmployeeContract(contract!.id, periodEndDate),
    onSuccess: () => {
      onDone();
      onClose();
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível prorrogar o contrato')),
  });

  return (
    <Dialog open={Boolean(contract)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Prorrogar contrato de experiência</DialogTitle>
          <DialogDescription>Única prorrogação permitida (Art. 451, CLT) — soma dos dois períodos não pode ultrapassar 90 dias.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="extend-period-2">Fim do 2º período *</Label>
          <Input id="extend-period-2" type="date" value={periodEndDate} onChange={(event) => setPeriodEndDate(event.target.value)} />
          {validationError && <p className="text-sm text-destructive">{validationError}</p>}
        </div>
        {error && <DidacticAlert error={error} />}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (!periodEndDate) {
                setValidationError('Informe a data.');
                return;
              }
              setValidationError(null);
              mutation.mutate();
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Salvando...' : 'Confirmar prorrogação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DecideContractDialog({
  contract,
  canApprove,
  employeeName,
  onClose,
  onDone,
}: {
  contract: hrApi.EmployeeContract | null;
  canApprove: boolean;
  employeeName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [decision, setDecision] = React.useState<'prorrogar' | 'efetivar' | 'rescindir'>('efetivar');
  const [periodEndDate, setPeriodEndDate] = React.useState('');
  const [terminationReason, setTerminationReason] = React.useState('');
  const [noticeModality, setNoticeModality] = React.useState<hrApi.NoticeModality | ''>('');
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [error, setError] = React.useState<DidacticError | null>(null);

  React.useEffect(() => {
    if (contract) {
      setDecision('efetivar');
      setPeriodEndDate('');
      setTerminationReason('');
      setNoticeModality('');
      setValidationError(null);
      setError(null);
    }
  }, [contract]);

  const mutation = useMutation({
    mutationFn: () =>
      hrApi.decideEmployeeContract(contract!.id, {
        decision,
        period_2_end_date: decision === 'prorrogar' ? periodEndDate : undefined,
        termination_reason: decision === 'rescindir' ? terminationReason : undefined,
        notice_modality: decision === 'rescindir' ? noticeModality || undefined : undefined,
      }),
    onSuccess: () => {
      onDone();
      onClose();
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível registrar a decisão sobre o contrato')),
  });

  const handleConfirm = () => {
    if (decision === 'prorrogar' && !periodEndDate) {
      setValidationError('Informe a data de fim do 2º período.');
      return;
    }
    if (decision === 'rescindir' && !terminationReason.trim()) {
      setValidationError('Informe o motivo da rescisão.');
      return;
    }
    if (decision === 'rescindir' && !noticeModality) {
      setValidationError('Selecione a modalidade do aviso prévio.');
      return;
    }
    setValidationError(null);
    mutation.mutate();
  };

  return (
    <Dialog open={Boolean(contract)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decisão sobre o contrato — {employeeName}</DialogTitle>
          <DialogDescription>
            "Rescindir" encaminha para um processo de demissão por término de experiência e exige nível de aprovação de RH.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="decision-select">Decisão</Label>
            <SelectNative
              id="decision-select"
              value={decision}
              onChange={(event) => setDecision(event.target.value as typeof decision)}
            >
              <option value="efetivar">Efetivar (contrato por prazo indeterminado)</option>
              <option value="prorrogar">Prorrogar</option>
              <option value="rescindir">Rescindir (término de experiência)</option>
            </SelectNative>
          </div>
          {decision === 'prorrogar' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="decision-period-2">Fim do 2º período *</Label>
              <Input id="decision-period-2" type="date" value={periodEndDate} onChange={(event) => setPeriodEndDate(event.target.value)} />
            </div>
          )}
          {decision === 'rescindir' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="decision-termination-reason">Motivo *</Label>
              <textarea
                id="decision-termination-reason"
                className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={terminationReason}
                onChange={(event) => setTerminationReason(event.target.value)}
              />
              <Label htmlFor="decision-notice-modality">Modalidade do aviso prévio *</Label>
              <SelectNative
                id="decision-notice-modality"
                value={noticeModality}
                onChange={(event) => setNoticeModality(event.target.value as hrApi.NoticeModality)}
              >
                <option value="">Selecione...</option>
                <option value="trabalhado">Trabalhado</option>
                <option value="indenizado">Indenizado</option>
              </SelectNative>
              {!canApprove && (
                <p className="text-sm text-amber-600">
                  Rescindir exige nível de aprovação de RH ("rh:approve"). O botão de confirmação ficará desabilitado se você
                  não tiver esse nível — o backend rejeitará com 403.
                </p>
              )}
            </div>
          )}
          {validationError && <p className="text-sm text-destructive">{validationError}</p>}
        </div>
        {error && <DidacticAlert error={error} />}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={decision === 'rescindir' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={mutation.isPending || (decision === 'rescindir' && !canApprove)}
            title={decision === 'rescindir' && !canApprove ? 'Requer nível de aprovação de RH (rh:approve).' : undefined}
          >
            {mutation.isPending ? 'Salvando...' : decision === 'rescindir' ? <><XCircle className="size-4" /> Confirmar rescisão</> : <><CheckCircle2 className="size-4" /> Confirmar</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
