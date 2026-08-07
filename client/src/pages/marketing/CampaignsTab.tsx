import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Megaphone, Plus } from 'lucide-react';

import * as marketingApi from '@/api/marketing';
import { useAuth } from '@/context/AuthContext';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const TYPE_LABELS: Record<marketingApi.CampaignType, string> = {
  ads: 'Mídia paga (Ads)',
  social: 'Redes sociais',
  email: 'Email marketing',
  event: 'Evento/Feira',
  trade: 'Trade marketing',
  content: 'Conteúdo',
};

const STATUS_LABELS: Record<marketingApi.CampaignStatus, string> = {
  planned: 'Planejada',
  active: 'Ativa',
  paused: 'Pausada',
  completed: 'Concluída',
  canceled: 'Cancelada',
};

const STATUS_VARIANT: Record<marketingApi.CampaignStatus, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  planned: 'secondary',
  active: 'success',
  paused: 'warning',
  completed: 'secondary',
  canceled: 'destructive',
};

/** Aba "Campanhas" de `/marketing` — CRUD de campanhas de marketing. */
export function CampaignsTab() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const [statusFilter, setStatusFilter] = React.useState<marketingApi.CampaignStatus | ''>('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingCampaign, setEditingCampaign] = React.useState<marketingApi.Campaign | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['marketing-campaigns', statusFilter],
    queryFn: () => marketingApi.listCampaigns({ status: statusFilter || undefined, limit: 100 }),
  });

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
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Período</TableHead>
            <TableHead>Orçamento / Custo real</TableHead>
            <TableHead>Leads / Conversões</TableHead>
            <TableHead>Status</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={canWrite ? 7 : 6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={canWrite ? 7 : 6} className="text-center text-destructive">
                Não foi possível carregar as campanhas. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((campaign) => (
            <TableRow key={campaign.id}>
              <TableCell className="font-medium">{campaign.name}</TableCell>
              <TableCell>{TYPE_LABELS[campaign.campaign_type]}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {campaign.start_date}
                {campaign.end_date ? ` – ${campaign.end_date}` : ''}
              </TableCell>
              <TableCell className="tabular-nums text-xs">
                {campaign.budget ? `R$ ${Number(campaign.budget).toFixed(2)}` : '-'}
                {' / '}
                R$ {Number(campaign.actual_cost).toFixed(2)}
              </TableCell>
              <TableCell className="tabular-nums text-xs">
                {campaign.leads_generated} / {campaign.conversions}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[campaign.status]}>{STATUS_LABELS[campaign.status]}</Badge>
              </TableCell>
              {canWrite && (
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => setEditingCampaign(campaign)}>
                    Editar
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={canWrite ? 7 : 6} className="py-10 text-center">
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
    </div>
  );
}

const campaignSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.').max(200),
  description: z.string().trim().max(5000).optional(),
  campaign_type: z.enum(['ads', 'social', 'email', 'event', 'trade', 'content']),
  start_date: z.string().trim().min(1, 'Informe a data de início.'),
  end_date: z.string().trim().optional(),
  budget: z.coerce.number().min(0).optional().or(z.literal('').transform(() => undefined)),
  actual_cost: z.coerce.number().min(0).optional().or(z.literal('').transform(() => undefined)),
  target_audience: z.string().trim().max(255).optional(),
  channel: z.string().trim().max(100).optional(),
  status: z.enum(['planned', 'active', 'paused', 'completed', 'canceled']).default('planned'),
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
    mutationFn: (values: CampaignFormData) =>
      mode === 'create'
        ? marketingApi.createCampaign(values as marketingApi.CreateCampaignInput)
        : marketingApi.updateCampaign(campaign!.id, values),
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
          budget: campaign.budget ? Number(campaign.budget) : undefined,
          actual_cost: campaign.actual_cost ? Number(campaign.actual_cost) : undefined,
          target_audience: campaign.target_audience ?? '',
          channel: campaign.channel ?? '',
          status: campaign.status,
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="campaign-name">Nome *</Label>
            <Input id="campaign-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campaign-type">Tipo *</Label>
              <SelectNative id="campaign-type" {...register('campaign_type')}>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campaign-status">Status</Label>
              <SelectNative id="campaign-status" {...register('status')}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectNative>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campaign-start">Início *</Label>
              <Input id="campaign-start" type="date" {...register('start_date')} />
              {errors.start_date && <p className="text-sm text-destructive">{errors.start_date.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campaign-end">Fim</Label>
              <Input id="campaign-end" type="date" {...register('end_date')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campaign-budget">Orçamento (R$)</Label>
              <Input id="campaign-budget" type="number" step="0.01" {...register('budget')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campaign-actual-cost">Custo real (R$)</Label>
              <Input id="campaign-actual-cost" type="number" step="0.01" {...register('actual_cost')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campaign-audience">Público-alvo</Label>
              <Input id="campaign-audience" {...register('target_audience')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campaign-channel">Canal</Label>
              <Input id="campaign-channel" placeholder="Ex.: Instagram, Google Ads" {...register('channel')} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="campaign-description">Descrição</Label>
            <Input id="campaign-description" {...register('description')} />
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
