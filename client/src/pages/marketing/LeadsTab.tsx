import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, ArrowRight, ListChecks, Plus, Target, UserCheck, X } from 'lucide-react';

import * as marketingApi from '@/api/marketing';
import * as clientsApi from '@/api/clients';
import * as usersApi from '@/api/users';
import { useAuth } from '@/context/AuthContext';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LEAD_SOURCE_LABELS } from './marketingShared';

const STAGES: { status: marketingApi.LeadStatus; label: string }[] = [
  { status: 'new', label: 'Novo' },
  { status: 'contacted', label: 'Contatado' },
  { status: 'qualified', label: 'Qualificado' },
  { status: 'in_sales_attendance', label: 'Em atendimento' },
  { status: 'converted', label: 'Convertido' },
  { status: 'lost', label: 'Perdido' },
];

/** Próxima etapa "caminho feliz" do funil corrigido (RF-MKT-005) — `converted` nunca é alcançado por aqui, sempre via `convertLead`. */
const NEXT_STAGE: Partial<Record<marketingApi.LeadStatus, marketingApi.ChangeableLeadStatus>> = {
  new: 'contacted',
  contacted: 'qualified',
};

/** Aba "Leads" de `/marketing` — funil (RF-MKT-005), handoff com SLA (UC-64), conversão atômica (UC-63) e captação em lote. */
export function LeadsTab() {
  const { hasRole, permissions } = useAuth();
  const canWrite = hasRole('admin') || permissions?.marketing === 'operate' || permissions?.marketing === 'approve';
  const [createOpen, setCreateOpen] = React.useState(false);
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [slaOnly, setSlaOnly] = React.useState(false);
  const [handoffLead, setHandoffLead] = React.useState<marketingApi.Lead | null>(null);
  const [convertingLead, setConvertingLead] = React.useState<marketingApi.Lead | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['marketing-leads', slaOnly],
    queryFn: () => marketingApi.listLeads({ limit: 200, sla_breached: slaOnly || undefined }),
  });

  const queryClient = useQueryClient();
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);

  const invalidateLeads = () => queryClient.invalidateQueries({ queryKey: ['marketing-leads'] });

  const advanceMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: marketingApi.ChangeableLeadStatus }) => marketingApi.changeLeadStatus(id, { status }),
    onSuccess: () => {
      invalidateLeads();
      setActionError(null);
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível avançar o lead')),
  });

  const lostMutation = useMutation({
    mutationFn: (id: number) => marketingApi.changeLeadStatus(id, { status: 'lost' }),
    onSuccess: () => {
      invalidateLeads();
      setActionError(null);
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível marcar o lead como perdido')),
  });

  const leadsByStage = React.useMemo(() => {
    const grouped: Record<marketingApi.LeadStatus, marketingApi.Lead[]> = {
      new: [], contacted: [], qualified: [], in_sales_attendance: [], converted: [], lost: [],
    };
    for (const lead of data?.data ?? []) {
      grouped[lead.status].push(lead);
    }
    return grouped;
  }, [data]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={slaOnly} onChange={(e) => setSlaOnly(e.target.checked)} />
          Mostrar só leads com SLA de handoff vencido
        </label>
        {canWrite && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setBulkOpen(true)}>
              <ListChecks className="size-4" />
              Captação em lote
            </Button>
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Novo lead
            </Button>
          </div>
        )}
      </div>

      {actionError && <DidacticAlert error={actionError} />}

      {isError && (
        <p className="text-center text-sm text-destructive">Não foi possível carregar os leads. Tente novamente.</p>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Carregando leads...</p>}

      {!isLoading && !isError && (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
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
                  <div
                    key={lead.id}
                    className={`flex flex-col gap-1.5 rounded-md border bg-background p-2.5 text-xs shadow-sm ${lead.needs_review ? 'border-destructive/60' : ''}`}
                  >
                    {lead.needs_review && (
                      <div className="flex items-center gap-1 text-destructive">
                        <AlertTriangle className="size-3" />
                        <span className="font-medium">Revisar dado (saneamento pendente)</span>
                      </div>
                    )}
                    <p className="font-medium">{lead.name}</p>
                    {lead.company && <p className="text-muted-foreground">{lead.company}</p>}
                    {lead.email && <p className="text-muted-foreground">{lead.email}</p>}
                    {lead.phone && <p className="text-muted-foreground">{lead.phone}</p>}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {lead.lead_source && <Badge variant="outline">{LEAD_SOURCE_LABELS[lead.lead_source]}</Badge>}
                      {lead.campaign && <Badge variant="secondary">{lead.campaign.name}</Badge>}
                      {lead.event && <Badge variant="secondary">{lead.event.name}</Badge>}
                      {lead.sales_owner_user_id && (
                        <Badge variant="outline">
                          <UserCheck className="size-3" />
                          Vendedor #{lead.sales_owner_user_id}
                        </Badge>
                      )}
                    </div>
                    {canWrite && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {NEXT_STAGE[lead.status] && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 text-xs"
                            disabled={advanceMutation.isPending}
                            onClick={() => advanceMutation.mutate({ id: lead.id, status: NEXT_STAGE[lead.status]! })}
                          >
                            <ArrowRight className="size-3" />
                            {STAGES.find((s) => s.status === NEXT_STAGE[lead.status])?.label}
                          </Button>
                        )}
                        {lead.status === 'qualified' && !lead.sales_owner_user_id && (
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setHandoffLead(lead)}>
                            <UserCheck className="size-3" />
                            Atribuir vendedor
                          </Button>
                        )}
                        {lead.status === 'qualified' && lead.sales_owner_user_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 text-xs"
                            disabled={advanceMutation.isPending}
                            onClick={() => advanceMutation.mutate({ id: lead.id, status: 'in_sales_attendance' })}
                          >
                            <ArrowRight className="size-3" />
                            Em atendimento
                          </Button>
                        )}
                        {lead.status === 'in_sales_attendance' && (
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setConvertingLead(lead)}>
                            <ArrowRight className="size-3" />
                            Converter
                          </Button>
                        )}
                        {(lead.status === 'qualified' || lead.status === 'in_sales_attendance') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                            disabled={lostMutation.isPending}
                            onClick={() => lostMutation.mutate(lead.id)}
                          >
                            <X className="size-3" />
                          </Button>
                        )}
                        {(lead.status === 'new' || lead.status === 'contacted') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                            disabled={lostMutation.isPending}
                            onClick={() => lostMutation.mutate(lead.id)}
                          >
                            <X className="size-3" />
                          </Button>
                        )}
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
      <BulkCreateLeadsDialog open={bulkOpen} onClose={() => setBulkOpen(false)} />
      <HandoffLeadDialog lead={handoffLead} onClose={() => setHandoffLead(null)} />
      <ConvertLeadDialog lead={convertingLead} onClose={() => setConvertingLead(null)} />
    </div>
  );
}

const leadSchema = z
  .object({
    campaign_id: z.coerce.number().int().positive().optional().or(z.literal('').transform(() => undefined)),
    event_id: z.coerce.number().int().positive().optional().or(z.literal('').transform(() => undefined)),
    name: z.string().trim().min(1, 'Informe o nome.').max(200),
    email: z.string().trim().email('Email inválido.').max(100).optional().or(z.literal('').transform(() => undefined)),
    phone: z.string().trim().max(20).optional().or(z.literal('').transform(() => undefined)),
    company: z.string().trim().max(200).optional(),
    interest: z.string().trim().max(255).optional(),
    lead_source: z.enum(['website', 'instagram', 'facebook', 'google', 'email', 'event', 'indication', 'other'], {
      message: 'Informe a origem do lead.',
    }),
    consent_given: z.boolean().optional(),
    consent_channel: z.enum(['formulario_site', 'whatsapp', 'telefone', 'feira', 'indicacao', 'outro']).optional(),
  })
  .refine((data) => Boolean(data.email) || Boolean(data.phone), {
    message: 'Informe email ou telefone.',
    path: ['email'],
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
    defaultValues: { name: '', lead_source: 'website' },
  });

  const mutation = useMutation({
    mutationFn: (values: LeadFormData) => marketingApi.createLead(values as marketingApi.CreateLeadInput),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-leads'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível salvar o lead')),
  });

  React.useEffect(() => {
    if (open) {
      reset({ name: '', lead_source: 'website' });
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
              <Label htmlFor="lead-email">Email {!errors.phone && '*'}</Label>
              <Input id="lead-email" type="email" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
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
              <Label htmlFor="lead-source">Origem *</Label>
              <SelectNative id="lead-source" {...register('lead_source')}>
                {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
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
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('consent_given')} />
            Consentimento LGPD registrado
          </label>

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

/** Captação em lote (RF-MKT-019) — item a item, edição em textarea simples (`nome; email; telefone`), processamento parcial. */
function BulkCreateLeadsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [eventId, setEventId] = React.useState('');
  const [rawText, setRawText] = React.useState('');
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const [result, setResult] = React.useState<marketingApi.BulkCreateLeadsResult | null>(null);

  const { data: events } = useQuery({
    queryKey: ['marketing-events-select'],
    queryFn: () => marketingApi.listEvents({ limit: 100 }),
    enabled: open,
  });

  React.useEffect(() => {
    if (open) {
      setEventId('');
      setRawText('');
      setFormError(null);
      setResult(null);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => {
      const leads = rawText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [name, email, phone] = line.split(';').map((part) => part.trim());
          return { name, email: email || undefined, phone: phone || undefined };
        });
      return marketingApi.bulkCreateLeads({ event_id: eventId ? Number(eventId) : undefined, leads });
    },
    onSuccess: (data) => {
      setResult(data);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['marketing-leads'] });
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível processar a captação em lote')),
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Captação em lote</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            Uma linha por lead: <code>nome; email; telefone</code> (email ou telefone obrigatório). Itens inválidos são
            reportados individualmente — não é tudo ou nada.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bulk-event">Evento (opcional, aplicado a todo item sem `event_id` próprio)</Label>
            <SelectNative id="bulk-event" value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">-</option>
              {(events?.data ?? []).map((event) => (
                <option key={event.id} value={event.id}>{event.name}</option>
              ))}
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bulk-leads-text">Leads</Label>
            <textarea
              id="bulk-leads-text"
              rows={6}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder={'Maria Silva; maria@exemplo.com; 11988887777\nJoão Souza; ; 11999998888'}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
          </div>

          {formError && <DidacticAlert error={formError} />}

          {result && (
            <div className="flex flex-col gap-1 rounded-md border p-2 text-xs">
              <p className="font-medium text-success">{result.created.length} criado(s)</p>
              {result.rejected.length > 0 && (
                <div className="text-destructive">
                  <p className="font-medium">{result.rejected.length} rejeitado(s):</p>
                  <ul className="list-disc pl-4">
                    {result.rejected.map((r) => (
                      <li key={r.index}>Linha {r.index + 1}: {r.error.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Button type="button" disabled={!rawText.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? 'Processando...' : 'Processar lote'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Handoff Marketing → Vendas (UC-64) — atribui `sales_owner_user_id`, exigido para avançar a `in_sales_attendance`. */
function HandoffLeadDialog({ lead, onClose }: { lead: marketingApi.Lead | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [selectedUserId, setSelectedUserId] = React.useState('');
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const { data: users } = useQuery({
    queryKey: ['users-select-marketing', search],
    queryFn: () => usersApi.listUsers({ search: search || undefined, limit: 20, active: true }),
    enabled: Boolean(lead),
  });

  React.useEffect(() => {
    setSearch('');
    setSelectedUserId('');
    setFormError(null);
  }, [lead]);

  const mutation = useMutation({
    mutationFn: () => marketingApi.handoffLead(lead!.id, Number(selectedUserId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-leads'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível atribuir o vendedor')),
  });

  return (
    <Dialog open={Boolean(lead)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atribuir vendedor — {lead?.name ?? ''}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input placeholder="Buscar usuário..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <SelectNative value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
            <option value="">Selecione o vendedor</option>
            {(users?.data ?? []).map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </SelectNative>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" disabled={!selectedUserId || mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? 'Atribuindo...' : 'Atribuir'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Conversão atômica lead → cliente (UC-63) — cliente existente (busca por nome/CPF-CNPJ) ou cliente novo. */
function ConvertLeadDialog({ lead, onClose }: { lead: marketingApi.Lead | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = React.useState<'existing' | 'new'>('existing');
  const [search, setSearch] = React.useState('');
  const [selectedClientId, setSelectedClientId] = React.useState('');
  const [newClient, setNewClient] = React.useState({ name: '', cpf_cnpj: '', phone: '', email: '', city: '', state: '' });
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const { data: clients } = useQuery({
    queryKey: ['clients-select-marketing', search],
    queryFn: () => clientsApi.listClients({ search: search || undefined, limit: 20 }),
    enabled: Boolean(lead) && mode === 'existing',
  });

  React.useEffect(() => {
    setMode('existing');
    setSearch('');
    setSelectedClientId('');
    setNewClient({ name: lead?.name ?? '', cpf_cnpj: '', phone: lead?.phone ?? '', email: lead?.email ?? '', city: '', state: '' });
    setFormError(null);
  }, [lead]);

  const mutation = useMutation({
    mutationFn: () =>
      marketingApi.convertLead(lead!.id, mode === 'existing' ? { client_id: Number(selectedClientId) } : { new_client: newClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-leads'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível converter o lead')),
  });

  const canSubmit = mode === 'existing' ? Boolean(selectedClientId) : Boolean(newClient.name.trim() && newClient.cpf_cnpj.trim());

  return (
    <Dialog open={Boolean(lead)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Converter lead — {lead?.name ?? ''}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={mode === 'existing' ? 'default' : 'outline'} onClick={() => setMode('existing')}>
              Cliente existente
            </Button>
            <Button type="button" size="sm" variant={mode === 'new' ? 'default' : 'outline'} onClick={() => setMode('new')}>
              Criar cliente novo
            </Button>
          </div>

          {mode === 'existing' && (
            <div className="flex flex-col gap-2">
              <Input placeholder="Buscar por nome/CPF-CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <SelectNative value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
                <option value="">Selecione o cliente</option>
                {(clients?.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.cpf_cnpj}</option>
                ))}
              </SelectNative>
            </div>
          )}

          {mode === 'new' && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-client-name">Nome *</Label>
                <Input id="new-client-name" value={newClient.name} onChange={(e) => setNewClient((c) => ({ ...c, name: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-client-doc">CPF/CNPJ *</Label>
                <Input id="new-client-doc" value={newClient.cpf_cnpj} onChange={(e) => setNewClient((c) => ({ ...c, cpf_cnpj: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Telefone" value={newClient.phone} onChange={(e) => setNewClient((c) => ({ ...c, phone: e.target.value }))} />
                <Input placeholder="Email" value={newClient.email} onChange={(e) => setNewClient((c) => ({ ...c, email: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Cidade" value={newClient.city} onChange={(e) => setNewClient((c) => ({ ...c, city: e.target.value }))} />
                <Input placeholder="UF" maxLength={2} value={newClient.state} onChange={(e) => setNewClient((c) => ({ ...c, state: e.target.value }))} />
              </div>
            </div>
          )}

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? 'Convertendo...' : 'Converter lead'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
