import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ShieldAlert } from 'lucide-react';

import * as directorateApi from '@/api/directorate';
import { useAuth } from '@/context/AuthContext';
import { useEmployeeOptions } from '@/components/hr/useEmployeeOptions';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';
import { DidacticAlert } from '@/components/DidacticAlert';
import { cn } from '@/lib/utils';

const CATEGORY_LABEL: Record<directorateApi.RiskCategory, string> = {
  operational: 'Operacional',
  financial: 'Financeiro',
  market: 'Mercado',
  regulatory: 'Regulatório',
  reputation: 'Reputação',
  supply: 'Suprimentos',
};

const LEVEL_LABEL: Record<directorateApi.RiskLevel, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

const STATUS_LABEL: Record<directorateApi.RiskStatus, string> = {
  active: 'Ativo',
  mitigated: 'Mitigado',
  accepted: 'Aceito',
  closed: 'Encerrado',
};

const STATUS_BADGE: Record<directorateApi.RiskStatus, 'default' | 'success' | 'secondary' | 'outline'> = {
  active: 'default',
  mitigated: 'success',
  accepted: 'secondary',
  closed: 'outline',
};

/**
 * Cor do badge de score (1–16, `probability × impact`) — pedido do dono:
 * 1-4 verde, 6-9 âmbar, 12-16 vermelho. O score em si SEMPRE vem do
 * servidor (`risk.risk_score`), nunca recalculado no cliente.
 */
function scoreClass(score: number): string {
  if (score <= 4) return 'border-transparent bg-success text-success-foreground';
  if (score <= 9) return 'border-transparent bg-amber-700 text-white';
  return 'border-transparent bg-destructive text-destructive-foreground';
}

/**
 * Aba "Riscos" de `/directorate` — `/api/directorate/business-risks`.
 * `risk_score` é sempre o valor devolvido pelo servidor; o formulário nunca
 * o envia (o schema Zod do backend é `.strict()` e rejeitaria).
 */
export function BusinessRisksTab() {
  const { hasRole, permissions } = useAuth();
  const canWrite = hasRole('admin') || permissions?.diretoria === 'approve';
  const { employeeName, employees } = useEmployeeOptions();

  const [statusFilter, setStatusFilter] = React.useState<directorateApi.RiskStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = React.useState<directorateApi.RiskCategory | ''>('');
  const [page, setPage] = React.useState(1);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<directorateApi.BusinessRisk | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['directorate-business-risks', statusFilter, categoryFilter, page],
    queryFn: () =>
      directorateApi.listBusinessRisks({
        status: statusFilter || undefined,
        risk_category: categoryFilter || undefined,
        page,
        limit: 20,
      }),
  });

  const colSpan = canWrite ? 8 : 7;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="risk-status-filter">Status</Label>
            <SelectNative
              id="risk-status-filter"
              className="w-40"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as directorateApi.RiskStatus | '');
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
            <Label htmlFor="risk-category-filter">Categoria</Label>
            <SelectNative
              id="risk-category-filter"
              className="w-44"
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value as directorateApi.RiskCategory | '');
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
        </div>
        {canWrite && (
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus /> Novo risco
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Categoria</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Probabilidade</TableHead>
            <TableHead>Impacto</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Responsável</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={colSpan} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-destructive">
                Não foi possível carregar os riscos. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((risk) => (
            <TableRow key={risk.id}>
              <TableCell>{CATEGORY_LABEL[risk.risk_category]}</TableCell>
              <TableCell className="max-w-72">{risk.description}</TableCell>
              <TableCell>{LEVEL_LABEL[risk.probability]}</TableCell>
              <TableCell>{LEVEL_LABEL[risk.impact]}</TableCell>
              <TableCell>
                <Badge className={cn(scoreClass(risk.risk_score))}>{risk.risk_score}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE[risk.status]}>{STATUS_LABEL[risk.status]}</Badge>
              </TableCell>
              <TableCell className="text-sm">{employeeName(risk.responsible_id)}</TableCell>
              {canWrite && (
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(risk);
                      setFormOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
                <ShieldAlert className="mx-auto mb-1 size-5 opacity-40" />
                Nenhum risco corporativo registrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <RiskFormDialog open={formOpen} risk={editing} employees={employees} onClose={() => setFormOpen(false)} />
    </div>
  );
}

function RiskFormDialog({
  open,
  risk,
  employees,
  onClose,
}: {
  open: boolean;
  risk: directorateApi.BusinessRisk | null;
  employees: { id: number; name: string }[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(risk);

  const [category, setCategory] = React.useState<directorateApi.RiskCategory>('operational');
  const [description, setDescription] = React.useState('');
  const [probability, setProbability] = React.useState<directorateApi.RiskLevel>('low');
  const [impact, setImpact] = React.useState<directorateApi.RiskLevel>('low');
  const [mitigationActions, setMitigationActions] = React.useState('');
  const [contingencyPlan, setContingencyPlan] = React.useState('');
  const [responsibleId, setResponsibleId] = React.useState<number | ''>('');
  const [reviewDate, setReviewDate] = React.useState('');
  const [status, setStatus] = React.useState<directorateApi.RiskStatus>('active');
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    if (risk) {
      setCategory(risk.risk_category);
      setDescription(risk.description);
      setProbability(risk.probability);
      setImpact(risk.impact);
      setMitigationActions(risk.mitigation_actions ?? '');
      setContingencyPlan(risk.contingency_plan ?? '');
      setResponsibleId(risk.responsible_id ?? '');
      setReviewDate(risk.review_date ?? '');
      setStatus(risk.status);
    } else {
      setCategory('operational');
      setDescription('');
      setProbability('low');
      setImpact('low');
      setMitigationActions('');
      setContingencyPlan('');
      setResponsibleId('');
      setReviewDate('');
      setStatus('active');
    }
    setError(null);
    setValidationError(null);
  }, [open, risk]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload: directorateApi.BusinessRiskInput = {
        risk_category: category,
        description: description.trim(),
        probability,
        impact,
        mitigation_actions: mitigationActions.trim() || null,
        contingency_plan: contingencyPlan.trim() || null,
        responsible_id: responsibleId === '' ? null : Number(responsibleId),
        review_date: reviewDate || null,
        status,
      };
      return isEdit ? directorateApi.updateBusinessRisk(risk!.id, payload) : directorateApi.createBusinessRisk(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directorate-business-risks'] });
      onClose();
    },
    onError: (err) => setError(translateApiError(err, isEdit ? 'Não foi possível atualizar o risco' : 'Não foi possível registrar o risco')),
  });

  const previewScore = LEVEL_WEIGHT[probability] * LEVEL_WEIGHT[impact];

  const handleConfirm = () => {
    if (!description.trim()) {
      setValidationError('Descreva o risco.');
      return;
    }
    setValidationError(null);
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar risco corporativo' : 'Novo risco corporativo'}</DialogTitle>
          <DialogDescription>O score (probabilidade × impacto) é calculado e recalculado pelo servidor — nunca informado manualmente.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="risk-form-category">Categoria *</Label>
              <SelectNative id="risk-form-category" value={category} onChange={(event) => setCategory(event.target.value as directorateApi.RiskCategory)}>
                {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="risk-form-status">Status</Label>
              <SelectNative id="risk-form-status" value={status} onChange={(event) => setStatus(event.target.value as directorateApi.RiskStatus)}>
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="risk-form-description">Descrição *</Label>
            <textarea
              id="risk-form-description"
              className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={4000}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="risk-form-probability">Probabilidade *</Label>
              <SelectNative id="risk-form-probability" value={probability} onChange={(event) => setProbability(event.target.value as directorateApi.RiskLevel)}>
                {Object.entries(LEVEL_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="risk-form-impact">Impacto *</Label>
              <SelectNative id="risk-form-impact" value={impact} onChange={(event) => setImpact(event.target.value as directorateApi.RiskLevel)}>
                {Object.entries(LEVEL_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Score previsto: <Badge className={cn(scoreClass(previewScore))}>{previewScore}</Badge> (confirmado pelo servidor ao salvar)
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="risk-form-mitigation">Ações de mitigação</Label>
            <textarea
              id="risk-form-mitigation"
              className="flex min-h-14 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={mitigationActions}
              onChange={(event) => setMitigationActions(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="risk-form-contingency">Plano de contingência</Label>
            <textarea
              id="risk-form-contingency"
              className="flex min-h-14 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={contingencyPlan}
              onChange={(event) => setContingencyPlan(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="risk-form-responsible">Responsável</Label>
              <SelectNative id="risk-form-responsible" value={responsibleId} onChange={(event) => setResponsibleId(event.target.value ? Number(event.target.value) : '')}>
                <option value="">Não definido</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="risk-form-review-date">Próxima revisão</Label>
              <Input id="risk-form-review-date" type="date" value={reviewDate} onChange={(event) => setReviewDate(event.target.value)} />
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
            {mutation.isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Espelha `server/src/modules/directorate/domain/services/riskScore.ts` — usado SÓ para prévia visual, nunca enviado ao backend. */
const LEVEL_WEIGHT: Record<directorateApi.RiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};
