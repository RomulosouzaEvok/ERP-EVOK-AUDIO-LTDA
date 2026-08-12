import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Ban, FileBarChart } from 'lucide-react';

import * as hrApi from '@/api/hr';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { formatCurrency } from '@/lib/format';
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

const CATEGORY_LABEL: Record<hrApi.BenefitCategory, string> = {
  vt: 'Vale-transporte',
  vr: 'Vale-refeição',
  va: 'Vale-alimentação',
  saude: 'Plano de saúde',
  odonto: 'Plano odontológico',
  vida: 'Seguro de vida',
  outros: 'Outros',
};

const FUNDING_RULE_LABEL: Record<hrApi.BenefitFundingRule, string> = {
  percentual: 'Percentual sobre salário',
  fixo: 'Valor fixo',
};

const DEPENDENTS_ALLOWED_CATEGORIES: hrApi.BenefitCategory[] = ['saude', 'odonto'];

type BenefitSection = 'catalog' | 'enrollments' | 'report';

/**
 * Aba "Benefícios" de `/hr` — RF-RH-050 a 054. Três seções: catálogo de
 * tipos de benefício (criar/editar, sem excluir — referenciado por
 * adesões), adesões por funcionário (aderir/cancelar, nunca excluir
 * fisicamente — `hr_employee_benefits` tem trigger de banco que bloqueia
 * `DELETE`) e o relatório mensal por competência (custo por departamento,
 * RF-RH-053).
 */
export function BenefitsTab() {
  const [section, setSection] = React.useState<BenefitSection>('catalog');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b">
        <SectionButton active={section === 'catalog'} onClick={() => setSection('catalog')}>
          Catálogo de benefícios
        </SectionButton>
        <SectionButton active={section === 'enrollments'} onClick={() => setSection('enrollments')}>
          Adesões
        </SectionButton>
        <SectionButton active={section === 'report'} onClick={() => setSection('report')}>
          Relatório mensal
        </SectionButton>
      </div>

      {section === 'catalog' && <BenefitCatalogSection />}
      {section === 'enrollments' && <BenefitEnrollmentsSection />}
      {section === 'report' && <BenefitMonthlyReportSection />}
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

function BenefitCatalogSection() {
  const { hasModuleAccess } = useAuth();
  const canWrite = hasModuleAccess('rh');
  const [categoryFilter, setCategoryFilter] = React.useState<hrApi.BenefitCategory | ''>('');
  const [page, setPage] = React.useState(1);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<hrApi.BenefitType | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-benefit-types', categoryFilter, page],
    queryFn: () => hrApi.listBenefitTypes({ category: categoryFilter || undefined, page, limit: 20 }),
  });

  const colSpan = canWrite ? 5 : 4;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="benefit-type-category-filter">Categoria</Label>
          <SelectNative
            id="benefit-type-category-filter"
            className="w-56"
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value as hrApi.BenefitCategory | '');
              setPage(1);
            }}
          >
            <option value="">Todas</option>
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
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
            <Plus /> Novo tipo de benefício
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Regra de custeio</TableHead>
            <TableHead>Status</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={colSpan} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-destructive">
                Não foi possível carregar o catálogo de benefícios. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((type) => (
            <TableRow key={type.id}>
              <TableCell className="font-medium">{type.name}</TableCell>
              <TableCell>{CATEGORY_LABEL[type.category]}</TableCell>
              <TableCell>{FUNDING_RULE_LABEL[type.funding_rule]}</TableCell>
              <TableCell>
                <Badge variant={type.active ? 'success' : 'outline'}>{type.active ? 'Ativo' : 'Inativo'}</Badge>
              </TableCell>
              {canWrite && (
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(type);
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
                Nenhum tipo de benefício cadastrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <BenefitTypeFormDialog open={formOpen} benefitType={editing} onClose={() => setFormOpen(false)} />
    </div>
  );
}

function BenefitTypeFormDialog({
  open,
  benefitType,
  onClose,
}: {
  open: boolean;
  benefitType: hrApi.BenefitType | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState<hrApi.BenefitCategory>('vt');
  const [fundingRule, setFundingRule] = React.useState<hrApi.BenefitFundingRule>('percentual');
  const [supplier, setSupplier] = React.useState('');
  const [active, setActive] = React.useState(true);
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName(benefitType?.name ?? '');
      setCategory(benefitType?.category ?? 'vt');
      setFundingRule(benefitType?.funding_rule ?? 'percentual');
      setSupplier(benefitType?.supplier ?? '');
      setActive(benefitType?.active ?? true);
      setError(null);
      setValidationError(null);
    }
  }, [open, benefitType]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { name, category, funding_rule: fundingRule, supplier: supplier.trim() || null, active };
      return benefitType ? hrApi.updateBenefitType(benefitType.id, payload) : hrApi.createBenefitType(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-benefit-types'] });
      onClose();
    },
    onError: (err) => setError(translateApiError(err, benefitType ? 'Não foi possível atualizar o tipo de benefício' : 'Não foi possível criar o tipo de benefício')),
  });

  const handleConfirm = () => {
    if (!name.trim()) {
      setValidationError('Informe o nome do benefício.');
      return;
    }
    setValidationError(null);
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{benefitType ? 'Editar tipo de benefício' : 'Novo tipo de benefício'}</DialogTitle>
          <DialogDescription>O catálogo não permite exclusão — desative quando o benefício deixar de ser oferecido.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="benefit-type-name">Nome *</Label>
            <Input id="benefit-type-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={150} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="benefit-type-category">Categoria *</Label>
              <SelectNative id="benefit-type-category" value={category} onChange={(event) => setCategory(event.target.value as hrApi.BenefitCategory)}>
                {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="benefit-type-funding-rule">Regra de custeio *</Label>
              <SelectNative id="benefit-type-funding-rule" value={fundingRule} onChange={(event) => setFundingRule(event.target.value as hrApi.BenefitFundingRule)}>
                {Object.entries(FUNDING_RULE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="benefit-type-supplier">Fornecedor/operadora</Label>
            <Input id="benefit-type-supplier" value={supplier} onChange={(event) => setSupplier(event.target.value)} maxLength={150} />
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
      </DialogContent>
    </Dialog>
  );
}

function BenefitEnrollmentsSection() {
  const { hasModuleAccess } = useAuth();
  const canWrite = hasModuleAccess('rh');
  const queryClient = useQueryClient();
  const { employees, employeeName } = useEmployeeOptions();

  const [employeeFilter, setEmployeeFilter] = React.useState<number | ''>('');
  const [statusFilter, setStatusFilter] = React.useState<hrApi.BenefitEnrollmentStatus | ''>('');
  const [page, setPage] = React.useState(1);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-employee-benefits', employeeFilter, statusFilter, page],
    queryFn: () =>
      hrApi.listEmployeeBenefits({
        employee_id: employeeFilter || undefined,
        enrollment_status: statusFilter || undefined,
        page,
        limit: 20,
      }),
  });

  const cancelMutation = useMutation({
    mutationFn: hrApi.cancelEmployeeBenefit,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr-employee-benefits'] }),
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível cancelar a adesão')),
  });

  const colSpan = canWrite ? 7 : 6;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="benefit-enrollment-employee-filter">Funcionário</Label>
            <SelectNative
              id="benefit-enrollment-employee-filter"
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
            <Label htmlFor="benefit-enrollment-status-filter">Status</Label>
            <SelectNative
              id="benefit-enrollment-status-filter"
              className="w-44"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as hrApi.BenefitEnrollmentStatus | '');
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="cancelado">Cancelado</option>
            </SelectNative>
          </div>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus /> Nova adesão
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Funcionário</TableHead>
            <TableHead>Benefício</TableHead>
            <TableHead>Desconto</TableHead>
            <TableHead>Custo empresa</TableHead>
            <TableHead>Dias suspensos</TableHead>
            <TableHead>Status</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={colSpan} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-destructive">
                Não foi possível carregar as adesões. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((benefit) => (
            <TableRow key={benefit.id}>
              <TableCell className="font-medium">{employeeName(benefit.employee_id)}</TableCell>
              <TableCell>{benefit.benefitType?.name ?? `#${benefit.benefit_type_id}`}</TableCell>
              <TableCell>{formatCurrency(benefit.discount_value)}</TableCell>
              <TableCell>{formatCurrency(benefit.company_cost_value)}</TableCell>
              <TableCell>{benefit.suspended_days}</TableCell>
              <TableCell>
                <Badge variant={benefit.enrollment_status === 'ativo' ? 'success' : 'outline'}>
                  {benefit.enrollment_status === 'ativo' ? 'Ativo' : 'Cancelado'}
                </Badge>
              </TableCell>
              {canWrite && (
                <TableCell>
                  {benefit.enrollment_status === 'ativo' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={cancelMutation.isPending}
                      onClick={() => {
                        if (!window.confirm('Cancelar esta adesão de benefício?')) return;
                        setActionError(null);
                        cancelMutation.mutate(benefit.id);
                      }}
                    >
                      <Ban className="size-4" /> Cancelar
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
                Nenhuma adesão encontrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      {actionError && <DidacticAlert error={actionError} />}

      <CreateEmployeeBenefitDialog open={createOpen} employees={employees} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function CreateEmployeeBenefitDialog({
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
  const [benefitTypeId, setBenefitTypeId] = React.useState<number | ''>('');
  const [discountValue, setDiscountValue] = React.useState('');
  const [companyCostValue, setCompanyCostValue] = React.useState('');
  const [dependentsCount, setDependentsCount] = React.useState('');
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const { data: benefitTypesData } = useQuery({
    queryKey: ['hr-benefit-types-all'],
    queryFn: () => hrApi.listBenefitTypes({ active: true, limit: 100 }),
    enabled: open,
  });
  const benefitTypes = benefitTypesData?.data ?? [];
  const selectedType = benefitTypes.find((type) => type.id === benefitTypeId);
  const dependentsAllowed = selectedType ? DEPENDENTS_ALLOWED_CATEGORIES.includes(selectedType.category) : false;

  React.useEffect(() => {
    if (open) {
      setEmployeeId('');
      setBenefitTypeId('');
      setDiscountValue('');
      setCompanyCostValue('');
      setDependentsCount('');
      setError(null);
      setValidationError(null);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () =>
      hrApi.createEmployeeBenefit({
        employee_id: Number(employeeId),
        benefit_type_id: Number(benefitTypeId),
        discount_value: discountValue ? Number(discountValue) : undefined,
        company_cost_value: companyCostValue ? Number(companyCostValue) : undefined,
        dependents: dependentsAllowed && dependentsCount ? { count: Number(dependentsCount) } : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-employee-benefits'] });
      onClose();
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível registrar a adesão de benefício')),
  });

  const handleConfirm = () => {
    if (!employeeId || !benefitTypeId) {
      setValidationError('Selecione o funcionário e o tipo de benefício.');
      return;
    }
    setValidationError(null);
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova adesão de benefício</DialogTitle>
          <DialogDescription>
            Vale-transporte tem limite de desconto de 6% do salário-base (Lei 7.418/85) — o backend recusa valores acima disso.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="employee-benefit-employee">Funcionário *</Label>
            <SelectNative
              id="employee-benefit-employee"
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
            <Label htmlFor="employee-benefit-type">Tipo de benefício *</Label>
            <SelectNative
              id="employee-benefit-type"
              value={benefitTypeId}
              onChange={(event) => setBenefitTypeId(event.target.value ? Number(event.target.value) : '')}
            >
              <option value="">Selecione...</option>
              {benefitTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({CATEGORY_LABEL[type.category]})
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employee-benefit-discount">Desconto do funcionário (R$)</Label>
              <Input
                id="employee-benefit-discount"
                type="number"
                step="0.01"
                min="0"
                value={discountValue}
                onChange={(event) => setDiscountValue(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employee-benefit-company-cost">Custo da empresa (R$)</Label>
              <Input
                id="employee-benefit-company-cost"
                type="number"
                step="0.01"
                min="0"
                value={companyCostValue}
                onChange={(event) => setCompanyCostValue(event.target.value)}
              />
            </div>
          </div>
          {dependentsAllowed && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employee-benefit-dependents">Número de dependentes</Label>
              <Input
                id="employee-benefit-dependents"
                type="number"
                min="0"
                value={dependentsCount}
                onChange={(event) => setDependentsCount(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Só aplicável a saúde/odontológico.</p>
            </div>
          )}
          {validationError && <p className="text-sm text-destructive">{validationError}</p>}
        </div>
        {error && <DidacticAlert error={error} />}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={mutation.isPending}>
            {mutation.isPending ? 'Registrando...' : 'Registrar adesão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BenefitMonthlyReportSection() {
  const currentCompetence = new Date().toISOString().slice(0, 7);
  const [competencia, setCompetencia] = React.useState(currentCompetence);
  const [submittedCompetencia, setSubmittedCompetencia] = React.useState(currentCompetence);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-benefit-monthly-report', submittedCompetencia],
    queryFn: () => hrApi.getMonthlyBenefitReport(submittedCompetencia),
    enabled: Boolean(submittedCompetencia),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="benefit-report-competence">Competência (mês/ano)</Label>
          <Input
            id="benefit-report-competence"
            type="month"
            className="w-44"
            value={competencia}
            onChange={(event) => setCompetencia(event.target.value)}
          />
        </div>
        <Button type="button" variant="outline" onClick={() => setSubmittedCompetencia(competencia)} disabled={!competencia}>
          <FileBarChart className="size-4" /> Gerar relatório
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando relatório...</p>}
      {isError && <p className="text-sm text-destructive">Não foi possível gerar o relatório para esta competência.</p>}

      {data && (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Custo por departamento</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Adesões</TableHead>
                  <TableHead>Custo total da empresa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.by_department.map((bucket) => (
                  <TableRow key={String(bucket.department_id ?? 'sem_departamento')}>
                    <TableCell>{bucket.department_id ? `Departamento #${bucket.department_id}` : 'Sem departamento'}</TableCell>
                    <TableCell>{bucket.count}</TableCell>
                    <TableCell>{formatCurrency(bucket.company_cost_total)}</TableCell>
                  </TableRow>
                ))}
                {data.by_department.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhuma adesão vigente nesta competência.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Detalhamento por adesão</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Benefício</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Custo empresa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item, index) => (
                  <TableRow key={`${item.employee_id}-${item.benefit_type_id}-${index}`}>
                    <TableCell>Funcionário #{item.employee_id}</TableCell>
                    <TableCell>{item.benefit_type_name ?? `#${item.benefit_type_id}`}</TableCell>
                    <TableCell>{formatCurrency(item.discount_value)}</TableCell>
                    <TableCell>{formatCurrency(item.company_cost_value)}</TableCell>
                  </TableRow>
                ))}
                {data.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum item nesta competência.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
