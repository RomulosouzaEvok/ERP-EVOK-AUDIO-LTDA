import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FlaskConical } from 'lucide-react';

import * as requisitionsApi from '@/api/purchaseRequisitions';
import * as engineeringApi from '@/api/engineering';
import type * as itemsApi from '@/api/items';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { DidacticAlert } from '@/components/DidacticAlert';
import { ItemSearchSelect } from '@/components/ItemSearchSelect';

/**
 * Origem de amostra da Engenharia (Bloco 2, UC-39) — texto livre
 * compartilhado com `RequisitionsPage.tsx`/backend (`origin` é
 * `VARCHAR(80)`, não ENUM).
 */
const ENGINEERING_SAMPLE_ORIGIN = 'engenharia_amostra';

/** Limiar de quantidade a partir do qual exibimos o aviso não bloqueante de amostra atípica. */
const ATYPICAL_QUANTITY_THRESHOLD = 50;

const sampleRequestSchema = z.object({
  item_id: z.string().min(1, 'Selecione o item a ser amostrado.'),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero.'),
  unit: z.string().optional(),
  engineering_project_id: z.string().optional(),
  justification: z.string().trim().min(1, 'Justifique o motivo da amostra.').max(4000),
});

type SampleRequestFormData = z.infer<typeof sampleRequestSchema>;

const EMPTY_DEFAULTS: SampleRequestFormData = {
  item_id: '',
  quantity: 1,
  unit: '',
  engineering_project_id: '',
  justification: '',
};

/**
 * Aba "Solicitar Amostra" (Bloco 2, UC-39) — cria uma requisição de compra
 * com `origin='engenharia_amostra'`, justificativa obrigatória (carregada
 * em `notes`, sem coluna dedicada — ver `CreatePurchaseRequisitionUseCase`)
 * e vínculo opcional com um Projeto de P&D. Reaproveita 100% o backend de
 * `POST /api/purchase-requisitions`; nenhuma rota nova.
 */
export function SampleRequestTab() {
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = React.useState<itemsApi.Item | null>(null);
  const [submitError, setSubmitError] = React.useState<DidacticError | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const { data: engineeringProjects } = useQuery({
    queryKey: ['engineering-projects-all-sample-tab'],
    queryFn: () => engineeringApi.listEngineeringProjects({ limit: 200 }),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SampleRequestFormData>({
    resolver: zodResolver(sampleRequestSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  const quantityValue = watch('quantity');
  const isAtypicalQuantity = Number(quantityValue) > ATYPICAL_QUANTITY_THRESHOLD;

  const createMutation = useMutation({
    mutationFn: (values: SampleRequestFormData) =>
      requisitionsApi.createPurchaseRequisition({
        origin: ENGINEERING_SAMPLE_ORIGIN,
        status: 'pending',
        notes: values.justification,
        engineering_project_id: values.engineering_project_id ? Number(values.engineering_project_id) : undefined,
        items: [
          {
            item_id: values.item_id,
            quantity: values.quantity,
            unit: values.unit || undefined,
          },
        ],
      }),
    onSuccess: (requisition) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });
      setSubmitError(null);
      setSuccessMessage(
        `Requisição de amostra ${requisition.requisition_number ?? `#${requisition.id}`} criada com sucesso. Acompanhe a aprovação em Compras → Requisições.`,
      );
      setSelectedItem(null);
      reset(EMPTY_DEFAULTS);
    },
    onError: (error) => {
      setSuccessMessage(null);
      setSubmitError(
        translateApiError(error, 'Não foi possível criar a requisição de amostra', 'create-engineering-sample'),
      );
    },
  });

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <FlaskConical className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Solicitar amostra</h2>
          <p className="text-sm text-muted-foreground">
            Cria uma requisição de compra de amostra para a Engenharia. Pedidos gerados a partir desta requisição
            são recebidos no Depósito do Laboratório.
          </p>
        </div>
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={handleSubmit((values) => {
          setSuccessMessage(null);
          createMutation.mutate(values);
        })}
        noValidate
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sample-item">Item a ser amostrado *</Label>
          <Controller
            control={control}
            name="item_id"
            render={({ field }) => (
              <ItemSearchSelect
                value={selectedItem}
                onChange={(item) => {
                  setSelectedItem(item);
                  field.onChange(item?.id ?? '');
                }}
                placeholder="Buscar item..."
              />
            )}
          />
          {errors.item_id && <p className="text-sm text-destructive">{errors.item_id.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sample-quantity">Quantidade *</Label>
            <Input id="sample-quantity" type="number" step="any" min="0" {...register('quantity')} />
            {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sample-unit">Unidade</Label>
            <Input id="sample-unit" placeholder="UN, KG..." {...register('unit')} />
          </div>
        </div>

        {isAtypicalQuantity && (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            Quantidade acima de {ATYPICAL_QUANTITY_THRESHOLD} unidades para uma amostra é incomum — confira antes de
            enviar. Isto não impede o envio da requisição.
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sample-project">Projeto de P&D (opcional)</Label>
          <SelectNative id="sample-project" {...register('engineering_project_id')} defaultValue="">
            <option value="">Nenhum</option>
            {engineeringProjects?.data.map((project) => (
              <option key={project.id} value={project.id}>
                {project.project_code} — {project.name}
              </option>
            ))}
          </SelectNative>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sample-justification">Justificativa *</Label>
          <textarea
            id="sample-justification"
            className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Motivo da amostra (ex.: validação acústica de protótipo, teste destrutivo, homologação de fornecedor...)"
            {...register('justification')}
          />
          {errors.justification && <p className="text-sm text-destructive">{errors.justification.message}</p>}
        </div>

        {submitError && <DidacticAlert error={submitError} />}
        {successMessage && (
          <p className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
            {successMessage}
          </p>
        )}

        <div>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            {isSubmitting || createMutation.isPending ? 'Enviando...' : 'Solicitar amostra'}
          </Button>
        </div>
      </form>
    </div>
  );
}
