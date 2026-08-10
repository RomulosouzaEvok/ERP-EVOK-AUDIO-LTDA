import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, CalendarRange, CheckCircle2, Factory, Lock, Plus, XCircle } from 'lucide-react';

import * as masterProductionApi from '@/api/masterProduction';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/Textarea';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';
import { DidacticAlert } from '@/components/DidacticAlert';
import { AmberNoticeBox } from '@/components/AmberNoticeBox';

/**
 * **Plano Mestre de Produção (MPS)** — gap G17, decisão D-F do dono.
 *
 * A tela existe porque o backend do MPS foi entregue só por API (`3e3827e`) e
 * o PCP não tinha por onde firmar um plano. Ela é organizada em torno do
 * ciclo de vida, porque é ele que carrega a regra de negócio: o plano nasce
 * `draft` com a demanda consolidada, o **humano decide linha a linha**, o
 * plano é congelado (`firm`) e só então vira Ordem de Produção (`released`).
 *
 * Duas coisas aparecem explicitamente na interface porque são decisões de
 * negócio que o usuário precisa enxergar, não detalhes internos:
 *
 * 1. **Sugerido × planejado.** O sistema calcula `suggested_quantity` e a
 *    pessoa preenche `planned_quantity`. A linha nasce com zero mesmo quando
 *    a sugestão é positiva — confirmar produção é ato humano. A divergência
 *    entre as duas colunas é exatamente o que uma auditoria de PCP procura,
 *    então ela é mostrada lado a lado, nunca fundida.
 * 2. **O horizonte é declarado, não adivinhado.** Não existe default de
 *    horizonte: política de PCP não definida pelo dono não é inventada aqui.
 *
 * Limitação herdada do backend, avisada na tela para não virar surpresa:
 * `sales` não tem data de entrega prometida, então a demanda é consolidada no
 * horizonte inteiro, **sem baldes de tempo**.
 */

/** Rótulo humano de cada estado do plano. */
const PLAN_STATUS_LABEL: Record<masterProductionApi.MasterPlanStatus, string> = {
  draft: 'Rascunho',
  firm: 'Firmado',
  released: 'Liberado',
  canceled: 'Cancelado',
};

/** O que cada estado significa para quem opera. */
const PLAN_STATUS_HELP: Record<masterProductionApi.MasterPlanStatus, string> = {
  draft: 'Demanda consolidada. As linhas ainda podem ser decididas e alteradas.',
  firm: 'Decisão congelada. As linhas não mudam mais; o próximo passo é gerar as ordens de produção.',
  released: 'Ordens de produção geradas a partir das linhas decididas.',
  canceled: 'Plano encerrado sem gerar produção.',
};

const PLAN_STATUS_STYLE: Record<masterProductionApi.MasterPlanStatus, string> = {
  draft: 'border-transparent bg-muted text-muted-foreground',
  firm: 'border-transparent bg-blue-600 text-white',
  released: 'border-transparent bg-success text-success-foreground',
  canceled: 'border-transparent bg-destructive text-destructive-foreground',
};

const LINE_STATUS_LABEL: Record<masterProductionApi.MasterPlanLineStatus, string> = {
  pending: 'Aguardando decisão',
  planned: 'Planejado',
  dismissed: 'Descartado',
  released: 'Virou OP',
};

const LINE_STATUS_STYLE: Record<masterProductionApi.MasterPlanLineStatus, string> = {
  pending: 'border-transparent bg-amber-700 text-white',
  planned: 'border-transparent bg-blue-600 text-white',
  dismissed: 'border-transparent bg-muted text-muted-foreground',
  released: 'border-transparent bg-success text-success-foreground',
};

/** Ordem em que o ciclo é desenhado no topo da tela. */
const PLAN_FLOW: masterProductionApi.MasterPlanStatus[] = ['draft', 'firm', 'released'];

/**
 * Converte um valor numérico da API (que chega como string em DECIMAL) para
 * texto com no máximo 4 casas, sem zeros à direita inúteis.
 *
 * @param value - Valor cru vindo da API.
 * @returns Texto pronto para a célula.
 */
function quantity(value: string | number | null | undefined): string {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return '0';
  return parsed.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
}

/**
 * Formata uma data `YYYY-MM-DD` sem passar por `new Date`, que aplicaria o
 * fuso e mostraria o dia anterior.
 *
 * @param value - Data ISO curta.
 * @returns Data em `DD/MM/AAAA`, ou `—` quando vazia.
 */
function isoDate(value: string | null | undefined): string {
  if (!value) return '—';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  if (!year || !month || !day) return String(value);
  return `${day}/${month}/${year}`;
}

const createPlanSchema = z
  .object({
    horizon_start: z.string().min(1, 'Informe o início do horizonte.'),
    horizon_end: z.string().min(1, 'Informe o fim do horizonte.'),
    notes: z.string().max(5000, 'Máximo de 5000 caracteres.'),
  })
  .refine((values) => values.horizon_end >= values.horizon_start, {
    message: 'O fim do horizonte não pode ser anterior ao início.',
    path: ['horizon_end'],
  });
type CreatePlanInput = z.input<typeof createPlanSchema>;
type CreatePlanData = z.output<typeof createPlanSchema>;

/** Desenho do ciclo de vida, com o estado atual destacado. */
function PlanFlow({ status }: { status: masterProductionApi.MasterPlanStatus }) {
  if (status === 'canceled') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Badge className={PLAN_STATUS_STYLE.canceled}>Cancelado</Badge>
        <span className="text-muted-foreground">{PLAN_STATUS_HELP.canceled}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PLAN_FLOW.map((step, index) => (
        <React.Fragment key={step}>
          {index > 0 ? <ArrowRight className="size-4 text-muted-foreground" aria-hidden /> : null}
          <Badge className={step === status ? PLAN_STATUS_STYLE[step] : undefined} variant={step === status ? undefined : 'secondary'}>
            {PLAN_STATUS_LABEL[step]}
          </Badge>
        </React.Fragment>
      ))}
    </div>
  );
}

export default function MasterProductionPlanPage() {
  const { hasRole, permissions } = useAuth();
  const mrpLevel = permissions?.mrp;
  const isAdmin = hasRole('admin');
  const canWrite = isAdmin || mrpLevel === 'operate' || mrpLevel === 'approve';

  const queryClient = useQueryClient();

  const [page, setPage] = React.useState(1);
  const [statusFilter, setStatusFilter] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState('');
  const [pageError, setPageError] = React.useState<DidacticError | null>(null);
  const [skipped, setSkipped] = React.useState<masterProductionApi.SkippedProduct[]>([]);
  const [releasedOrders, setReleasedOrders] = React.useState<
    masterProductionApi.ReleaseMasterPlanResult['production_orders'] | null
  >(null);
  /** Quantidade digitada por linha, antes de gravar a decisão. */
  const [draftQuantities, setDraftQuantities] = React.useState<Record<number, string>>({});

  const listQuery = useQuery({
    queryKey: ['master-plans', page, statusFilter],
    queryFn: () =>
      masterProductionApi.listMasterPlans({
        page,
        limit: 10,
        status: (statusFilter || undefined) as masterProductionApi.MasterPlanStatus | undefined,
      }),
  });

  const plans = listQuery.data?.data ?? [];
  const pagination = listQuery.data?.pagination;

  // Sem seleção explícita, abre o plano mais recente: quem entra na tela quase
  // sempre quer continuar de onde parou.
  React.useEffect(() => {
    if (selectedId === null && plans.length > 0) setSelectedId(plans[0].id);
  }, [plans, selectedId]);

  const detailQuery = useQuery({
    queryKey: ['master-plan', selectedId],
    queryFn: () => masterProductionApi.getMasterPlan(selectedId as number),
    enabled: selectedId !== null,
  });

  const plan = detailQuery.data;
  const lines = plan?.lines ?? [];
  const isDraft = plan?.status === 'draft';
  const isFirm = plan?.status === 'firm';

  const createForm = useForm<CreatePlanInput, unknown, CreatePlanData>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: { horizon_start: '', horizon_end: '', notes: '' },
  });

  function invalidatePlans() {
    queryClient.invalidateQueries({ queryKey: ['master-plans'] });
    queryClient.invalidateQueries({ queryKey: ['master-plan'] });
  }

  const createMutation = useMutation({
    mutationFn: (values: CreatePlanData) =>
      masterProductionApi.createMasterPlan({
        horizon_start: values.horizon_start,
        horizon_end: values.horizon_end,
        notes: values.notes.trim() || undefined,
      }),
    onSuccess: (result) => {
      invalidatePlans();
      setSelectedId(result.plan.id);
      // Produto com demanda que o MPS não planeja (item de compra) aparece
      // para o planejador: omissão silenciosa é como se perde uma demanda.
      setSkipped(result.skipped ?? []);
      setCreateOpen(false);
      setPageError(null);
      createForm.reset({ horizon_start: '', horizon_end: '', notes: '' });
    },
    onError: (error) => setPageError(translateApiError(error, 'Não foi possível consolidar o plano mestre')),
  });

  const decideMutation = useMutation({
    mutationFn: (input: { lineId: number; body: masterProductionApi.DecideLineInput }) =>
      masterProductionApi.decideMasterPlanLine(selectedId as number, input.lineId, input.body),
    onSuccess: () => {
      invalidatePlans();
      setPageError(null);
    },
    onError: (error) => setPageError(translateApiError(error, 'Não foi possível gravar a decisão da linha')),
  });

  const firmMutation = useMutation({
    mutationFn: () => masterProductionApi.firmMasterPlan(selectedId as number),
    onSuccess: () => {
      invalidatePlans();
      setPageError(null);
    },
    onError: (error) => setPageError(translateApiError(error, 'Não foi possível firmar o plano')),
  });

  const releaseMutation = useMutation({
    mutationFn: () => masterProductionApi.releaseMasterPlan(selectedId as number),
    onSuccess: (result) => {
      invalidatePlans();
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      setReleasedOrders(result.production_orders ?? []);
      setPageError(null);
    },
    onError: (error) => setPageError(translateApiError(error, 'Não foi possível liberar o plano')),
  });

  const cancelMutation = useMutation({
    mutationFn: () => masterProductionApi.cancelMasterPlan(selectedId as number, cancelReason.trim() || undefined),
    onSuccess: () => {
      invalidatePlans();
      setCancelOpen(false);
      setCancelReason('');
      setPageError(null);
    },
    onError: (error) => setPageError(translateApiError(error, 'Não foi possível cancelar o plano')),
  });

  /**
   * Grava a decisão de uma linha.
   *
   * @param line - Linha alvo.
   * @param dismiss - `true` descarta a linha em vez de planejar quantidade.
   */
  function decide(line: masterProductionApi.MasterPlanLine, dismiss: boolean) {
    if (dismiss) {
      decideMutation.mutate({ lineId: line.id, body: { dismiss: true } });
      return;
    }
    // Sem nada digitado, "Planejar" aceita a sugestão do sistema. Isso não
    // contradiz a decisão D-F: o clique **é** o ato humano, e ele fica
    // registrado em `decided_by`/`decided_at`. O que a regra proíbe é a linha
    // nascer decidida sozinha — e ela nasce com zero, sempre.
    const typed = draftQuantities[line.id];
    decideMutation.mutate({
      lineId: line.id,
      body: { planned_quantity: typed === undefined || typed === '' ? line.suggested_quantity : typed },
    });
  }

  const summary = plan?.summary;
  const decidedLines = (summary?.planned_lines ?? 0) + (summary?.dismissed_lines ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <CalendarRange className="size-6" aria-hidden />
            Plano Mestre de Produção
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            A ponte entre a carteira de pedidos e a ordem de produção. O sistema consolida a demanda do horizonte;
            quem planeja decide o que produzir, linha a linha. Confirmar uma venda <strong>não</strong> gera
            produção sozinha.
          </p>
        </div>
        {canWrite ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden /> Novo plano
          </Button>
        ) : null}
      </header>

      {pageError ? <DidacticAlert error={pageError} /> : null}

      <AmberNoticeBox icon={CalendarRange}>
        <strong>A demanda é consolidada no horizonte inteiro, sem semanas.</strong> O cadastro de vendas ainda não
        tem data de entrega prometida, então não há como distribuir a demanda em baldes de tempo (semana 1, semana
        2...). O plano é uma fotografia datada do horizonte que você declarar, e não se reconsolida sozinho quando
        chega pedido novo.
      </AmberNoticeBox>

      {skipped.length > 0 ? (
        <AmberNoticeBox icon={Factory}>
          <strong>{skipped.length} produto(s) com demanda ficaram de fora do plano.</strong> O plano mestre só
          planeja o que a fábrica produz. Estes têm demanda, mas são itens de compra — trate-os por Requisição de
          Compra, não por ordem de produção:{' '}
          {skipped.map((item) => item.code ?? item.name ?? `#${item.product_id}`).join(', ')}.
        </AmberNoticeBox>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader className="gap-3">
            <CardTitle>Planos</CardTitle>
            <div className="grid gap-1.5">
              <Label htmlFor="mps-status">Situação</Label>
              <SelectNative
                id="mps-status"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todas</option>
                {(Object.keys(PLAN_STATUS_LABEL) as masterProductionApi.MasterPlanStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {PLAN_STATUS_LABEL[status]}
                  </option>
                ))}
              </SelectNative>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {listQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}
            {!listQuery.isLoading && plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum plano ainda. Crie o primeiro declarando o horizonte que quer planejar.
              </p>
            ) : null}
            {plans.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`flex flex-col items-start gap-1 rounded-md border p-3 text-left text-sm transition ${
                  item.id === selectedId ? 'border-primary bg-accent' : 'hover:bg-muted'
                }`}
              >
                <span className="font-medium">{item.plan_number}</span>
                <span className="text-muted-foreground">
                  {isoDate(item.horizon_start)} → {isoDate(item.horizon_end)}
                </span>
                <Badge className={PLAN_STATUS_STYLE[item.status]}>{PLAN_STATUS_LABEL[item.status]}</Badge>
              </button>
            ))}
            {pagination && pagination.totalPages > 1 ? (
              <Pagination pagination={pagination} onPageChange={setPage} />
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          {selectedId === null ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Selecione um plano à esquerda para ver a demanda consolidada.
              </CardContent>
            </Card>
          ) : null}

          {detailQuery.isLoading ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">Carregando o plano…</CardContent>
            </Card>
          ) : null}

          {plan ? (
            <>
              <Card>
                <CardHeader className="gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle>{plan.plan_number}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      {canWrite && isDraft ? (
                        <Button
                          variant="outline"
                          onClick={() => firmMutation.mutate()}
                          disabled={firmMutation.isPending || decidedLines === 0}
                          title={
                            decidedLines === 0
                              ? 'Decida ao menos uma linha antes de firmar — plano sem decisão nenhuma é recusado.'
                              : undefined
                          }
                        >
                          <Lock className="size-4" aria-hidden /> Firmar decisão
                        </Button>
                      ) : null}
                      {canWrite && isFirm ? (
                        <Button onClick={() => releaseMutation.mutate()} disabled={releaseMutation.isPending}>
                          <Factory className="size-4" aria-hidden /> Gerar ordens de produção
                        </Button>
                      ) : null}
                      {canWrite && (isDraft || isFirm) ? (
                        <Button variant="outline" onClick={() => setCancelOpen(true)}>
                          <XCircle className="size-4" aria-hidden /> Cancelar plano
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <PlanFlow status={plan.status} />
                  <p className="text-sm text-muted-foreground">{PLAN_STATUS_HELP[plan.status]}</p>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Horizonte</p>
                    <p className="text-sm font-medium">
                      {isoDate(plan.horizon_start)} → {isoDate(plan.horizon_end)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Linhas</p>
                    <p className="text-sm font-medium">
                      {summary?.total_lines ?? lines.length} · {summary?.pending_lines ?? 0} aguardando decisão
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Sugerido pelo sistema</p>
                    <p className="text-sm font-medium">{quantity(summary?.total_suggested_quantity)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Planejado por você</p>
                    <p className="text-sm font-medium">{quantity(summary?.total_planned_quantity)}</p>
                  </div>
                </CardContent>
              </Card>

              {releasedOrders ? (
                <div className="flex items-start gap-2 rounded-md border border-success/40 bg-success/10 p-3 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <p>
                    {releasedOrders.length} ordem(ns) de produção criada(s) a partir deste plano. A rastreabilidade
                    da origem fica gravada na própria OP.
                  </p>
                </div>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle>Demanda consolidada</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    <strong>Sugerido</strong> é a necessidade líquida calculada pelo sistema;{' '}
                    <strong>planejado</strong> é a sua decisão. Elas são colunas diferentes de propósito — material
                    em quarentena e material reservado para outra ordem não contam como disponível.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-right">Carteira</TableHead>
                          <TableHead className="text-right">Est. mínimo</TableHead>
                          <TableHead className="text-right">Disponível</TableHead>
                          <TableHead className="text-right">Em produção</TableHead>
                          <TableHead className="text-right">Sugerido</TableHead>
                          <TableHead className="text-right">Planejado</TableHead>
                          <TableHead>Situação</TableHead>
                          {canWrite && isDraft ? <TableHead className="text-right">Decisão</TableHead> : null}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailQuery.isLoading ? <TableSkeletonRows rows={4} columns={9} /> : null}
                        {!detailQuery.isLoading && lines.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-sm text-muted-foreground">
                              Este plano não tem linhas.
                            </TableCell>
                          </TableRow>
                        ) : null}
                        {lines.map((line) => (
                          <TableRow key={line.id}>
                            <TableCell>
                              <span className="font-medium">{line.product?.code ?? `#${line.product_id}`}</span>
                              {line.product?.name ? (
                                <span className="block text-xs text-muted-foreground">{line.product.name}</span>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-right">{quantity(line.demand_sales_orders)}</TableCell>
                            <TableCell className="text-right">{quantity(line.demand_safety_stock)}</TableCell>
                            <TableCell className="text-right">
                              {quantity(line.supply_on_hand)}
                              {Number(line.supply_withheld) > 0 ? (
                                <span
                                  className="block text-xs text-amber-700"
                                  title="Retido pela Qualidade (quarentena ou bloqueio) e já descontado do disponível."
                                >
                                  {quantity(line.supply_withheld)} retido
                                </span>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-right">{quantity(line.supply_in_production)}</TableCell>
                            <TableCell className="text-right font-medium">{quantity(line.suggested_quantity)}</TableCell>
                            <TableCell className="text-right">
                              {canWrite && isDraft && line.status !== 'released' ? (
                                <Input
                                  aria-label={`Quantidade planejada de ${line.product?.code ?? line.product_id}`}
                                  className="ml-auto w-28 text-right"
                                  inputMode="decimal"
                                  value={draftQuantities[line.id] ?? String(line.planned_quantity ?? '')}
                                  onChange={(event) =>
                                    setDraftQuantities((current) => ({ ...current, [line.id]: event.target.value }))
                                  }
                                />
                              ) : (
                                quantity(line.planned_quantity)
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={LINE_STATUS_STYLE[line.status]}>{LINE_STATUS_LABEL[line.status]}</Badge>
                            </TableCell>
                            {canWrite && isDraft ? (
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => decide(line, false)}
                                    disabled={decideMutation.isPending}
                                  >
                                    Planejar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => decide(line, true)}
                                    disabled={decideMutation.isPending}
                                  >
                                    Descartar
                                  </Button>
                                </div>
                              </TableCell>
                            ) : null}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo plano mestre</DialogTitle>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
          >
            <p className="text-sm text-muted-foreground">
              O horizonte é declarado por você: o ERP não assume um período padrão porque a política de
              planejamento não está definida. A demanda é consolidada no momento em que o plano é criado.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="horizon_start">Início do horizonte</Label>
                <Input id="horizon_start" type="date" {...createForm.register('horizon_start')} />
                {createForm.formState.errors.horizon_start ? (
                  <p className="text-sm text-destructive">{createForm.formState.errors.horizon_start.message}</p>
                ) : null}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="horizon_end">Fim do horizonte</Label>
                <Input id="horizon_end" type="date" {...createForm.register('horizon_end')} />
                {createForm.formState.errors.horizon_end ? (
                  <p className="text-sm text-destructive">{createForm.formState.errors.horizon_end.message}</p>
                ) : null}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="notes">Observação</Label>
              <Textarea id="notes" rows={3} {...createForm.register('notes')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Consolidar demanda
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar o plano {plan?.plan_number}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              O plano deixa de existir como decisão de produção. Nada do que já virou ordem de produção é desfeito.
            </p>
            <div className="grid gap-1.5">
              <Label htmlFor="cancel-reason">Motivo</Label>
              <Textarea
                id="cancel-reason"
                rows={3}
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelOpen(false)}>
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              Cancelar plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
