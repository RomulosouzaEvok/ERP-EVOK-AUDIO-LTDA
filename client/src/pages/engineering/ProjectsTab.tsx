import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil } from 'lucide-react';

import * as engineeringApi from '@/api/engineering';
import * as productsApi from '@/api/products';
import { extractApiErrorMessage } from '@/api/httpClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';

const PROJECT_TYPE_LABEL: Record<engineeringApi.EngineeringProjectType, string> = {
  new_product: 'Novo produto',
  improvement: 'Melhoria',
  customization: 'Customização',
  research: 'Pesquisa',
};

const PROJECT_STAGE_LABEL: Record<engineeringApi.EngineeringProjectStage, string> = {
  concept: 'Conceito',
  design: 'Projeto',
  prototype: 'Protótipo',
  testing: 'Testes',
  homologation: 'Homologação',
  production: 'Produção',
};

const PROJECT_STAGE_BADGE: Record<engineeringApi.EngineeringProjectStage, BadgeProps['variant']> = {
  concept: 'secondary',
  design: 'secondary',
  prototype: 'warning',
  testing: 'warning',
  homologation: 'default',
  production: 'success',
};

const PROJECT_STATUS_LABEL: Record<engineeringApi.EngineeringProjectStatus, string> = {
  active: 'Ativo',
  paused: 'Pausado',
  completed: 'Concluído',
  canceled: 'Cancelado',
};

const PROJECT_PRIORITY_LABEL: Record<engineeringApi.EngineeringProjectPriority, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  critical: 'Crítica',
};

const PROJECT_PRIORITY_CLASS: Record<engineeringApi.EngineeringProjectPriority, string> = {
  low: 'text-muted-foreground',
  normal: 'text-foreground',
  high: 'text-amber-600 font-semibold',
  critical: 'text-destructive font-semibold',
};

const projectSchema = z.object({
  project_code: z.string().trim().min(1, 'Informe o código do projeto.').max(20),
  name: z.string().trim().min(1, 'Informe o nome do projeto.').max(200),
  description: z.string().optional(),
  project_type: z.enum(['new_product', 'improvement', 'customization', 'research']),
  product_id: z.string().optional(),
  start_date: z.string().optional(),
  target_date: z.string().optional(),
  budget: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'critical']),
  stage: z.enum(['concept', 'design', 'prototype', 'testing', 'homologation', 'production']),
  status: z.enum(['active', 'paused', 'completed', 'canceled']),
  notes: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

const EMPTY_DEFAULTS: ProjectFormData = {
  project_code: '',
  name: '',
  description: '',
  project_type: 'new_product',
  product_id: '',
  start_date: '',
  target_date: '',
  budget: '',
  priority: 'normal',
  stage: 'concept',
  status: 'active',
  notes: '',
};

/** Aba A: Projetos de P&D (PDP) — CRUD e avanço de fase. */
export function ProjectsTab() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = React.useState<engineeringApi.EngineeringProjectStatus | ''>('');
  const [stageFilter, setStageFilter] = React.useState<engineeringApi.EngineeringProjectStage | ''>('');
  const [page, setPage] = React.useState(1);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<engineeringApi.EngineeringProject | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['engineering-projects', page, statusFilter, stageFilter],
    queryFn: () =>
      engineeringApi.listEngineeringProjects({
        page,
        limit: 20,
        status: statusFilter || undefined,
        stage: stageFilter || undefined,
      }),
  });

  const { data: products } = useQuery({
    queryKey: ['products-all-for-eng-project'],
    queryFn: () => productsApi.listProducts({ limit: 200 }),
    enabled: open,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['engineering-projects'] });

  const createMutation = useMutation({
    mutationFn: (values: ProjectFormData) =>
      engineeringApi.createEngineeringProject({
        project_code: values.project_code,
        name: values.name,
        description: values.description || undefined,
        project_type: values.project_type,
        product_id: values.product_id ? Number(values.product_id) : undefined,
        start_date: values.start_date || undefined,
        target_date: values.target_date || undefined,
        budget: values.budget !== '' && values.budget !== undefined ? Number(values.budget) : undefined,
        priority: values.priority,
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      invalidate();
      closeDialog();
    },
    onError: (error) => setFormError(extractApiErrorMessage(error, 'Não foi possível criar o projeto.')),
  });

  const updateMutation = useMutation({
    mutationFn: (values: ProjectFormData) =>
      engineeringApi.updateEngineeringProject(editing!.id, {
        project_code: values.project_code,
        name: values.name,
        description: values.description || undefined,
        project_type: values.project_type,
        product_id: values.product_id ? Number(values.product_id) : null,
        start_date: values.start_date || null,
        target_date: values.target_date || null,
        budget: values.budget !== '' && values.budget !== undefined ? Number(values.budget) : null,
        priority: values.priority,
        stage: values.stage,
        status: values.status,
        notes: values.notes || null,
      }),
    onSuccess: () => {
      invalidate();
      closeDialog();
    },
    onError: (error) => setFormError(extractApiErrorMessage(error, 'Não foi possível atualizar o projeto.')),
  });

  function closeDialog() {
    setOpen(false);
    setEditing(null);
    setFormError(null);
    reset(EMPTY_DEFAULTS);
  }

  function openCreate() {
    setEditing(null);
    reset(EMPTY_DEFAULTS);
    setFormError(null);
    setOpen(true);
  }

  function openEdit(project: engineeringApi.EngineeringProject) {
    setEditing(project);
    reset({
      project_code: project.project_code,
      name: project.name,
      description: project.description ?? '',
      project_type: project.project_type ?? 'new_product',
      product_id: project.product_id ? String(project.product_id) : '',
      start_date: project.start_date ? project.start_date.slice(0, 10) : '',
      target_date: project.target_date ? project.target_date.slice(0, 10) : '',
      budget: project.budget !== null && project.budget !== undefined ? String(project.budget) : '',
      priority: project.priority,
      stage: project.stage,
      status: project.status,
      notes: project.notes ?? '',
    });
    setFormError(null);
    setOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor="proj-status-filter" className="text-sm text-muted-foreground">
            Status
          </Label>
          <SelectNative
            id="proj-status-filter"
            className="max-w-40"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as engineeringApi.EngineeringProjectStatus | '');
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {Object.entries(PROJECT_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectNative>

          <Label htmlFor="proj-stage-filter" className="text-sm text-muted-foreground">
            Fase
          </Label>
          <SelectNative
            id="proj-stage-filter"
            className="max-w-44"
            value={stageFilter}
            onChange={(event) => {
              setStageFilter(event.target.value as engineeringApi.EngineeringProjectStage | '');
              setPage(1);
            }}
          >
            <option value="">Todas</option>
            {Object.entries(PROJECT_STAGE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectNative>
        </div>

        {canWrite && (
          <Button onClick={openCreate}>
            <Plus /> Novo projeto
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Fase</TableHead>
            <TableHead>Prazo</TableHead>
            <TableHead>Prioridade</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={canWrite ? 8 : 7} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={canWrite ? 8 : 7} className="text-center text-destructive">
                Não foi possível carregar os projetos. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((project) => (
            <TableRow key={project.id}>
              <TableCell className="font-medium">{project.project_code}</TableCell>
              <TableCell>{project.name}</TableCell>
              <TableCell>{project.project_type ? PROJECT_TYPE_LABEL[project.project_type] : '-'}</TableCell>
              <TableCell>{project.product ? `${project.product.code} — ${project.product.name}` : '-'}</TableCell>
              <TableCell>
                <Badge variant={PROJECT_STAGE_BADGE[project.stage]}>{PROJECT_STAGE_LABEL[project.stage]}</Badge>
              </TableCell>
              <TableCell>{project.target_date ? new Date(project.target_date).toLocaleDateString('pt-BR') : '-'}</TableCell>
              <TableCell className={PROJECT_PRIORITY_CLASS[project.priority]}>
                {PROJECT_PRIORITY_LABEL[project.priority]}
              </TableCell>
              {canWrite && (
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => openEdit(project)}>
                    <Pencil className="size-4" /> Editar
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={canWrite ? 8 : 7} className="text-center text-muted-foreground">
                Nenhum projeto de engenharia registrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : closeDialog())}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar projeto ${editing.project_code}` : 'Novo projeto de P&D'}</DialogTitle>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={handleSubmit((values) =>
              editing ? updateMutation.mutate(values) : createMutation.mutate(values),
            )}
            noValidate
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="project_code">Código *</Label>
                <Input id="project_code" {...register('project_code')} />
                {errors.project_code && <p className="text-sm text-destructive">{errors.project_code.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="project_type">Tipo</Label>
                <SelectNative id="project_type" {...register('project_type')}>
                  {Object.entries(PROJECT_TYPE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product_id">Produto (opcional)</Label>
                <Controller
                  control={control}
                  name="product_id"
                  render={({ field }) => (
                    <SelectNative id="product_id" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)}>
                      <option value="">Nenhum</option>
                      {products?.data.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.code} — {product.name}
                        </option>
                      ))}
                    </SelectNative>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="start_date">Data de início</Label>
                <Input id="start_date" type="date" {...register('start_date')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="target_date">Prazo alvo</Label>
                <Input id="target_date" type="date" {...register('target_date')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="budget">Orçamento</Label>
                <Input id="budget" type="number" step="any" min="0" {...register('budget')} />
              </div>
            </div>

            {editing ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="stage">Fase</Label>
                  <SelectNative id="stage" {...register('stage')}>
                    {Object.entries(PROJECT_STAGE_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </SelectNative>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="status">Status</Label>
                  <SelectNative id="status" {...register('status')}>
                    {Object.entries(PROJECT_STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </SelectNative>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="priority">Prioridade</Label>
                  <SelectNative id="priority" {...register('priority')}>
                    {Object.entries(PROJECT_PRIORITY_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </SelectNative>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="priority">Prioridade</Label>
                <SelectNative id="priority" {...register('priority')}>
                  {Object.entries(PROJECT_PRIORITY_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectNative>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Descrição</Label>
              <textarea
                id="description"
                className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register('description')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Observações</Label>
              <textarea
                id="notes"
                className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register('notes')}
              />
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
                {isSubmitting || createMutation.isPending || updateMutation.isPending
                  ? 'Salvando...'
                  : editing
                    ? 'Salvar alterações'
                    : 'Criar projeto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
