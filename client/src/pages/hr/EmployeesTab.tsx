import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';

import * as employeesApi from '@/api/employees';
import * as departmentsApi from '@/api/departments';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { useAuth } from '@/context/AuthContext';
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
import { DidacticAlert } from '@/components/DidacticAlert';
import { Pagination } from '@/components/Pagination';

const STATUS_LABEL: Record<employeesApi.EmployeeStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  fired: 'Desligado',
  vacation: 'Férias',
  license: 'Afastado',
};

const STATUS_BADGE_VARIANT: Record<employeesApi.EmployeeStatus, 'success' | 'secondary' | 'destructive' | 'warning'> = {
  active: 'success',
  inactive: 'secondary',
  fired: 'destructive',
  vacation: 'warning',
  license: 'warning',
};

const SHIFT_LABEL: Record<employeesApi.EmployeeShift, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  night: 'Noite',
  commercial: 'Comercial',
  rotating: 'Revezamento',
};

const WORK_REGIME_LABEL: Record<employeesApi.EmployeeWorkRegime, string> = {
  clt: 'CLT',
  pj: 'PJ',
  estagiario: 'Estagiário',
  aprendiz: 'Aprendiz',
};

function formatCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Aba "Funcionários" de `/hr` — CRUD com busca (nome/CPF), filtro por
 * departamento/situação e paginação server-side (`GET /api/employees`, o
 * único endpoint RH que pagina). Criação/edição/desligamento exigem role
 * `admin` (mesmo padrão de `DepartmentsTab.tsx` — regra espelha
 * `authorize('admin')` do backend, não um módulo de `access-profiles`).
 */
export function EmployeesTab() {
  const { hasRole } = useAuth();
  const canManage = hasRole('admin');
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<employeesApi.EmployeeStatus | ''>('');
  const [departmentId, setDepartmentId] = React.useState<number | ''>('');
  const [page, setPage] = React.useState(1);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingEmployee, setEditingEmployee] = React.useState<employeesApi.Employee | null>(null);

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsApi.listDepartments,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['employees', search, status, departmentId, page],
    queryFn: () =>
      employeesApi.listEmployees({
        search: search || undefined,
        status: status || undefined,
        department_id: departmentId || undefined,
        limit: 20,
        page,
      }),
  });

  const queryClient = useQueryClient();
  const deactivateMutation = useMutation({
    mutationFn: employeesApi.deactivateEmployee,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });

  const colSpan = canManage ? 7 : 6;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="employee-search">Buscar</Label>
            <Input
              id="employee-search"
              placeholder="Nome ou CPF..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="w-64"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="employee-status-filter">Situação</Label>
            <SelectNative
              id="employee-status-filter"
              className="w-40"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as employeesApi.EmployeeStatus | '');
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="employee-department-filter">Departamento</Label>
            <SelectNative
              id="employee-department-filter"
              className="w-48"
              value={departmentId}
              onChange={(event) => {
                setDepartmentId(event.target.value ? Number(event.target.value) : '');
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
        {canManage && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus /> Novo funcionário
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>CPF</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead>Turno</TableHead>
            <TableHead>Situação</TableHead>
            {canManage && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={colSpan} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-destructive">
                Não foi possível carregar os funcionários. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell>{employee.name}</TableCell>
              <TableCell className="font-mono text-xs">{formatCpf(employee.cpf)}</TableCell>
              <TableCell>{employee.position || '-'}</TableCell>
              <TableCell>{employee.department?.name ?? '-'}</TableCell>
              <TableCell>{SHIFT_LABEL[employee.shift]}</TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE_VARIANT[employee.status]}>{STATUS_LABEL[employee.status]}</Badge>
              </TableCell>
              {canManage && (
                <TableCell className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingEmployee(employee)}>
                    Editar
                  </Button>
                  {employee.status === 'active' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm(`Desligar o funcionário "${employee.name}"?`)) {
                          deactivateMutation.mutate(employee.id);
                        }
                      }}
                    >
                      Desligar
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
                Nenhum funcionário encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <EmployeeDialog
        mode="create"
        open={createOpen}
        employee={null}
        departments={departments ?? []}
        onClose={() => setCreateOpen(false)}
      />
      <EmployeeDialog
        mode="edit"
        open={Boolean(editingEmployee)}
        employee={editingEmployee}
        departments={departments ?? []}
        onClose={() => setEditingEmployee(null)}
      />
    </div>
  );
}

const employeeSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.').max(200, 'Máximo de 200 caracteres.'),
  cpf: z
    .string()
    .trim()
    .min(1, 'Informe o CPF.')
    .transform((value) => value.replace(/\D/g, ''))
    .refine((value) => value.length === 11, { message: 'CPF deve ter 11 dígitos.' }),
  department_id: z.coerce.number({ invalid_type_error: 'Selecione um departamento.' }).positive('Selecione um departamento.'),
  position: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().email('E-mail inválido.').max(100).optional().or(z.literal('')),
  salary: z.coerce.number({ invalid_type_error: 'Informe um valor numérico.' }).nonnegative('Salário não pode ser negativo.').optional(),
  salary_type: z.enum(['mensal', 'horista', 'comissionado']),
  shift: z.enum(['morning', 'afternoon', 'night', 'commercial', 'rotating']),
  work_regime: z.enum(['clt', 'pj', 'estagiario', 'aprendiz']),
  hire_date: z.string().trim().optional(),
  bank_name: z.string().trim().max(100).optional(),
  bank_agency: z.string().trim().max(10).optional(),
  bank_account: z.string().trim().max(20).optional(),
  pix_key: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

const DEFAULT_VALUES: EmployeeFormData = {
  name: '',
  cpf: '',
  department_id: 0,
  position: '',
  phone: '',
  email: '',
  salary: undefined,
  salary_type: 'mensal',
  shift: 'commercial',
  work_regime: 'clt',
  hire_date: '',
  bank_name: '',
  bank_agency: '',
  bank_account: '',
  pix_key: '',
  notes: '',
};

function EmployeeDialog({
  mode,
  open,
  employee,
  departments,
  onClose,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  employee: employeesApi.Employee | null;
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
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const mutation = useMutation({
    mutationFn: (values: EmployeeFormData) => {
      const payload = {
        name: values.name.trim(),
        cpf: values.cpf,
        department_id: values.department_id,
        position: values.position?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        email: values.email?.trim() || undefined,
        salary: values.salary,
        salary_type: values.salary_type,
        shift: values.shift,
        work_regime: values.work_regime,
        bank_name: values.bank_name?.trim() || undefined,
        bank_agency: values.bank_agency?.trim() || undefined,
        bank_account: values.bank_account?.trim() || undefined,
        pix_key: values.pix_key?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
      };
      if (mode === 'create') {
        return employeesApi.createEmployee({
          ...payload,
          hire_date: values.hire_date?.trim() || undefined,
        });
      }
      return employeesApi.updateEmployee(employee!.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      reset(DEFAULT_VALUES);
      setFormError(null);
      onClose();
    },
    onError: (error) =>
      setFormError(
        translateApiError(error, mode === 'create' ? 'Não foi possível criar o funcionário' : 'Não foi possível salvar o funcionário'),
      ),
  });

  React.useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && employee) {
      reset({
        name: employee.name,
        cpf: employee.cpf,
        department_id: employee.department_id,
        position: employee.position ?? '',
        phone: employee.phone ?? '',
        email: employee.email ?? '',
        salary: employee.salary !== undefined && employee.salary !== null ? Number(employee.salary) : undefined,
        salary_type: employee.salary_type,
        shift: employee.shift,
        work_regime: employee.work_regime,
        hire_date: '',
        bank_name: employee.bank_name ?? '',
        bank_agency: employee.bank_agency ?? '',
        bank_account: employee.bank_account ?? '',
        pix_key: employee.pix_key ?? '',
        notes: employee.notes ?? '',
      });
    } else {
      reset(DEFAULT_VALUES);
    }
    setFormError(null);
  }, [open, mode, employee, reset]);

  const isOpen = mode === 'create' ? open : open && Boolean(employee);

  return (
    <Dialog open={isOpen} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo funcionário' : `Editar funcionário ${employee?.name ?? ''}`}</DialogTitle>
          {mode === 'create' && <DialogDescription>O CPF é único e não pode ser alterado após o cadastro incorreto ser corrigido.</DialogDescription>}
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employee-name">Nome completo *</Label>
              <Input id="employee-name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employee-cpf">CPF *</Label>
              <Input id="employee-cpf" placeholder="Somente números" {...register('cpf')} />
              {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employee-department">Departamento *</Label>
              <SelectNative id="employee-department" {...register('department_id')}>
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
              <Label htmlFor="employee-position">Cargo</Label>
              <Input id="employee-position" {...register('position')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employee-phone">Telefone</Label>
              <Input id="employee-phone" {...register('phone')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employee-email">E-mail</Label>
              <Input id="employee-email" type="email" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employee-salary">Salário (R$)</Label>
              <Input id="employee-salary" type="number" step="0.01" min="0" {...register('salary')} />
              {errors.salary && <p className="text-sm text-destructive">{errors.salary.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employee-salary-type">Tipo de salário</Label>
              <SelectNative id="employee-salary-type" {...register('salary_type')}>
                <option value="mensal">Mensal</option>
                <option value="horista">Horista</option>
                <option value="comissionado">Comissionado</option>
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employee-work-regime">Regime</Label>
              <SelectNative id="employee-work-regime" {...register('work_regime')}>
                {Object.entries(WORK_REGIME_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employee-shift">Turno</Label>
              <SelectNative id="employee-shift" {...register('shift')}>
                {Object.entries(SHIFT_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectNative>
            </div>
            {mode === 'create' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="employee-hire-date">Data de admissão</Label>
                <Input id="employee-hire-date" type="date" {...register('hire_date')} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employee-bank-name">Banco</Label>
              <Input id="employee-bank-name" {...register('bank_name')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employee-bank-agency">Agência</Label>
              <Input id="employee-bank-agency" {...register('bank_agency')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employee-bank-account">Conta</Label>
              <Input id="employee-bank-account" {...register('bank_account')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="employee-pix">Chave PIX</Label>
            <Input id="employee-pix" {...register('pix_key')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="employee-notes">Observações</Label>
            <Input id="employee-notes" {...register('notes')} />
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : mode === 'create' ? 'Criar funcionário' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
