import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Lightbulb, Plus } from 'lucide-react';

import * as legalApi from '@/api/legal';
import { useAuth } from '@/context/AuthContext';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Textarea } from '@/components/Textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const TYPE_LABELS: Record<legalApi.IntellectualPropertyType, string> = {
  trademark: 'Marca',
  patent: 'Patente',
  industrial_design: 'Desenho industrial',
  copyright: 'Direito autoral',
  trade_secret: 'Segredo industrial',
};

const STATUS_LABELS: Record<legalApi.IntellectualPropertyStatus, string> = {
  filed: 'Depositado',
  examined: 'Em análise',
  granted: 'Concedido',
  expired: 'Vencido',
  abandoned: 'Abandonado',
};

const STATUS_VARIANT: Record<legalApi.IntellectualPropertyStatus, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  filed: 'secondary',
  examined: 'warning',
  granted: 'success',
  expired: 'destructive',
  abandoned: 'destructive',
};

/** Aba "Propriedade Intelectual" de `/legal` — CRUD de marcas, patentes, desenhos industriais, direitos autorais e segredos industriais. */
export function IntellectualPropertyTab() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const [typeFilter, setTypeFilter] = React.useState<legalApi.IntellectualPropertyType | ''>('');
  const [statusFilter, setStatusFilter] = React.useState<legalApi.IntellectualPropertyStatus | ''>('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingIp, setEditingIp] = React.useState<legalApi.IntellectualProperty | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['legal-intellectual-property', typeFilter, statusFilter],
    queryFn: () => legalApi.listIntellectualProperty({ ip_type: typeFilter || undefined, status: statusFilter || undefined, limit: 100 }),
  });

  const { data: expiring } = useQuery({
    queryKey: ['legal-intellectual-property-expiring'],
    queryFn: () => legalApi.listExpiringIntellectualProperty(30),
  });

  return (
    <div className="flex flex-col gap-4">
      {Boolean(expiring?.length) && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p className="text-sm">
            <strong>{expiring!.length}</strong> ativo(s) de propriedade intelectual vencendo nos próximos 30 dias (ou já vencidos e ainda não abandonados) — verifique renovação junto ao INPI/órgão competente.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ip-type-filter" className="text-sm text-muted-foreground">
              Tipo
            </Label>
            <SelectNative
              id="ip-type-filter"
              className="max-w-48"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as legalApi.IntellectualPropertyType | '')}
            >
              <option value="">Todos</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ip-status-filter" className="text-sm text-muted-foreground">
              Status
            </Label>
            <SelectNative
              id="ip-status-filter"
              className="max-w-48"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as legalApi.IntellectualPropertyStatus | '')}
            >
              <option value="">Todos</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </SelectNative>
          </div>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Novo ativo de PI
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Nº de registro</TableHead>
            <TableHead>Titular</TableHead>
            <TableHead>Expiração</TableHead>
            <TableHead>Status</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={canWrite ? 7 : 6} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={canWrite ? 7 : 6} className="text-center text-destructive">
                Não foi possível carregar os ativos de propriedade intelectual. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((ip) => (
            <TableRow key={ip.id}>
              <TableCell className="font-medium">{ip.title}</TableCell>
              <TableCell className="text-xs">{TYPE_LABELS[ip.ip_type]}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{ip.registration_number || '-'}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{ip.owner}</TableCell>
              <TableCell className="text-xs">{ip.expiration_date || '-'}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[ip.status]}>{STATUS_LABELS[ip.status]}</Badge>
              </TableCell>
              {canWrite && (
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => setEditingIp(ip)}>
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
                  <Lightbulb className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum ativo de propriedade intelectual cadastrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <IntellectualPropertyDialog mode="create" open={createOpen} ip={null} onClose={() => setCreateOpen(false)} />
      <IntellectualPropertyDialog mode="edit" open={Boolean(editingIp)} ip={editingIp} onClose={() => setEditingIp(null)} />
    </div>
  );
}

const ipSchema = z.object({
  ip_type: z.enum(['trademark', 'patent', 'industrial_design', 'copyright', 'trade_secret']),
  title: z.string().trim().min(1, 'Informe o título.').max(200),
  description: z.string().trim().max(5000).optional(),
  registration_number: z.string().trim().max(50).optional(),
  filing_date: z.string().trim().optional(),
  grant_date: z.string().trim().optional(),
  expiration_date: z.string().trim().optional(),
  owner: z.string().trim().max(200).optional(),
  status: z.enum(['filed', 'examined', 'granted', 'expired', 'abandoned']).default('filed'),
  jurisdiction: z.string().trim().max(50).optional(),
});

type IpFormData = z.infer<typeof ipSchema>;

function IntellectualPropertyDialog({
  mode,
  open,
  ip,
  onClose,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  ip: legalApi.IntellectualProperty | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IpFormData>({
    resolver: zodResolver(ipSchema),
    defaultValues: { ip_type: 'trademark', title: '', owner: 'EVOK ÁUDIO LTDA', status: 'filed', jurisdiction: 'BR' },
  });

  const mutation = useMutation({
    mutationFn: (values: IpFormData) =>
      mode === 'create'
        ? legalApi.createIntellectualProperty(values as legalApi.CreateIntellectualPropertyInput)
        : legalApi.updateIntellectualProperty(ip!.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-intellectual-property'] });
      queryClient.invalidateQueries({ queryKey: ['legal-intellectual-property-expiring'] });
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível salvar o ativo de propriedade intelectual')),
  });

  React.useEffect(() => {
    if (open) {
      if (mode === 'edit' && ip) {
        reset({
          ip_type: ip.ip_type,
          title: ip.title,
          description: ip.description ?? '',
          registration_number: ip.registration_number ?? '',
          filing_date: ip.filing_date ?? '',
          grant_date: ip.grant_date ?? '',
          expiration_date: ip.expiration_date ?? '',
          owner: ip.owner,
          status: ip.status,
          jurisdiction: ip.jurisdiction,
        });
      } else {
        reset({ ip_type: 'trademark', title: '', owner: 'EVOK ÁUDIO LTDA', status: 'filed', jurisdiction: 'BR' });
      }
      setFormError(null);
    }
  }, [open, mode, ip, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo ativo de PI' : `Editar ativo de PI — ${ip?.title ?? ''}`}</DialogTitle>
        </DialogHeader>
        <form className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ip-type">Tipo *</Label>
              <SelectNative id="ip-type" {...register('ip_type')}>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ip-status">Status</Label>
              <SelectNative id="ip-status" {...register('status')}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectNative>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ip-title">Título *</Label>
            <Input id="ip-title" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ip-description">Descrição</Label>
            <Textarea id="ip-description" rows={2} {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ip-registration-number">Nº de registro</Label>
              <Input id="ip-registration-number" {...register('registration_number')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ip-jurisdiction">Jurisdição</Label>
              <Input id="ip-jurisdiction" placeholder="BR" {...register('jurisdiction')} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ip-filing-date">Depósito</Label>
              <Input id="ip-filing-date" type="date" {...register('filing_date')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ip-grant-date">Concessão</Label>
              <Input id="ip-grant-date" type="date" {...register('grant_date')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ip-expiration-date">Expiração</Label>
              <Input id="ip-expiration-date" type="date" {...register('expiration_date')} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ip-owner">Titular</Label>
            <Input id="ip-owner" {...register('owner')} />
          </div>

          {formError && <DidacticAlert error={formError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : mode === 'create' ? 'Criar ativo' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
