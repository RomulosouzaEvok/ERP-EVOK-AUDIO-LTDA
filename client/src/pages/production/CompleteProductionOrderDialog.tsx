import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as productionApi from '@/api/production';
import * as bomApi from '@/api/bom';
import * as inventoryApi from '@/api/inventory';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ProductionOrder } from '@/api/production';

interface ComponentConsumption {
  product_id: number;
  name: string;
  neededQuantity: number;
  lot_control_id: number | '';
  quantity: string;
}

/**
 * Conclusão de OP com consumo de lote explícito (obrigatório na API,
 * `ChangeProductionOrderStatusUseCase`): busca a BOM ativa do produto,
 * explode os componentes, lista os lotes com saldo disponível de cada um
 * e exige que o usuário escolha o lote e a quantidade consumida de cada
 * componente antes de concluir.
 */
export default function CompleteProductionOrderDialog({
  order,
  onClose,
}: {
  order: ProductionOrder | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [consumptions, setConsumptions] = React.useState<ComponentConsumption[]>([]);
  const [finishedLotNumber, setFinishedLotNumber] = React.useState('');
  const [quantityProduced, setQuantityProduced] = React.useState('');
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<DidacticError | null>(null);

  const { data: bom } = useQuery({
    queryKey: ['bom-by-product', order?.product_id],
    queryFn: () => bomApi.getActiveBomByProduct(order!.product_id),
    enabled: Boolean(order),
  });

  const producedQty = Number(quantityProduced) || Number(order?.quantity ?? 0);

  const { data: explosion, isLoading: loadingExploded } = useQuery({
    queryKey: ['bom-explode', bom?.id, producedQty],
    queryFn: () => bomApi.explodeBom(bom!.id, producedQty),
    enabled: Boolean(bom?.id) && producedQty > 0,
  });

  React.useEffect(() => {
    if (!order) return;
    setQuantityProduced(String(order.quantity));
    setFinishedLotNumber(`OP-${order.id}-${Date.now()}`);
  }, [order]);

  React.useEffect(() => {
    if (!explosion) return;
    setConsumptions(
      explosion.components.map((component) => ({
        product_id: component.component_id,
        name: component.component_name ?? `Produto #${component.component_id}`,
        neededQuantity: component.quantity,
        lot_control_id: '',
        quantity: String(component.quantity.toFixed(4)),
      })),
    );
  }, [explosion]);

  React.useEffect(() => {
    if (bom === null && order) {
      setLoadError('Este produto não tem estrutura (BOM) ativa cadastrada — não é possível concluir com rastreabilidade de consumo. Cadastre a BOM primeiro em "Produção → Estrutura de produto".');
    } else {
      setLoadError(null);
    }
  }, [bom, order]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!order) return;
      const incomplete = consumptions.find((item) => !item.lot_control_id || !item.quantity);
      if (incomplete) {
        throw new Error(`Selecione o lote e a quantidade consumida de "${incomplete.name}".`);
      }
      await productionApi.completeProductionOrder(order.id, {
        quantity_produced: Number(quantityProduced),
        finished_lot_number: finishedLotNumber || undefined,
        lot_consumptions: consumptions.map((item) => ({
          product_id: item.product_id,
          lot_control_id: Number(item.lot_control_id),
          quantity: Number(item.quantity),
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
    onError: (error) =>
      setSubmitError(
        translateApiError(
          error,
          `Não é possível concluir a ordem de produção ${order?.order_number ?? `#${order?.id}`}`,
          'complete-production-order',
        ),
      ),
  });

  return (
    <Dialog open={Boolean(order)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Concluir ordem de produção — {order?.order_number ?? order?.id}</DialogTitle>
        </DialogHeader>

        {loadError && <p className="text-sm text-destructive">{loadError}</p>}

        {!loadError && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="quantityProduced">Quantidade produzida</Label>
                <Input
                  id="quantityProduced"
                  type="number"
                  step="any"
                  value={quantityProduced}
                  onChange={(event) => setQuantityProduced(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="finishedLotNumber">Nº do lote do produto acabado</Label>
                <Input id="finishedLotNumber" value={finishedLotNumber} onChange={(event) => setFinishedLotNumber(event.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Label>Consumo de componentes (rastreabilidade obrigatória)</Label>
              {loadingExploded && <p className="text-sm text-muted-foreground">Carregando estrutura...</p>}
              {consumptions.map((item, index) => (
                <ComponentLotPicker
                  key={item.product_id}
                  item={item}
                  onChange={(updated) =>
                    setConsumptions((prev) => prev.map((c, i) => (i === index ? updated : c)))
                  }
                />
              ))}
              {!loadingExploded && consumptions.length === 0 && (
                <p className="text-sm text-muted-foreground">Estrutura sem componentes.</p>
              )}
            </div>

            {submitError && <DidacticAlert error={submitError} />}
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || Boolean(loadError) || consumptions.length === 0}>
            {mutation.isPending ? 'Concluindo...' : 'Concluir produção'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ComponentLotPicker({
  item,
  onChange,
}: {
  item: ComponentConsumption;
  onChange: (updated: ComponentConsumption) => void;
}) {
  const { data: lots, isLoading } = useQuery({
    queryKey: ['available-lots', item.product_id],
    queryFn: () => inventoryApi.listAvailableLots(item.product_id),
  });

  const hasLot = item.lot_control_id !== '';
  return (
    <div
      className={`flex items-center gap-2 rounded-md border p-3 transition-colors ${
        hasLot ? 'border-brand/40 bg-brand/5' : 'border-input'
      }`}
    >
      <div className="flex-1 text-sm">
        <p className="font-medium">{item.name}</p>
        <p className="text-xs text-muted-foreground">
          Necessário: <span className="tabular-nums">{item.neededQuantity.toFixed(4)}</span>
        </p>
      </div>
      {isLoading ? (
        <span className="text-xs text-muted-foreground">Carregando lotes...</span>
      ) : lots?.length === 0 ? (
        <span className="text-xs text-destructive">Sem lote disponível</span>
      ) : (
        <SelectNative
          className="w-40"
          value={item.lot_control_id}
          onChange={(event) => onChange({ ...item, lot_control_id: Number(event.target.value) })}
        >
          <option value="">Selecione o lote...</option>
          {lots?.map((lot) => (
            <option key={lot.id} value={lot.id}>
              {lot.lot_number} (saldo {lot.quantity_available})
            </option>
          ))}
        </SelectNative>
      )}
      <Input
        type="number"
        step="any"
        className="w-28 text-right tabular-nums"
        value={item.quantity}
        onChange={(event) => onChange({ ...item, quantity: event.target.value })}
      />
    </div>
  );
}
