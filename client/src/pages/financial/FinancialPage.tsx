import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, TrendingUp, TrendingDown, Scale, AlarmClock, AlertTriangle, Wallet } from 'lucide-react';

import * as financialApi from '@/api/financial';
import { extractApiErrorMessage } from '@/api/httpClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';
import { CostCentersTab } from './CostCentersTab';
import { DailyCashFlowProjectionTab } from './DailyCashFlowProjectionTab';
import { ReconciliationTab } from './ReconciliationTab';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'destructive' | 'secondary' | 'warning'> = {
  pending: 'secondary',
  partial: 'warning',
  paid: 'success',
  overdue: 'destructive',
  canceled: 'secondary',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  partial: 'Parcial',
  paid: 'Pago',
  overdue: 'Atrasado',
  canceled: 'Cancelado',
};

/** Pede o valor a pagar/receber (branco = quita o restante). Retorna `undefined` se cancelado. */
function promptPaymentAmount(remaining: number): number | undefined {
  const input = window.prompt(
    `Valor a registrar (restante: R$ ${remaining.toFixed(2)}). Deixe em branco para quitar o valor total restante.`,
  );
  if (input === null) return undefined;
  if (input.trim() === '') return remaining;
  const parsed = Number(input.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

const INVOICE_TYPE_LABEL: Record<string, string> = {
  nfe: 'NF-e (mercadoria)',
  nfse: 'NFS-e (serviço)',
};

const payableSchema = z.object({
  description: z.string().min(1, 'Informe a descrição.'),
  amount: z.coerce.number().positive('Informe um valor maior que zero.'),
  due_date: z.string().min(1, 'Informe o vencimento.'),
  invoice_type: z.enum(['nfe', 'nfse']).optional(),
  cost_center_id: z.coerce.number().int().positive().optional(),
});

type PayableFormData = z.infer<typeof payableSchema>;

type FinancialView = 'accounts' | 'cost-centers' | 'cash-flow-daily' | 'reconciliation';

/** `FE5`: contas a pagar/receber, centros de custo e projeção de fluxo de caixa. */
export default function FinancialPage() {
  const { hasRole } = useAuth();
  // Perfil `financial` é somente-leitura no módulo Financeiro (CLAUDE.md §4 —
  // "financial (leitura financeira)"); mesmo padrão `canWrite` de
  // `SuppliersPage`/`ClientsPage`, aqui restrito a admin/operator.
  const canWrite = hasRole('admin', 'operator');
  const [view, setView] = React.useState<FinancialView>('accounts');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Wallet className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Contas a pagar, contas a receber, centros de custo e projeção de fluxo de caixa.</p>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        <button
          type="button"
          className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            view === 'accounts' ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setView('accounts')}
        >
          Contas a pagar/receber
        </button>
        <button
          type="button"
          className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            view === 'cost-centers' ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setView('cost-centers')}
        >
          Centros de custo
        </button>
        <button
          type="button"
          className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            view === 'cash-flow-daily' ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setView('cash-flow-daily')}
        >
          Projeção de caixa
        </button>
        <button
          type="button"
          className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            view === 'reconciliation' ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setView('reconciliation')}
        >
          Conciliação
        </button>
      </div>

      {view === 'cost-centers' && <CostCentersTab />}
      {view === 'cash-flow-daily' && <DailyCashFlowProjectionTab />}
      {view === 'reconciliation' && <ReconciliationTab />}
      {view === 'accounts' && <AccountsTab canWrite={canWrite} />}
    </div>
  );
}

function AccountsTab({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [payablesPage, setPayablesPage] = React.useState(1);
  const [receivablesPage, setReceivablesPage] = React.useState(1);

  const { data: payables, isLoading: loadingPayables, isError: errorPayables } = useQuery({
    queryKey: ['payables', payablesPage],
    queryFn: () => financialApi.listPayables({ limit: 20, page: payablesPage }),
  });
  const { data: receivables, isLoading: loadingReceivables, isError: errorReceivables } = useQuery({
    queryKey: ['receivables', receivablesPage],
    queryFn: () => financialApi.listReceivables({ limit: 20, page: receivablesPage }),
  });
  const { data: costCenters } = useQuery({
    queryKey: ['cost-centers', 'lookup'],
    queryFn: () => financialApi.listCostCenters({ limit: 100 }),
  });
  const costCenterById = React.useMemo(() => {
    const map = new Map<number, financialApi.CostCenter>();
    costCenters?.data.forEach((costCenter) => map.set(costCenter.id, costCenter));
    return map;
  }, [costCenters]);
  const activeCostCenters = costCenters?.data.filter((costCenter) => costCenter.active) ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PayableFormData>({ resolver: zodResolver(payableSchema) });

  const createMutation = useMutation({
    mutationFn: financialApi.createPayable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payables'] });
      setOpen(false);
      reset();
      setFormError(null);
    },
    onError: (error) => setFormError(extractApiErrorMessage(error)),
  });

  const payMutation = useMutation({
    mutationFn: ({ id, amount }: { id: number; amount?: number }) => financialApi.payPayable(id, amount),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payables'] }),
    onError: (error) => window.alert(extractApiErrorMessage(error, 'Não foi possível registrar o pagamento.')),
  });

  const receiveMutation = useMutation({
    mutationFn: ({ id, amount }: { id: number; amount?: number }) => financialApi.receivePayment(id, amount),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['receivables'] }),
    onError: (error) => window.alert(extractApiErrorMessage(error, 'Não foi possível registrar o recebimento.')),
  });

  const updatePayableCostCenterMutation = useMutation({
    mutationFn: ({ id, costCenterId }: { id: number; costCenterId: number | null }) =>
      financialApi.updatePayableCostCenter(id, costCenterId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payables'] }),
    onError: (error) => window.alert(extractApiErrorMessage(error, 'Não foi possível atualizar o centro de custo.')),
  });

  const updateReceivableCostCenterMutation = useMutation({
    mutationFn: ({ id, costCenterId }: { id: number; costCenterId: number | null }) =>
      financialApi.updateReceivableCostCenter(id, costCenterId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['receivables'] }),
    onError: (error) => window.alert(extractApiErrorMessage(error, 'Não foi possível atualizar o centro de custo.')),
  });

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-l-4 border-l-brand/40">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Contas a pagar</CardTitle>
          {canWrite ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus /> Nova conta a pagar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova conta a pagar</DialogTitle>
                </DialogHeader>
                <form
                  className="flex flex-col gap-3"
                  onSubmit={handleSubmit((values) =>
                    createMutation.mutate({
                      ...values,
                      invoice_type: values.invoice_type || undefined,
                      cost_center_id: values.cost_center_id || undefined,
                    }),
                  )}
                  noValidate
                >
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="description">Descrição</Label>
                    <Input id="description" {...register('description')} />
                    {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="amount">Valor</Label>
                      <Input id="amount" type="number" step="any" {...register('amount')} />
                      {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="due_date">Vencimento</Label>
                      <Input id="due_date" type="date" {...register('due_date')} />
                      {errors.due_date && <p className="text-sm text-destructive">{errors.due_date.message}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="invoice_type">Tipo de nota</Label>
                    <SelectNative id="invoice_type" defaultValue="" {...register('invoice_type')}>
                      <option value="">Não informado</option>
                      {Object.entries(INVOICE_TYPE_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </SelectNative>
                    <p className="text-xs text-muted-foreground">
                      NF-e para mercadoria/matéria-prima; NFS-e para serviço ou licença digital recebida de fornecedor.
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="cost_center_id">Centro de custo</Label>
                    <SelectNative id="cost_center_id" defaultValue="" {...register('cost_center_id')}>
                      <option value="">Sem centro de custo</option>
                      {activeCostCenters.map((costCenter) => (
                        <option key={costCenter.id} value={costCenter.id}>
                          {costCenter.code} — {costCenter.name}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                  {formError && <p className="text-sm text-destructive">{formError}</p>}
                  <DialogFooter>
                    <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                      {isSubmitting ? 'Salvando...' : 'Criar conta'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : (
            <p className="text-xs text-muted-foreground">
              Criação de contas restrita aos perfis com escrita no módulo Financeiro.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Pago</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Centro de custo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingPayables && <TableSkeletonRows columns={8} />}
              {errorPayables && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-destructive">
                    Não foi possível carregar as contas a pagar. Tente novamente.
                  </TableCell>
                </TableRow>
              )}
              {payables?.data.map((account) => {
                const remaining = Number(account.amount) - Number(account.amount_paid ?? 0);
                return (
                  <TableRow key={account.id}>
                    <TableCell>{account.description}</TableCell>
                    <TableCell className="text-right tabular-nums">R$ {Number(account.amount).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">R$ {Number(account.amount_paid ?? 0).toFixed(2)}</TableCell>
                    <TableCell>{new Date(account.due_date).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      {account.invoice_type ? (
                        <Badge variant="secondary">{INVOICE_TYPE_LABEL[account.invoice_type] ?? account.invoice_type}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {canWrite ? (
                        <SelectNative
                          value={account.cost_center_id ?? ''}
                          onChange={(event) => {
                            const value = event.target.value;
                            updatePayableCostCenterMutation.mutate({
                              id: account.id,
                              costCenterId: value ? Number(value) : null,
                            });
                          }}
                          disabled={updatePayableCostCenterMutation.isPending}
                          className="h-8 text-xs"
                        >
                          <option value="">Sem centro de custo</option>
                          {activeCostCenters.map((costCenter) => (
                            <option key={costCenter.id} value={costCenter.id}>
                              {costCenter.code} — {costCenter.name}
                            </option>
                          ))}
                        </SelectNative>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {account.cost_center_id ? costCenterById.get(account.cost_center_id)?.name ?? '—' : 'Sem centro de custo'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[account.status] ?? 'secondary'}>{STATUS_LABEL[account.status] ?? account.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {(account.status === 'pending' || account.status === 'partial' || account.status === 'overdue') &&
                        (canWrite ? (
                          <Button
                            size="sm"
                            disabled={payMutation.isPending}
                            onClick={() => {
                              const amount = promptPaymentAmount(remaining);
                              if (amount !== undefined) payMutation.mutate({ id: account.id, amount });
                            }}
                          >
                            Registrar pagamento
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Somente leitura</span>
                        ))}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loadingPayables && !errorPayables && payables?.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Nenhuma conta a pagar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="mt-3">
            <Pagination pagination={payables?.pagination} onPageChange={setPayablesPage} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-brand/40">
        <CardHeader>
          <CardTitle>Contas a receber</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Recebido</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Centro de custo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingReceivables && <TableSkeletonRows columns={7} />}
              {errorReceivables && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-destructive">
                    Não foi possível carregar as contas a receber. Tente novamente.
                  </TableCell>
                </TableRow>
              )}
              {receivables?.data.map((account) => {
                const remaining = Number(account.amount) - Number(account.amount_paid ?? 0);
                return (
                  <TableRow key={account.id}>
                    <TableCell>{account.id}</TableCell>
                    <TableCell className="text-right tabular-nums">R$ {Number(account.amount).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">R$ {Number(account.amount_paid ?? 0).toFixed(2)}</TableCell>
                    <TableCell>{new Date(account.due_date).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      {canWrite ? (
                        <SelectNative
                          value={account.cost_center_id ?? ''}
                          onChange={(event) => {
                            const value = event.target.value;
                            updateReceivableCostCenterMutation.mutate({
                              id: account.id,
                              costCenterId: value ? Number(value) : null,
                            });
                          }}
                          disabled={updateReceivableCostCenterMutation.isPending}
                          className="h-8 text-xs"
                        >
                          <option value="">Sem centro de custo</option>
                          {activeCostCenters.map((costCenter) => (
                            <option key={costCenter.id} value={costCenter.id}>
                              {costCenter.code} — {costCenter.name}
                            </option>
                          ))}
                        </SelectNative>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {account.cost_center_id ? costCenterById.get(account.cost_center_id)?.name ?? '—' : 'Sem centro de custo'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[account.status] ?? 'secondary'}>{STATUS_LABEL[account.status] ?? account.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {(account.status === 'pending' || account.status === 'partial' || account.status === 'overdue') &&
                        (canWrite ? (
                          <Button
                            size="sm"
                            disabled={receiveMutation.isPending}
                            onClick={() => {
                              const amount = promptPaymentAmount(remaining);
                              if (amount !== undefined) receiveMutation.mutate({ id: account.id, amount });
                            }}
                          >
                            Registrar recebimento
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Somente leitura</span>
                        ))}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loadingReceivables && !errorReceivables && receivables?.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhuma conta a receber.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="mt-3">
            <Pagination pagination={receivables?.pagination} onPageChange={setReceivablesPage} />
          </div>
        </CardContent>
      </Card>
      <CashFlowProjectionSection />
    </div>
  );
}

const HORIZON_OPTIONS = [30, 60, 90] as const;
type HorizonDays = (typeof HORIZON_OPTIONS)[number];

function formatBRL(value: number): string {
  return `R$ ${Number(value).toFixed(2)}`;
}

function formatWeekRange(start: string, end: string): string {
  const toDdMm = (value: string) => {
    const [, month, day] = value.split('-');
    return `${day}/${month}`;
  };
  return `${toDdMm(start)}–${toDdMm(end)}`;
}

/** Projeção de fluxo de caixa por semana, a partir dos títulos em aberto (contas a pagar/receber). */
function CashFlowProjectionSection() {
  const [days, setDays] = React.useState<HorizonDays>(30);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cash-flow-projection', days],
    queryFn: () => financialApi.getCashFlowProjection(days),
  });

  const netVariant = (data?.totals.net ?? 0) >= 0 ? 'text-success' : 'text-destructive';
  const overdueTotal = (data?.totals.overdue_receivable ?? 0) + (data?.totals.overdue_payable ?? 0);

  return (
    <Card className="border-l-4 border-l-brand/40">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Fluxo de caixa (projeção)</CardTitle>
        <div className="flex items-center gap-2">
          <Label htmlFor="cash-flow-horizon" className="text-xs text-muted-foreground">
            Horizonte
          </Label>
          <SelectNative
            id="cash-flow-horizon"
            value={days}
            onChange={(event) => setDays(Number(event.target.value) as HorizonDays)}
            className="w-28"
          >
            {HORIZON_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} dias
              </option>
            ))}
          </SelectNative>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando projeção...</p>}
        {isError && (
          <p className="text-sm text-destructive">Não foi possível carregar a projeção de fluxo de caixa. Tente novamente.</p>
        )}

        {!isLoading && !isError && data && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <TrendingUp className="size-7 text-success" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Entradas previstas</p>
                    <p className="text-lg font-semibold text-success">{formatBRL(data.totals.receivable)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <TrendingDown className="size-7 text-destructive" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Saídas previstas</p>
                    <p className="text-lg font-semibold text-destructive">{formatBRL(data.totals.payable)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <Scale className={`size-7 ${netVariant}`} />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Saldo projetado</p>
                    <p className={`text-lg font-semibold ${netVariant}`}>{formatBRL(data.totals.net)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <AlarmClock className="size-7 text-amber-500" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vencendo em 7d</p>
                    <p className="text-lg font-semibold text-amber-600">
                      +{formatBRL(data.due_next_7_days.receivable)} / -{formatBRL(data.due_next_7_days.payable)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <AlertTriangle className="size-7 text-destructive" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Em atraso</p>
                    <p className="text-lg font-semibold text-destructive">{formatBRL(overdueTotal)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Semana</TableHead>
                  <TableHead className="text-right">A receber</TableHead>
                  <TableHead className="text-right">A pagar</TableHead>
                  <TableHead className="text-right">Saldo da semana</TableHead>
                  <TableHead className="text-right">Acumulado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.weeks.map((week) => (
                  <TableRow key={week.week_start}>
                    <TableCell>{formatWeekRange(week.week_start, week.week_end)}</TableCell>
                    <TableCell className="text-right tabular-nums text-success">{formatBRL(week.receivable)}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">{formatBRL(week.payable)}</TableCell>
                    <TableCell className={`text-right tabular-nums ${week.net >= 0 ? 'text-success' : 'text-destructive'}`}>{formatBRL(week.net)}</TableCell>
                    <TableCell className={`text-right tabular-nums font-bold ${week.cumulative_net >= 0 ? '' : 'text-destructive'}`}>
                      {formatBRL(week.cumulative_net)}
                    </TableCell>
                  </TableRow>
                ))}
                {data.weeks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum título em aberto no horizonte selecionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
