import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, FileWarning, Plus } from 'lucide-react';

import * as sstApi from '@/api/sst';
import * as employeesApi from '@/api/employees';
import { useAuth } from '@/context/AuthContext';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/Textarea';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AmberNoticeBox } from '@/components/AmberNoticeBox';
import { cn } from '@/lib/utils';
import { ACCIDENT_TIPO_LABELS, AccidentGravidadeBadge, formatDateTime, toDateInputValue } from './sstShared';

export function AccidentsTab() {
  const { user, permissions } = useAuth();
  const canApprove = user?.role === 'admin' || permissions?.sst === 'approve';
  const [newAccidentOpen, setNewAccidentOpen] = React.useState(false);
  const [selectedAccident, setSelectedAccident] = React.useState<sstApi.Accident | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<sstApi.AccidentStatus | ''>('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sst-accidents', statusFilter],
    queryFn: () => sstApi.listAccidents({ status: statusFilter || undefined, limit: 50 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="accident-status-filter" className="text-sm text-muted-foreground">
            Status
          </Label>
          <SelectNative
            id="accident-status-filter"
            className="max-w-48"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as sstApi.AccidentStatus | '')}
          >
            <option value="">Todos</option>
            <option value="aberto">Aberto</option>
            <option value="encerrado">Encerrado</option>
          </SelectNative>
        </div>
        <Button type="button" onClick={() => setNewAccidentOpen(true)}>
          <Plus className="size-4" />
          Registrar acidente
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Funcionário</TableHead>
            <TableHead>Data/hora</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Gravidade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-destructive">
                Não foi possível carregar os acidentes. Verifique se você tem acesso ao módulo SST.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((accident) => (
            <TableRow
              key={accident.id}
              className={cn(
                'border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5',
                accident.gravidade !== 'sem_afastamento' && 'border-l-destructive/40',
              )}
            >
              <TableCell>{accident.employee?.name ?? `#${accident.employee_id}`}</TableCell>
              <TableCell>{formatDateTime(accident.data_hora)}</TableCell>
              <TableCell>{ACCIDENT_TIPO_LABELS[accident.tipo] ?? accident.tipo}</TableCell>
              <TableCell>
                <AccidentGravidadeBadge gravidade={accident.gravidade} />
              </TableCell>
              <TableCell>
                {accident.status === 'encerrado' ? (
                  <Badge variant="success">Encerrado</Badge>
                ) : (
                  <Badge variant="warning">Aberto</Badge>
                )}
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => setSelectedAccident(accident)}>
                  Detalhar / CAT
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileWarning className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum acidente registrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <NewAccidentDialog open={newAccidentOpen} onClose={() => setNewAccidentOpen(false)} />
      <AccidentDetailDialog accident={selectedAccident} canApprove={canApprove} onClose={() => setSelectedAccident(null)} />
    </div>
  );
}

const newAccidentSchema = z.object({
  employee_id: z.coerce.number().int().positive('Selecione o funcionário.'),
  data_hora: z.string().min(1, 'Informe a data/hora do acidente.'),
  tipo: z.enum(['tipico', 'trajeto', 'doenca_ocupacional']),
  local_setor: z.string().min(1, 'Informe o local/setor.'),
  descricao: z.string().min(1, 'Descreva o acidente.'),
  parte_corpo: z.string().min(1, 'Informe a parte do corpo atingida.'),
  agente_causador: z.string().min(1, 'Informe o agente causador.'),
  gravidade: z.enum(['sem_afastamento', 'com_afastamento', 'incapacidade_permanente', 'obito']),
  dias_perdidos: z.coerce.number().int().min(0).optional(),
});

type NewAccidentFormData = z.infer<typeof newAccidentSchema>;

function NewAccidentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const { data: employees } = useQuery({
    queryKey: ['employees-active-select'],
    queryFn: () => employeesApi.listEmployees({ limit: 200, status: 'active' }),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewAccidentFormData>({
    resolver: zodResolver(newAccidentSchema),
    defaultValues: { tipo: 'tipico', gravidade: 'sem_afastamento', dias_perdidos: 0 },
  });

  const mutation = useMutation({
    mutationFn: (values: NewAccidentFormData) =>
      sstApi.createAccident({ ...values, data_hora: new Date(values.data_hora).toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sst-accidents'] });
      reset({ tipo: 'tipico', gravidade: 'sem_afastamento', dias_perdidos: 0 } as never);
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível registrar o acidente')),
  });

  React.useEffect(() => {
    if (open) {
      reset({ tipo: 'tipico', gravidade: 'sem_afastamento', dias_perdidos: 0 } as never);
      setFormError(null);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar acidente de trabalho</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <p className="text-xs text-muted-foreground">
            Este registro é imutável após criado — correções posteriores são lançadas como complementos, com trilha de
            auditoria.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="accident-employee">Funcionário</Label>
            <SelectNative id="accident-employee" {...register('employee_id')}>
              <option value="">Selecione...</option>
              {(employees?.data ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </SelectNative>
            {errors.employee_id && <p className="text-sm text-destructive">{errors.employee_id.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="accident-datahora">Data/hora</Label>
              <Input id="accident-datahora" type="datetime-local" {...register('data_hora')} />
              {errors.data_hora && <p className="text-sm text-destructive">{errors.data_hora.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="accident-tipo">Tipo</Label>
              <SelectNative id="accident-tipo" {...register('tipo')}>
                {Object.entries(ACCIDENT_TIPO_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="accident-local">Local/setor</Label>
            <Input id="accident-local" {...register('local_setor')} />
            {errors.local_setor && <p className="text-sm text-destructive">{errors.local_setor.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="accident-descricao">Descrição</Label>
            <Textarea id="accident-descricao" rows={3} {...register('descricao')} />
            {errors.descricao && <p className="text-sm text-destructive">{errors.descricao.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="accident-parte-corpo">Parte do corpo</Label>
              <Input id="accident-parte-corpo" {...register('parte_corpo')} />
              {errors.parte_corpo && <p className="text-sm text-destructive">{errors.parte_corpo.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="accident-agente">Agente causador</Label>
              <Input id="accident-agente" {...register('agente_causador')} />
              {errors.agente_causador && <p className="text-sm text-destructive">{errors.agente_causador.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="accident-gravidade">Gravidade</Label>
              <SelectNative id="accident-gravidade" {...register('gravidade')}>
                <option value="sem_afastamento">Sem afastamento</option>
                <option value="com_afastamento">Com afastamento</option>
                <option value="incapacidade_permanente">Incapacidade permanente</option>
                <option value="obito">Óbito</option>
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="accident-dias-perdidos">Dias perdidos</Label>
              <Input id="accident-dias-perdidos" type="number" min={0} {...register('dias_perdidos')} />
            </div>
          </div>
          {formError && <DidacticAlert error={formError} />}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Registrar acidente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Detalhe do acidente: emissão de CAT (com prazo legal visível), abertura de
 * investigação (exigida para encerrar acidentes com afastamento ou pior) e
 * encerramento.
 */
function AccidentDetailDialog({
  accident,
  canApprove,
  onClose,
}: {
  accident: sstApi.Accident | null;
  canApprove: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [catError, setCatError] = React.useState<DidacticError | null>(null);
  const [closeError, setCloseError] = React.useState<DidacticError | null>(null);
  const [investigationOpen, setInvestigationOpen] = React.useState(false);

  const { data: cats } = useQuery({
    queryKey: ['sst-accident-cats', accident?.id],
    queryFn: () => sstApi.listCats(accident!.id),
    enabled: Boolean(accident),
  });

  const { data: investigation } = useQuery({
    queryKey: ['sst-accident-investigation', accident?.id],
    queryFn: () => sstApi.getInvestigation(accident!.id),
    enabled: Boolean(accident),
    retry: false,
  });

  const requiresInvestigation =
    accident && ['com_afastamento', 'incapacidade_permanente', 'obito'].includes(accident.gravidade);

  const emitCatMutation = useMutation({
    mutationFn: () => sstApi.emitCat(accident!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sst-accident-cats', accident?.id] });
      setCatError(null);
    },
    onError: (error) => setCatError(translateApiError(error, 'Não foi possível emitir a CAT')),
  });

  const closeMutation = useMutation({
    mutationFn: () => sstApi.closeAccident(accident!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sst-accidents'] });
      setCloseError(null);
      onClose();
    },
    onError: (error) => setCloseError(translateApiError(error, 'Não foi possível encerrar o acidente')),
  });

  React.useEffect(() => {
    if (accident) {
      setCatError(null);
      setCloseError(null);
    }
  }, [accident]);

  return (
    <>
      <Dialog open={Boolean(accident)} onOpenChange={(value) => !value && onClose()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Acidente — {accident?.employee?.name ?? `#${accident?.employee_id}`}</DialogTitle>
          </DialogHeader>
          {accident && (
            <div className="flex flex-col gap-4 text-sm">
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Data/hora</dt>
                  <dd>{formatDateTime(accident.data_hora)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Local/setor</dt>
                  <dd>{accident.local_setor}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Gravidade</dt>
                  <dd>
                    <AccidentGravidadeBadge gravidade={accident.gravidade} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Dias perdidos</dt>
                  <dd>{accident.dias_perdidos}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Descrição</dt>
                  <dd>{accident.descricao}</dd>
                </div>
              </dl>

              <div className="rounded-md border border-destructive/30 bg-destructive/[0.03] p-3">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <AlertTriangle className="size-4 text-destructive" />
                  CAT (Comunicação de Acidente de Trabalho)
                </p>
                {cats?.length ? (
                  <ul className="flex flex-col gap-2 text-xs">
                    {cats.map((cat) => (
                      <li
                        key={cat.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border border-destructive/30 bg-destructive/5 p-2"
                      >
                        <span>
                          {cat.tipo === 'inicial' ? 'CAT inicial' : cat.tipo === 'obito' ? 'CAT por óbito' : 'Reabertura'}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded bg-destructive px-2 py-0.5 font-semibold text-destructive-foreground">
                          Prazo legal: {formatDateTime(cat.prazo_limite)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhuma CAT emitida ainda.</p>
                )}
                {!cats?.length && (
                  <Button
                    size="sm"
                    className="mt-2"
                    disabled={!canApprove || emitCatMutation.isPending}
                    title={!canApprove ? 'Requer nível de aprovação (approve) no módulo SST' : undefined}
                    onClick={() => emitCatMutation.mutate()}
                  >
                    Emitir CAT
                  </Button>
                )}
                {catError && <DidacticAlert className="mt-2" error={catError} />}
              </div>

              {requiresInvestigation && (
                <div className="rounded-md border p-3">
                  <p className="mb-1 text-sm font-semibold">Investigação do acidente</p>
                  {investigation ? (
                    <p className="text-xs text-success">Investigação registrada.</p>
                  ) : (
                    <>
                      <AmberNoticeBox icon={AlertTriangle} size="xs" className="mb-2">
                        Obrigatória (com pelo menos uma ação corretiva) antes de encerrar este acidente.
                      </AmberNoticeBox>
                      <Button size="sm" variant="outline" onClick={() => setInvestigationOpen(true)}>
                        Abrir investigação
                      </Button>
                    </>
                  )}
                </div>
              )}

              {closeError && <DidacticAlert error={closeError} />}

              {accident.status !== 'encerrado' && (
                <Button
                  variant="outline"
                  disabled={!canApprove || closeMutation.isPending}
                  title={!canApprove ? 'Requer nível de aprovação (approve) no módulo SST' : undefined}
                  onClick={() => closeMutation.mutate()}
                >
                  Encerrar acidente
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <InvestigationDialog
        accident={accident}
        open={investigationOpen}
        onClose={() => setInvestigationOpen(false)}
      />
    </>
  );
}

const investigationSchema = z.object({
  participantes: z.string().min(1, 'Informe ao menos um ID de participante.'),
  causas: z.string().min(1, 'Descreva ao menos uma causa.'),
  acao_descricao: z.string().min(1, 'Descreva a ação corretiva.'),
  acao_responsavel_id: z.coerce.number().int().positive('Informe o responsável pela ação.'),
  acao_prazo: z.string().min(1, 'Informe o prazo da ação corretiva.'),
});

type InvestigationFormData = z.infer<typeof investigationSchema>;

function InvestigationDialog({
  accident,
  open,
  onClose,
}: {
  accident: sstApi.Accident | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InvestigationFormData>({
    resolver: zodResolver(investigationSchema),
    defaultValues: { acao_prazo: toDateInputValue() },
  });

  const mutation = useMutation({
    mutationFn: (values: InvestigationFormData) =>
      sstApi.createInvestigation(accident!.id, {
        participantes: values.participantes
          .split(',')
          .map((entry) => Number(entry.trim()))
          .filter((entry) => Number.isFinite(entry)),
        causas: values.causas.split('\n').map((line) => line.trim()).filter(Boolean),
        acoes_corretivas: [
          {
            descricao: values.acao_descricao,
            responsavel_id: values.acao_responsavel_id,
            prazo: values.acao_prazo,
          },
        ],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sst-accident-investigation', accident?.id] });
      reset({ acao_prazo: toDateInputValue() } as never);
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível abrir a investigação')),
  });

  React.useEffect(() => {
    if (open) {
      reset({ acao_prazo: toDateInputValue() } as never);
      setFormError(null);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir investigação do acidente</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="investigation-participantes">Participantes (IDs de funcionário, separados por vírgula)</Label>
            <Input id="investigation-participantes" placeholder="10, 15, 501" {...register('participantes')} />
            {errors.participantes && <p className="text-sm text-destructive">{errors.participantes.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="investigation-causas">Causas (uma por linha)</Label>
            <Textarea id="investigation-causas" rows={3} {...register('causas')} />
            {errors.causas && <p className="text-sm text-destructive">{errors.causas.message}</p>}
          </div>
          <p className="text-xs font-medium text-muted-foreground">Ação corretiva (ao menos uma é exigida para fechar o acidente)</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="investigation-acao-descricao">Descrição da ação</Label>
            <Input id="investigation-acao-descricao" {...register('acao_descricao')} />
            {errors.acao_descricao && <p className="text-sm text-destructive">{errors.acao_descricao.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="investigation-responsavel">Responsável (ID funcionário)</Label>
              <Input id="investigation-responsavel" type="number" {...register('acao_responsavel_id')} />
              {errors.acao_responsavel_id && <p className="text-sm text-destructive">{errors.acao_responsavel_id.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="investigation-prazo">Prazo</Label>
              <Input id="investigation-prazo" type="date" {...register('acao_prazo')} />
              {errors.acao_prazo && <p className="text-sm text-destructive">{errors.acao_prazo.message}</p>}
            </div>
          </div>
          {formError && <DidacticAlert error={formError} />}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Abrir investigação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
