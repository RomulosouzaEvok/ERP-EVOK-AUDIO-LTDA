import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Users } from 'lucide-react';

import * as sstApi from '@/api/sst';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/Textarea';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatDate, toDateInputValue } from './sstShared';

/** Selo de ícone verde padrão dos cards de KPI/resumo do módulo (ver DashboardPage). */
function IconBadge({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
      <Icon className="size-4" />
    </div>
  );
}

/**
 * Aba CIPA (NR-5, CF/88): dimensionamento, mandatos vigentes e reuniões
 * (com ata obrigatória). Mandato/membros/processo eleitoral são exibidos
 * apenas em leitura nesta passada — criação de mandato/eleição fica para o
 * próximo incremento (ver Handoff).
 */
export function CipaTab() {
  const [newMeetingOpen, setNewMeetingOpen] = React.useState(false);

  const { data: dimensioning } = useQuery({
    queryKey: ['sst-cipa-dimensioning'],
    queryFn: sstApi.getCipaDimensioning,
  });

  const { data: mandates, isLoading: isMandatesLoading, isError: isMandatesError } = useQuery({
    queryKey: ['sst-cipa-mandates'],
    queryFn: sstApi.listCipaMandates,
  });

  const { data: meetings, isLoading: isMeetingsLoading, isError: isMeetingsError } = useQuery({
    queryKey: ['sst-cipa-meetings'],
    queryFn: () => sstApi.listCipaMeetings(),
  });

  return (
    <div className="flex flex-col gap-4">
      <Card className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <IconBadge icon={Users} />
          <div>
            <CardTitle className="text-base">Dimensionamento atual</CardTitle>
            <CardDescription>Calculado a partir do headcount ativo e enquadramento CNAE (NR-5, Quadro I).</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6">
          <div>
            <p className="text-2xl font-semibold tabular-nums">{dimensioning?.headcount_ativo ?? '-'}</p>
            <p className="text-xs text-muted-foreground">Headcount ativo</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">{dimensioning?.titulares ?? '-'}</p>
            <p className="text-xs text-muted-foreground">Titulares exigidos</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">{dimensioning?.suplentes ?? '-'}</p>
            <p className="text-xs text-muted-foreground">Suplentes exigidos</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mandatos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead className="text-right">Membros</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isMandatesLoading && <TableSkeletonRows columns={3} />}
              {isMandatesError && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-destructive">
                    Não foi possível carregar os mandatos da CIPA.
                  </TableCell>
                </TableRow>
              )}
              {mandates?.map((mandate) => (
                <TableRow
                  key={mandate.id}
                  className="border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5"
                >
                  <TableCell>{formatDate(mandate.data_inicio)}</TableCell>
                  <TableCell>{formatDate(mandate.data_fim)}</TableCell>
                  <TableCell className="text-right tabular-nums">{mandate.members?.length ?? 0}</TableCell>
                </TableRow>
              ))}
              {!isMandatesLoading && !isMandatesError && mandates?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-6 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Users className="size-8 text-muted-foreground/50" />
                      <p className="text-sm">Nenhum mandato cadastrado.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Reuniões</CardTitle>
            <CardDescription>Ata obrigatória em reuniões ordinárias (BR-SST-023).</CardDescription>
          </div>
          <Button type="button" size="sm" onClick={() => setNewMeetingOpen(true)}>
            <Plus className="size-4" />
            Nova reunião
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Ata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isMeetingsLoading && <TableSkeletonRows columns={3} />}
              {isMeetingsError && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-destructive">
                    Não foi possível carregar as reuniões.
                  </TableCell>
                </TableRow>
              )}
              {meetings?.map((meeting) => (
                <TableRow
                  key={meeting.id}
                  className="border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5"
                >
                  <TableCell>{formatDate(meeting.data)}</TableCell>
                  <TableCell>{meeting.tipo === 'ordinaria' ? 'Ordinária' : 'Extraordinária'}</TableCell>
                  <TableCell>
                    {meeting.ata_arquivo_url ? (
                      <a href={meeting.ata_arquivo_url} target="_blank" rel="noreferrer" className="text-brand underline">
                        Ver arquivo
                      </a>
                    ) : (
                      meeting.ata_texto ?? '-'
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!isMeetingsLoading && !isMeetingsError && meetings?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="size-8 text-muted-foreground/50" />
                      Nenhuma reunião registrada.
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NewMeetingDialog open={newMeetingOpen} onClose={() => setNewMeetingOpen(false)} mandates={mandates ?? []} />
    </div>
  );
}

const newMeetingSchema = z
  .object({
    mandate_id: z.coerce.number().int().positive('Selecione o mandato.'),
    tipo: z.enum(['ordinaria', 'extraordinaria']),
    data: z.string().min(1, 'Informe a data da reunião.'),
    ata_texto: z.string().optional(),
    ata_arquivo_url: z.string().optional(),
  })
  .refine((value) => value.tipo !== 'ordinaria' || Boolean(value.ata_texto?.trim() || value.ata_arquivo_url?.trim()), {
    message: 'Reunião ordinária exige ata (texto ou arquivo).',
    path: ['ata_texto'],
  });

type NewMeetingFormData = z.infer<typeof newMeetingSchema>;

function NewMeetingDialog({
  open,
  onClose,
  mandates,
}: {
  open: boolean;
  onClose: () => void;
  mandates: sstApi.CipaMandate[];
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewMeetingFormData>({
    resolver: zodResolver(newMeetingSchema),
    defaultValues: { tipo: 'ordinaria', data: toDateInputValue() },
  });

  const mutation = useMutation({
    mutationFn: (values: NewMeetingFormData) =>
      sstApi.createCipaMeeting({
        mandate_id: values.mandate_id,
        tipo: values.tipo,
        data: values.data,
        ata_texto: values.ata_texto?.trim() || undefined,
        ata_arquivo_url: values.ata_arquivo_url?.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sst-cipa-meetings'] });
      reset({ tipo: 'ordinaria', data: toDateInputValue() } as never);
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível registrar a reunião da CIPA')),
  });

  React.useEffect(() => {
    if (open) {
      reset({ tipo: 'ordinaria', data: toDateInputValue() } as never);
      setFormError(null);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova reunião da CIPA</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="meeting-mandate">Mandato</Label>
            <SelectNative id="meeting-mandate" {...register('mandate_id')}>
              <option value="">Selecione...</option>
              {mandates.map((mandate) => (
                <option key={mandate.id} value={mandate.id}>
                  {formatDate(mandate.data_inicio)} — {formatDate(mandate.data_fim)}
                </option>
              ))}
            </SelectNative>
            {errors.mandate_id && <p className="text-sm text-destructive">{errors.mandate_id.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="meeting-tipo">Tipo</Label>
              <SelectNative id="meeting-tipo" {...register('tipo')}>
                <option value="ordinaria">Ordinária</option>
                <option value="extraordinaria">Extraordinária</option>
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="meeting-data">Data</Label>
              <Input id="meeting-data" type="date" {...register('data')} />
              {errors.data && <p className="text-sm text-destructive">{errors.data.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="meeting-ata-texto">Ata (texto)</Label>
            <Textarea id="meeting-ata-texto" rows={3} {...register('ata_texto')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="meeting-ata-url">Ou URL do arquivo de ata</Label>
            <Input id="meeting-ata-url" placeholder="https://..." {...register('ata_arquivo_url')} />
            {errors.ata_texto && <p className="text-sm text-destructive">{errors.ata_texto.message}</p>}
          </div>
          {formError && <DidacticAlert error={formError} />}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Registrar reunião'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
