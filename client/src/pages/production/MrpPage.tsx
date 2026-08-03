import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';

import * as mrpApi from '@/api/mrp';
import { extractApiErrorMessage } from '@/api/httpClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ItemSearchSelect } from '@/components/ItemSearchSelect';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';

const ORIGIN_LABEL: Record<mrpApi.MrpDemandOrigin, string> = {
  MANUAL: 'Manual',
  PEDIDO_VENDA: 'Pedido de venda',
  PREVISAO: 'Previsão',
  ORDEM_PRODUCAO: 'Ordem de produção',
};

const demandSchema = z.object({
  item_id: z.string().min(1, 'Selecione um item.'),
  quantidade: z.coerce.number().positive('Quantidade deve ser maior que zero.'),
  data_necessidade: z.string().min(1, 'Informe a data de necessidade.'),
  origem: z.enum(['MANUAL', 'PEDIDO_VENDA', 'PREVISAO', 'ORDEM_PRODUCAO']),
});

const planSchema = z.object({
  demands: z.array(demandSchema).min(1, 'Adicione ao menos uma demanda.'),
});

type PlanFormData = z.infer<typeof planSchema>;

/** MRP: planejamento de necessidades de materiais contra o estoque real (não congelado). */
export default function MrpPage() {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<string | null>(null);

  const { data: plannedOrders, isLoading, isError } = useQuery({
    queryKey: ['mrp-planned-orders'],
    queryFn: () => mrpApi.listPlannedOrders(),
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: { demands: [{ item_id: '', quantidade: 1, data_necessidade: '', origem: 'MANUAL' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'demands' });

  const planMutation = useMutation({
    mutationFn: (values: PlanFormData) => mrpApi.planMrp({ demands: values.demands }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mrp-planned-orders'] });
      reset({ demands: [{ item_id: '', quantidade: 1, data_necessidade: '', origem: 'MANUAL' }] });
      setFormError(null);
    },
    onError: (error) => setFormError(extractApiErrorMessage(error)),
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">MRP — Planejamento de necessidades</h1>

      <div className="rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Gerar plano</h2>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => planMutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="mb-1.5 block text-xs">Item</Label>
                  <Controller
                    control={control}
                    name={`demands.${index}.item_id`}
                    render={({ field: controllerField }) => (
                      <ItemSearchSelect
                        value={null}
                        onChange={(item) => controllerField.onChange(item?.id ?? '')}
                        placeholder="Item..."
                      />
                    )}
                  />
                </div>
                <div className="w-28">
                  <Label className="mb-1.5 block text-xs">Quantidade</Label>
                  <Controller
                    control={control}
                    name={`demands.${index}.quantidade`}
                    render={({ field: controllerField }) => (
                      <Input type="number" step="any" {...controllerField} value={controllerField.value ?? ''} />
                    )}
                  />
                </div>
                <div className="w-40">
                  <Label className="mb-1.5 block text-xs">Data necessidade</Label>
                  <Controller
                    control={control}
                    name={`demands.${index}.data_necessidade`}
                    render={({ field: controllerField }) => <Input type="date" {...controllerField} />}
                  />
                </div>
                <div className="w-44">
                  <Label className="mb-1.5 block text-xs">Origem</Label>
                  <Controller
                    control={control}
                    name={`demands.${index}.origem`}
                    render={({ field: controllerField }) => (
                      <SelectNative {...controllerField}>
                        {Object.entries(ORIGIN_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </SelectNative>
                    )}
                  />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            {errors.demands?.message && <p className="text-sm text-destructive">{errors.demands.message}</p>}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => append({ item_id: '', quantidade: 1, data_necessidade: '', origem: 'MANUAL' })}
            >
              <Plus className="size-3" /> Adicionar demanda
            </Button>
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button type="submit" className="w-fit" disabled={isSubmitting || planMutation.isPending}>
            {planMutation.isPending ? 'Gerando...' : 'Gerar plano'}
          </Button>
        </form>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Ordens planejadas</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Bruta</TableHead>
              <TableHead>Disponível</TableHead>
              <TableHead>Líquida</TableHead>
              <TableHead>Planejada</TableHead>
              <TableHead>Necessidade</TableHead>
              <TableHead>Liberação</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows columns={8} />}
            {isError && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-destructive">
                  Não foi possível carregar as ordens planejadas. Tente novamente.
                </TableCell>
              </TableRow>
            )}
            {plannedOrders?.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.item ? `${order.item.codigo} — ${order.item.descricao}` : '-'}</TableCell>
                <TableCell>{Number(order.necessidade_bruta)}</TableCell>
                <TableCell>{Number(order.estoque_disponivel)}</TableCell>
                <TableCell>{Number(order.necessidade_liquida)}</TableCell>
                <TableCell>{Number(order.quantidade_planejada)}</TableCell>
                <TableCell>{new Date(order.data_necessidade).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell>{new Date(order.data_liberacao).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{order.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && !isError && (plannedOrders?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Nenhuma ordem planejada gerada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
