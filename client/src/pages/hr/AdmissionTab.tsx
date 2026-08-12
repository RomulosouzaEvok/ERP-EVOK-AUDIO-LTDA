import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Stethoscope, ListChecks, CheckCircle2, Send, Ban } from 'lucide-react';

import * as hrApi from '@/api/hr';
import * as departmentsApi from '@/api/departments';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
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

const STATUS_LABEL: Record<hrApi.AdmissionStatus, string> = {
  documentos_pendentes: 'Documentos pendentes',
  aso_pendente: 'ASO pendente',
  aguardando_esocial: 'Aguardando eSocial',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

const STATUS_BADGE: Record<hrApi.AdmissionStatus, BadgeProps['variant']> = {
  documentos_pendentes: 'warning',
  aso_pendente: 'warning',
  aguardando_esocial: 'secondary',
  concluida: 'success',
  cancelada: 'destructive',
};

const CHECKLIST_LABEL: Record<hrApi.ChecklistDocument, string> = {
  rg: 'RG',
  cpf: 'CPF',
  ctps_digital: 'CTPS digital',
  pis: 'PIS',
  comprovante_residencia: 'Comprovante de residência',
  foto: 'Foto',
};

const CHECKLIST_FIELD_MAP: Record<hrApi.ChecklistDocument, keyof hrApi.AdmissionProcess> = {
  rg: 'checklist_rg',
  cpf: 'checklist_cpf',
  ctps_digital: 'checklist_ctps',
  pis: 'checklist_pis',
  comprovante_residencia: 'checklist_proof_of_address',
  foto: 'checklist_photo',
};

const WORK_REGIME_LABEL: Record<hrApi.EmployeeWorkRegimeRh, string> = {
  clt: 'CLT',
  pj: 'PJ',
  estagiario: 'Estagiário',
  aprendiz: 'Aprendiz',
};

const SHIFT_LABEL: Record<hrApi.EmployeeShiftRh, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  night: 'Noite',
  commercial: 'Comercial',
  rotating: 'Revezamento',
};

const CONTRACT_TYPE_LABEL: Record<hrApi.ContractType, string> = {
  indeterminado: 'Prazo indeterminado',
  experiencia: 'Experiência',
  aprendiz: 'Aprendiz',
  estagio: 'Estágio',
};

/**
 * Aba "Admissão" de `/hr` — UC-69 (RF-RH-007 a 012). Cobre o ciclo completo:
 * abrir processo → checklist de documentos → solicitar/confirmar ASO
 * admissional → concluir (cria `Employee`+`EmployeeContract`+
 * `EmployeeJobHistory` em uma transação) → confirmar eSocial S-2200 →
 * cancelar (nunca exclusão física).
 *
 * O gate de ASO da conclusão (RF-RH-008/030) usa o snapshot gravado no
 * próprio processo (`aso_result`/`aso_valid_until`, via `aso-confirmation`)
 * — não `EmployeeDocument`, porque o funcionário ainda não existe neste
 * ponto (ver `server/.../ConcludeAdmissionProcessUseCase.ts`).
 */
export function AdmissionTab() {
  const { hasModuleAccess } = useAuth();
  const canWrite = hasModuleAccess('rh');
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = React.useState<hrApi.AdmissionStatus | ''>('');
  const [departmentFilter, setDepartmentFilter] = React.useState<number | ''>('');
  const [page, setPage] = React.useState(1);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [checklistProcess, setChecklistProcess] = React.useState<hrApi.AdmissionProcess | null>(null);
  const [asoProcess, setAsoProcess] = React.useState<hrApi.AdmissionProcess | null>(null);
  const [concludeProcess, setConcludeProcess] = React.useState<hrApi.AdmissionProcess | null>(null);
  const [cancelProcess, setCancelProcess] = React.useState<hrApi.AdmissionProcess | null>(null);
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);

  const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: departmentsApi.listDepartments });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-admission-processes', statusFilter, departmentFilter, page],
    queryFn: () =>
      hrApi.listAdmissionProcesses({
        status: statusFilter || undefined,
        department_id: departmentFilter || undefined,
        page,
        limit: 20,
      }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['hr-admission-processes'] });

  const requestAsoMutation = useMutation({
    mutationFn: hrApi.requestAdmissionAso,
    onSuccess: invalidate,
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível solicitar o ASO admissional')),
  });

  const esocialMutation = useMutation({
    mutationFn: hrApi.confirmAdmissionEsocial,
    onSuccess: invalidate,
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível confirmar a transmissão do eSocial')),
  });

  const colSpan = canWrite ? 6 : 5;
  const departmentName = (id: number) => departments?.find((department) => department.id === id)?.name ?? `#${id}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admission-status-filter">Status</Label>
            <SelectNative
              id="admission-status-filter"
              className="w-52"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as hrApi.AdmissionStatus | '');
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admission-department-filter">Departamento</Label>
            <SelectNative
              id="admission-department-filter"
              className="w-48"
              value={departmentFilter}
              onChange={(event) => {
                setDepartmentFilter(event.target.value ? Number(event.target.value) : '');
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {departments?.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </SelectNative>
          </div>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus /> Nova admissão
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Candidato</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead>Início planejado</TableHead>
            <TableHead>ASO</TableHead>
            <TableHead>Status</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={colSpan} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-destructive">
                Não foi possível carregar os processos de admissão. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((process) => (
            <TableRow key={process.id}>
              <TableCell className="font-medium">{process.candidate_name}</TableCell>
              <TableCell>{departmentName(process.department_id)}</TableCell>
              <TableCell>{formatDate(process.planned_start_date)}</TableCell>
              <TableCell>
                {process.aso_result ? (
                  <Badge variant={process.aso_result === 'inapto' ? 'destructive' : 'success'}>
                    {process.aso_result === 'apto' ? 'Apto' : process.aso_result === 'inapto' ? 'Inapto' : 'Apto c/ restrição'}
                  </Badge>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE[process.status]}>{STATUS_LABEL[process.status]}</Badge>
              </TableCell>
              {canWrite && (
                <TableCell className="flex flex-wrap gap-1.5">
                  {process.status !== 'concluida' && process.status !== 'cancelada' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setChecklistProcess(process)}>
                        <ListChecks className="size-4" /> Checklist
                      </Button>
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
                      <Button size="sm" onClick={() => setConcludeProcess(process)}>
                        <CheckCircle2 className="size-4" /> Concluir
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setCancelProcess(process)}>
                        <Ban className="size-4" /> Cancelar
                      </Button>
                    </>
                  )}
                  {process.status === 'concluida' && !process.esocial_s2200_confirmed_at && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActionError(null);
                        esocialMutation.mutate(process.id);
                      }}
                    >
                      <Send className="size-4" /> Confirmar eSocial S-2200
                    </Button>
                  )}
                  {process.status === 'concluida' && process.esocial_s2200_confirmed_at && (
                    <Badge variant="success">eSocial confirmado</Badge>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
                Nenhum processo de admissão encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      {actionError && <DidacticAlert error={actionError} />}

      <CreateAdmissionDialog open={createOpen} departments={departments ?? []} onClose={() => setCreateOpen(false)} />
      <ChecklistDialog process={checklistProcess} onClose={() => setChecklistProcess(null)} />
      <ConfirmAsoDialog process={asoProcess} onClose={() => setAsoProcess(null)} />
      <ConcludeAdmissionDialog process={concludeProcess} onClose={() => setConcludeProcess(null)} />
      <CancelAdmissionDialog process={cancelProcess} onClose={() => setCancelProcess(null)} />
    </div>
  );
}

const createSchema = z.object({
  candidate_name: z.string().trim().min(1, 'Informe o nome do candidato.').max(200),
  candidate_cpf: z.string().trim().max(14).optional(),
  department_id: z.coerce.number({ invalid_type_error: 'Selecione um departamento.' }).positive('Selecione um departamento.'),
  planned_start_date: z.string().trim().min(1, 'Informe a data prevista de início.'),
  required_documents: z.array(z.string()).optional(),
});
type CreateFormData = z.infer<typeof createSchema>;

function CreateAdmissionDialog({
  open,
  departments,
  onClose,
}: {
  open: boolean;
  departments: departmentsApi.Department[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { candidate_name: '', candidate_cpf: '', department_id: 0, planned_start_date: '', required_documents: [] },
  });

  React.useEffect(() => {
    if (open) {
      reset({ candidate_name: '', candidate_cpf: '', department_id: 0, planned_start_date: '', required_documents: [] });
      setFormError(null);
    }
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: CreateFormData) =>
      hrApi.createAdmissionProcess({
        candidate_name: values.candidate_name.trim(),
        candidate_cpf: values.candidate_cpf?.trim() || undefined,
        department_id: values.department_id,
        planned_start_date: values.planned_start_date,
        required_documents: (values.required_documents ?? []) as hrApi.ChecklistDocument[],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-admission-processes'] });
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível abrir o processo de admissão')),
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova admissão</DialogTitle>
          <DialogDescription>Abre um processo de admissão com status inicial "Documentos pendentes".</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admission-candidate-name">Nome do candidato *</Label>
            <Input id="admission-candidate-name" {...register('candidate_name')} />
            {errors.candidate_name && <p className="text-sm text-destructive">{errors.candidate_name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admission-candidate-cpf">CPF</Label>
              <Input id="admission-candidate-cpf" placeholder="Somente números" {...register('candidate_cpf')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admission-planned-start">Início previsto *</Label>
              <Input id="admission-planned-start" type="date" {...register('planned_start_date')} />
              {errors.planned_start_date && <p className="text-sm text-destructive">{errors.planned_start_date.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admission-department">Departamento *</Label>
            <SelectNative id="admission-department" {...register('department_id')}>
              <option value={0}>Selecione...</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </SelectNative>
            {errors.department_id && <p className="text-sm text-destructive">{errors.department_id.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Checklist inicial de documentos</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(CHECKLIST_LABEL).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" value={value} className="size-4" {...register('required_documents')} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Criando...' : 'Abrir processo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChecklistDialog({ process, onClose }: { process: hrApi.AdmissionProcess | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<DidacticError | null>(null);

  const mutation = useMutation({
    mutationFn: (input: { document: hrApi.ChecklistDocument; received: boolean }) =>
      hrApi.updateAdmissionChecklist(process!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-admission-processes'] });
      setError(null);
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível atualizar o checklist')),
  });

  return (
    <Dialog open={Boolean(process)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Checklist de documentos — {process?.candidate_name}</DialogTitle>
          <DialogDescription>Marque cada documento conforme for recebido do candidato.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {process &&
            (Object.keys(CHECKLIST_LABEL) as hrApi.ChecklistDocument[]).map((doc) => {
              const received = Boolean(process[CHECKLIST_FIELD_MAP[doc]]);
              return (
                <label key={doc} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                  <span>{CHECKLIST_LABEL[doc]}</span>
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={received}
                    disabled={mutation.isPending}
                    onChange={(event) => mutation.mutate({ document: doc, received: event.target.checked })}
                  />
                </label>
              );
            })}
        </div>
        {error && <DidacticAlert error={error} />}
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmAsoDialog({ process, onClose }: { process: hrApi.AdmissionProcess | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [asoResult, setAsoResult] = React.useState<hrApi.AsoResult>('apto');
  const [validUntil, setValidUntil] = React.useState('');
  const [error, setError] = React.useState<DidacticError | null>(null);

  React.useEffect(() => {
    if (process) {
      setAsoResult('apto');
      setValidUntil('');
      setError(null);
    }
  }, [process]);

  const mutation = useMutation({
    mutationFn: () => hrApi.confirmAdmissionAsoResult(process!.id, { aso_result: asoResult, aso_valid_until: validUntil || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-admission-processes'] });
      onClose();
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível registrar o resultado do ASO')),
  });

  return (
    <Dialog open={Boolean(process)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar resultado do ASO admissional</DialogTitle>
          <DialogDescription>
            O resultado registrado aqui é o que libera a conclusão da admissão (RF-RH-008) — não substitui o laudo, que
            permanece com a SST.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admission-aso-result">Resultado</Label>
            <SelectNative
              id="admission-aso-result"
              value={asoResult}
              onChange={(event) => setAsoResult(event.target.value as hrApi.AsoResult)}
            >
              <option value="apto">Apto</option>
              <option value="apto_com_restricao">Apto com restrição</option>
              <option value="inapto">Inapto</option>
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admission-aso-valid-until">Válido até (opcional)</Label>
            <Input id="admission-aso-valid-until" type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
          </div>
        </div>
        {error && <DidacticAlert error={error} />}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : 'Confirmar resultado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const concludeSchema = z
  .object({
    name: z.string().trim().min(1, 'Informe o nome.').max(200),
    cpf: z
      .string()
      .trim()
      .min(1, 'Informe o CPF.')
      .transform((value) => value.replace(/\D/g, ''))
      .refine((value) => value.length === 11, { message: 'CPF deve ter 11 dígitos.' }),
    hire_date: z.string().trim().min(1, 'Informe a data de admissão.'),
    salary: z.coerce.number().nonnegative().optional(),
    work_regime: z.enum(['clt', 'pj', 'estagiario', 'aprendiz']),
    shift: z.enum(['morning', 'afternoon', 'night', 'commercial', 'rotating']),
    contract_type: z.enum(['indeterminado', 'experiencia', 'aprendiz', 'estagio']),
    period_1_end_date: z.string().trim().optional(),
  })
  .refine((data) => data.contract_type !== 'experiencia' || Boolean(data.period_1_end_date), {
    message: 'Informe o fim do 1º período de experiência (Art. 445, parágrafo único, CLT).',
    path: ['period_1_end_date'],
  });
type ConcludeFormData = z.infer<typeof concludeSchema>;

function ConcludeAdmissionDialog({ process, onClose }: { process: hrApi.AdmissionProcess | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ConcludeFormData>({
    resolver: zodResolver(concludeSchema),
    defaultValues: {
      name: '',
      cpf: '',
      hire_date: '',
      work_regime: 'clt',
      shift: 'commercial',
      contract_type: 'experiencia',
      period_1_end_date: '',
    },
  });
  const contractType = watch('contract_type');

  React.useEffect(() => {
    if (process) {
      reset({
        name: process.candidate_name,
        cpf: process.candidate_cpf ?? '',
        hire_date: process.planned_start_date,
        work_regime: 'clt',
        shift: 'commercial',
        contract_type: 'experiencia',
        period_1_end_date: '',
      });
      setFormError(null);
    }
  }, [process, reset]);

  const mutation = useMutation({
    mutationFn: (values: ConcludeFormData) =>
      hrApi.concludeAdmissionProcess(process!.id, {
        employee: {
          name: values.name.trim(),
          cpf: values.cpf,
          hire_date: values.hire_date,
          salary: values.salary,
          work_regime: values.work_regime,
          shift: values.shift,
        },
        contract_type: values.contract_type,
        period_1_end_date: values.contract_type === 'experiencia' ? values.period_1_end_date : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-admission-processes'] });
      queryClient.invalidateQueries({ queryKey: ['employees-all'] });
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível concluir a admissão')),
  });

  return (
    <Dialog open={Boolean(process)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Concluir admissão — {process?.candidate_name}</DialogTitle>
          <DialogDescription>
            Cria o funcionário, o contrato inicial e o histórico funcional em uma única transação. Exige ASO admissional
            confirmado como apto/apto com restrição.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="conclude-name">Nome completo *</Label>
              <Input id="conclude-name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="conclude-cpf">CPF *</Label>
              <Input id="conclude-cpf" placeholder="Somente números" {...register('cpf')} />
              {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="conclude-hire-date">Data de admissão *</Label>
              <Input id="conclude-hire-date" type="date" {...register('hire_date')} />
              {errors.hire_date && <p className="text-sm text-destructive">{errors.hire_date.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="conclude-salary">Salário (R$)</Label>
              <Input id="conclude-salary" type="number" step="0.01" min="0" {...register('salary')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="conclude-work-regime">Regime</Label>
              <SelectNative id="conclude-work-regime" {...register('work_regime')}>
                {Object.entries(WORK_REGIME_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="conclude-shift">Turno</Label>
              <SelectNative id="conclude-shift" {...register('shift')}>
                {Object.entries(SHIFT_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="conclude-contract-type">Tipo de contrato *</Label>
              <SelectNative id="conclude-contract-type" {...register('contract_type')}>
                {Object.entries(CONTRACT_TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectNative>
            </div>
            {contractType === 'experiencia' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="conclude-period-1">Fim do 1º período *</Label>
                <Input id="conclude-period-1" type="date" {...register('period_1_end_date')} />
                {errors.period_1_end_date && <p className="text-sm text-destructive">{errors.period_1_end_date.message}</p>}
              </div>
            )}
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Concluindo...' : 'Concluir admissão'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CancelAdmissionDialog({ process, onClose }: { process: hrApi.AdmissionProcess | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = React.useState('');
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [error, setError] = React.useState<DidacticError | null>(null);

  React.useEffect(() => {
    if (process) {
      setReason('');
      setValidationError(null);
      setError(null);
    }
  }, [process]);

  const mutation = useMutation({
    mutationFn: (motivo: string) => hrApi.cancelAdmissionProcess(process!.id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-admission-processes'] });
      onClose();
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível cancelar o processo de admissão')),
  });

  const handleConfirm = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setValidationError('Informe o motivo do cancelamento.');
      return;
    }
    setValidationError(null);
    mutation.mutate(trimmed);
  };

  return (
    <Dialog open={Boolean(process)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar admissão — {process?.candidate_name}</DialogTitle>
          <DialogDescription>O processo nunca é excluído fisicamente — fica marcado como "Cancelada" com o motivo.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admission-cancel-reason">Motivo *</Label>
          <textarea
            id="admission-cancel-reason"
            className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          {validationError && <p className="text-sm text-destructive">{validationError}</p>}
        </div>
        {error && <DidacticAlert error={error} />}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Voltar
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={mutation.isPending}>
            {mutation.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
