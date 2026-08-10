import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowRight,
  CheckCircle2,
  CopyPlus,
  ListOrdered,
  Lock,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';

import * as productionRoutesApi from '@/api/productionRoutes';
import * as productsApi from '@/api/products';
import * as workCentersApi from '@/api/workCenters';
import type { DidacticError } from '@/lib/translateApiError';
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
import { PrerequisiteChecklist, type PrerequisiteItem } from '@/components/PrerequisiteChecklist';
import { RouteStepsEditor, RouteStepsTable } from './RouteStepsEditor';
import {
  PRODUCIBLE_PRODUCT_TYPES,
  ROUTE_STATUS_HELP,
  ROUTE_STATUS_LABEL,
  ROUTE_STATUS_VARIANT,
  formatMinutes,
  productTypeLabel,
  translateProductionRouteError,
} from './productionRouteShared';

/**
 * `FE4` — Roteiro de fabricação (gap G5): cadastro das operações que a fábrica
 * executa por produto, pré-requisito do apontamento de produção obrigatório
 * (Bloco K do SPED Fiscal).
 *
 * A tela é organizada em torno do ciclo de vida, porque é ele que costuma
 * confundir: um roteiro **liberado é congelado** e o caminho para mudá-lo é
 * *criar uma nova revisão*, não editar. O fluxo aparece explicitamente no topo
 * e o status atual é destacado nele.
 */

const ROUTE_STATUS_ORDER: productionRoutesApi.ProductionRouteStatus[] = ['draft', 'active', 'inactive', 'superseded'];

const createRouteSchema = z.object({
  product_id: z.string().min(1, 'Selecione o produto que será fabricado.'),
  route_code: z.string().trim().min(1, 'Informe o código do roteiro.').max(50, 'Máximo de 50 caracteres.'),
  revision: z.string().trim().max(10, 'Máximo de 10 caracteres.'),
  description: z.string().max(5000, 'Máximo de 5000 caracteres.'),
});
type CreateRouteInput = z.input<typeof createRouteSchema>;
type CreateRouteData = z.output<typeof createRouteSchema>;

const headerSchema = z.object({
  route_code: z.string().trim().min(1, 'Informe o código do roteiro.').max(50, 'Máximo de 50 caracteres.'),
  revision: z.string().trim().min(1, 'Informe a revisão.').max(10, 'Máximo de 10 caracteres.'),
  description: z.string().max(5000, 'Máximo de 5000 caracteres.'),
});
type HeaderInput = z.input<typeof headerSchema>;
type HeaderData = z.output<typeof headerSchema>;

const reviseSchema = z.object({
  revision: z.string().trim().max(10, 'Máximo de 10 caracteres.'),
  route_code: z.string().trim().max(50, 'Máximo de 50 caracteres.'),
  description: z.string().max(5000, 'Máximo de 5000 caracteres.'),
});
type ReviseInput = z.input<typeof reviseSchema>;
type ReviseData = z.output<typeof reviseSchema>;

/** Aviso verde de operação concluída (liberação, revisão, salvamento). */
function SuccessNotice({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-success/40 bg-success/10 p-3 text-sm text-success">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

/** Fluxo do ciclo de vida, com o status atual destacado. */
function RouteLifecycleFlow({ current }: { current?: productionRoutesApi.ProductionRouteStatus }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {ROUTE_STATUS_ORDER.map((status, index) => (
        <React.Fragment key={status}>
          {index > 0 && <ArrowRight className="size-4 shrink-0 text-muted-foreground" />}
          <Badge
            variant={current === status ? ROUTE_STATUS_VARIANT[status] : 'outline'}
            className={current === status ? 'ring-2 ring-brand/40' : 'text-muted-foreground'}
          >
            {ROUTE_STATUS_LABEL[status]}
          </Badge>
        </React.Fragment>
      ))}
    </div>
  );
}

/** Roteiros de fabricação: rascunho → liberação → revisão. */
export default function ProductionRoutesPage() {
  const { hasRole, permissions } = useAuth();
  const producaoLevel = permissions?.producao;
  const isAdmin = hasRole('admin');
  const canWrite = isAdmin || hasRole('operator') || producaoLevel === 'operate' || producaoLevel === 'approve';
  const canApprove = isAdmin || producaoLevel === 'approve';

  const queryClient = useQueryClient();

  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [productFilter, setProductFilter] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [stepsDirty, setStepsDirty] = React.useState(false);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [headerOpen, setHeaderOpen] = React.useState(false);
  const [reviseOpen, setReviseOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const [createError, setCreateError] = React.useState<DidacticError | null>(null);
  const [headerError, setHeaderError] = React.useState<DidacticError | null>(null);
  const [reviseError, setReviseError] = React.useState<DidacticError | null>(null);
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);
  const [stepsError, setStepsError] = React.useState<DidacticError | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const listParams: productionRoutesApi.ListProductionRoutesParams = {
    page,
    limit: 10,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(statusFilter ? { status: statusFilter as productionRoutesApi.ProductionRouteStatus } : {}),
    ...(productFilter ? { product_id: Number(productFilter) } : {}),
  };

  const listQuery = useQuery({
    queryKey: ['production-routes', listParams],
    queryFn: () => productionRoutesApi.listProductionRoutes(listParams),
  });

  const detailQuery = useQuery({
    queryKey: ['production-route', selectedId],
    queryFn: () => productionRoutesApi.getProductionRouteById(selectedId as number),
    enabled: selectedId !== null,
  });

  const productsQuery = useQuery({
    queryKey: ['products-for-routes'],
    queryFn: () => productsApi.listProducts({ limit: 200 }),
  });

  const workCentersQuery = useQuery({
    queryKey: ['work-centers-for-routes'],
    queryFn: () => workCentersApi.listWorkCenters({ limit: 100 }),
  });

  const route = detailQuery.data ?? null;

  // Qual revisão será substituída quando este rascunho for liberado.
  const activeSiblingQuery = useQuery({
    queryKey: ['production-routes-active-sibling', route?.product_id],
    queryFn: () =>
      productionRoutesApi.listProductionRoutes({ product_id: route?.product_id, status: 'active', limit: 5 }),
    enabled: Boolean(route && route.status !== 'active'),
  });

  const products = productsQuery.data?.data ?? [];
  const producibleProducts = products.filter(
    (product) => product.status === 'active' && PRODUCIBLE_PRODUCT_TYPES.includes(product.product_type ?? 'finished'),
  );
  const workCenters = workCentersQuery.data?.data ?? [];

  function resetErrors() {
    setCreateError(null);
    setHeaderError(null);
    setReviseError(null);
    setActionError(null);
    setStepsError(null);
  }

  function selectRoute(id: number) {
    setSelectedId(id);
    setStepsDirty(false);
    resetErrors();
    setNotice(null);
  }

  function invalidateAll(routeId?: number) {
    queryClient.invalidateQueries({ queryKey: ['production-routes'] });
    queryClient.invalidateQueries({ queryKey: ['production-routes-active-sibling'] });
    if (routeId !== undefined) {
      queryClient.invalidateQueries({ queryKey: ['production-route', routeId] });
    }
  }

  const createMutation = useMutation({
    mutationFn: productionRoutesApi.createProductionRoute,
    onSuccess: (created) => {
      invalidateAll(created.id);
      setCreateOpen(false);
      setCreateError(null);
      selectRoute(created.id);
      setNotice(
        `Rascunho ${created.route_code} (revisão ${created.revision}) criado. Monte as operações abaixo e depois libere o roteiro.`,
      );
    },
    onError: (error) => setCreateError(translateProductionRouteError(error, 'Não foi possível criar o roteiro')),
  });

  const headerMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: productionRoutesApi.UpdateProductionRouteInput }) =>
      productionRoutesApi.updateProductionRoute(id, input),
    onSuccess: (updated) => {
      invalidateAll(updated.id);
      setHeaderOpen(false);
      setHeaderError(null);
      setNotice(`Cabeçalho do roteiro ${updated.route_code} atualizado.`);
    },
    onError: (error) =>
      setHeaderError(translateProductionRouteError(error, 'Não foi possível salvar o cabeçalho do roteiro')),
  });

  const stepsMutation = useMutation({
    mutationFn: ({ id, steps }: { id: number; steps: productionRoutesApi.ProductionRouteStepInput[] }) =>
      productionRoutesApi.replaceProductionRouteSteps(id, steps),
    onSuccess: (_saved, variables) => {
      invalidateAll(variables.id);
      setStepsError(null);
      setStepsDirty(false);
      setNotice('Operações salvas no rascunho.');
    },
    onError: (error) => setStepsError(translateProductionRouteError(error, 'Não foi possível salvar as operações')),
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => productionRoutesApi.activateProductionRoute(id),
    onSuccess: (result) => {
      invalidateAll(result.route.id);
      setActionError(null);
      setNotice(
        result.superseded_route_id
          ? `Roteiro ${result.route.route_code} (revisão ${result.route.revision}) liberado. A revisão que estava valendo passou a "Substituído" e continua guardada, com as etapas intactas, para sustentar os apontamentos já feitos.`
          : `Roteiro ${result.route.route_code} (revisão ${result.route.revision}) liberado. A partir de agora ele é o roteiro que a fábrica executa — e está congelado: para mudar, crie uma nova revisão.`,
      );
    },
    onError: (error) => setActionError(translateProductionRouteError(error, 'Não foi possível liberar o roteiro')),
  });

  const inactivateMutation = useMutation({
    mutationFn: (id: number) => productionRoutesApi.inactivateProductionRoute(id),
    onSuccess: (updated) => {
      invalidateAll(updated.id);
      setActionError(null);
      setNotice(`Roteiro ${updated.route_code} aposentado. O produto ficou sem roteiro liberado.`);
    },
    onError: (error) => setActionError(translateProductionRouteError(error, 'Não foi possível aposentar o roteiro')),
  });

  const reviseMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: productionRoutesApi.ReviseProductionRouteInput }) =>
      productionRoutesApi.reviseProductionRoute(id, input),
    onSuccess: (draft) => {
      invalidateAll(draft.id);
      setReviseOpen(false);
      setReviseError(null);
      selectRoute(draft.id);
      setNotice(
        `Revisão ${draft.revision} criada como rascunho (${draft.route_code}), com uma cópia de todas as operações. Altere o que precisa e libere: só na liberação a revisão anterior é substituída.`,
      );
    },
    onError: (error) => setReviseError(translateProductionRouteError(error, 'Não foi possível criar a nova revisão')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productionRoutesApi.removeProductionRoute(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-routes'] });
      setDeleteOpen(false);
      setSelectedId(null);
      setActionError(null);
      setNotice('Rascunho excluído.');
    },
    onError: (error) => {
      setDeleteOpen(false);
      setActionError(translateProductionRouteError(error, 'Não foi possível excluir o rascunho'));
    },
  });

  const routes = listQuery.data?.data ?? [];
  const isDraft = route?.status === 'draft';
  const canBeActivated = route?.status === 'draft' || route?.status === 'inactive';
  const stepsWithDeadCenter = (route?.steps ?? []).filter((step) => step.workCenter && !step.workCenter.active);
  const activeSibling = (activeSiblingQuery.data?.data ?? []).find((candidate) => candidate.id !== route?.id);

  const activationChecklist: PrerequisiteItem[] = route
    ? [
        {
          label: 'Roteiro tem operações cadastradas',
          ok: route.steps.length > 0,
          detail:
            route.steps.length > 0
              ? `${route.steps.length} operação(ões), ${formatMinutes(route.total_standard_time_minutes)} por peça.`
              : 'Um roteiro sem operação não pode ser liberado — o operador não teria contra o que apontar.',
        },
        {
          label: 'Nenhuma operação aponta para centro de trabalho desativado',
          ok: stepsWithDeadCenter.length === 0,
          detail:
            stepsWithDeadCenter.length === 0
              ? 'Os centros informados estão ativos (o sistema confere de novo na liberação).'
              : `Operação(ões) ${stepsWithDeadCenter.map((step) => step.sequence).join(', ')} usam centro desativado: ${stepsWithDeadCenter
                  .map((step) => step.workCenter?.code)
                  .join(', ')}.`,
          action:
            stepsWithDeadCenter.length > 0
              ? { label: 'Reativar em Centros de Trabalho', to: '/production/work-centers' }
              : undefined,
        },
        {
          label: 'Alterações das operações salvas',
          ok: !stepsDirty,
          detail: stepsDirty
            ? 'Há alteração aberta no editor de operações. A liberação usa o que está gravado, não o que está na tela.'
            : 'Nada pendente no editor.',
        },
      ]
    : [];

  const activationBlocked = activationChecklist.some((item) => !item.ok);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <ListOrdered className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Roteiro de fabricação</h1>
            <p className="text-sm text-muted-foreground">
              A sequência de operações que a fábrica executa em cada produto — e contra a qual o operador aponta a produção.
            </p>
          </div>
        </div>
        {canWrite && (
          <Button
            onClick={() => {
              setCreateError(null);
              setCreateOpen(true);
            }}
          >
            <Plus className="size-4" /> Novo roteiro
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como o roteiro muda de situação</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <RouteLifecycleFlow current={route?.status} />
          <p className="text-muted-foreground">
            Você monta o roteiro em <strong>rascunho</strong> e o gestor de produção o <strong>libera</strong>. Depois de
            liberado ele <strong>não muda mais</strong>: para alterar o processo, use <strong>Criar nova revisão</strong> — o
            sistema copia tudo para um rascunho novo e, quando você liberar a revisão, a anterior passa a{' '}
            <strong>Substituído</strong>, guardada com as etapas intactas. É isso que faz as ordens de produção já apontadas
            continuarem batendo com o roteiro que a fábrica realmente executou.
          </p>
        </CardContent>
      </Card>

      {/* Sem roteiro selecionado (ex.: logo após excluir um rascunho) o aviso
          precisa aparecer aqui, senão sumiria junto com o painel de detalhe. */}
      {selectedId === null && notice && <SuccessNotice message={notice} />}
      {selectedId === null && actionError && <DidacticAlert error={actionError} />}

      <Card>
        <CardHeader className="flex flex-col gap-3">
          <CardTitle className="text-base">Roteiros cadastrados</CardTitle>
          <div className="grid gap-3 md:grid-cols-[1fr_14rem_12rem]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="route-search" className="text-xs">
                Buscar por código ou descrição
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="route-search"
                  className="pl-8"
                  placeholder="Ex.: ROT-ALT15"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="route-product" className="text-xs">
                Produto
              </Label>
              <SelectNative
                id="route-product"
                value={productFilter}
                onChange={(event) => {
                  setProductFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todos os produtos</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.code} — {product.name}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="route-status" className="text-xs">
                Situação
              </Label>
              <SelectNative
                id="route-status"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todas</option>
                {ROUTE_STATUS_ORDER.map((status) => (
                  <option key={status} value={status}>
                    {ROUTE_STATUS_LABEL[status]}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {listQuery.isError && (
            <DidacticAlert error={translateProductionRouteError(listQuery.error, 'Não foi possível carregar os roteiros')} />
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roteiro</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="w-20">Revisão</TableHead>
                <TableHead className="w-32">Situação</TableHead>
                <TableHead className="text-right">Tempo padrão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQuery.isLoading ? (
                <TableSkeletonRows rows={4} columns={5} />
              ) : routes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum roteiro encontrado com esses filtros.
                  </TableCell>
                </TableRow>
              ) : (
                routes.map((item) => (
                  <TableRow
                    key={item.id}
                    className={`cursor-pointer hover:bg-accent/50 ${selectedId === item.id ? 'bg-accent/60' : ''}`}
                    onClick={() => selectRoute(item.id)}
                  >
                    <TableCell className="font-medium">{item.route_code}</TableCell>
                    <TableCell className="text-sm">
                      {item.product ? `${item.product.code} — ${item.product.name}` : `Produto #${item.product_id}`}
                    </TableCell>
                    <TableCell className="tabular-nums">{item.revision}</TableCell>
                    <TableCell>
                      <Badge variant={ROUTE_STATUS_VARIANT[item.status]}>{ROUTE_STATUS_LABEL[item.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMinutes(item.total_standard_time_minutes)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <Pagination pagination={listQuery.data?.pagination} onPageChange={setPage} />
        </CardContent>
      </Card>

      {selectedId !== null && (
        <Card>
          <CardHeader className="flex flex-col gap-3">
            {detailQuery.isLoading || !route ? (
              <CardTitle className="text-base">Carregando roteiro...</CardTitle>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      {route.route_code}
                      <span className="text-sm font-normal text-muted-foreground">revisão {route.revision}</span>
                      <Badge variant={ROUTE_STATUS_VARIANT[route.status]}>{ROUTE_STATUS_LABEL[route.status]}</Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {route.product
                        ? `${route.product.code} — ${route.product.name} (${productTypeLabel(route.product.product_type)})`
                        : `Produto #${route.product_id}`}
                    </p>
                    {route.description && <p className="text-sm">{route.description}</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canWrite && isDraft && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setHeaderError(null);
                          setHeaderOpen(true);
                        }}
                      >
                        <Pencil className="size-4" /> Editar cabeçalho
                      </Button>
                    )}
                    {canWrite && !isDraft && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setReviseError(null);
                          setReviseOpen(true);
                        }}
                      >
                        <CopyPlus className="size-4" /> Criar nova revisão
                      </Button>
                    )}
                    {canWrite && canBeActivated && (
                      <Button
                        size="sm"
                        disabled={!canApprove || activationBlocked || activateMutation.isPending}
                        onClick={() => activateMutation.mutate(route.id)}
                      >
                        <CheckCircle2 className="size-4" />
                        {activateMutation.isPending ? 'Liberando...' : 'Liberar roteiro'}
                      </Button>
                    )}
                    {canWrite && route.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canApprove || inactivateMutation.isPending}
                        onClick={() => inactivateMutation.mutate(route.id)}
                      >
                        {inactivateMutation.isPending ? 'Aposentando...' : 'Aposentar roteiro'}
                      </Button>
                    )}
                    {canWrite && isDraft && (
                      <Button variant="ghost" size="icon" title="Excluir rascunho" onClick={() => setDeleteOpen(true)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">{ROUTE_STATUS_HELP[route.status]}</p>

                {canWrite && !canApprove && (route.status === 'active' || canBeActivated) && (
                  <p className="text-xs text-muted-foreground">
                    Liberar e aposentar roteiro exigem alçada de gestor da produção — seu perfil monta e revisa o rascunho,
                    mas quem libera é a gerência.
                  </p>
                )}
              </>
            )}
          </CardHeader>

          {route && (
            <CardContent className="flex flex-col gap-4">
              {notice && <SuccessNotice message={notice} />}

              {actionError && <DidacticAlert error={actionError} />}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Operações</p>
                  <p className="text-lg font-semibold tabular-nums">{route.steps_count}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Tempo padrão (por peça)</p>
                  <p className="text-lg font-semibold tabular-nums">{formatMinutes(route.total_standard_time_minutes)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Setup total (por lote)</p>
                  <p className="text-lg font-semibold tabular-nums">{formatMinutes(route.total_setup_time_minutes)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Liberado por</p>
                  <p className="text-sm font-medium">
                    {route.approvedBy?.name ?? 'Ainda não liberado'}
                    {route.approved_at && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {new Date(route.approved_at).toLocaleString('pt-BR')}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {canBeActivated && (
                <div className="flex flex-col gap-2 rounded-lg border p-3">
                  <p className="text-sm font-medium">Antes de liberar</p>
                  <PrerequisiteChecklist items={activationChecklist} />
                  {activeSibling && (
                    <AmberNoticeBox size="xs">
                      Este produto já tem o roteiro <strong>{activeSibling.route_code}</strong> (revisão{' '}
                      {activeSibling.revision}) liberado. Ao liberar este aqui, aquele passa automaticamente a{' '}
                      <strong>Substituído</strong> — só pode existir um roteiro liberado por produto.
                    </AmberNoticeBox>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">Operações do roteiro</h2>
                  {!isDraft && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Lock className="size-3.5" /> Somente leitura — roteiro fora de rascunho não é editável
                    </span>
                  )}
                </div>

                {isDraft && canWrite ? (
                  <RouteStepsEditor
                    key={route.id}
                    route={route}
                    workCenters={workCenters}
                    onSave={(steps) => stepsMutation.mutate({ id: route.id, steps })}
                    isSaving={stepsMutation.isPending}
                    saveError={stepsError}
                    onDirtyChange={setStepsDirty}
                  />
                ) : (
                  <RouteStepsTable route={route} />
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <CreateRouteDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        products={producibleProducts}
        productsLoading={productsQuery.isLoading}
        isPending={createMutation.isPending}
        error={createError}
        onSubmit={(values) =>
          createMutation.mutate({
            product_id: Number(values.product_id),
            route_code: values.route_code,
            ...(values.revision ? { revision: values.revision } : {}),
            description: values.description ? values.description : null,
          })
        }
      />

      <HeaderDialog
        open={headerOpen}
        onOpenChange={setHeaderOpen}
        route={route}
        isPending={headerMutation.isPending}
        error={headerError}
        onSubmit={(values) => {
          if (!route) return;
          headerMutation.mutate({
            id: route.id,
            input: {
              route_code: values.route_code,
              revision: values.revision,
              description: values.description ? values.description : null,
            },
          });
        }}
      />

      <ReviseDialog
        open={reviseOpen}
        onOpenChange={setReviseOpen}
        route={route}
        isPending={reviseMutation.isPending}
        error={reviseError}
        onSubmit={(values) => {
          if (!route) return;
          reviseMutation.mutate({
            id: route.id,
            input: {
              ...(values.revision ? { revision: values.revision } : {}),
              ...(values.route_code ? { route_code: values.route_code } : {}),
              ...(values.description ? { description: values.description } : {}),
            },
          });
        }}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir o rascunho {route?.route_code}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            O rascunho e todas as suas operações serão apagados. Só é possível excluir rascunho nunca apontado — roteiro
            liberado é histórico industrial e se aposenta, não se apaga.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => route && deleteMutation.mutate(route.id)}
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir rascunho'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Dialog de criação do roteiro (nasce sempre em rascunho). */
function CreateRouteDialog({
  open,
  onOpenChange,
  products,
  productsLoading,
  isPending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: productsApi.Product[];
  productsLoading: boolean;
  isPending: boolean;
  error: DidacticError | null;
  onSubmit: (values: CreateRouteData) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateRouteInput, unknown, CreateRouteData>({
    resolver: zodResolver(createRouteSchema),
    defaultValues: { product_id: '', route_code: '', revision: '', description: '' },
  });

  React.useEffect(() => {
    if (open) reset({ product_id: '', route_code: '', revision: '', description: '' });
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Novo roteiro de fabricação</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-route-product">Produto fabricado</Label>
            <SelectNative id="new-route-product" {...register('product_id')}>
              <option value="">Selecione...</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.code} — {product.name}
                </option>
              ))}
            </SelectNative>
            {errors.product_id && <p className="text-sm text-destructive">{errors.product_id.message}</p>}
            {!productsLoading && products.length === 0 && (
              <AmberNoticeBox size="xs">
                Nenhum produto acabado ou subconjunto ativo foi encontrado no cadastro. Roteiro de fabricação só existe para
                o que a fábrica produz — cadastre o produto antes.
              </AmberNoticeBox>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-route-code">Código do roteiro</Label>
              <Input id="new-route-code" placeholder="ROT-ALT15" {...register('route_code')} />
              {errors.route_code && <p className="text-sm text-destructive">{errors.route_code.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-route-revision">Revisão</Label>
              <Input id="new-route-revision" placeholder="00" {...register('revision')} />
              {errors.revision && <p className="text-sm text-destructive">{errors.revision.message}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-route-description">Descrição (opcional)</Label>
            <Textarea id="new-route-description" rows={2} {...register('description')} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <p className="text-xs text-muted-foreground">
            O roteiro nasce em rascunho: você adiciona as operações depois de criá-lo e a liberação é um passo separado, feito
            pela gerência de produção.
          </p>

          {error && <DidacticAlert error={error} />}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Criando...' : 'Criar rascunho'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Dialog de edição do cabeçalho (somente rascunho). */
function HeaderDialog({
  open,
  onOpenChange,
  route,
  isPending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: productionRoutesApi.ProductionRouteDetail | null;
  isPending: boolean;
  error: DidacticError | null;
  onSubmit: (values: HeaderData) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HeaderInput, unknown, HeaderData>({
    resolver: zodResolver(headerSchema),
    defaultValues: { route_code: '', revision: '', description: '' },
  });

  React.useEffect(() => {
    if (!open || !route) return;
    reset({ route_code: route.route_code, revision: route.revision, description: route.description ?? '' });
  }, [open, route, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar cabeçalho do rascunho</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-route-code">Código do roteiro</Label>
              <Input id="edit-route-code" {...register('route_code')} />
              {errors.route_code && <p className="text-sm text-destructive">{errors.route_code.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-route-revision">Revisão</Label>
              <Input id="edit-route-revision" {...register('revision')} />
              {errors.revision && <p className="text-sm text-destructive">{errors.revision.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-route-description">Descrição</Label>
            <Textarea id="edit-route-description" rows={2} {...register('description')} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          {error && <DidacticAlert error={error} />}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : 'Salvar cabeçalho'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Dialog de criação de nova revisão (clona cabeçalho + operações em rascunho). */
function ReviseDialog({
  open,
  onOpenChange,
  route,
  isPending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: productionRoutesApi.ProductionRouteDetail | null;
  isPending: boolean;
  error: DidacticError | null;
  onSubmit: (values: ReviseData) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReviseInput, unknown, ReviseData>({
    resolver: zodResolver(reviseSchema),
    defaultValues: { revision: '', route_code: '', description: '' },
  });

  React.useEffect(() => {
    if (open) reset({ revision: '', route_code: '', description: '' });
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nova revisão de {route?.route_code}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
          <p className="text-sm text-muted-foreground">
            O sistema cria um <strong>rascunho novo</strong> com uma cópia de todas as operações deste roteiro. O roteiro
            atual continua valendo até que você libere a revisão — e só nesse momento ele passa a "Substituído".
          </p>

          <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="revise-revision">Revisão</Label>
              <Input id="revise-revision" placeholder="automática" {...register('revision')} />
              {errors.revision && <p className="text-sm text-destructive">{errors.revision.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="revise-code">Código do novo roteiro</Label>
              <Input id="revise-code" placeholder="automático" {...register('route_code')} />
              {errors.route_code && <p className="text-sm text-destructive">{errors.route_code.message}</p>}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Deixe em branco para o sistema sugerir sozinho: a próxima revisão numérica e o código do roteiro de origem com o
            sufixo da revisão.
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="revise-description">Motivo da revisão (opcional)</Label>
            <Textarea id="revise-description" rows={2} placeholder="Ex.: troca do adesivo da bobina." {...register('description')} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          {error && <DidacticAlert error={error} />}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Criando revisão...' : 'Criar revisão em rascunho'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
