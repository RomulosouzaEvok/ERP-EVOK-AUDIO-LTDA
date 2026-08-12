import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, ShieldAlert, AlertTriangle } from 'lucide-react';

import * as hrApi from '@/api/hr';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { useEmployeeOptions } from '@/components/hr/useEmployeeOptions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

type TrainingSection = 'catalog' | 'records' | 'cannot-operate';

/**
 * Aba "Treinamentos" de `/hr` — RF-RH-055 a 059. Três seções: catálogo de
 * cursos (criar/editar, sem excluir), registro de conclusão por funcionário
 * (`valid_until` sempre calculado no servidor) e o relatório "quem não pode
 * operar" (RF-RH-058 — nunca bloqueia produção sozinho, é insumo para quem
 * decide).
 */
export function TrainingsTab() {
  const [section, setSection] = React.useState<TrainingSection>('catalog');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b">
        <SectionButton active={section === 'catalog'} onClick={() => setSection('catalog')}>
          Catálogo de cursos
        </SectionButton>
        <SectionButton active={section === 'records'} onClick={() => setSection('records')}>
          Conclusões
        </SectionButton>
        <SectionButton active={section === 'cannot-operate'} onClick={() => setSection('cannot-operate')}>
          Quem não pode operar
        </SectionButton>
      </div>

      {section === 'catalog' && <TrainingCatalogSection />}
      {section === 'records' && <TrainingRecordsSection />}
      {section === 'cannot-operate' && <CannotOperateSection />}
    </div>
  );
}

function SectionButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={active ? 'rounded-none border-b-2 border-brand text-brand' : 'rounded-none border-b-2 border-transparent'}
    >
      {children}
    </Button>
  );
}

function TrainingCatalogSection() {
  const { hasModuleAccess } = useAuth();
  const canWrite = hasModuleAccess('rh');
  const [normativeFilter, setNormativeFilter] = React.useState<'' | 'true' | 'false'>('');
  const [page, setPage] = React.useState(1);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<hrApi.TrainingCourse | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-training-courses', normativeFilter, page],
    queryFn: () =>
      hrApi.listTrainingCourses({
        is_normative: normativeFilter === '' ? undefined : normativeFilter === 'true',
        page,
        limit: 20,
      }),
  });

  const colSpan = canWrite ? 6 : 5;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="training-course-normative-filter">Natureza</Label>
          <SelectNative
            id="training-course-normative-filter"
            className="w-56"
            value={normativeFilter}
            onChange={(event) => {
              setNormativeFilter(event.target.value as '' | 'true' | 'false');
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            <option value="true">Somente normativos (NR)</option>
            <option value="false">Somente não normativos</option>
          </SelectNative>
        </div>
        {canWrite && (
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus /> Novo curso
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Curso</TableHead>
            <TableHead>Natureza</TableHead>
            <TableHead>Validade</TableHead>
            <TableHead>Carga horária</TableHead>
            <TableHead>Status</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={colSpan} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-destructive">
                Não foi possível carregar o catálogo de cursos. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((course) => (
            <TableRow key={course.id}>
              <TableCell className="font-medium">{course.name}</TableCell>
              <TableCell>
                {course.is_normative ? (
                  <span className="flex items-center gap-1">
                    <Badge variant="warning">
                      <ShieldAlert className="mr-1 size-3" /> Normativo{course.nr_code ? ` — ${course.nr_code}` : ''}
                    </Badge>
                  </span>
                ) : (
                  <Badge variant="outline">Não normativo</Badge>
                )}
              </TableCell>
              <TableCell>{course.validity_months ? `${course.validity_months} meses` : 'Sem vencimento'}</TableCell>
              <TableCell>{course.workload_hours ? `${course.workload_hours}h` : '-'}</TableCell>
              <TableCell>
                <Badge variant={course.active ? 'success' : 'outline'}>{course.active ? 'Ativo' : 'Inativo'}</Badge>
              </TableCell>
              {canWrite && (
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(course);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="size-4" /> Editar
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
                Nenhum curso cadastrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <TrainingCourseFormDialog open={formOpen} course={editing} onClose={() => setFormOpen(false)} />
    </div>
  );
}

function TrainingCourseFormDialog({
  open,
  course,
  onClose,
}: {
  open: boolean;
  course: hrApi.TrainingCourse | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState('');
  const [isNormative, setIsNormative] = React.useState(false);
  const [nrCode, setNrCode] = React.useState('');
  const [validityMonths, setValidityMonths] = React.useState('');
  const [workloadHours, setWorkloadHours] = React.useState('');
  const [active, setActive] = React.useState(true);
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  /**
   * RF-INT-RH-SST-01 (2026-08-12): resultado pós-gravação informando de onde
   * veio a validade efetiva — o formulário não consulta a matriz SST
   * enquanto o usuário digita (o backend é a única fonte de verdade), então
   * o aviso aparece depois de salvar, igual ao padrão já usado no diálogo de
   * conclusão de treinamento (`resultInfo` em `CreateEmployeeTrainingDialog`).
   */
  const [resultInfo, setResultInfo] = React.useState<{ validityMonths: number | null; source: 'sst_matrix' | 'manual'; warning?: string } | null>(null);

  React.useEffect(() => {
    if (open) {
      setName(course?.name ?? '');
      setIsNormative(course?.is_normative ?? false);
      setNrCode(course?.nr_code ?? '');
      setValidityMonths(course?.validity_months ? String(course.validity_months) : '');
      setWorkloadHours(course?.workload_hours ? String(course.workload_hours) : '');
      setActive(course?.active ?? true);
      setError(null);
      setValidationError(null);
      setResultInfo(null);
    }
  }, [open, course]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        is_normative: isNormative,
        nr_code: nrCode.trim() || null,
        validity_months: validityMonths ? Number(validityMonths) : null,
        workload_hours: workloadHours ? Number(workloadHours) : null,
        active,
      };
      return course ? hrApi.updateTrainingCourse(course.id, payload) : hrApi.createTrainingCourse(payload);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['hr-training-courses'] });
      if (result.validity_source === 'sst_matrix' || result.warning) {
        setResultInfo({ validityMonths: result.validity_months, source: result.validity_source ?? 'manual', warning: result.warning });
        return;
      }
      onClose();
    },
    onError: (err) => setError(translateApiError(err, course ? 'Não foi possível atualizar o curso' : 'Não foi possível criar o curso')),
  });

  const handleConfirm = () => {
    if (!name.trim()) {
      setValidationError('Informe o nome do curso.');
      return;
    }
    setValidationError(null);
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{course ? 'Editar curso' : 'Novo curso'}</DialogTitle>
          <DialogDescription>
            O catálogo não permite exclusão. Cursos normativos (NR) têm a validade governada pela SST — RH apenas administra o cadastro.
          </DialogDescription>
        </DialogHeader>
        {resultInfo ? (
          <div className="flex flex-col gap-3">
            <div
              className={`flex flex-col gap-2 rounded-md border p-3 text-sm ${
                resultInfo.source === 'sst_matrix'
                  ? 'border-emerald-700/40 bg-emerald-700/10 text-emerald-900'
                  : 'border-amber-700/40 bg-amber-700/10 text-amber-900'
              }`}
            >
              <p className="flex items-center gap-1 font-semibold">
                <ShieldAlert className="size-4" /> {resultInfo.source === 'sst_matrix' ? 'Validade definida pela matriz SST' : 'Curso salvo'}
              </p>
              {resultInfo.source === 'sst_matrix' ? (
                <p>
                  Este curso é normativo e o código da NR está cadastrado na matriz oficial de treinamentos do SST — a validade gravada foi{' '}
                  {resultInfo.validityMonths ? `${resultInfo.validityMonths} meses` : 'sem vencimento (a matriz não exige reciclagem periódica para esta norma)'},
                  substituindo qualquer valor digitado neste formulário.
                </p>
              ) : (
                <p>{resultInfo.warning}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" onClick={onClose}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="training-course-name">Nome *</Label>
                <Input id="training-course-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={200} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-4" checked={isNormative} onChange={(event) => setIsNormative(event.target.checked)} />
                Curso normativo (NR)
              </label>
              {isNormative && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="training-course-nr-code">Código da NR</Label>
                  <Input id="training-course-nr-code" value={nrCode} onChange={(event) => setNrCode(event.target.value)} maxLength={20} placeholder="Ex.: NR-12" />
                  <p className="text-xs text-muted-foreground">
                    Se este código estiver cadastrado na matriz oficial do SST, a validade abaixo é ignorada — a da matriz prevalece.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="training-course-validity">Validade (meses)</Label>
                  <Input
                    id="training-course-validity"
                    type="number"
                    min="1"
                    value={validityMonths}
                    onChange={(event) => setValidityMonths(event.target.value)}
                    placeholder="Vazio = sem vencimento"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="training-course-workload">Carga horária (h)</Label>
                  <Input
                    id="training-course-workload"
                    type="number"
                    min="0"
                    step="0.5"
                    value={workloadHours}
                    onChange={(event) => setWorkloadHours(event.target.value)}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-4" checked={active} onChange={(event) => setActive(event.target.checked)} />
                Ativo
              </label>
              {validationError && <p className="text-sm text-destructive">{validationError}</p>}
            </div>
            {error && <DidacticAlert error={error} />}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleConfirm} disabled={mutation.isPending}>
                {mutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TrainingRecordsSection() {
  const { hasModuleAccess } = useAuth();
  const canWrite = hasModuleAccess('rh');
  const { employees, employeeName } = useEmployeeOptions();

  const [employeeFilter, setEmployeeFilter] = React.useState<number | ''>('');
  const [expiringInDays, setExpiringInDays] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [createOpen, setCreateOpen] = React.useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-employee-trainings', employeeFilter, expiringInDays, page],
    queryFn: () =>
      hrApi.listEmployeeTrainings({
        employee_id: employeeFilter || undefined,
        expiring_in_days: expiringInDays ? Number(expiringInDays) : undefined,
        page,
        limit: 20,
      }),
  });

  const colSpan = 5;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="training-record-employee-filter">Funcionário</Label>
            <SelectNative
              id="training-record-employee-filter"
              className="w-52"
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
            <Label htmlFor="training-record-expiring">Vencendo em até (dias)</Label>
            <Input
              id="training-record-expiring"
              type="number"
              min="0"
              className="w-40"
              value={expiringInDays}
              onChange={(event) => {
                setExpiringInDays(event.target.value);
                setPage(1);
              }}
              placeholder="Ex.: 30"
            />
          </div>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus /> Registrar conclusão
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Funcionário</TableHead>
            <TableHead>Curso</TableHead>
            <TableHead>Concluído em</TableHead>
            <TableHead>Válido até</TableHead>
            <TableHead>Instrutor/fornecedor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={colSpan} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-destructive">
                Não foi possível carregar as conclusões de treinamento. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="font-medium">{employeeName(record.employee_id)}</TableCell>
              <TableCell>{record.trainingCourse?.name ?? `#${record.training_course_id}`}</TableCell>
              <TableCell>{formatDate(record.completed_at)}</TableCell>
              <TableCell>{record.valid_until ? formatDate(record.valid_until) : 'Sem vencimento'}</TableCell>
              <TableCell>{record.instructor_or_provider ?? '-'}</TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
                Nenhuma conclusão de treinamento registrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <CreateEmployeeTrainingDialog open={createOpen} employees={employees} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function CreateEmployeeTrainingDialog({
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
  const [courseId, setCourseId] = React.useState<number | ''>('');
  const [completedAt, setCompletedAt] = React.useState('');
  const [instructor, setInstructor] = React.useState('');
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [resultInfo, setResultInfo] = React.useState<{ validUntil: string | null; warning?: string } | null>(null);

  const { data: coursesData } = useQuery({
    queryKey: ['hr-training-courses-all'],
    queryFn: () => hrApi.listTrainingCourses({ active: true, limit: 100 }),
    enabled: open,
  });
  const courses = coursesData?.data ?? [];

  React.useEffect(() => {
    if (open) {
      setEmployeeId('');
      setCourseId('');
      setCompletedAt('');
      setInstructor('');
      setError(null);
      setValidationError(null);
      setResultInfo(null);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () =>
      hrApi.createEmployeeTraining({
        employee_id: Number(employeeId),
        training_course_id: Number(courseId),
        completed_at: completedAt,
        instructor_or_provider: instructor.trim() || undefined,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['hr-employee-trainings'] });
      if (result.warning) {
        setResultInfo({ validUntil: result.valid_until, warning: result.warning });
        return;
      }
      onClose();
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível registrar a conclusão do treinamento')),
  });

  const handleConfirm = () => {
    if (!employeeId || !courseId || !completedAt) {
      setValidationError('Selecione o funcionário, o curso e a data de conclusão.');
      return;
    }
    setValidationError(null);
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar conclusão de treinamento</DialogTitle>
          <DialogDescription>A validade (`valid_until`) é calculada automaticamente a partir da data de conclusão e do curso.</DialogDescription>
        </DialogHeader>
        {resultInfo ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 rounded-md border border-amber-700/40 bg-amber-700/10 p-3 text-sm text-amber-900">
              <p className="flex items-center gap-1 font-semibold">
                <AlertTriangle className="size-4" /> Conclusão registrada
              </p>
              <p>{resultInfo.warning}</p>
              <p>Válido até: {resultInfo.validUntil ? formatDate(resultInfo.validUntil) : 'sem vencimento'}.</p>
            </div>
            <DialogFooter>
              <Button type="button" onClick={onClose}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="employee-training-employee">Funcionário *</Label>
                <SelectNative
                  id="employee-training-employee"
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
                <Label htmlFor="employee-training-course">Curso *</Label>
                <SelectNative
                  id="employee-training-course"
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value ? Number(event.target.value) : '')}
                >
                  <option value="">Selecione...</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                      {course.is_normative ? ` (normativo${course.nr_code ? ` — ${course.nr_code}` : ''})` : ''}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="employee-training-completed-at">Concluído em *</Label>
                  <Input id="employee-training-completed-at" type="date" value={completedAt} onChange={(event) => setCompletedAt(event.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="employee-training-instructor">Instrutor/fornecedor</Label>
                  <Input id="employee-training-instructor" value={instructor} onChange={(event) => setInstructor(event.target.value)} maxLength={200} />
                </div>
              </div>
              {validationError && <p className="text-sm text-destructive">{validationError}</p>}
            </div>
            {error && <DidacticAlert error={error} />}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleConfirm} disabled={mutation.isPending}>
                {mutation.isPending ? 'Registrando...' : 'Registrar conclusão'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CannotOperateSection() {
  const [departmentId, setDepartmentId] = React.useState('');
  const [submittedDepartmentId, setSubmittedDepartmentId] = React.useState<number | undefined>(undefined);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-cannot-operate-report', submittedDepartmentId],
    queryFn: () => hrApi.getCannotOperateReport({ department_id: submittedDepartmentId }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-amber-700/40 bg-amber-700/10 p-3 text-sm text-amber-900">
        Relatório informativo (RF-RH-058) — funcionários ativos cujo cargo exige treinamento ausente ou vencido. Não bloqueia
        operação sozinho; a decisão de impedir a operação é de quem recebe este relatório.
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cannot-operate-department">Departamento (ID)</Label>
          <Input
            id="cannot-operate-department"
            type="number"
            min="1"
            className="w-40"
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
            placeholder="Todos"
          />
        </div>
        <Button type="button" variant="outline" onClick={() => setSubmittedDepartmentId(departmentId ? Number(departmentId) : undefined)}>
          Filtrar
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Funcionário</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead>Curso</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Válido até</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={5} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-destructive">
                Não foi possível carregar o relatório. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.items.map((item, index) => (
            <TableRow key={`${item.employee_id}-${item.training_course_id}-${index}`}>
              <TableCell className="font-medium">{item.employee_name}</TableCell>
              <TableCell>{item.department_id ? `#${item.department_id}` : '-'}</TableCell>
              <TableCell>{item.training_course_name}</TableCell>
              <TableCell>
                <Badge variant={item.reason === 'vencido' ? 'destructive' : 'warning'}>
                  {item.reason === 'vencido' ? 'Vencido' : 'Ausente'}
                </Badge>
              </TableCell>
              <TableCell>{item.valid_until ? formatDate(item.valid_until) : '-'}</TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Nenhuma pendência encontrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {data && <p className="text-sm text-muted-foreground">Total de pendências: {data.total}</p>}
    </div>
  );
}
