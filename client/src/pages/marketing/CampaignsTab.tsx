import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Megaphone, Plus, RefreshCw } from 'lucide-react';

import * as marketingApi from '@/api/marketing';
import { useAuth } from '@/context/AuthContext';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  BUDGET_APPROVAL_STATUS_LABELS,
  BudgetAlertBadge,
  BudgetApprovalBadge,
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_TYPE_LABELS,
  CampaignStatusBadge,
  formatCurrency,
} from './marketingShared';

/** Aba "Campanhas" de `/marketing` — CRUD, aprovação de orçamento (nível `approve`) e recálculo de métricas. */
export function CampaignsTab() {
  const { hasRole, permissions } = useAuth();
  const canWrite = hasRole('admin') || permissions?.marketing === 'operate' || permissions?.marketing === 'approve';
  const canApprove = hasRole('admin') || permissions?.marketing === 'approve';
  const [statusFilter, setStatusFilter] = React.useState<marketingApi.CampaignStatus | ''>('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingCampaign, setEditingCampaign] = React.useState<marketingApi.Campaign | null>(null);
  const [budgetCampaign, setBudgetCampaign] = React.useState<marketingApi.Campaign | null>(null);
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);

  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['marketing-campaigns', statusFilter],
    queryFn: () => marketingApi.listCampaigns({ status: statusFilter || undefined, limit: 100 }),
  });

  const recalculateMutation = useMutation({
    mutationFn: (id: number) => marketingApi.recalculateCampaignMetrics(id),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível recalcular as métricas')),
  });

  const colCount = canWrite ? 7 : 6;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="campaign-status-filter" className="text-sm text-muted-foreground">
            Status
          </Label>
          <SelectNative
            id="campaign-status-filter"
            className="max-w-48"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as marketingApi.CampaignStatus | '')}
          >
            <option value="">Todos</option>
            {Object.entries(CAMPAIGN_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SelectNative>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nova campanha
          </Button>
        )}
      </div>

      {actionError && <DidacticAlert error={actionError} />}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Período</TableHead>
            <TableHead>Orçamento (solic. / aprov.) / Custo real</TableHead>
            <TableHead>Leads / Conversões / ROI</TableHead>
            <TableHead>Status</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={colCount} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={colCount} className="text-center text-destructive">
                Não foi possível carregar as campanhas. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((campaign) => (
            <TableRow key={campaign.id}>
              <TableCell className="font-medium">{campaign.name}</TableCell>
              <TableCell>{CAMPAIGN_TYPE_LABELS[campaign.campaign_type]}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {campaign.start_date}
                {campaign.end_date ? ` – ${campaign.end_date}` : ''}
              </TableCell>
              <TableCell className="tabular-nums text-xs">
                <div className="flex flex-col gap-0.5">
                  <span>
                    {formatCurrency(campaign.budget_requested)} / {formatCurrency(campaign.budget_approved)}
                  </span>
                  <span className="text-muted-foreground">Realizado: {formatCurrency(campaign.actual_cost)}</span>
                  <div className="flex flex-wrap gap-1">
                    <BudgetApprovalBadge status={campaign.budget_approval_status} />
                    <BudgetAlertBadge level={campaign.budget_alert_level} />
                  </div>
                </div>
              </TableCell>
              <TableCell className="tabular-nums text-xs">
                {campaign.leads_generated} / {campaign.conversions} / {campaign.roi ?? '-'}
              </TableCell>
              <TableCell>
                <CampaignStatusBadge status={campaign.status} />
              </TableCell>
              {canWrite && (
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setEditingCampaign(campaign)}>
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={recalculateMutation.isPending}
                      onClick={() => recalculateMutation.mutate(campaign.id)}
                      title="Recalcular leads/conversões/ROI a partir dos vínculos reais"
                    >
                      <RefreshCw className="size-3.5" />
                    </Button>
                    {canApprove && campaign.budget_approval_status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => setBudgetCampaign(campaign)}>
                        Aprovar orçamento
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={colCount} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Megaphone className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhuma campanha cadastrada.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <CampaignDialog mode="create" open={createOpen} campaign={null} onClose={() => setCreateOpen(false)} />
      <CampaignDialog mode="edit" open={Boolean(editingCampaign)} campaign={editingCampaign} onClose={() => setEditingCampaign(null)} />
      <BudgetDecisionDialog campaign={budgetCampaign} onClose={() => setBudgetCampaign(null)} />
    </div>
  );
}

const campaignSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.').max(200),
  description: z.string().trim().max(5000).optional(),
  campaign_type: z.enum(['ads', 'social', 'email', 'event', 'trade', 'content']),
  start_date: z.string().trim().min(1, 'Informe a data de início.'),
  end_date: z.string().trim().optional(),
  budget_requested: z.coerce.number().min(0).optional().or(z.literal('').transform(() => undefined)),
  actual_cost: z.coerce.number().min(0).optional().or(z.literal('').transform(() => undefined)),
  target_audience: z.string().trim().max(255).optional(),
  channel: z.string().trim().max(100).optional(),
  status: z.enum(['planned', 'active', 'paused', 'completed', 'canceled']).default('planned'),
  notes: z.string().trim().max(5000).optional(),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

function CampaignDialog({
  mode,
  open,
  campaign,
  onClose,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  campaign: marketingApi.Campaign | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  /** RF-MKT-034: pós `completed`/`canceled`, só `notes` é editável — demais campos ficam somente leitura. */
  const isLocked = mode === 'edit' && (campaign?.status === 'completed' || campaign?.status === 'canceled');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { name: '', campaign_type: 'social', start_date: '', status: 'planned' },
  });

  const mutation = useMutation({
    mutationFn: (values: CampaignFormData) => {
      if (mode === 'create') {
        return marketingApi.createCampaign(values as marketingApi.CreateCampaignInput);
      }
      if (isLocked) {
        return marketingApi.updateCampaign(campaign!.id, { notes: values.notes ?? null });
      }
      return marketingApi.updateCampaign(campaign!.id, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível salvar a campanha')),
  });

  React.useEffect(() => {
    if (open) {
      if (mode === 'edit' && campaign) {
        reset({
          name: campaign.name,
          description: campaign.description ?? '',
          campaign_type: campaign.campaign_type,
          start_date: campaign.start_date,
          end_date: campaign.end_date ?? '',
          budget_requested: campaign.budget_requested ? Number(campaign.budget_requested) : undefined,
          actual_cost: campaign.actual_cost ? Number(campaign.actual_cost) : undefined,
          target_audience: campaign.target_audience ?? '',
          channel: campaign.channel ?? '',
          status: campaign.status,
          notes: campaign.notes ?? '',
        });
      } else {
        reset({ name: '', campaign_type: 'social', start_date: '', status: 'planned' });
      }
      setFormError(null);
    }
  }, [open, mode, campaign, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nova campanha' : `Editar campanha — ${campaign?.name ?? ''}`}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          {isLocked && (
            <p className="text-xs text-muted-foreground">
              Campanha {campaign?.status === 'completed' ? 'concluída' : 'cancelada'} — apenas observações podem ser editadas.
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="campaign-name">Nome *</Label>
            <Input id="campaign-name" disabled={isLocked} {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campaign-type">Tipo *</Label>
              <SelectNative id="campaign-type" disabled={isLocked} {...register('campaign_type')}>
                {Object.entries(CAMPAIGN_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campaign-status">Status</Label>
              <SelectNative id="campaign-status" disabled={isLocked} {...register('status')}>
                <option value="planned">Planejada</option>
                <option value="active">Ativa</option>
                <option value="paused">Pausada</option>
                <option value="completed">Concluída</option>
                <option value="canceled">Cancelada</option>
              </SelectNative>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campaign-start">Início *</Label>
              <Input id="campaign-start" type="date" disabled={isLocked} {...register('start_date')} />
              {errors.start_date && <p className="text-sm text-destructive">{errors.start_date.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campaign-end">Fim</Label>
              <Input id="campaign-end" type="date" disabled={isLocked} {...register('end_date')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campaign-budget-requested">Orçamento solicitado (R$)</Label>
              <Input id="campaign-budget-requested" type="number" step="0.01" disabled={isLocked} {...register('budget_requested')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campaign-actual-cost">Custo real (R$)</Label>
              <Input id="campaign-actual-cost" type="number" step="0.01" disabled={isLocked} {...register('actual_cost')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campaign-audience">Público-alvo</Label>
              <Input id="campaign-audience" disabled={isLocked} {...register('target_audience')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campaign-channel">Canal</Label>
              <Input id="campaign-channel" placeholder="Ex.: Instagram, Google Ads" disabled={isLocked} {...register('channel')} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="campaign-description">Descrição</Label>
            <Input id="campaign-description" disabled={isLocked} {...register('description')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="campaign-notes">Observações {isLocked && '(único campo editável)'}</Label>
            <Input id="campaign-notes" {...register('notes')} />
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : mode === 'create' ? 'Criar campanha' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BudgetDecisionDialog({ campaign, onClose }: { campaign: marketingApi.Campaign | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [decision, setDecision] = React.useState<'approved' | 'rejected'>('approved');
  const [budgetApproved, setBudgetApproved] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  React.useEffect(() => {
    setDecision('approved');
    setBudgetApproved(campaign?.budget_requested ? String(campaign.budget_requested) : '');
    setReason('');
    setFormError(null);
  }, [campaign]);

  const mutation = useMutation({
    mutationFn: () =>
      marketingApi.decideCampaignBudget(campaign!.id, {
        decision,
        budget_approved: decision === 'approved' ? Number(budgetApproved) : undefined,
        reason: reason || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível registrar a decisão de orçamento')),
  });

  return (
    <Dialog open={Boolean(campaign)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Orçamento — {campaign?.name ?? ''}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Solicitado: {formatCurrency(campaign?.budget_requested)}. Status atual: {campaign ? BUDGET_APPROVAL_STATUS_LABELS[campaign.budget_approval_status] : '-'}.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget-decision">Decisão</Label>
            <SelectNative id="budget-decision" value={decision} onChange={(e) => setDecision(e.target.value as 'approved' | 'rejected')}>
              <option value="approved">Aprovar</option>
              <option value="rejected">Rejeitar</option>
            </SelectNative>
          </div>
          {decision === 'approved' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="budget-approved-value">Orçamento aprovado (R$) *</Label>
              <Input id="budget-approved-value" type="number" step="0.01" value={budgetApproved} onChange={(e) => setBudgetApproved(e.target.value)} />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget-decision-reason">Justificativa {decision === 'rejected' && '(recomendada)'}</Label>
            <Input id="budget-decision-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={mutation.isPending || (decision === 'approved' && !budgetApproved)}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? 'Salvando...' : 'Confirmar decisão'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
