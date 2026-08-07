import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Wrench } from 'lucide-react';

import * as facilitiesApi from '@/api/facilities';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { Textarea } from '@/components/Textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FACILITY_SPECIALTY_LABELS } from './facilitiesShared';

const ticketSchema = z.object({
  facility_area_id: z.coerce.number().int().positive('Informe o ID da área física (peça ao setor de Facilities se não souber).'),
  facility_specialty: z.enum(['electrical', 'plumbing', 'civil', 'hvac', 'roofing', 'gardening', 'other']),
  description: z.string().trim().min(1, 'Descreva o problema.'),
  asset_id: z.union([z.coerce.number().int().positive(), z.literal('')]).optional(),
});

type TicketFormData = z.infer<typeof ticketSchema>;

/**
 * `/chamado-predial` — Auto-serviço de abertura de chamado de Manutenção
 * Predial (RF-FAC-040, UC-60). Acessível a **qualquer usuário autenticado**,
 * independentemente de possuir o módulo `facilities`/`manutencao` — mesmo
 * precedente de `/meus-chamados` (Bloco 2, TI). **Decisão de UX**: diferente
 * do TI, aqui não há listagem "meus chamados prediais" nesta tela, porque
 * `GET /api/facilities/maintenance-tickets` exige o módulo `facilities` OU
 * `manutencao` (o contrato de API não abre exceção de leitura por
 * solicitante) — a tela cobre só a abertura + confirmação; acompanhamento
 * detalhado é responsabilidade da equipe de Facilities/Manutenção em
 * `/facilities` → aba "Manutenção Predial".
 */
export default function FacilityTicketPage() {
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const [lastCreatedId, setLastCreatedId] = React.useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TicketFormData>({ resolver: zodResolver(ticketSchema), defaultValues: { facility_specialty: 'other' } });

  const mutation = useMutation({
    mutationFn: (values: TicketFormData) =>
      facilitiesApi.createMaintenanceTicket({
        facility_area_id: values.facility_area_id,
        facility_specialty: values.facility_specialty,
        description: values.description,
        asset_id: values.asset_id ? Number(values.asset_id) : null,
      }),
    onSuccess: (ticket) => {
      setFormError(null);
      setLastCreatedId(ticket.id);
      reset({ facility_specialty: 'other' } as never);
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível abrir o chamado predial')),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Wrench className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Chamado Predial</h1>
          <p className="text-sm text-muted-foreground">
            Reporte um problema de manutenção predial (elétrica, hidráulica, civil, climatização, jardinagem etc.) — qualquer funcionário pode abrir.
          </p>
        </div>
      </div>

      {lastCreatedId != null && (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          Chamado #{lastCreatedId} aberto com sucesso. A equipe de Facilities/Manutenção vai triar e acompanhar a execução.
        </div>
      )}

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Abrir novo chamado</CardTitle>
          <CardDescription>Informe a área e descreva o problema com o máximo de detalhes.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ticket-area">ID da área física *</Label>
                <Input id="ticket-area" type="number" placeholder="Ex.: 14" {...register('facility_area_id')} />
                {errors.facility_area_id && <p className="text-sm text-destructive">{errors.facility_area_id.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ticket-specialty">Especialidade</Label>
                <SelectNative id="ticket-specialty" {...register('facility_specialty')}>
                  {Object.entries(FACILITY_SPECIALTY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectNative>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ticket-description">Descrição do problema *</Label>
              <Textarea id="ticket-description" rows={4} placeholder="Ex.: Tomada com fio exposto próxima à bancada 3" {...register('description')} />
              {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ticket-asset">Ativo relacionado (opcional — ID do patrimônio)</Label>
              <Input id="ticket-asset" type="number" {...register('asset_id')} />
            </div>

            {formError && <DidacticAlert error={formError} />}

            <Button type="submit" disabled={isSubmitting || mutation.isPending} className="self-start">
              {mutation.isPending ? 'Enviando...' : 'Abrir chamado'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
