import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Plus, Target, X } from 'lucide-react';

import * as marketingApi from '@/api/marketing';
import { useAuth } from '@/context/AuthContext';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const SOURCE_LABELS: Record<marketingApi.LeadSource, string> = {
  website: 'Site',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google: 'Google',
  email: 'Email',
  event: 'Evento',
  indication: 'Indicação',
  other: 'Outro',
};

const STAGES: { status: marketingApi.LeadStatus; label: string }[] = [
  { status: 'new', label: 'Novo' },
  { status: 'contacted', label: 'Contatado' },
  { status: 'qualified', label: 'Qualificado' },
  { status: 'converted', label: 'Convertido' },
  { status: 'lost', label: 'Perdido' },
];

/** Próxima etapa do funil (mesmo mapa de `ChangeLeadStatusUseCase.VALID_TRANSITIONS`, só o "caminho feliz"). */
const NEXT_STAGE: Partial<Record<marketingApi.LeadStatus, marketingApi.LeadStatus>> = {
  new: 'contacted',
  contacted: 'qualified',
  qualified: 'converted',
};

/** Aba "Leads" de `/marketing` — funil simples (colunas por status) com CRUD cadastral. */
export function LeadsTab() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [convertingLead, setConvertingLead] = React.useState<marketingApi.Lead | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['marketing-leads'],
    queryFn: () => marketingApi.listLeads({ limit: 200 }),
  });

  const queryClient = useQueryClient();
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);

  const advanceMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: marketingApi.LeadStatus }) => marketingApi.changeLeadStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-leads'] });
      setActionError(null);
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível avançar o lead')),
  });

  const lostMutation = useMutation({
    mutationFn: (id: number) => marketingApi.changeLeadStatus(id, 'lost'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-leads'] });
      setActionError(null);
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível marcar o lead como perdido')),
  });

  const leadsByStage = React.useMemo(() => {
    const grouped: Record<marketingApi.LeadStatus, marketingApi.Lead[]> = {
      new: [], contacted: [], qualified: [], converted: [], lost: [],
    };
    for (const lead of data?.data ?? []) {
      grouped[lead.status].push(lead);
    }
    return grouped;
  }, [data]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Novo lead
          </Button>
        )}
      </div>

      {actionError && <DidacticAlert error={actionError} />}

      {isError && (
        <p className="text-center text-sm text-destructive">Não foi possível carregar os leads. Tente novamente.</p>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Carregando leads...</p>}

      {!isLoading && !isError && (
        <div className="grid gap-3 md:grid-cols-5">
          {STAGES.map((stage) => (
            <div key={stage.status} className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{stage.label}</span>
                <Badge variant="secondary">{leadsByStage[stage.status].length}</Badge>
              </div>
              <div className="flex flex-col gap-2">
                {leadsByStage[stage.status].length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">Nenhum lead</p>
                )}
                {leadsByStage[stage.status].map((lead) => (
                  <div key={lead.id} className="flex flex-col gap-1.5 rounded-md border bg-background p-2.5 text-xs shadow-sm">
                    <p className="font-medium">{lead.name}</p>
                    {lead.company && <p className="text-muted-foreground">{lead.company}</p>}
                    {lead.email && <p className="text-muted-foreground">{lead.email}</p>}
                    <div className="flex items-center gap-1.5">
                      {lead.lead_source && <Badge variant="outline">{SOURCE_LABELS[lead.lead_source]}</Badge>}
                      {lead.campaign && <Badge variant="secondary">{lead.campaign.name}</Badge>}
                    </div>
                    {canWrite && NEXT_STAGE[lead.status] && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 flex-1 gap-1 text-xs"
                          disabled={advanceMutation.isPending}
                          onClick={() => {
                            const next = NEXT_STAGE[lead.status]!;
                            if (next === 'converted') {
                              setConvertingLead(lead);
                            } else {
                              advanceMutation.mutate({ id: lead.id, status: next });
                            }
                          }}
                        >
                          <ArrowRight className="size-3" />
                          {STAGES.find((s) => s.status === NEXT_STAGE[lead.status])?.label}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                          disabled={lostMutation.isPending}
                          onClick={() => lostMutation.mutate(lead.id)}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !isError && data?.data.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
          <Target className="size-8 text-muted-foreground/50" />
          <p className="text-sm">Nenhum lead cadastrado.</p>
        </div>
      )}

      <LeadDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <ConvertLeadDialog lead={convertingLead} onClose={() => setConvertingLead(null)} />
    </div>
  );
}

const leadSchema = z.object({
  campaign_id: z.coerce.number().int().positive().optional().or(z.literal('').transform(() => undefined)),
  name: z.string().trim().min(1, 'Informe o nome.').max(200),
  email: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(20).optional(),
  company: z.string().trim().max(200).optional(),
  interest: z.string().trim().max(255).optional(),
  lead_source: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

function LeadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const { data: campaigns } = useQuery({
    queryKey: ['marketing-campaigns-select'],
    queryFn: () => marketingApi.listCampaigns({ limit: 100 }),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: { name: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: LeadFormData) => {
      const payload = {
        ...values,
        lead_source: values.lead_source ? (values.lead_source as marketingApi.LeadSource) : undefined,
      };
      return marketingApi.createLead(payload as marketingApi.CreateLeadInput);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-leads'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível salvar o lead')),
  });

  React.useEffect(() => {
    if (open) {
      reset({ name: '' });
      setFormError(null);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo lead</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-name">Nome *</Label>
            <Input id="lead-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lead-email">Email</Label>
              <Input id="lead-email" type="email" {...register('email')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lead-phone">Telefone</Label>
              <Input id="lead-phone" {...register('phone')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lead-company">Empresa</Label>
              <Input id="lead-company" {...register('company')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lead-source">Origem</Label>
              <SelectNative id="lead-source" {...register('lead_source')}>
                <option value="">-</option>
                {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectNative>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-campaign">Campanha</Label>
            <SelectNative id="lead-campaign" {...register('campaign_id')}>
              <option value="">-</option>
              {(campaigns?.data ?? []).map((campaign) => (
                <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
              ))}
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-interest">Interesse</Label>
            <Input id="lead-interest" {...register('interest')} />
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Criar lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Diálogo de conversão do lead: pede opcionalmente o `client_id` real vinculado. */
function ConvertLeadDialog({ lead, onClose }: { lead: marketingApi.Lead | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = React.useState('');
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  React.useEffect(() => {
    setCustomerId('');
    setFormError(null);
  }, [lead]);

  const mutation = useMutation({
    mutationFn: () => marketingApi.changeLeadStatus(lead!.id, 'converted', customerId ? Number(customerId) : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-leads'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível converter o lead')),
  });

  return (
    <Dialog open={Boolean(lead)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Converter lead — {lead?.name ?? ''}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Opcionalmente, informe o id do cliente real (`clients.id`) criado a partir deste lead. Pode ser deixado em
            branco e vinculado depois.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="convert-customer-id">Id do cliente (opcional)</Label>
            <Input
              id="convert-customer-id"
              type="number"
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
            />
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? 'Convertendo...' : 'Converter lead'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
